import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import userRoutes from './routes/UserRoutes.js';
import workScheduleRoutes from './routes/WorksSchRoutes.js';
import logsRoutes from './routes/logsRoutes.js';
config(); 
const app = express();

app.use(cors());
app.use(express.json());  

app.use('/user', userRoutes);
app.use('/workplan',workScheduleRoutes);
app.use('/logsplan',logsRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});

