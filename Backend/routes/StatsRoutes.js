import express from 'express';
import connectDB from '../db.js';
const router = express.Router();
const db = await connectDB();
router.get('/statistics', async (req, res) => {
  try {
    const [
      [complianceRateResult],
      [discrepancyRateResult],
      [resolutionRateResult],
      [unjustifiedPresenceResult],
      [lostHoursResult],
      topEmployees,
      lateTrend
    ] = await Promise.all([
      // 1. Attendance Compliance Rate
      db.query(`
        SELECT ROUND(
          SUM(CASE WHEN anomaly IS NULL THEN 1 ELSE 0 END) / COUNT(*) * 100, 2
        ) AS compliance_rate
        FROM attendance_logs2
      `),

      // 2. Discrepancy Rate
      db.query(`
        SELECT ROUND(COUNT(*) / (SELECT COUNT(*) FROM work_schedule) * 100, 2) AS discrepancy_rate
        FROM alerts
        WHERE resolved = 0
      `),

      // 3. Alert Resolution Rate
      db.query(`
        SELECT ROUND(SUM(resolved = 1) / COUNT(*) * 100, 2) AS resolution_rate
        FROM alerts
      `),

      // 4. Unjustified On-site Presence (marked as Sick/Remote/Leave but showed up)
      db.query(`
        SELECT COUNT(*) AS unjustified_presence
        FROM alerts
        WHERE expected_status IN ('S','T','L') AND actual_status = 'on_site'
      `),

      // 5. Work Hours Lost to Absenteeism
      db.query(`
        SELECT ROUND(SUM(
          CASE 
            WHEN check_in_actual IS NULL AND check_out_actual IS NULL THEN 8 
            ELSE 0 
          END
        ), 2) AS lost_hours
        FROM attendance_logs2
      `),

      // 6. Top 5 Employees with Most Alerts
      db.query(`
        SELECT emp_num_aux, COUNT(*) AS alert_count
        FROM alerts
        GROUP BY emp_num_aux
        ORDER BY alert_count DESC
        LIMIT 5
      `),

      // 7. Late Arrival Trend (Last 30 Days)
      db.query(`
        SELECT detected_on AS date, COUNT(*) AS late_count
        FROM alerts
        WHERE actual_status = 'late'
          AND detected_on >= CURDATE() - INTERVAL 30 DAY
        GROUP BY detected_on
        ORDER BY detected_on
      `)
    ]);

    res.json({
      complianceRate: complianceRateResult.compliance_rate,
      discrepancyRate: discrepancyRateResult.discrepancy_rate,
      resolutionRate: resolutionRateResult.resolution_rate,
      unjustifiedPresence: unjustifiedPresenceResult.unjustified_presence,
      absenteeLostHours: lostHoursResult.lost_hours,
      topAlertedEmployees: topEmployees,
      lateTrend: lateTrend
    });
  } catch (error) {
    console.error('Error fetching professional statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
