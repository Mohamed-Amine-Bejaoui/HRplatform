import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../db.js';

const router = express.Router();
const db = await connectDB();

// Setup directory for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Upload route

router.post('/upload', upload.single('file'), async (req, res) => {
  console.log("File upload started");

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  console.log("Uploaded file path:", filePath);

  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ message: 'Uploaded file not found' });
  }

  const selectedMonth = parseInt(req.body.month);
  if (!selectedMonth || selectedMonth < 1 || selectedMonth > 12) {
    return res.status(400).json({ message: 'Invalid or missing month selection' });
  }

  try {
    const results = [];
    let rowCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ headers: true, separator: ';', skipLines: 2 }))
        .on('data', (data) => {
          rowCount++;

          if (data['_0'] && data['_0'].startsWith('Calendar Legends')) {
            console.log('Skipping Calendar Legends row');
            return;
          }

          if (!data['_1'] || !data['_2']) {
            console.log('Skipping row due to missing employee ID or status:', data);
            return;
          }

          const empNumAux = data['_1'];
          const plannedStatuses = Object.values(data).slice(2);

          const currentYear = new Date().getFullYear();
          const startDate = new Date(currentYear, selectedMonth - 1, 26);
          const dateList = [];

          for (let i = 0; i < 31; i++) {
            const tempDate = new Date(startDate);
            tempDate.setDate(startDate.getDate() + i);
            dateList.push(tempDate.toISOString().split('T')[0]);
          }

          for (let index = 0; index < 31; index++) {
            const status = plannedStatuses[index];
            const formattedDate = dateList[index];

            if (status && empNumAux && formattedDate) {
              const statusMapping = {
                "OK": "Working day",
                "V": "Vacations",
                "R": "Recovery",
                "P": "Public Holiday",
                "HO": "Home Office",
                "L": "paid Permission",
                "S": "Sickness",
                "HD": "Half-Day",
                "T": "Training",
                "BT": "Business Trip",
                "F": "Relatives Death",
                "M": "Marriage",
              };

              const plannedStatus = statusMapping[status] || "weekend";
              results.push([empNumAux, formattedDate, plannedStatus]);
            }
          }
        })
        .on('end', () => {
          console.log(`CSV parsing finished. Total rows processed: ${rowCount}`);
          resolve();
        })
        .on('error', reject);
    });

    console.log('Rows processed:', results.length);

    if (results.length > 0) {
      const sql = `
        INSERT INTO work_schedule (emp_num_aux, work_date, planned_status)
        VALUES (?, ?, ?)
      `;

      for (const row of results) {
        try {
          await db.query(sql, row);
          console.log('✅ Inserted:', row);
        } catch (err) {
          console.error('❌ Insert error:', err);
        }
      }
    } else {
      console.log('No valid rows to insert.');
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ message: 'File processed and data inserted successfully!' });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Failed to process file', error: error.message });
  }
});

export default router;
