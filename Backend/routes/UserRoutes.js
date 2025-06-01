import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '../db.js';
import { configDotenv } from 'dotenv';
const router = express.Router();
configDotenv()
const db = await connectDB();
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
  
      const query = 'SELECT * FROM login WHERE emp_mail = ?';
      const [rows] = await db.query(query, [email]);
  
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
  
      const user = rows[0]; 
  
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
  
      // Check user status from users_aux table
      const statusQuery = 'SELECT aux_status FROM users_aux WHERE emp_mail = ?';
      const [statusRows] = await db.query(statusQuery, [email]);
  
      if (statusRows.length === 0) {
        return res.status(400).json({ error: 'User profile not found' });
      }
  
      const userStatus = statusRows[0].aux_status;
  
      // Check if account is approved (status = 1)
      if (userStatus !== 1 && userStatus !== '1') {
        return res.status(403).json({ 
          error: 'Account pending approval', 
          message: 'Your account is waiting for admin approval. Please contact your administrator.' 
        });
      }
  
      const queryAdm = 'SELECT role FROM login WHERE emp_mail = ?';
      const [rowsAdm] = await db.query(queryAdm, [email]);
  
      const role = rowsAdm[0].role;
  
      const token = jwt.sign(
        { userId: user.id, email: user.emp_mail, role, emp_num_aux: user.emp_num_aux },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to login. Please try again later.' });
    }
  });
  router.get('/getemp',async(req,res)=>{
    try{
      const query='SELECT * FROM users_aux';
      const [rows]=await db.query(query);
      res.json(rows);
    }
    catch (error)
    {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  })
  router.get('/getemp/:num',async(req,res)=>{
    try{
      const query='SELECT * from users_aux where emp_num_aux=?'
      const [rows]=await db.query(query,[req.params.num])
      res.json(rows[0])
    }
    catch (error)
    {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  })
  router.delete('/delemp/:num', async (req, res) => {
  try {
    console.log('Delete request for employee:', req.params.num); // Debug log
    
    // First check if employee exists
    const checkQuery = 'SELECT emp_mail FROM users_aux WHERE emp_num_aux = ?';
    const [checkRows] = await db.query(checkQuery, [req.params.num]);

    if (checkRows.length === 0) {
      console.log('Employee not found:', req.params.num);
      return res.status(404).json({ error: 'Employee not found' });
    }

    const email = checkRows[0].emp_mail;
    console.log('Found employee email:', email);

    // Delete from login table first (if email exists)
    if (email) {
      const deleteLoginQuery = 'DELETE FROM login WHERE emp_mail = ?';
      await db.query(deleteLoginQuery, [email]);
      console.log('Deleted from login table');
    }

    // Delete from users_aux table
    const deleteUserQuery = 'DELETE FROM users_aux WHERE emp_num_aux = ?';
    const [deleteResult] = await db.query(deleteUserQuery, [req.params.num]);
    
    console.log('Delete result:', deleteResult);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found or already deleted' });
    }

    res.status(200).json({ 
      message: 'Employee deleted successfully',
      deletedEmployee: req.params.num 
    });

  } catch (error) {
    console.error('Database error in delete route:', error);
    res.status(500).json({ 
      error: 'Database error',
      details: error.message 
    });
  }
});
  router.patch('/patemp/:num', async (req, res) => {
    try {
      const { num } = req.params;
      const updates = req.body;
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No update fields provided' });
      }
  
  
      const setClause = Object.keys(updates)
        .map((field) => `${field} = ?`)
        .join(', ');
  
      const values = [...Object.values(updates), num];
  
      const query = `UPDATE users_aux SET ${setClause} WHERE emp_num_aux = ?`;
      await db.query(query, values);
  
      res.status(200).json({ message: 'Employee updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
  router.post('/addemp', async (req, res) => {
    try {
      const { emp_num_aux, emp_mail, emp_type_aux, emp_join_aux, contract_finish, aux_status, isAdmin } = req.body;
      console.log(aux_status)
      const query = `
        INSERT INTO users_aux (emp_num_aux, emp_mail, emp_type_aux, emp_join_aux, contract_finish, aux_status)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const values = [emp_num_aux, emp_mail, emp_type_aux, emp_join_aux, contract_finish, aux_status];
      
      const [result] = await db.query(query, values);  // MySQL returns an array of results, so you access result[0]
  
      if (result.affectedRows === 0) {
        throw new Error("Employee insertion failed");
      }
      
      const insertedId = result.insertId;  // Get the ID of the last inserted row
  
      const query2 = `
        INSERT INTO login (emp_mail, password_hash, role,emp_num_aux) 
        VALUES (?, ?, ?,?)
      `;
      const role = isAdmin === true ? "admin" : "employee";
      const values2 = [emp_mail, process.env.PASSWORD_HASH, role, emp_num_aux];
      const [result2] = await db.query(query2, values2);
  
      res.status(200).json({ message: "Employee added successfully", id: insertedId });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ message: "Email or ID is not unique", error: error.message });
    }
  });
  router.get("/inactive-employees", async (req, res) => {
    try {
        const query = `
            SELECT * 
            FROM users_aux ua
            LEFT JOIN login l ON ua.emp_num_aux = l.emp_num_aux
            WHERE ua.aux_status = 0
            
        `;
        
        const [results] = await db.query(query);
        
        const inactiveEmployees = results.map(employee => ({
            id: employee.id,
            emp_num_aux: employee.emp_num_aux,
            emp_mail: employee.emp_mail,
            emp_type_aux: employee.emp_type_aux,
            emp_join_aux: employee.emp_join_aux,
            contract_finish: employee.contract_finish,
            aux_status: employee.aux_status,
            emp_vdays_aux: employee.emp_vdays_aux,
            role: employee.role,
        }));
        
        res.json({
            count: inactiveEmployees.length,
            employees: inactiveEmployees
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to fetch inactive employees' });
    }
});
  
export default router;