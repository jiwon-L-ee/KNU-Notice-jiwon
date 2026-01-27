import genAI, { aiModels } from './gemini.js';
import { pool } from '../db.js';

/**
 * 아직 분석되지 않은 공지사항들을 한꺼번에 처리합니다.
 */
export const processUnanalyzedNotices = async () => {
  try {
    // 1. 분석되지 않은 공지사항 가져오기
    const result = await pool.query(
      'SELECT id, content FROM knu_notices WHERE processed_by_ai = FALSE LIMIT 10'
    );
    const notices = result.rows;

    if (notices.length === 0) {
      console.log("분석할 새로운 공지사항이 없습니다.");
      return;
    }

    console.log(`[AI Batch] ${notices.length}개의 공지 분석 시작...`);

    for (const notice of notices) {
      await extractAndSaveDates(notice);
    }
  } catch (err) {
    console.error("배치 처리 중 오류:", err.message);
  }
};

/**
 * 개별 공지사항에서 날짜를 추출하고 DB를 업데이트합니다.
 */
export async function extractAndSaveDates(notice) {
  const prompt = `
    다음은 대학 공지사항 본문입니다. 이 활동의 '신청 시작일'과 '최종 마감일'을 찾아주세요.
    연도가 명시되지 않았다면 게시물 등록일(현재연도)로 가정하세요.
    반드시 아래 JSON 형식으로만 응답하세요:
    {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    날짜를 도저히 알 수 없다면 "null"로 표기하세요.

    [공지사항 본문]:
    ${notice.content.substring(0, 2000)} 
  `;

  try {
    const response = await genAI.models.generateContent({
      model: aiModels.flash,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    // AI 응답 정제 및 파싱
    const rawText = response.text.trim();
    const jsonMatch = rawText.match(/\{.*\}/s);
    
    if (!jsonMatch) throw new Error("JSON 형식을 찾을 수 없음");
    
    const { start_date, end_date } = JSON.parse(jsonMatch[0]);

    // DB 업데이트 (날짜가 유효하지 않으면 null로 들어감)
    await pool.query(
      `UPDATE knu_notices 
       SET start_date = $1, end_date = $2, processed_by_ai = TRUE 
       WHERE id = $3`,
      [start_date === "null" ? null : start_date, 
       end_date === "null" ? null : end_date, 
       notice.id]
    );

    console.log(`공지 ID ${notice.id} 분석 완료: ${start_date} ~ ${end_date}`);

  } catch (error) {
    console.error(`공지 ID ${notice.id} 분석 실패:`, error.message);
    // 실패해도 다음에 또 시도하지 않도록 일단 TRUE로 바꾸거나, 실패 횟수를 기록하는 로직이 필요함
  }
}