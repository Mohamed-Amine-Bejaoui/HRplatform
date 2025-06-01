import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import connectDB from '../db.js';
import csv from 'csv-parser';

const router = express.Router();
const db = await connectDB();

// Setup directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/logs');
const processedDir = path.resolve(__dirname, '../uploads/processed');
try {
  const files = fs.readdirSync(uploadsDir);
} catch (err) {
  console.error('Cannot access directory:', err);
}
[uploadsDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// File upload config (XLS only)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});
router.get('/debug-uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      uploadsDir,
      exists: fs.existsSync(uploadsDir),
      fileCount: files.length,
      files: files,
      parentDirContents: fs.readdirSync(path.dirname(uploadsDir))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Upload endpoint
router.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded.' });
  res.status(200).json({ message: 'Files uploaded successfully.' });
});

// Employee presence endpoint
router.get('/prescence/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM attendance_logs2 WHERE emp_id = ?', [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Cron setup endpoint
router.post('/process-cron', async (req, res) => {
  const { date, time, targetMonth } = req.body;
  if (!date || !time || !targetMonth) {
    return res.status(400).json({ message: 'Date, time and target month are required' });
  }

  try {
    const [year, month] = targetMonth.split('-');
    const cronDate = new Date(`${date}T${time}:00`);
    const cronExpression = `${cronDate.getMinutes()} ${cronDate.getHours()} ${cronDate.getDate()} ${cronDate.getMonth() + 1} *`;

    // Schedule the job
    cron.schedule(cronExpression, () => processFilesForMonth(year, month), {
      scheduled: true,
      timezone: 'Africa/Tunis'
    });

    res.json({
      message: `Cron job scheduled for ${targetMonth}`,
      cronExpression,
      scheduledTime: cronDate.toISOString()
    });

  } catch (error) {
    console.error('Error scheduling cron job:', error);
    res.status(500).json({ message: 'Failed to schedule cron job' });
  }
});

async function processFilesForMonth(year, month) {
  console.log(`\n⏳ Starting processing for ${year}-${month}...`);
  try {
    // Log directory check
    if (!fs.existsSync(uploadsDir)) {
      console.error(`❌ Uploads directory not found: ${uploadsDir}`);
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`📁 Found ${files.length} files in upload directory`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const ext = path.extname(file).toLowerCase();

      if (!['.xls', '.xlsx'].includes(ext)) {
        skippedCount++;
        continue;
      }
      try {
        const results = await processXlsFile(filePath, year, month);
        
        if (results.length > 0) {
          await saveToDatabase(results);
          fs.renameSync(filePath, path.join(processedDir, file));
          processedCount++;
        } else {
          skippedCount++;
        }
      } catch (fileError) {
        console.error(`❌ Error processing file ${file}:`, fileError.message);
        skippedCount++;
      }
    }

    console.log(`\n✔️ Processing completed:
    - Processed files: ${processedCount}
    - Skipped files: ${skippedCount}
    - Total files: ${files.length}`);

  } catch (error) {
    console.error('\n❌ Critical processing error:', error);
  }
}
async function processXlsFile(filePath, targetYear, targetMonth) {
  return new Promise((resolve, reject) => {
    try {
      const results = [];
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      

      // Get the date from French header
      const frenchDatePattern = /Pointages du \w+\. (\d+) (\w+) (\d+)/;
      const headerCell = worksheet['A1'] || worksheet['B1'];
      
      if (!headerCell) {
        console.warn('No header found in worksheet');
        return resolve([]);
      }

      const dateMatch = headerCell.v.toString().match(frenchDatePattern);
      if (!dateMatch) {
        console.warn('Could not extract date from header:', headerCell.v);
        return resolve([]);
      }

      const [, day, frenchMonth, year] = dateMatch;
      const monthMap = {
        'janv': '01', 'févr': '02', 'mars': '03', 'avr': '04',
        'mai': '05', 'juin': '06', 'juil': '07', 'août': '08',
        'sept': '09', 'oct': '10', 'nov': '11', 'déc': '12'
      };
      
      const monthStr = monthMap[frenchMonth.toLowerCase()];
      if (!monthStr) {
        console.warn('Unknown French month:', frenchMonth);
        return resolve([]);
      }

      // Check if the file date matches the target month and year
      if (year !== targetYear || monthStr !== targetMonth) {
        return resolve([]);
      }

      const formattedDate = `${year}-${monthStr}-${day.padStart(2, '0')}`;
      
      // Convert Excel data to JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        header: ['matricule', 'nom_prenom', 'empty1', 'empty2', 'empty3', 'empty4', 
                'horaire_prev', 'empty5','prévue','prem_point', 'dern_point', 'nb_point', 'empty6', 'empty7'],
        range: 1,
        defval: null
      });
      

      // Process each row
      jsonData.forEach((row, index) => {
        try {
          // Skip empty rows or rows without employee ID
          if (!row.matricule || !row.nom_prenom) return;
          if (row.matricule === 'Matricule' || row.matricule === 'Faurecia') return;
          // Enhanced datetime conversion function
        const convertExcelTime = (excelSerial, fieldName) => {
    if (excelSerial === null || excelSerial === undefined) {
        return null;
    }
    
    try {
        // Excel serial dates are days since 1900-01-00 (with 1900 incorrectly treated as leap year)
        // JavaScript dates are milliseconds since 1970-01-01
        
        // First, check if this is a pure time value (no date component)
        if (excelSerial < 1) {
            // It's a time-only value (fraction of a day)
            const totalSeconds = excelSerial * 86400; // 86400 seconds in a day
            const hours = Math.floor(totalSeconds / 3600) % 24;
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            // It's a date-time value
            // Adjust for Excel's 1900 leap year bug (Excel thinks 1900 was a leap year)
            const excelEpoch = new Date(1899, 11, 31);
            const excelBug = excelSerial >= 61 ? 1 : 0; // The bug affects serials >= 61 (1900-02-29)
            
            const utcDate = new Date(excelEpoch.getTime() + 
                                   (excelSerial - excelBug) * 86400 * 1000);
            
            // Extract time components
            const hours = utcDate.getUTCHours();
            const minutes = utcDate.getUTCMinutes();
            const seconds = utcDate.getUTCSeconds();
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    } catch (e) {
        console.warn(`Error converting Excel time for ${fieldName}:`, e);
        return null;
    }
};
const calculateWorkedHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;

  try {
    const [inH, inM, inS] = checkIn.split(':').map(Number);
    const [outH, outM, outS] = checkOut.split(':').map(Number);

    const checkInSeconds = inH * 3600 + inM * 60 + (inS || 0);
    const checkOutSeconds = outH * 3600 + outM * 60 + (outS || 0);

    const workedSeconds = checkOutSeconds - checkInSeconds;

    if (workedSeconds <= 0) return null; // Invalid time

    const workedHours = workedSeconds / 3600;
    return parseFloat(workedHours.toFixed(2));
  } catch (e) {
    console.warn('⛔ Failed to calculate worked hours:', e.message);
    return null;
  }
};

          // Usage:
     const checkIn = convertExcelTime(row.prem_point);
const checkOut = convertExcelTime(row.dern_point);
const workedHours = calculateWorkedHours(checkIn, checkOut, row.nb_point);


 
  // Helper to check if check-in is after a defined threshold (e.g., 09:00)

const isLate = (checkIn) => {
  try {
    const [h, m] = checkIn.split(':').map(Number);
    return h > 9 || (h === 9 && m > 30);
  } catch {
    return false;
  }
};

let anomaly = null;

if (!checkIn && !checkOut) {
  anomaly = 'Absence';
} else if (checkIn && isLate(checkIn)) {
  anomaly = 'Late Arrival';
} else if (workedHours !== null && workedHours < 7) {
  anomaly = 'Short Shift';
}


        const record = {
          emp_id: row.matricule,
          name: row.nom_prenom,
          date: formattedDate,
          workplace: 'Faurecia',
          check_in_actual: checkIn,
          check_out_actual: checkOut,
          worked_hours: workedHours,
          anomaly: anomaly
        };
          
          results.push(record);
        } catch (err) {
          console.warn(`⏭ Error in row ${index}:`, err.message);
        }
      });
      
      resolve(results);
    } catch (err) {
      console.error('Error processing file:', err);
      reject(err);
    }
  });

}

import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function runPythonAnomalyDetection() {
  const pythonPath = 'C:\\Users\\aminh\\env\\Scripts\\python.exe';
  const scriptPath = 'C:\\Users\\aminh\\attendance-ai\\detect_anomalies.py';

  const cmd = `"${pythonPath}" "${scriptPath}"`;

  try {
    const { stdout, stderr } = await execAsync(cmd);
    console.log('🐍 Python Output:\n', stdout);
    if (stderr) console.error('⚠️ Python Warnings:\n', stderr);
  } catch (err) {
    console.error('❌ Python Script Failed:\n', err.message);
    throw err;
  }
}

export async function saveToDatabase(results) {
  try {
    if (results.length === 0) {
      console.warn('No valid records to insert');
      return;
    }

    const query = `
      INSERT IGNORE INTO attendance_logs2 (
        emp_id, name, date, workplace,
        check_in_actual, check_out_actual,
        worked_hours, anomaly
      ) VALUES ?`;
    
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

    await db.query(query, [values]);
    console.log(`✅ Successfully inserted ${results.length} records`);

    // ✅ Trigger anomaly detection after successful insert
    console.log(`🚀 Running anomaly detection...`);
    await runPythonAnomalyDetection();
    
  } catch (error) {
    console.error('❌ Database insertion error:', error);
    throw error;
  }
}
router.get('/presence', async (req, res) => {
  try {
    const { month, year, name } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year required.' });
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

// Get attendance data for specific employee
router.get('/presence/:id', async (req, res) => {
  try {
    const { month, year } = req.query;
    const empId = req.params.id;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year required.' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const [rows] = await db.query(
      `SELECT * FROM attendance_logs2 
       WHERE emp_id = ? AND date BETWEEN ? AND ?`,
      [empId, startDate, endDate]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;