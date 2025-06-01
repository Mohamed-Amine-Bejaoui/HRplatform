import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '../db.js';

const router = express.Router();
const db = await connectDB();

router.get("/alerts", async (req, res) => {
  try {
    const { anomaly, resolved, month, year, emp_num_aux } = req.query; // Changed from 'employee' to 'emp_num_aux'
    let query = 'SELECT * FROM alerts';
    const params = [];
    const conditions = [];

    if (anomaly) {
      conditions.push('anomaly LIKE ?');
      params.push(`${anomaly}%`);
    }

    if (resolved !== undefined) {
      conditions.push('resolved = ?');
      params.push(resolved === 'true' ? 1 : 0);
    }

    // Fixed employee filter logic
    if (emp_num_aux && emp_num_aux.trim() !== '') {
      conditions.push('emp_num_aux = ?'); // Changed from LIKE to exact match
      params.push(emp_num_aux.trim()); // Trim whitespace and use exact value
    }

    // Always calculate filterYear safely
    let filterYear;
    if (year && year !== "all") {
      filterYear = parseInt(year);
    } else {
      filterYear = new Date().getFullYear(); // default to current year
    }

    if (month && month !== "all") {
      const monthInt = parseInt(month);
      const lastDay = new Date(filterYear, monthInt, 0).getDate();
      const startDate = `${filterYear}-${String(monthInt).padStart(2, '0')}-01`;
      const endDate = `${filterYear}-${String(monthInt).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      conditions.push('DATE(detected_on) BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (year && year !== "all") {
      const startOfYear = `${filterYear}-01-01`;
      const endOfYear = `${filterYear}-12-31`;
      conditions.push('DATE(detected_on) BETWEEN ? AND ?');
      params.push(startOfYear, endOfYear);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY detected_on DESC';

    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.patch("/alerts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { resolved } = req.body;
        
        const query = 'UPDATE alerts SET resolved = ? WHERE id = ?';
        await db.query(query, [resolved, id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'DB error' });
    }
});

// New route to get all employees with inactive status


export default router;