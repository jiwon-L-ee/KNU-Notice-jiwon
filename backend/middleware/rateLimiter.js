/**
 * @file rateLimiter.js
 * @description Rate limiting middleware to prevent abuse and DDoS attacks
 */

/**
 * 간단한 메모리 기반 rate limiter
 * 프로덕션 환경에서는 Redis 등을 사용하는 것을 권장합니다.
 */
const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15분
const MAX_REQUESTS = 100; // 15분당 최대 100개 요청

const rateLimiter = (req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  // 오래된 기록 정리
  if (requestCounts.has(clientId)) {
    const { count, resetTime } = requestCounts.get(clientId);
    if (now > resetTime) {
      requestCounts.delete(clientId);
    }
  }

  // 현재 클라이언트의 요청 수 확인
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return next();
  }

  const clientData = requestCounts.get(clientId);
  
  if (clientData.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000) // 초 단위
    });
  }

  clientData.count++;
  next();
};

// 인증 관련 엔드포인트에 대한 더 엄격한 제한
const authRateLimiter = (req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15분
  const MAX_AUTH_REQUESTS = 5; // 15분당 최대 5회 (로그인/회원가입 시도)

  const key = `auth_${clientId}`;

  if (requestCounts.has(key)) {
    const { count, resetTime } = requestCounts.get(key);
    if (now > resetTime) {
      requestCounts.delete(key);
    } else if (count >= MAX_AUTH_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      });
    }
  }

  if (!requestCounts.has(key)) {
    requestCounts.set(key, {
      count: 1,
      resetTime: now + AUTH_WINDOW_MS
    });
  } else {
    requestCounts.get(key).count++;
  }

  next();
};

export { rateLimiter, authRateLimiter };
