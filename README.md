# KNU Notice (경북대학교 공지사항 종합 서비스)

> **경북대학교(컴퓨터학부, 전자공학부, AI융합대학, 학사공지)의 공지사항을 통합 수집하고, AI를 활용해 사용자 맞춤형 추천을 제공하는 웹 서비스입니다.**

## 📅 최근 업데이트 (2025-01-29)

### 🔒 보안 개선 사항
- ✅ **비밀번호 해싱**: bcrypt를 사용한 안전한 비밀번호 저장 및 검증
- ✅ **JWT 인증 시스템**: 로그인 시 JWT 토큰 발행 및 토큰 기반 인증 구현
- ✅ **인증 미들웨어**: 보호가 필요한 API 엔드포인트에 인증 적용
- ✅ **CORS 설정 개선**: 특정 origin만 허용하도록 보안 강화
- ✅ **Rate Limiting**: 브루트포스 공격 방지를 위한 요청 제한 적용
- ✅ **입력 검증 및 Sanitization**: SQL Injection 및 XSS 공격 방지
- ✅ **환경 변수 보안**: `.env` 파일 요소 변경

### 📝 주요 변경사항
- 인증이 필요한 엔드포인트: `/auth/update`, `/notices/update-keywords`, `/recommendations/*`
- 로그인 응답에 JWT 토큰 포함
- 사용자 ID는 토큰에서 자동 추출 (보안 강화)
- 요청 크기 제한 (10MB) 및 에러 처리 개선

## 🛠️ 주요 기능
* **통합 크롤링**: 여러 학과의 공지사항을 한곳에서 수집 (Crawlee & Playwright 활용)
* **AI 공지 분석**: Google Gemini API를 활용하여 공지사항 내용을 분석 및 요약
* **맞춤 추천**: 사용자의 정보(학과, 학년, 경험 등)를 기반으로 중요 공지사항 추천 (AI Score 산정)
* **웹 대시보드**: 수집된 공지사항과 추천 목록을 확인할 수 있는 웹 인터페이스 제공
* **사용자 인증**: JWT 기반 안전한 사용자 인증 시스템

## 🚀 시작하기 (Getting Started)

프로젝트를 로컬 환경에서 실행하기 위한 단계별 가이드입니다.

### 1. 사전 요구 사항 (Prerequisites)
* Node.js
* PostgreSQL Database
* Git

### 2. 설치 (Installation)

**Backend**와 **Frontend**가 분리되어 있습니다. 각각 의존성을 설치해야 합니다.

* #### Backend 설정
```bash
# 1. 필수 라이브러리 설치
cd backend
npm install

# 필수 패키지 목록:
# - express: 웹 서버 프레임워크
# - pg: PostgreSQL 클라이언트
# - dotenv: 환경 변수 관리
# - @google/genai: Google Gemini API
# - cors: CORS 설정
# - bcryptjs: 비밀번호 해싱
# - jsonwebtoken: JWT 토큰 생성/검증
# - crawlee: 웹 크롤링
# - playwright: 브라우저 자동화

# 2. Playwright 패키지 및 브라우저 설치 (크롤러 작동용)
npm install playwright
npx playwright install
```
* #### Frontend 설정
```bash
npm install
```
* #### 데이터베이스 설정
```bash
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
```
```bash
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
```
```bash
CREATE TABLE IF NOT EXISTS user_recommendations (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        notice_id INT REFERENCES knu_notices(id) ON DELETE CASCADE,
        ai_score INT DEFAULT 0,
        ai_reason TEXT,
        user_profile_hash VARCHAR(64), -- 사용자 프로필 변경 감지용 해시 (2025-01-29 추가)
        calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, notice_id)
      );
```

**users 테이블에 keywords 컬럼 추가 (선택사항):**
```bash
ALTER TABLE users ADD COLUMN IF NOT EXISTS keywords TEXT[];
```

> 💡 **참고**: 데이터베이스 스키마는 `backend/db.js`의 `initDb()` 함수에서 자동으로 생성/마이그레이션됩니다. 수동으로 생성할 필요는 없습니다.

* #### 환경변수 설정 (.env)
backend 폴더와 crawler 폴더 내에 각각 .env 파일을 생성하고 다음 내용을 입력합니다.

**backend/.env 파일:**
```bash
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=[생성한 DB 이름, 예: knu_notice_db]
DB_PASSWORD=[본인의 postgreSQL 비밀번호]
DB_PORT=5432

# Server Configuration
PORT=5000

# JWT Secret Key (반드시 강력한 랜덤 문자열로 변경하세요!)
JWT_SECRET_KEY=your_super_secret_key_change_this_in_production

# CORS 허용 Origin (쉼표로 구분, 개발 환경에서는 기본값 사용)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Environment (development, production)
NODE_ENV=development

# API Keys
# Google Gemini API 키 주소: https://aistudio.google.com/api-keys?hl=ko
GEMINI_API_KEY=[Google Gemini API 키값]
```

> 💡 **보안 주의사항**: 
> - `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함되어 있음)
> - 프로덕션 환경에서는 반드시 강력한 `JWT_SECRET_KEY`를 설정하세요
> - `ALLOWED_ORIGINS`에 실제 도메인을 명시하세요

### 3. 실행 (Run)
크롤링 및 백엔드 서버와 프론트엔드 서버를 각각 순서대로 실행합니다.

**1) 크롤러 실행** (Crawler 폴더 내에서)
```bash
cd backend/Crawler
npm start
```

**2) 백엔드 서버 실행** (backend 폴더 내에서)
```bash
cd backend
npm start
# 또는 개발 모드 (nodemon 사용)
npm run dev
```

**3) 프론트엔드 서버 실행** (frontend 폴더 내에서)
```bash
cd frontend
npm start
```

## 🔐 API 인증 가이드

### 인증이 필요한 엔드포인트
다음 엔드포인트들은 JWT 토큰이 필요합니다:

- `POST /auth/update` - 회원 정보 수정
- `POST /notices/update-keywords` - 키워드 업데이트
- `POST /recommendations/analyze` - AI 분석 요청
- `GET /recommendations/history` - 분석 이력 조회
- `DELETE /recommendations/:noticeId` - 분석 결과 삭제

### 인증 방법
1. **로그인**하여 JWT 토큰 받기:
```bash
POST /auth/login
Body: { "student_id": "학번", "password": "비밀번호" }
Response: { "success": true, "user": {...}, "token": "JWT_TOKEN" }
```

2. **요청 헤더에 토큰 포함**:
```bash
Authorization: Bearer JWT_TOKEN
```

### 인증이 필요 없는 엔드포인트
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/reset-password` - 비밀번호 재설정
- `GET /notices` - 공지사항 조회
- `POST /notices/bulk` - 공지사항 대량 저장

## 🛡️ 보안 기능

### Rate Limiting
- **일반 요청**: 15분당 최대 100회
- **인증 요청** (로그인/회원가입): 15분당 최대 5회

### 입력 검증
- 학번: 숫자만 허용, 4-20자
- 비밀번호: 최소 6자 이상
- 이름: 한글/영문/공백만 허용
- 키워드: 최대 3개까지

### 보안 미들웨어
- `authenticateToken`: JWT 토큰 검증
- `rateLimiter`: 요청 제한
- `authRateLimiter`: 인증 엔드포인트 요청 제한
- `validator`: 입력 검증 및 sanitization

## 📁 프로젝트 구조

```
KNU-Notice/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT 인증 미들웨어
│   │   ├── logger.js         # 요청 로깅 미들웨어
│   │   ├── rateLimiter.js    # Rate limiting 미들웨어
│   │   └── validator.js      # 입력 검증 및 sanitization
│   ├── routes/
│   │   ├── auth.js           # 인증 관련 라우트
│   │   ├── notices.js        # 공지사항 관련 라우트
│   │   └── recommendations.js # 추천 관련 라우트
│   ├── services/
│   │   ├── gemini.js         # Gemini API 서비스
│   │   ├── noticeProcessor.js
│   │   └── recommendationService.js
│   ├── Crawler/
│   │   └── knu_crawler.js    # 크롤러 스크립트
│   ├── db.js                 # 데이터베이스 설정
│   ├── index.js              # Express 서버 진입점
│   └── .env.example         # 환경 변수 예제
├── frontend/
│   └── src/                  # React 프론트엔드
└── README.md
```

## ⚠️ 주의사항

1. **프로덕션 배포 전**:
   - `.env` 파일의 `JWT_SECRET_KEY`를 강력한 랜덤 문자열로 변경
   - `ALLOWED_ORIGINS`에 실제 도메인 설정
   - `NODE_ENV=production` 설정

2. **데이터베이스**:
   - 기존 사용자의 비밀번호는 평문으로 저장되어 있을 수 있음
   - 비밀번호 재설정을 통해 해시된 비밀번호로 업데이트 권장

3. **Rate Limiting**:
   - 현재는 메모리 기반으로 구현됨
   - 프로덕션 환경에서는 Redis 사용 권장

## 📝 라이선스

ISC