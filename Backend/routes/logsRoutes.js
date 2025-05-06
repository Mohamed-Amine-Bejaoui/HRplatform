import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../db.js';

const router = express.Router();
const db = await connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });
router.get('/presence', async (req, res) => {
  try {
    const { month, year, name } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required as query parameters.' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    let query = `SELECT * FROM attendance_logs2 WHERE date BETWEEN ? AND ?`;
    const params = [startDate, endDate];

    if (name) {
      query += ` AND name LIKE ?`;
      params.push(`%${name}%`);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
router.get('/presence/:id', async (req, res) => {
  try {
    const { month, year } = req.query; 
    const empId = req.params.id;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required as query parameters.' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const query = `
      SELECT * 
      FROM attendance_logs2 
      WHERE emp_id = ? 
      AND date BETWEEN ? AND ?`;

    const [rows] = await db.query(query, [empId, startDate, endDate]);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const filePath = req.file.path;
  const results = [];

  try {
    console.log('📂 Reading file:', filePath);
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    // 🔍 Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && row.includes('Matricule') && row.includes('Nom prénom')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return res.status(400).json({ message: 'Could not find header row in Excel file' });
    }

    // 🧭 Column indexes
    const headers = jsonData[headerRowIndex].map(h => h?.toString().toLowerCase().trim());
    const getIndex = (name) => headers.findIndex(h => h && h.includes(name));

    const idxMatricule = getIndex('matricule');
    const idxNom = getIndex('nom');
    const idxCheckIn = 9; // Column index for Prem. point. (Check-In)
    const idxCheckOut = 10;

    // Log headers for debugging
    console.log("Headers:", headers);

    // 📅 Extract date from title
    let date = null;
    for (const row of jsonData) {
      if (row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('pointages du')) {
        const match = row[0].match(/(\d{1,2})\s(\w+)\s(\d{4})/);
        if (match) {
          const [_, day, monthStr, year] = match;
          const months = {
            'jan': '01', 'fév': '02', 'mar': '03', 'avr': '04', 'mai': '05', 'jun': '06',
            'jul': '07', 'aoû': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'déc': '12'
          };
          const month = months[monthStr.toLowerCase()] || '01';
          date = `${year}-${month}-${day.padStart(2, '0')}`;
          break;
        }
      }
    }

    if (!date) {
      return res.status(400).json({ message: 'Could not extract date from file' });
    }

    // 🔄 Process attendance rows
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[idxMatricule] || !row[idxNom]) continue;

      const matricule = row[idxMatricule].toString().trim();
      const name = row[idxNom].toString().trim();

      if (
        !matricule || 
        matricule.toLowerCase().includes('faurecia') || 
        row[0]?.toString().toLowerCase().startsWith('bilan') || 
        row[0]?.toString().toLowerCase().startsWith('imprimé')
      ) continue;

      // Log Full Row Data
      console.log("Full Row Data:", row);

      const checkInRaw = row[idxCheckIn] || null;
      const checkOutRaw = row[idxCheckOut] || null;

      // Log Raw Data for Check-In and Check-Out
      console.log("Raw Check-In Data:", checkInRaw);
      console.log("Raw Check-Out Data:", checkOutRaw);

      const checkIn = parseExcelTime(checkInRaw);
      const checkOut = parseExcelTime(checkOutRaw);

      // Log Parsed Times
      console.log("Parsed Check-In:", checkIn);
      console.log("Parsed Check-Out:", checkOut);

      // ⏱ Calculate worked hours
      let workedHours = null;
      if (checkIn && checkOut && checkOut > checkIn) {
        const ms = checkOut - checkIn;
        workedHours = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));
      }

      const anomaly = !checkIn && !checkOut ? 'Absence' :
                      (checkIn && checkIn.getHours() >= 9 ? 'Late Arrival' : null);

      results.push({
        emp_id: matricule,
        name: name,
        date: date,
        workplace: 'Faurecia',
        check_in_actual: checkIn ? formatTime(checkIn) : null,
        check_out_actual: checkOut ? formatTime(checkOut) : null,
        worked_hours: workedHours,
        anomaly: anomaly
      });

    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'No valid attendance data found in file' });
    }

    // 📥 Insert into database
    const insertQuery = `
      INSERT INTO attendance_logs2 (
        emp_id, name, date, workplace,
        check_in_actual, check_out_actual,
        worked_hours, anomaly
      ) VALUES ?
    `;

    const values = results.map(r => [
      r.emp_id,
      r.name,
      r.date,
      r.workplace,
      r.check_in_actual,
      r.check_out_actual,
      r.worked_hours,
      r.anomaly
    ]);

    await db.query(insertQuery, [values]);

    console.log(`✅ Inserted ${results.length} attendance records`);
    res.status(200).json({ message: 'Attendance data imported successfully', count: results.length });

  } catch (err) {
    console.error('❌ Error processing file:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

function parseExcelTime(value) {
  if (typeof value === 'string') {
    // Handle case where time is in "HH:MM:" format (remove trailing colon)
    value = value.replace(':', '');
  }
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const totalSeconds = Math.round(value * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return new Date(1970, 0, 1, hours, minutes, seconds);
  }
  const parsed = new Date(`1970-01-01T${value}Z`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// 🕒 Format Date object to HH:MM:SS
function formatTime(date) {
  if (!(date instanceof Date)) return null;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default router;
