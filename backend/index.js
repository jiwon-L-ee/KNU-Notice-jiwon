import { initDb } from './db.js'; 
import express from 'express';
import dotenv from 'dotenv';
import logger from './middleware/logger.js'; 
import { rateLimiter } from './middleware/rateLimiter.js';
import authRouter from './routes/auth.js';
import noticeRouter from './routes/notices.js';
import recoRouter from './routes/recommendations.js';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 설정 개선: 특정 origin만 허용 (개발/프로덕션 환경 분리)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000']; // 기본값: 개발 환경

app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (같은 origin에서의 요청, Postman 등) 허용
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy에 의해 차단되었습니다.'));
    }
  },
  credentials: true, // 쿠키/인증 정보 포함 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // 요청 크기 제한
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(logger);
app.use(rateLimiter); // 전역 rate limiting 적용 

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