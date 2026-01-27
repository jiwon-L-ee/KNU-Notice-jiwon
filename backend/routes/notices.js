import express from 'express';
import { pool } from '../db.js';

const router = express.Router();


// [POST] /notices/bulk
router.post('/bulk', async (req, res) => {
  const { notices } = req.body; // 공지사항 배열 [{title, content, link, source, post_date, target_dept}, ...]

  if (!Array.isArray(notices) || notices.length === 0) {
    return res.status(400).json({ success: false, message: '저장할 공지사항 데이터가 없습니다.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const notice of notices) {
      await client.query(
        `INSERT INTO knu_notices (source, title, content, link, target_dept, post_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (title) DO NOTHING`,
        [notice.source, notice.title, notice.content, notice.link, notice.target_dept, notice.post_date]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: `${notices.length}개의 공지사항 처리 완료` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[NOTICES] 대량 저장 오류:', err);
    res.status(500).json({ success: false, message: '공지사항 저장 중 서버 오류 발생' });
  } finally {
    client.release();
  }
});

// [GET] /notices

router.get('/', async (req, res) => {
  try {
        const query = `
            SELECT source as dept, title, link, post_date as date 
            FROM knu_notices 
            ORDER BY post_date DESC, id DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (e) {
        console.error(`공지사항 조회 에러: ${e.message}`);
        res.json([]);
    }
});

router.post('/update-keywords', async (req, res) => {
    const { student_id, keywords } = req.body; // keywords는 배열([]) 형태여야 함

    try {
        // DB 컬럼이 TEXT[] 타입이면 JS 배열을 그대로 넣으면 됩니다.
        await pool.query(
            "UPDATE users SET keywords = $1 WHERE student_id = $2",
            [keywords, student_id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(`키워드 업데이트 에러: ${e.message}`);
        res.json({ success: false, message: e.message });
    }
});

export default router;