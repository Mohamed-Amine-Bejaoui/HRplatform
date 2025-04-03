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
  
      const db = await connectDB();
      const query = 'SELECT * FROM login WHERE emp_mail = ?';
      const [rows] = await db.query(query, [email]);
  
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Invalid email' });
      }
  
      const user = rows[0]; 
  
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
  
      const queryAdm = 'SELECT role FROM login WHERE emp_mail = ?';
      const [rowsAdm] = await db.query(queryAdm, [email]);
  
      const role = rowsAdm[0].role
  
      const token = jwt.sign(
        { userId: user.id, email: user.emp_mail, role },
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
      res.status(500).json({ error:error.message});
    }
  })
  router.get('/getemp/:num',async(req,res)=>{
    try{
      const db=await connectDB();
      const query='SELECT * from users_aux where emp_num_aux=?'
      const [rows]=await db.query(query,[req.params.num])
      res.json(rows[0])
    }
    catch (error)
    {
      console.log(error);
      res.status(500).json({error:error.message});
    }
  })
  router.delete('/delemp/:num', async (req, res) => {
    try {
      
      const getEmailQuery = 'SELECT emp_mail FROM users_aux WHERE emp_num_aux = ?';
      const [rows] = await db.query(getEmailQuery, [req.params.num]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
  
      const email = rows[0].emp_mail; 
  
      const deleteLoginTypeQuery = 'DELETE FROM login WHERE emp_mail = ?';
      await db.query(deleteLoginTypeQuery, [email]);
  
      const deleteLoginQuery = 'DELETE FROM login WHERE emp_mail = ?';
      await db.query(deleteLoginQuery, [email]);
  
      const deleteUserQuery = 'DELETE FROM users_aux WHERE emp_num_aux = ?';
      await db.query(deleteUserQuery, [req.params.num]);
  
      res.status(200).json({ message: 'Employee deleted successfully' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
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
  });router.post('/addemp', async (req, res) => {
    try {
      const { emp_num_aux, emp_mail, emp_type_aux, emp_join_aux, contract_finish, aux_status, isAdmin } = req.body;
      
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
        INSERT INTO login (emp_mail, password_hash, role) 
        VALUES (?, ?, ?)
      `;
      const role = isAdmin === true ? "admin" : "employee";
      const values2 = [emp_mail, process.env.PASSWORD_HASH, role];
      const [result2] = await db.query(query2, values2);
  
      res.status(200).json({ message: "Employee added successfully", id: insertedId });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ message: "Error adding employee", error: error.message });
    }
  });
  
export default router; 