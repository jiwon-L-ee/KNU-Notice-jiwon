import express from 'express';
import { pool } from '../db.js';
import { getRecommendationScore } from '../services/recommendationService.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { keywords, dept } = req.query; // 쿼리 파라미터로 keywords와 dept 받기 (선택적)

  const keywordsArray = keywords ? keywords.split(',').map(k => k.trim()) : [];

  try {
    // 1. 유저 데이터 자동 추출 (dept가 없으면 유저의 department 사용)
    const userResult = await pool.query('SELECT department FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    
    const userDept = userResult.rows[0].department;
    const targetDept = dept || userDept; // dept 파라미터가 있으면 사용, 없으면 유저 department

    // 2. 공지사항 데이터 자동 추출 (해당 학과 공지만)
   const noticesResult = await pool.query(
      `SELECT * FROM knu_notices 
       WHERE (target_dept = $1 OR target_dept IS NULL OR $1 = '전체')
       AND (end_date >= CURRENT_DATE OR end_date IS NULL)
       AND post_date >= CURRENT_DATE - INTERVAL '1 month'
       ORDER BY post_date DESC`, 
      [targetDept]
    );
    
    let notices = noticesResult.rows;

    // 키워드가 있으면 필터링
    if (keywordsArray.length > 0) {
      notices = notices.filter(notice => 
        keywordsArray.some(keyword => 
          notice.title.toLowerCase().includes(keyword.toLowerCase()) || 
          notice.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    if (notices.length === 0) {
      return res.json({ success: true, data: [], message: keywordsArray.length > 0 ? "키워드에 맞는 공지가 없습니다." : "현재 조건에 맞는 공지가 없습니다." });
    }

    // 필터링된 모든 공지 반환
    res.json({ success: true, data: notices });

  } catch (err) {
    console.error("추천 라우터 에러:", err);
    res.status(500).json({ success: false, message: "추천 시스템 가동 중 서버 오류가 발생했습니다." });
  }
});

export default router;