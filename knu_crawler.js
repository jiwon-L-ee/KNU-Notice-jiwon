import { PlaywrightCrawler } from 'crawlee';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// 1. DB 연결 설정 (비밀번호 확인 필수!)
const pool = new Pool({
    user: process.env.DB_USER,      // .env의 DB_USER 값을 가져옴
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const crawler = new PlaywrightCrawler({
    // 브라우저가 뜨는 것을 눈으로 확인 (디버깅용)
    headless: false,

    // SSL 인증서 오류 무시 (학교 사이트 접속 시 필수)
    launchContext: {
        launchOptions: {
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },

    async requestHandler({ request, page, log }) {
        const currentUrl = request.url;
        log.info(`접속 시도: ${currentUrl}`);

        let notices = [];
        let sourceName = '';

        // -------------------------------------------------------
        // [CASE 1] 컴퓨터학부 (CSE)
        // -------------------------------------------------------
        if (currentUrl.includes('cse.knu.ac.kr')) {
            sourceName = '컴퓨터학부';
            try {
                await page.waitForLoadState('networkidle', { timeout: 15000 });
                await page.waitForSelector('.bo_tit', { timeout: 15000 });
                
                notices = await page.evaluate((sourceName) => {
                    const rows = document.querySelectorAll('tbody tr');
                    const result = [];
                    const seenTitles = new Set();
                    rows.forEach(row => {
                        const subjectElem = row.querySelector('.bo_tit a');
                        const dateElem = row.querySelector('.td_date') || row.querySelector('.td_datetime');
                        if (subjectElem && dateElem) {
                            const title = subjectElem.innerText.trim();
                            const link = subjectElem.href;
                            const date = dateElem.innerText.trim();
                            if (title.length > 0 && !seenTitles.has(title)) {
                                seenTitles.add(title);
                                result.push({ title, link, date, source: sourceName });
                            }
                        }
                    });
                    return result;
                }, sourceName);
            } catch (e) { 
                log.error(`[${sourceName}] 로딩 실패! 원인: ${e.message}`);
            }

        // -------------------------------------------------------
        // [CASE 2] 경북대 학사 공지 (WBBS)
        // -------------------------------------------------------
        } else if (currentUrl.includes('knu.ac.kr/wbbs')) {
            sourceName = '경북대 학사공지';
            try {
                await page.waitForLoadState('networkidle', { timeout: 15000 });
                await page.waitForSelector('.subject', { timeout: 15000 });

                notices = await page.evaluate((sourceName) => {
                    const rows = document.querySelectorAll('tbody tr');
                    const result = [];
                    const seenTitles = new Set();
                    rows.forEach(row => {
                        const subjectElem = row.querySelector('.subject a');
                        const dateElem = row.querySelector('.date');
                        if (subjectElem && dateElem) {
                            const title = subjectElem.innerText.trim();
                            const rawHref = subjectElem.getAttribute('href');
                            const date = dateElem.innerText.trim();
                            const match = rawHref.match(/'([^']+)'/g);
                            let realLink = rawHref;
                            if (match && match.length >= 3) {
                                const bbs_cde = match[0].replace(/'/g, '');
                                const note_div = match[1].replace(/'/g, '');
                                const bltn_no = match[2].replace(/'/g, '');
                                const menu_idx = 42; 
                                realLink = `https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/stdViewBtin.action?search_type=&search_text=&popupDeco=&note_div=${note_div}&bltn_no=${bltn_no}&menu_idx=${menu_idx}&bbs_cde=${bbs_cde}`;
                            }
                            if (title.length > 0 && !seenTitles.has(title)) {
                                seenTitles.add(title);
                                result.push({ title, link: realLink, date, source: sourceName });
                            }
                        }
                    });
                    return result;
                }, sourceName);
            } catch (e) { 
                log.error(`[${sourceName}] 로딩 실패! 원인: ${e.message}`);
            }

        // -------------------------------------------------------
        // [CASE 3] AI융합대학 (COSS)
        // -------------------------------------------------------
        } else if (currentUrl.includes('home.knu.ac.kr/HOME/aic')) {
            sourceName = 'AI융합대학';
            try {
                await page.waitForLoadState('networkidle', { timeout: 15000 });
                await page.waitForSelector('.subject', { timeout: 15000 });

                notices = await page.evaluate((sourceName) => {
                    const rows = document.querySelectorAll('tbody tr');
                    const result = [];
                    const seenTitles = new Set();

                    rows.forEach(row => {
                        const subjectElem = row.querySelector('.subject a');
                        const dateElem = row.querySelector('.date');

                        if (subjectElem && dateElem) {
                            const title = subjectElem.innerText.trim();
                            const date = dateElem.innerText.trim();
                            const link = subjectElem.href; 

                            // '공지'라고 적힌 헤더 행은 제외하기 위해 제목 길이가 있는지 체크
                            if (title.length > 0 && !seenTitles.has(title)) {
                                seenTitles.add(title);
                                result.push({ title, link, date, source: sourceName });
                            }
                        }
                    });
                    return result;
                }, sourceName);
            } catch (e) { 
                log.error(`[${sourceName}] 로딩 실패: ${e.message}`);
            }
        }    

        log.info(`✅ [${sourceName}] 유효 데이터 ${notices.length}개 발견`);

        // DB 저장
        let newCount = 0;
        for (const notice of notices) {
            try {
                const query = `
                    INSERT INTO knu_notices (title, post_date, link, source)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (title) DO NOTHING
                    RETURNING id
                `;
                const res = await pool.query(query, [notice.title, notice.date, notice.link, notice.source]);
                if (res.rowCount > 0) newCount++;
            } catch (err) {
                console.error(`DB 에러: ${err.message}`);
            }
        }
        
        if (newCount > 0) log.info(`🎉 [${sourceName}] ${newCount}개 저장 완료!`);
        else log.info(`👍 [${sourceName}] 새로운 글 없음`);
    },
});

(async () => {
    try {
        console.log('크롤링 시작...');
        await crawler.run([
            'https://cse.knu.ac.kr/bbs/board.php?bo_table=sub5_1&lang=kor',         // 컴퓨터학부
            'https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/stdList.action?menu_idx=42',  // 학사공지
            'https://home.knu.ac.kr/HOME/aic/sub.htm?nav_code=aic1635293208'        // COSS
        ]);
        console.log('크롤링 완료!');
    } catch (error) {
        console.error('실행 중 에러 발생:', error);
    } finally {
        await pool.end();
    }
})();