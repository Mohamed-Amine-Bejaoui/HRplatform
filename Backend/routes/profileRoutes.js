import express from 'express';
import connectDB from '../db.js';

const router = express.Router();
const db = await connectDB();

router.get("/profile", async (req, res) => {
  try {
    const { numaux } = req.query;

    if (!numaux) {
      return res.status(400).json({ error: "Missing employee number (numaux) in query." });
    }

    // Get the name from the latest attendance_logs2 entry
    const [attendanceRows] = await db.execute(
      `SELECT name FROM attendance_logs2 WHERE emp_id = ? ORDER BY date DESC LIMIT 1`,
      [numaux]
    );

    // Get the rest of the profile data from users_aux
    const [profileRows] = await db.execute(
      `SELECT * FROM users_aux WHERE emp_num_aux = ?`,
      [numaux]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: "Employee not found in users_aux." });
    }

    const profileData = {
      name: attendanceRows[0]?.name || "Unknown",
      ...profileRows[0]
    };

    return res.json(profileData);
  } catch (error) {
    console.error("Error in /profile route:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
