# KNU Notice Crawler
### 경북대학교(컴퓨터학부, 전자공학부, AI융합대학, 본부)의 공지사항을 통합 수집하는 크롤러입니다.
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

## 2. 데이터베이스 테이블 생성
```bash
CREATE TABLE knu_notices (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100) NOT NULL,       -- 출처 (예: 컴퓨터학부, 전자공학부)
    title TEXT NOT NULL UNIQUE,         -- 공지 제목 (중복 방지)
    content TEXT,                       -- 공지 본문 내용
    link TEXT NOT NULL,                 -- 상세 페이지 주소
    post_date DATE,                     -- 게시 날짜 (YYYY-MM-DD)
    crawled_at TIMESTAMP DEFAULT NOW()  -- 수집된 시간
);
```

## 3. .env 파일을 생성하고 다음 내용을 입력
```bash
DB_USER=postgres
DB_HOST=localhost
DB_NAME=[생성한 DB 이름]
DB_PASSWORD=[본인의 postgreSQL 비밀번호]
DB_PORT=5432
```
## 실행
```bash
npm start
```