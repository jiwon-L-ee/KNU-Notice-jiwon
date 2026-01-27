/**
 * @file recommendationService.js
 * @description
 */
import genAI, { aiModels } from './gemini.js';

export const getRecommendationScore = async (userExp, noticeContent) => {
  try {
    
    const response = await genAI.models.generateContent({
      model: aiModels.flash, 
      contents: [{
        role: 'user',
        parts: [{
          text: `
            당신은 대학생을 위한 전문 커리어 분석가입니다. 
            입력된 [학생의 프로필]과 [공지사항 데이터]를 대조하여, 이 활동이 해당 학생에게 얼마나 실질적인 '스펙' 혹은 '성장 기회'가 될지 분석하세요.

            [학생의 프로필]: ${userExp}
            [공지사항 데이터]: ${noticeContent}

            [분석 및 채점 규칙]:
            1. 직무 적합성 (40점): 학생이 지향하는 진로(예: 보안, AI, 프런트엔드 등)와 공지사항의 주제가 얼마나 일치하는가?
            2. 성장 가능성 (30점): 학생의 현재 수준(학년/보유 스택/경험)에서 도전할 만한 가치가 있는가? 너무 쉽거나 너무 어려운 것은 감점 대상임.
            3. 희소성 및 보상 (30점): 장학금, 채용 연계, 학부연구생 등 커리어에 직접적인 '한 줄'이 될 수 있는 유력한 기회인가?

            [응답 제약]:
            - 반드시 한국어로 답변하세요.
            - 감성적인 추천보다는 '데이터'와 '학생의 이력'에 기반한 차가운 분석을 하세요.
            - 응답은 반드시 아래 JSON 형식으로만 하며, 마크다운 기호(\`\`\`)는 포함하지 마세요.

            {
                "score": (0~100 사이의 정수),
                "reason": (이 점수를 준 근거를 학생의 프로필 키워드와 연결하여 1~2문장으로 설명)
            }
            `
        }]
      }]
    });

    const rawText = response.text || (typeof response.text === 'function' ? response.text() : "");
    
    // JSON 추출 (AI가 앞뒤에 설명을 붙일 경우를 대비)
    const jsonMatch = rawText.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("JSON 파싱 실패");

  } catch (error) {
    console.error("[AI ERROR]:", error.message);
    return { score: 0, reason: "AI 분석 중 오류가 발생했습니다." };
  }
};