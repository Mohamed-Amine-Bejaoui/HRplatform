import mysql from 'mysql2/promise'; // Use promise-based MySQL client
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const connectDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    console.log('Connected to MySQL database ✅');
    return connection;
  } catch (err) {
    console.error('Database connection failed: ', err);
    throw err;
  }
};

export default connectDB;
