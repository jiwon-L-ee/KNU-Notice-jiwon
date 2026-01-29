# KNU Notice (경북대학교 공지사항 종합 서비스)

> **경북대학교(컴퓨터학부, 전자공학부, AI융합대학, 학사공지)의 공지사항을 통합 수집하고, AI를 활용해 사용자 맞춤형 추천을 제공하는 웹 서비스입니다.**

## 🛠️ 주요 기능
* **통합 크롤링**: 여러 학과의 공지사항을 한곳에서 수집 (Crawlee & Playwright 활용)
* **AI 공지 분석**: Google Gemini API를 활용하여 공지사항 내용을 분석 및 요약
* **맞춤 추천**: 사용자의 정보(학과, 학년, 경험 등)를 기반으로 중요 공지사항 추천 (AI Score 산정)
* **웹 대시보드**: 수집된 공지사항과 추천 목록을 확인할 수 있는 웹 인터페이스 제공

## 🚀 시작하기 (Getting Started)

프로젝트를 로컬 환경에서 실행하기 위한 단계별 가이드입니다.

### 1. 사전 요구 사항 (Prerequisites)
* Node.js
* PostgreSQL Database
* Git

### 2. 설치 (Installation)

이 프로젝트는 **Backend**와 **Frontend**가 분리되어 있습니다. 각각 의존성을 설치해야 합니다.

* #### Backend 설정
```bash
# 1. 필수 라이브러리 설치 (crawlee, pg, dotenv, google-genai 등)
npm install crawlee pg dotenv @google/genai express cors

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
        calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, notice_id)
      );
```
* #### 환경변수 설정 (.env)
backend 폴더와 clawler 폴더 내에 각각 .env 파일을 생성하고 다음 내용을 입력합니다.
```bash
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=[생성한 DB 이름, 예: knu_notice_db]
DB_PASSWORD=[본인의 postgreSQL 비밀번호]
DB_PORT=5432

# Server Configuration
PORT=5000

# API Keys
# Google Gemini API 키 주소: https://aistudio.google.com/api-keys?hl=ko
GEMINI_API_KEY=[Google Gemini API 키값]
```

### 3. 실행 (Run)
크롤링 및 백엔드 서버와 프론트엔드 서버를 각각 순서대로 실행합니다.
1) 크롤러 실행 (clawler 폴더 내에서)
```bash
npm start
```
2) 백엔드 서버 실행 (backend 폴더 내에서)
```bash
npm start
```
1) 프론트엔드 서버 실행 (frontend 폴더 내에서)
```bash
npm start
```