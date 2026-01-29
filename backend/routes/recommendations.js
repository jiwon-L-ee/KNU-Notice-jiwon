import express from 'express';
import { pool } from '../db.js'; // DB 설정 파일 경로에 맞게 수정
import { getSingleRecommendation, generateUserProfileHash } from '../services/recommendationService.js';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { userId, noticeId } = req.body;

  try {
    // 0. 입력값 검증
    if (userId == null || noticeId == null) {
      return res.status(400).json({
        success: false,
        message: 'userId, noticeId가 필요합니다.'
      });
    }

    // 1. 사용자 데이터 조회 (프로필 해시 생성에 필요)
    const userRes = await pool.query(
      'SELECT grade, department, experience_summary FROM users WHERE id = $1',
      [userId]
    );

    if (!userRes.rows[0]) {
      return res.status(404).json({ success: false, message: '해당 userId의 사용자를 찾을 수 없습니다.' });
    }

    const currentProfileHash = generateUserProfileHash(userRes.rows[0]);

    // 2. 기존 분석 결과 확인 (프로필 해시 포함)
    const existingResult = await pool.query(
      'SELECT ai_score, ai_reason, user_profile_hash FROM user_recommendations WHERE user_id = $1 AND notice_id = $2',
      [userId, noticeId]
    );

    // 3. 기존 결과가 있고, 프로필 해시가 일치하면 캐시 사용
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      const cachedHash = existing.user_profile_hash;

      // 프로필 해시가 일치하면 (회원 정보가 변경되지 않았으면) 캐시 사용
      if (cachedHash === currentProfileHash) {
        return res.json({ success: true, data: existing, source: 'database' });
      }

      // 프로필이 변경되었으면 기존 결과 삭제 후 재분석
      console.log(`[재분석] 사용자 프로필이 변경되어 기존 분석 결과를 무효화합니다. (user_id: ${userId})`);
      await pool.query(
        'DELETE FROM user_recommendations WHERE user_id = $1 AND notice_id = $2',
        [userId, noticeId]
      );
    }

    // 4. 공지사항 데이터 조회
    const noticeRes = await pool.query('SELECT content FROM knu_notices WHERE id = $1', [noticeId]);

    if (!noticeRes.rows[0]) {
      return res.status(404).json({ success: false, message: '해당 noticeId의 공지사항을 찾을 수 없습니다.' });
    }

    // 5. AI 분석 수행
    // 만약 여기서 에러가 발생하면 아래의 INSERT 쿼리는 영원히 실행되지 않습니다.
    const analysis = await getSingleRecommendation(userRes.rows[0], noticeRes.rows[0].content);

    // 6. [저장] 분석이 성공했을 때만 실행됨 (프로필 해시도 함께 저장)
    await pool.query(`
      INSERT INTO user_recommendations (user_id, notice_id, ai_score, ai_reason, user_profile_hash)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, noticeId, analysis.score, analysis.reason, currentProfileHash]);

    res.json({ success: true, data: analysis, source: 'ai' });

  } catch (err) {
    // 7. AI 오류나 DB 오류 모두 여기서 처리됩니다. 
    // 저장은 수행되지 않으며 클라이언트에 실패 사실만 알립니다.
    console.error("[분석 중단]: DB 저장을 수행하지 않았습니다.", err.message);
    const message = typeof err?.message === 'string' ? err.message : '';
    const isAiFailure = /AI 응답|AI Analysis|Gemini/i.test(message);

    res.status(isAiFailure ? 502 : 500).json({ 
      success: false, 
      message: "AI 분석 중 오류가 발생하여 결과를 저장하지 못했습니다." 
    });
  }
});

// 사용자의 모든 분석 이력 조회
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        ur.notice_id,
        ur.ai_score,
        ur.ai_reason,
        ur.calculated_at,
        n.title,
        n.source as dept,
        n.link,
        n.post_date as date
      FROM user_recommendations ur
      JOIN knu_notices n ON ur.notice_id = n.id
      WHERE ur.user_id = $1
      ORDER BY ur.calculated_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[분석 이력 조회 실패]:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "분석 이력 조회 중 오류가 발생했습니다." 
    });
  }
});

// 특정 분석 결과 삭제
router.delete('/:userId/:noticeId', async (req, res) => {
  const { userId, noticeId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM user_recommendations WHERE user_id = $1 AND notice_id = $2',
      [userId, noticeId]
    );

    if (result.rowCount > 0) {
      res.json({ success: true, message: '분석 결과가 삭제되었습니다.' });
    } else {
      res.status(404).json({ success: false, message: '해당 분석 결과를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error("[분석 결과 삭제 실패]:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "분석 결과 삭제 중 오류가 발생했습니다." 
    });
  }
});

export default router;