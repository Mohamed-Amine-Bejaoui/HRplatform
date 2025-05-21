import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import cron from 'node-cron';
import connectDB from '../db.js';

const db = await connectDB();
const router = express.Router();

// Directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const processedDir = path.resolve(__dirname, '../uploads/processed');
const uploadDir = path.resolve(__dirname, '../uploads/workschedule');

// Ensure upload directory exists
[uploadDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

// File upload endpoint
router.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const fileDetails = req.files.map(file => ({
    filename: file.originalname,
    path: file.path
  }));

  return res.status(200).json({
    message: 'Files uploaded successfully',
    files: fileDetails
  });
});

// Status mapping configuration
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

// Process work schedule files
const processWorkSchedule = async (targetMonth) => {
  const [targetYear, targetMonthNumber] = targetMonth.split('-');
  const folderPath = path.join(__dirname, '../uploads/workschedule');

  if (!fs.existsSync(folderPath)) {
    console.error('❌ Work folder does not exist');
    return { message: 'Work folder does not exist', entriesInserted: 0 };
  }

  const files = fs.readdirSync(folderPath);
  const csvFiles = files.filter(f => f.endsWith('.csv') || f.endsWith('.txt') || f.endsWith('.xls'));

  const matchedFiles = csvFiles.filter(file => {
    const dateMatch = file.match(/(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) return false;
    const [_, year, month] = dateMatch;
    return year === targetYear && month === targetMonthNumber;
  });

  if (matchedFiles.length === 0) {
    console.warn(`⚠️ No files match the selected month workschedule: ${targetMonth}`);
    return { message: `No files match the selected month workschedule: ${targetMonth}`, entriesInserted: 0 };
  }

  // Get the most recently modified file
  const latestFile = matchedFiles
    .map(file => ({
      file,
      mtime: fs.statSync(path.join(folderPath, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;

  const filePath = path.join(folderPath, latestFile);
  const results = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ headers: true, separator: ';', skipLines: 2 }))
      .on('data', (data) => {
        if (!data['_1'] || !data['_2']) return;
        if (data['_0'] && data['_0'].startsWith('Calendar Legends')) return;

        const empNumAux = data['_1'];
        const plannedStatuses = Object.values(data).slice(2);
        const startDate = new Date(targetYear, parseInt(targetMonthNumber) - 2, 26);

        for (let i = 0; i < 31; i++) {
          const tempDate = new Date(startDate);
          tempDate.setDate(startDate.getDate() + i);
          const formattedDate = tempDate.toISOString().split('T')[0];
          const status = plannedStatuses[i];

          if (status && empNumAux && formattedDate) {
            const plannedStatus = statusMapping[status] || "weekend";
            results.push([empNumAux, formattedDate, plannedStatus]);
          }
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Insert results into database
  const sql = `
    INSERT INTO work_schedule (emp_num_aux, work_date, planned_status)
    VALUES (?, ?, ?)
  `;

    let entriesInserted = 0;

  for (const row of results) {
    try {
      await db.query(sql, row);
      entriesInserted++;
    } catch (err) {
      console.error('Insert error:', err);
    }
  }

  console.log(`✅ Processed file: ${latestFile} with ${entriesInserted} entries`);

  // ✅ Move file to processed folder if at least one entry was inserted
  if (entriesInserted > 0) {
    const processedPath = path.join(processedDir, latestFile);
    fs.renameSync(filePath, processedPath);
    console.log(`📦 Moved processed file to: ${processedPath}`);
  } else {
    console.log(`🟡 No entries inserted. File not moved: ${latestFile}`);
  }

  return { latestFile, entriesInserted };

};

const dynamicCronJobs = [];

router.post('/process-cron', async (req, res) => {
  try {
    const { targetMonth, date: cronDate, time: cronTime } = req.body;

    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      return res.status(400).json({ message: 'Invalid target month format. Use YYYY-MM' });
    }

    if (cronDate && cronTime) {
      const [year, month, day] = cronDate.split('-');
      const [hour, minute] = cronTime.split(':');

      // Convert to cron expression: "m h D M *"
      const cronExpr = `${parseInt(minute)} ${parseInt(hour)} ${parseInt(day)} ${parseInt(month)} *`;

      console.log(`⏳ Scheduling cron job for ${targetMonth} at ${cronExpr}`);

      const job = cron.schedule(cronExpr, async () => {
        console.log(`⏰ Running scheduled work schedule processing for ${targetMonth}`);
        try {
          const { latestFile, entriesInserted } = await processWorkSchedule(targetMonth);
          console.log(`✅ Scheduled processing complete: ${latestFile} (${entriesInserted} entries)`);
        } catch (err) {
          console.error('❌ Scheduled processing failed:', err.message);
        }

        // Stop this one-time job
        job.stop();
      });

      dynamicCronJobs.push(job); // Optional: track it

      return res.status(200).json({
        message: `Cron job scheduled for ${cronDate} ${cronTime}`,
        cronExpression: cronExpr,
        scheduled: true
      });
    }

    // Fallback: Immediate processing
    const { latestFile, entriesInserted, message } = await processWorkSchedule(targetMonth);
    return res.status(200).json({
      message: message || `Successfully processed ${latestFile} for ${targetMonth}`,
      entriesInserted,
      processedImmediately: true
    });

  } catch (err) {
    console.error('Processing error:', err.message);
    return res.status(500).json({
      message: err.message || 'Failed to process work schedule'
    });
  }
});

export default router;