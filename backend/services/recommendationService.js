import genAI, { aiModels } from './gemini.js';
import crypto from 'crypto';

/**
 * 사용자 프로필 정보를 기반으로 해시 생성
 * grade, department, experience_summary가 변경되면 해시도 변경됨
 */
export const generateUserProfileHash = (userData) => {
  const { grade = '', department = '', experience_summary = '' } = userData;
  const profileString = `${grade}|${department}|${experience_summary}`;
  return crypto.createHash('sha256').update(profileString).digest('hex');
};

export const getSingleRecommendation = async (userData, noticeContent) => {
  const { grade, department, experience_summary } = userData;

  const prompt = `.당신은 대학 커리어 컨설턴트입니다. 다음 학생의 프로필과 공지사항을 분석하여 '취업 및 커리어 성장' 관점에서 점수를 매기세요.

    [학생 프로필]
    - 학년: ${grade || '정보 없음'}
    - 학과: ${department || '정보 없음'}
    - 주요 활동 및 스택: ${experience_summary || '기재된 내용 없음 (일반적인 대학생 기준으로 분석할 것)'}

    [공지 내용]
    ${noticeContent}

    [분석 가이드라인]
    1. 학년 적합성: 현재 학년에서 이 활동을 하는 것이 시기적절한가? (예: 4학년에게 단순 서포터즈는 감점, 1학년에게 심화 연구는 독려 등)
    2. 전공 연관성: ${department} 전공자로서 이 활동이 전공 역량을 증명하거나 보완할 수 있는가?
    3. 희소성 및 보상: 이 활동이 제공하는 혜택(장학금, 인턴 연계, 공인 수료증 등)이 시장에서 얼마나 가치 있는가?
    매우 엄격하고 객관적으로 평가하여 세부적으로 점수를 매기세요.

    [응답 형식 - JSON]
    {
      "score": 0~100 정수,
      "reason": "위 3가지 가이드라인을 포함하여 학생에게 직설적인 조언을 2-3문장으로 작성"
    }`; 

  try {
    const response = await genAI.models.generateContent({
      model: aiModels.flash,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const rawText = response.text || (typeof response.text === 'function' ? response.text() : "");
    const jsonMatch = rawText.match(/\{.*\}/s);

    if (!jsonMatch) {
      // 1. 파싱 실패 시 0점을 주지 말고 에러를 던지세요.
      throw new Error("AI 응답 데이터 형식이 올바르지 않습니다.");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 응답 검증: score/reason이 없거나 형식이 잘못되면 저장/캐시하지 않도록 즉시 실패 처리
    const score = Number(parsed?.score);
    const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim() : '';

    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw new Error('AI 응답 score가 0~100 정수가 아닙니다.');
    }
    if (!reason) {
      throw new Error('AI 응답 reason이 비어 있습니다.');
    }

    return { score, reason };

  } catch (error) {
    // 2. 여기서 객체를 return 하지 마세요. 에러를 그대로 위(라우터)로 보냅니다.
    console.error("AI Analysis Error:", error.message);
    throw error; 
  }
};