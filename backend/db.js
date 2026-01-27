import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});

console.log(`[DB] 연결 시도 중: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 사용자 테이블 (id를 SERIAL로 설정하여 자동 생성)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,              
        password TEXT NOT NULL,
        student_id VARCHAR(20) UNIQUE NOT NULL, 
        grade VARCHAR(10),
        department TEXT,
        name VARCHAR(50),
        experience_summary TEXT,            
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. 공지사항 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS knu_notices (
        id SERIAL PRIMARY KEY,
        source VARCHAR(100) NOT NULL,
        title TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        link TEXT NOT NULL,
        target_dept VARCHAR(100),
        post_date DATE NOT NULL,
        crawled_at TIMESTAMP DEFAULT NOW(),
        start_date DATE,          
        end_date DATE,            
        processed_by_ai BOOLEAN DEFAULT FALSE 
      );
    `);

    // 3. 추천 점수 테이블 (참조 타입 일치: INT로 수정)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        notice_id INT REFERENCES knu_notices(id) ON DELETE CASCADE,
        ai_score INT DEFAULT 0,
        ai_reason TEXT,
        calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, notice_id)
      );
    `);

    await client.query('COMMIT');
    console.log('[DB] 모든 테이블이 동기화되어 성공적으로 준비되었습니다.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] 초기화 실패:', err.message);
    throw err;
  } finally {
    client.release();
  }
};