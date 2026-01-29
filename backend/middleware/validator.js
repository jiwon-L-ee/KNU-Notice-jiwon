/**
 * @file validator.js
 * @description Input validation and sanitization middleware
 */

// SQL Injection 및 XSS 방지를 위한 기본 sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/['";\\]/g, ''); // SQL injection 시도 문자 제거
};

// 학번 검증 (숫자만 허용, 길이 제한)
export const validateStudentId = (studentId) => {
  if (!studentId || typeof studentId !== 'string') {
    return { valid: false, message: '학번이 필요합니다.' };
  }
  
  const trimmed = studentId.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: '학번은 숫자만 입력 가능합니다.' };
  }
  
  // 길이 제한 (2~30자 정도 체크)
  if (trimmed.length < 2 || trimmed.length > 30) {
    return { valid: false, message: '학번은 2자 이상 30자 이하여야 합니다.' };
  }
  
  return { valid: true, value: trimmed };
};

// 비밀번호 검증 (최소 길이만 간단히 체크)
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '비밀번호가 필요합니다.' };
  }
  
  if (password.length < 4) {
    return { valid: false, message: '비밀번호는 최소 4자 이상이어야 합니다.' };
  }
  
  return { valid: true, value: password };
};

// 이름 검증
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: '이름이 필요합니다.' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 50) {
    return { valid: false, message: '이름은 1자 이상 50자 이하여야 합니다.' };
  }
  
  // 특수문자
  return { valid: true, value: trimmed };
};

// 키워드 배열 검증
export const validateKeywords = (keywords) => {
  if (!Array.isArray(keywords)) {
    return { valid: false, message: '키워드는 배열 형태여야 합니다.' };
  }
  
  if (keywords.length > 3) {
    return { valid: false, message: '키워드는 최대 3개까지만 선택 가능합니다.' };
  }
  
  // 각 키워드 검증
  for (const keyword of keywords) {
    if (typeof keyword !== 'string' || keyword.trim().length === 0) {
      return { valid: false, message: '유효하지 않은 키워드가 포함되어 있습니다.' };
    }
    if (keyword.length > 50) {
      return { valid: false, message: '키워드는 50자 이하여야 합니다.' };
    }
  }
  
  return { valid: true, value: keywords.map(k => sanitizeInput(k)) };
};

// 숫자 ID 검증
export const validateId = (id, fieldName = 'ID') => {
  if (id === null || id === undefined) {
    return { valid: false, message: `${fieldName}가 필요합니다.` };
  }
  
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    return { valid: false, message: `유효하지 않은 ${fieldName}입니다.` };
  }
  
  return { valid: true, value: numId };
};
