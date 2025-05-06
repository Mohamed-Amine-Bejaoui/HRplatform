import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '../db.js';
const router = express.Router();
const db = await connectDB();
router.get("/alerts", async (req, res) => {
    try {
        const { anomaly, resolved,month } = req.query;
        let query = 'SELECT * FROM alerts';
        const params = [];
        
        const conditions = [];
        
        if (anomaly) {
            conditions.push('anomaly LIKE ?');
            params.push(`%${anomaly}%`);

        }
        
        if (resolved !== undefined) {
            conditions.push('resolved = ?');
            params.push(resolved === 'true' ? 1 : 0);
        }
        if (month && month !== "all") {
            const currentYear = new Date().getFullYear();
            const startDate = `${currentYear}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${currentYear}-${String(month).padStart(2, '0')}-31`;
            conditions.push('DATE(detected_on) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY detected_on DESC'; // Newest first
        
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
export default router; 