import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
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

router.get('/prescence/:id', async (req, res) => {
  try {
    const query = 'SELECT * FROM attendance_logs2 WHERE emp_id = ?';
    const [rows] = await db.query(query, [req.params.id]);
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

  fs.createReadStream(filePath)
    .pipe(csv({
      separator: ';', 
      mapHeaders: ({ header }) => header.trim()
    }))
    .on('data', (row) => {
      try {
        const dateStr = row.Date;
        if (dateStr && dateStr.includes('/')) {
          const [day, monthStr, year] = dateStr.split('/');
          const month = parseInt(monthStr);
          if (month) {
            results.push({
              emp_id: row.EmployeeID,
              name: row.Name,
              date: `${year}-${monthStr.padStart(2, '0')}-${day.padStart(2, '0')}`,
              workplace: row.Workplace,
              check_in_actual: row['Check-in (actual)'] || null,
              check_out_actual: row['Check-out (actual)'] || null,
              check_in_corrected: row['Check-in (corrected)'] || null,
              check_out_corrected: row['Check-out (corrected)'] || null,
              worked_hours: row['Worked Hours'] || null,
              anomaly: row['Absence/Anomaly'] || null,
            });
          }
        } else {
          console.warn('⏭ Skipping row due to invalid date:', row);
        }
      } catch (e) {
        console.warn('⏭ Skipping row due to parsing error:', e.message);
      }
    })
    .on('end', async () => {
      try {
        if (results.length === 0) {
          return res.status(400).json({ message: 'No valid data found for selected month.' });
        }

        const insertQuery = `
          INSERT INTO attendance_logs2 (
            emp_id, name, date, workplace,
            check_in_actual, check_out_actual,
            check_in_corrected, check_out_corrected,
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
          r.check_in_corrected,
          r.check_out_corrected,
          r.worked_hours,
          r.anomaly
        ]);

        await db.query(insertQuery, [values]);
        res.status(200).json({ message: '✅ Attendance data saved successfully!' });
      } catch (err) {
        console.error('❌ DB Insert error:', err);
        res.status(500).json({ error: 'Database insert error' });
      } finally {
        fs.unlinkSync(filePath); 
      }
    });
});

export default router;
