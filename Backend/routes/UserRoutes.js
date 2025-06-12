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
      res.status(500).json({ error: error.message });
    }
  })
  router.delete('/delemp/:num', async (req, res) => {
  try {
    
    // First check if employee exists
    const checkQuery = 'SELECT emp_mail FROM users_aux WHERE emp_num_aux = ?';
    const [checkRows] = await db.query(checkQuery, [req.params.num]);

    if (checkRows.length === 0) {
      console.log('Employee not found:', req.params.num);
      return res.status(404).json({ error: 'Employee not found' });
    }

    const email = checkRows[0].emp_mail;

    // Delete from login table first
    if (email) {
      const deleteLoginQuery = 'DELETE FROM login WHERE emp_mail = ?';
      const [loginResult] = await db.query(deleteLoginQuery, [email]);
    }

    // Delete from users_aux table
    const deleteUserQuery = 'DELETE FROM users_aux WHERE emp_num_aux = ?';
    const [deleteResult] = await db.query(deleteUserQuery, [req.params.num]);
    

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found or already deleted' });
    }

    res.status(200).json({ 
      message: 'Employee deleted successfully',
      deletedEmployee: req.params.num,
      affectedRows: deleteResult.affectedRows
    });

  } catch (error) {
    console.error('Database error in delete route:', error);
    res.status(500).json({ 
      error: 'Database error',
      details: error.message 
    });
  }
});
  router.post('/addemp', async (req, res) => {
  try {
    const { emp_num_aux, emp_mail, password, emp_type_aux, emp_join_aux, contract_finish, aux_status, isAdmin } = req.body;
    
    // Validate required fields
    if (!emp_num_aux || !emp_mail || !password) {
      return res.status(400).json({ error: 'Employee ID, email, and password are required' });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert into users_aux table first
    const query = `
      INSERT INTO users_aux (emp_num_aux, emp_mail, emp_type_aux, emp_join_aux, contract_finish, aux_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [emp_num_aux, emp_mail, emp_type_aux, emp_join_aux, contract_finish, aux_status];
    
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      throw new Error("Employee insertion failed");
    }
    
    const insertedId = result.insertId;

    // Insert into login table
    const query2 = `
      INSERT INTO login (emp_mail, password_hash, role, emp_num_aux) 
      VALUES (?, ?, ?, ?)
    `;
    const role = isAdmin === true ? "admin" : "employee";
    const values2 = [emp_mail, hashedPassword, role, emp_num_aux]; 
    
    const [result2] = await db.query(query2, values2);

    if (result2.affectedRows === 0) {
      // Rollback: delete from users_aux if login creation failed
      await db.query('DELETE FROM users_aux WHERE id = ?', [insertedId]);
      throw new Error("Login account creation failed");
    }

    res.status(200).json({ 
      message: "Employee added successfully", 
      id: insertedId,
      emp_num_aux: emp_num_aux
    });
    
  } catch (error) {
    console.error("Database Error:", error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ 
        error: "Employee ID or email already exists",
        message: "Please use a different employee ID or email address"
      });
    } else {
      res.status(500).json({ 
        error: "Failed to add employee",
        message: error.message 
      });
    }
  }
});
  router.patch('/patemp/:num', async (req, res) => {
  try {
    const { num } = req.params; // Original employee ID
    const { password, emp_num_aux, emp_mail, ...otherUpdates } = req.body;
    
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }


    // Start transaction-like updates
    let updateCount = 0;

    // 1. Handle password update in login table
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const [passwordResult] = await db.query(
        'UPDATE login SET password_hash = ? WHERE emp_num_aux = ?',
        [hashedPassword, num]
      );
      
      updateCount += passwordResult.affectedRows;
    }

    // 2. Handle employee ID change - update both tables
    if (emp_num_aux && emp_num_aux !== num) {
      // Check if new ID already exists
      const [existingCheck] = await db.query(
        'SELECT emp_num_aux FROM users_aux WHERE emp_num_aux = ?',
        [emp_num_aux]
      );
      
      if (existingCheck.length > 0) {
        return res.status(400).json({ 
          error: 'Employee ID already exists',
          message: 'Please use a different employee ID'
        });
      }
      
      // Update users_aux table
      const [userIdResult] = await db.query(
        'UPDATE users_aux SET emp_num_aux = ? WHERE emp_num_aux = ?',
        [emp_num_aux, num]
      );
      
      // Update login table
      const [loginIdResult] = await db.query(
        'UPDATE login SET emp_num_aux = ? WHERE emp_num_aux = ?',
        [emp_num_aux, num]
      );
      
      updateCount += userIdResult.affectedRows;
    }

    // 3. Handle email change - update both tables
    if (emp_mail && emp_mail.trim() !== '') {
      // Check if new email already exists
      const [emailCheck] = await db.query(
        'SELECT emp_mail FROM users_aux WHERE emp_mail = ? AND emp_num_aux != ?',
        [emp_mail, emp_num_aux || num]
      );
      
      if (emailCheck.length > 0) {
        return res.status(400).json({ 
          error: 'Email already exists',
          message: 'Please use a different email address'
        });
      }
      
      // Update users_aux table
      const [userEmailResult] = await db.query(
        'UPDATE users_aux SET emp_mail = ? WHERE emp_num_aux = ?',
        [emp_mail, emp_num_aux || num]
      );
      
      // Update login table
      const [loginEmailResult] = await db.query(
        'UPDATE login SET emp_mail = ? WHERE emp_num_aux = ?',
        [emp_mail, emp_num_aux || num]
      );
      
      updateCount += userEmailResult.affectedRows;
    }

    // 4. Update other fields in users_aux table
    if (Object.keys(otherUpdates).length > 0) {
      const setClause = Object.keys(otherUpdates)
        .map((field) => `${field} = ?`)
        .join(', ');

      const values = [...Object.values(otherUpdates), emp_num_aux || num];
      const query = `UPDATE users_aux SET ${setClause} WHERE emp_num_aux = ?`;
      
      
      const [otherResult] = await db.query(query, values);
      updateCount += otherResult.affectedRows;
    }

    if (updateCount === 0) {
      return res.status(404).json({ error: 'Employee not found or no changes made' });
    }

    res.status(200).json({ 
      message: 'Employee updated successfully',
      updatedFields: Object.keys(req.body).length,
      newEmployeeId: emp_num_aux || num
    });

  } catch (error) {
    console.error('Update error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ 
        error: "Employee ID or email already exists",
        message: "Please use a different employee ID or email address"
      });
    } else {
      res.status(500).json({ 
        error: "Failed to update employee",
        message: error.message 
      });
    }
  }
});
  router.get("/inactive-employees", async (req, res) => {
  try {
    const query = `
      SELECT 
        ua.id,
        ua.emp_num_aux,
        ua.emp_mail,
        ua.emp_type_aux,
        ua.emp_join_aux,
        ua.contract_finish,
        ua.aux_status,
        ua.emp_vdays_aux,
        l.role
      FROM users_aux ua
      LEFT JOIN login l ON ua.emp_num_aux = l.emp_num_aux
      WHERE ua.aux_status = 0
      ORDER BY ua.id DESC
    `;
    
    const [results] = await db.query(query);
    
    res.json({
      count: results.length,
      employees: results
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch inactive employees' });
  }
});
  
export default router;