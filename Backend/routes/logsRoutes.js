import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import connectDB from '../db.js';
import { exec } from 'child_process';
import util from 'util';
import nodemailer from 'nodemailer';
import { configDotenv } from 'dotenv';

configDotenv();

const router = express.Router();
const db = await connectDB();
const execAsync = util.promisify(exec);

// Setup directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/logs');
const processedDir = path.resolve(__dirname, '../uploads/processed');

[uploadsDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// File upload config
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});

// Upload endpoint
router.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded.' });
  res.status(200).json({ message: 'Files uploaded successfully.' });
});

// Employee presence endpoint
router.get('/presence/:id', async (req, res) => {
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
    res.status(500).json({ message: 'Failed to schedule cron job' });
  }
});

// Process files for a specific month
async function processFilesForMonth(year, month) {
  try {
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    let processedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const ext = path.extname(file).toLowerCase();

      if (!['.xls', '.xlsx'].includes(ext)) continue;

      try {
        const results = await processXlsFile(filePath, year, month);
        
        if (results.length > 0) {
          await saveToDatabase(results);
          fs.renameSync(filePath, path.join(processedDir, file));
          processedCount++;
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError.message);
      }
    }

    console.log(`Processing completed: ${processedCount} files processed`);
    
    // Send emails only once after all files are processed
    if (processedCount > 0 && !emailProcessing) {
      emailProcessing = true;
      console.log('⏳ Waiting 5 seconds for all alerts to be generated...');
      
      setTimeout(async () => {
        try {
          console.log('📧 Starting email sending process...');
          await sendAlertEmails();
          emailProcessing = false;
        } catch (error) {
          console.error('❌ Error sending emails:', error);
          emailProcessing = false;
        }
      }, 5000); // Wait 5 seconds for all alerts to be generated
    }

  } catch (error) {
    console.error('Processing error:', error);
    emailProcessing = false;
  }
}

// Process XLS file
async function processXlsFile(filePath, targetYear, targetMonth) {
  return new Promise((resolve, reject) => {
    try {
      const results = [];
      const workbook = xlsx.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Extract date from header
      const frenchDatePattern = /Pointages du \w+\. (\d+) (\w+) (\d+)/;
      const headerCell = worksheet['A1'] || worksheet['B1'];
      
      if (!headerCell) return resolve([]);

      const dateMatch = headerCell.v.toString().match(frenchDatePattern);
      if (!dateMatch) return resolve([]);

      const [, day, frenchMonth, year] = dateMatch;
      const monthMap = {
        'janv': '01', 'févr': '02', 'mars': '03', 'avr': '04',
        'mai': '05', 'juin': '06', 'juil': '07', 'août': '08',
        'sept': '09', 'oct': '10', 'nov': '11', 'déc': '12'
      };
      
      const monthStr = monthMap[frenchMonth.toLowerCase()];
      if (!monthStr || year !== targetYear || monthStr !== targetMonth) {
        return resolve([]);
      }

      const formattedDate = `${year}-${monthStr}-${day.padStart(2, '0')}`;
      
      // Convert to JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        header: ['matricule', 'nom_prenom', 'empty1', 'empty2', 'empty3', 'empty4', 
                'horaire_prev', 'empty5','prévue','prem_point', 'dern_point', 'nb_point'],
        range: 1,
        defval: null
      });

      // Process each row
      jsonData.forEach((row) => {
        if (!row.matricule || !row.nom_prenom) return;
        if (row.matricule === 'Matricule' || row.matricule === 'Faurecia') return;

        const checkIn = convertExcelTime(row.prem_point);
        const checkOut = convertExcelTime(row.dern_point);
        const workedHours = calculateWorkedHours(checkIn, checkOut);

        let anomaly = null;
        if (!checkIn && !checkOut) {
          anomaly = 'Absence';
        } else if (checkIn && isLate(checkIn)) {
          anomaly = 'Late Arrival';
        } else if (workedHours !== null && workedHours < 7) {
          anomaly = 'Short Shift';
        }

        results.push({
          emp_id: row.matricule,
          name: row.nom_prenom,
          date: formattedDate,
          workplace: 'Faurecia',
          check_in_actual: checkIn,
          check_out_actual: checkOut,
          worked_hours: workedHours,
          anomaly: anomaly
        });
      });
      
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

// Convert Excel time to readable format
const convertExcelTime = (excelSerial) => {
  if (excelSerial === null || excelSerial === undefined) return null;
  
  try {
    if (excelSerial < 1) {
      const totalSeconds = excelSerial * 86400;
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      const excelEpoch = new Date(1899, 11, 31);
      const excelBug = excelSerial >= 61 ? 1 : 0;
      const utcDate = new Date(excelEpoch.getTime() + (excelSerial - excelBug) * 86400 * 1000);
      
      const hours = utcDate.getUTCHours();
      const minutes = utcDate.getUTCMinutes();
      const seconds = utcDate.getUTCSeconds();
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  } catch (e) {
    return null;
  }
};

// Calculate worked hours
const calculateWorkedHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;

  try {
    const [inH, inM, inS] = checkIn.split(':').map(Number);
    const [outH, outM, outS] = checkOut.split(':').map(Number);

    const checkInSeconds = inH * 3600 + inM * 60 + (inS || 0);
    const checkOutSeconds = outH * 3600 + outM * 60 + (outS || 0);
    const workedSeconds = checkOutSeconds - checkInSeconds;

    if (workedSeconds <= 0) return null;
    return parseFloat((workedSeconds / 3600).toFixed(2));
  } catch (e) {
    return null;
  }
};

// Check if employee is late
const isLate = (checkIn) => {
  try {
    const [h, m] = checkIn.split(':').map(Number);
    return h > 9 || (h === 9 && m > 30);
  } catch {
    return false;
  }
};

// Email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Add a flag to track if emails are being sent
let emailProcessing = false;

// Updated sendAlertEmails function - ONE email per employee with ALL alerts
async function sendAlertEmails() {
  try {
    console.log(`📧 Looking for employees with alerts...`);
    
    const query = `
      SELECT 
        a.emp_num_aux,
        COUNT(*) as total_alert_count,
        GROUP_CONCAT(
          CONCAT(DATE(a.detected_on), ': ', a.anomaly) 
          ORDER BY a.detected_on DESC 
          SEPARATOR ' | '
        ) as all_alerts_with_dates,
        ua.emp_mail
      FROM alerts a
      LEFT JOIN users_aux ua ON a.emp_num_aux = ua.emp_num_aux
      WHERE ua.emp_mail IS NOT NULL
        AND ua.aux_status = 1
      GROUP BY a.emp_num_aux, ua.emp_mail
    `;

    const [employees] = await db.query(query);
    console.log(`📧 Found ${employees.length} employees with alerts`);
    
    if (employees.length === 0) {
      console.log('📧 No employees with valid emails found');
      return;
    }

    // Show alert counts for each employee
    console.log('📊 Alert summary by employee:');
    employees.forEach(emp => {
      console.log(`   - Employee ${emp.emp_num_aux}: ${emp.total_alert_count} alerts`);
    });

    const transporter = createEmailTransporter();
    let sentEmails = 0;

    for (const employee of employees) {
      try {
        await sendSimpleAlertEmail(transporter, employee);
        console.log(`✅ Email sent to ${employee.emp_mail} (${employee.total_alert_count} alerts)`);
        sentEmails++;
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${employee.emp_mail}:`, emailError.message);
      }
    }
    
    console.log(`📧 Final result: ${sentEmails} emails sent successfully`);
    
  } catch (error) {
    console.error('❌ Error in sendAlertEmails:', error);
  }
}

// Simple email function
async function sendSimpleAlertEmail(transporter, employee) {
  const { emp_num_aux, total_alert_count, all_alerts_with_dates, emp_mail } = employee;

  const alertsList = all_alerts_with_dates.split(' | ').map(alert => {
    const [date, type] = alert.split(': ');
    return `${new Date(date).toLocaleDateString()}: ${type}`;
  }).join('\n');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emp_mail,
    subject: `Attendance Alert - ${total_alert_count} Issue${total_alert_count > 1 ? 's' : ''} Need Verification`,
    html: `
      <h2>Attendance Alert</h2>
      <p><strong>Employee ID:</strong> ${emp_num_aux}</p>
      <p><strong>Total Alerts:</strong> ${total_alert_count}</p>
      
      <h3>Alert Details:</h3>
      <pre>${alertsList}</pre>
      
      <p><strong>Action Required:</strong> Please verify these attendance records and contact HR within 48 hours.</p>
      <p>Contact: hr@company.com</p>
    `,
    text: `
Attendance Alert

Employee ID: ${emp_num_aux}
Total Alerts: ${total_alert_count}

Alert Details:
${alertsList}

Action Required: Please verify these attendance records and contact HR within 48 hours.
Contact: hr@company.com
    `
  };

  await transporter.sendMail(mailOptions);
}

// Run Python anomaly detection
async function runPythonAnomalyDetection() {
  const pythonPath = 'C:\\Users\\aminh\\env\\Scripts\\python.exe';
  const scriptPath = 'C:\\Users\\aminh\\attendance-ai\\detect_anomalies.py';
  const cmd = `"${pythonPath}" "${scriptPath}"`;

  try {
    console.log('🐍 Starting Python script execution...');
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stdout) console.log('🐍 Python stdout:', stdout);
    if (stderr) console.log('⚠️ Python stderr:', stderr);
    
    console.log('✅ Python script completed successfully');
    
  } catch (err) {
    console.error('❌ Python Script Failed:', err.message);
    throw err;
  }
}

// Save to database
export async function saveToDatabase(results) {
  try {
    if (results.length === 0) return;

    const query = `
      INSERT IGNORE INTO attendance_logs2 (
        emp_id, name, date, workplace,
        check_in_actual, check_out_actual,
        worked_hours, anomaly
      ) VALUES ?`;
    
    const values = results.map(r => [
      r.emp_id, r.name, r.date, r.workplace,
      r.check_in_actual, r.check_out_actual,
      r.worked_hours, r.anomaly
    ]);

    await db.query(query, [values]);
    console.log(`✅ Successfully inserted ${results.length} records into attendance_logs2`);
    
    const recordsWithAnomalies = results.filter(r => r.anomaly !== null);
    console.log(`📊 Records with anomalies: ${recordsWithAnomalies.length}`);
    
    console.log('🐍 Running Python anomaly detection...');
    await runPythonAnomalyDetection();
    
  } catch (error) {
    console.error('❌ Database insertion error:', error);
    throw error;
  }
}

// API Routes
router.post('/send-alert-emails', async (req, res) => {
  try {
    await sendAlertEmails();
    res.json({ message: 'Alert emails sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

router.get('/test-email', async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.status(500).json({ error: 'Missing email credentials' });
    }
    
    const transporter = createEmailTransporter();
    await transporter.verify();
    
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'HR Platform Email Test',
      html: '<h2>✅ Email Test Successful!</h2>'
    };

    await transporter.sendMail(testEmail);
    res.json({ message: 'Test email sent successfully' });
    
  } catch (error) {
    res.status(500).json({ error: 'Email test failed', details: error.message });
  }
});

// Add this debug route to check alerts data
router.get('/debug-alerts', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check all alerts for today
    const [allAlerts] = await db.query(
      'SELECT * FROM alerts WHERE DATE(detected_on) = ? ORDER BY id DESC LIMIT 10', 
      [today]
    );
    
    // Check employees with emails
    const [employeesWithEmails] = await db.query(`
      SELECT 
        a.emp_num_aux,
        a.anomaly,
        a.detected_on,
        ua.emp_mail,
        ua.aux_status
      FROM alerts a
      LEFT JOIN users_aux ua ON a.emp_num_aux = ua.emp_num_aux
      WHERE DATE(a.detected_on) = ?
      ORDER BY a.id DESC LIMIT 10
    `, [today]);

    // Check the exact query from sendAlertEmails
    const [emailQuery] = await db.query(`
      SELECT 
        a.emp_num_aux,
        COUNT(*) as alert_count,
        GROUP_CONCAT(DISTINCT a.anomaly SEPARATOR ', ') as alert_types,
        ua.emp_mail
      FROM alerts a
      LEFT JOIN users_aux ua ON a.emp_num_aux = ua.emp_num_aux
      WHERE DATE(a.detected_on) = ? 
        AND ua.emp_mail IS NOT NULL
        AND ua.aux_status = 1
      GROUP BY a.emp_num_aux, ua.emp_mail
    `, [today]);

    res.json({
      today,
      totalAlerts: allAlerts.length,
      allAlerts,
      employeesWithEmails,
      emailQueryResults: emailQuery
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;