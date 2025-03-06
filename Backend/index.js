import express from 'express';
import cors from 'cors';
import connectDB from './db.js'; // Ensure db.js exports the correct function

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  try {
    const db = await connectDB(); // Get the connection
    const [rows] = await db.execute('SELECT * FROM users'); // Query
    res.json(rows);
    console.log(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5000 🚀'));
