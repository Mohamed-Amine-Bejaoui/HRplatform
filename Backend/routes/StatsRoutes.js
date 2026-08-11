import express from 'express';
import connectDB from '../db.js';

const router = express.Router();

let db;

connectDB().then((connection) => {
  db = connection;
router.get('/statistics', async (req, res) => {
  try {
    const [
      [complianceRows],  
      [discrepancyRows],
      [resolutionRows],
      [unjustifiedRows],
      [lostHoursRows],
      [topEmployeesRows],
      [lateTrendRows],
      [lateArrivalRows],
      [shortShiftRows],
      [inapprovedAbsenceRows]
    ] = await Promise.all([
      db.query(`
        SELECT ROUND(
          SUM(CASE WHEN anomaly IS NULL THEN 1 ELSE 0 END) / COUNT(*) * 100, 2
        ) AS compliance_rate
        FROM attendance_logs2
      `),
      db.query(`
        SELECT ROUND(COUNT(*) / (SELECT COUNT(*) FROM work_schedule) * 100, 2) AS discrepancy_rate
        FROM alerts
        WHERE resolved = 0
      `),
      db.query(`
        SELECT ROUND(SUM(resolved = 1) / COUNT(*) * 100, 2) AS resolution_rate
        FROM alerts
      `),
      db.query(`
        SELECT COUNT(*) AS unjustified_presence
        FROM alerts
        WHERE expected_status IN ('S','T','L') AND actual_status = 'on_site'
      `),
      db.query(`
        SELECT ROUND(SUM(
          CASE 
            WHEN check_in_actual IS NULL AND check_out_actual IS NULL THEN 8 
            ELSE 0 
          END
        ), 2) AS lost_hours
        FROM attendance_logs2
      `),
      db.query(`
        SELECT emp_num_aux, COUNT(*) AS alert_count
        FROM alerts
        WHERE anomaly NOT LIKE 'Approved absence%'
        GROUP BY emp_num_aux
        ORDER BY alert_count DESC
        LIMIT 4;
      `),
      db.query(`
        SELECT detected_on AS date, COUNT(*) AS late_count
        FROM alerts
        WHERE actual_status = 'late'
          AND detected_on >= CURDATE() - INTERVAL 30 DAY
        GROUP BY detected_on
        ORDER BY detected_on
      `),
      // Most alerted employees for late arrivals
      db.query(`
        SELECT emp_num_aux, COUNT(*) AS late_count
        FROM alerts
        WHERE anomaly = 'Late arrival' OR actual_status = 'late'
        GROUP BY emp_num_aux
        ORDER BY late_count DESC
        LIMIT 4;
      `),
      // Most alerted employees for short shifts
      db.query(`
        SELECT emp_num_aux, COUNT(*) AS short_shift_count
        FROM alerts
        WHERE anomaly LIKE '%Short shift%' OR anomaly LIKE '%early departure%'
        GROUP BY emp_num_aux
        ORDER BY short_shift_count DESC
        LIMIT 4;
      `),
      // Most alerted employees for unapproved absences
      db.query(`
        SELECT emp_num_aux, COUNT(*) AS absence_count
        FROM alerts
        WHERE anomaly = 'Inapproved absence' OR (anomaly LIKE '%absence%' AND anomaly NOT LIKE 'Approved absence%')
        GROUP BY emp_num_aux
        ORDER BY absence_count DESC
        LIMIT 4;
      `)
    ]);

    const topEmployees = topEmployeesRows.map(row => ({
      emp_num_aux: row.emp_num_aux,
      alert_count: row.alert_count
    }));

    const lateTrend = lateTrendRows.map(row => ({
      date: row.date,
      late_count: row.late_count
    }));

    const mostLateEmployees = lateArrivalRows.map(row => ({
      emp_num_aux: row.emp_num_aux,
      late_count: row.late_count
    }));

    const mostShortShiftEmployees = shortShiftRows.map(row => ({
      emp_num_aux: row.emp_num_aux,
      short_shift_count: row.short_shift_count
    }));

    const mostAbsentEmployees = inapprovedAbsenceRows.map(row => ({
      emp_num_aux: row.emp_num_aux,
      absence_count: row.absence_count
    }));

    res.json({
      complianceRate: complianceRows[0]?.compliance_rate || 0,
      discrepancyRate: discrepancyRows[0]?.discrepancy_rate || 0,
      resolutionRate: resolutionRows[0]?.resolution_rate || 0,
      unjustifiedPresence: unjustifiedRows[0]?.unjustified_presence || 0,
      absenteeLostHours: lostHoursRows[0]?.lost_hours || 0,
      topAlertedEmployees: topEmployees,
      lateTrend: lateTrend,
      mostLateEmployees: mostLateEmployees,
      mostShortShiftEmployees: mostShortShiftEmployees,
      mostAbsentEmployees: mostAbsentEmployees
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
});

export default router;
