# KNU Notice Crawler
### 경북대학교(컴퓨터학부, 전자공학부, AI융합대학, 학사공지)의 공지사항을 통합 수집하는 크롤러입니다.
### 크롤러를 작동시키기 위한 사전 준비 단계
## 1. 라이브러리 및 브라우저 설치
프로젝트에 사용된 crawlee(크롤링 프레임워크), pg(데이터베이스), dotenv(환경변수)를 설치
```bash
npm install crawlee pg dotenv
```
Playwright가 사용하는 전용 브라우저(Chromium 등)를 다운로드하는 명령어
```bash
npx playwright install
```

제미나이 API 다운로드

## 2. 데이터베이스 테이블 생성
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
## 3. .env 파일을 생성하고 다음 내용을 입력
```bash
DB_USER=postgres
DB_HOST=localhost
DB_NAME=[생성한 DB 이름]
DB_PASSWORD=[본인의 postgreSQL 비밀번호]
DB_PORT=5432
GEMINI_API_KEY=제미나이 키값
PORT = 5000

```
## 실행
```bash
npm start
```

26/01/28 01:16 수정사항: 백엔드 프론트엔드 통합, 백엔드 데이터 베이스 & 라우팅, 프론트엔드 API 사용법, 키워드 쿼리화 & 디자인 ,, 크롤러는 backend 파일 내부에 넣어 놨습니다. 

해야할 사항: 추가적인 기능 넣기, 보안 요소 추가
* 부가적인 기능 설치는 backend package.json 보고 추가 install 하시면 될 것 같습니다.