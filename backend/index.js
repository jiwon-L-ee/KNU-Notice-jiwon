import { initDb } from './db.js'; 
import express from 'express';
import dotenv from 'dotenv';
import logger from './middleware/logger.js'; 
import authRouter from './routes/auth.js';
import noticeRouter from './routes/notices.js';
import recoRouter from './routes/recommendations.js';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));

app.use(express.json()); 
app.use(logger); 

app.use('/auth', authRouter);           
app.use('/notices', noticeRouter);       
app.use('/recommendations', recoRouter); 

app.use((err, req, res, next) => {
  console.error(' [SERVER ERROR] ', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const startServer = async () => {
  try {
    await initDb(); 
    
    app.listen(PORT, () => {
      console.log(`
      =========================================
      KNU Notice AI Server is running!
      Port: ${PORT}
      Date: ${new Date().toLocaleDateString()}
      =========================================
      `);
    });
  } catch (err) {
    console.error('Failed to start server due to DB error:', err);
    process.exit(1);
  }
};

startServer();