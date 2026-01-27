import { PlaywrightCrawler } from 'crawlee';
import 'dotenv/config';
import { pool } from '../db.js';
import { extractAndSaveDates } from '../services/noticeProcessor.js';

// 날짜 변환 함수
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    return dateStr.replace(/\./g, '-'); 
}

const crawler = new PlaywrightCrawler({
    headless: false, // 브라우저가 뜨는 것을 눈으로 확인 (디버깅용)
    
    // 타임아웃 설정
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 180, 

    launchContext: { // SSL 인증서 오류 무시
        launchOptions: {
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },

    async requestHandler({ request, page, log }) {
        const currentUrl = request.url;
        log.info(`📂 목록 페이지 접속: ${currentUrl}`);

        let listItems = []; 
        let sourceName = '';
        let contentSelector = ''; 

        // =================================================================
        // 1. 목록 수집 단계
        // =================================================================
        
        // [CASE 1] 컴퓨터학부
        if (currentUrl.includes('cse.knu.ac.kr')) {
            sourceName = '컴퓨터학부';
            contentSelector = '#bo_v_con';
            
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            
            listItems = await page.evaluate((source) => {
                const rows = document.querySelectorAll('tbody tr');
                const items = [];
                rows.forEach(row => {
                    const subject = row.querySelector('.bo_tit a');
                    const date = row.querySelector('.td_date') || row.querySelector('.td_datetime');
                    if (subject && date) {
                        items.push({
                            title: subject.innerText.trim(),
                            link: subject.href,
                            date: date.innerText.trim(),
                            source: source
                        });
                    }
                });
                return items;
            }, sourceName);

        // [CASE 2] 학사공지
        } else if (currentUrl.includes('knu.ac.kr/wbbs')) {
            sourceName = '경북대 학사공지';
            contentSelector = '.board_cont';

            await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
            
            listItems = await page.evaluate((source) => {
                const rows = document.querySelectorAll('tbody tr');
                const items = [];
                rows.forEach(row => {
                    const subject = row.querySelector('.subject a');
                    const date = row.querySelector('.date');
                    if (subject && date) {
                        const rawHref = subject.getAttribute('href');
                        const match = rawHref.match(/'([^']+)'/g);
                        let realLink = rawHref;
                        if (match && match.length >= 3) {
                            const note_div = match[1].replace(/'/g, '');
                            const bltn_no = match[2].replace(/'/g, '');
                            realLink = `https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/stdViewBtin.action?search_type=&search_text=&popupDeco=&note_div=${note_div}&bltn_no=${bltn_no}&menu_idx=42`;
                        }
                        
                        items.push({
                            title: subject.innerText.trim(),
                            link: realLink,
                            date: date.innerText.trim(),
                            source: source
                        });
                    }
                });
                return items;
            }, sourceName);

        // [CASE 3] AI융합대학
        } else if (currentUrl.includes('home.knu.ac.kr/HOME/aic')) {
            sourceName = 'AI융합대학';
            contentSelector = '.cont';

            await page.waitForLoadState('networkidle', { timeout: 30000 });
            
            listItems = await page.evaluate((source) => {
                const rows = document.querySelectorAll('tbody tr');
                const items = [];
                rows.forEach(row => {
                    const subject = row.querySelector('.subject a');
                    const date = row.querySelector('.date');
                    if (subject && date) {
                        const title = subject.innerText.trim();
                        if (title.length > 0) {
                            items.push({
                                title: title,
                                link: subject.href,
                                date: date.innerText.trim(),
                                source: source
                            });
                        }
                    }
                });
                return items;
            }, sourceName);
        
        // [CASE 4] 전자공학부
        } else if (currentUrl.includes('see.knu.ac.kr')) {
            sourceName = '전자공학부';
            contentSelector = '.contentview';
            
            await page.waitForLoadState('networkidle', { timeout: 30000 });

            listItems = await page.evaluate((source) => {
                const rows = document.querySelectorAll('tbody tr');
                const items = [];
                
                rows.forEach(row => {
                    const subjectElem = row.querySelector('td.left a');
                    const tds = row.querySelectorAll('td');
                    const dateElem = tds[3]; 

                    if (subjectElem && dateElem) {
                        const title = subjectElem.innerText.trim();
                        const link = subjectElem.href;
                        const date = dateElem.innerText.trim();

                        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            items.push({
                                title: title,
                                link: link,
                                date: date,
                                source: source
                            });
                        }
                    }
                });
                return items;
            }, sourceName);
        }

        log.info(`✅ [${sourceName}] 공지사항 ${listItems.length}개 확보. 공지 본문 크롤링 시작...`);

        // =================================================================
        // 2. 상세 페이지 접속 및 본문(Content) 수집 단계
        // =================================================================
        let newCount = 0;

        for (const item of listItems) {
            // [중복 체크]
            const checkRes = await pool.query('SELECT id FROM knu_notices WHERE title = $1', [item.title]);
            if (checkRes.rowCount > 0) {
                log.info(`[Pass] 이미 저장됨: ${item.title.substring(0, 15)}...`);
                continue;
            }

            try {
                // 상세 페이지 이동
                await page.goto(item.link, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // 본문 추출
                let content = '';
                try {
                    if (await page.$(contentSelector)) {
                        content = await page.$eval(contentSelector, el => el.innerText.trim());
                    } else {
                        content = await page.$eval('body', el => el.innerText.trim());
                    }
                } catch (err) {
                    content = '본문 로딩 실패';
                    log.warning(`본문 추출 실패 (${sourceName}): ${err.message}`);
                }

                const query = `
                    INSERT INTO knu_notices 
                    (source, title, content, link, post_date)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                `;
                
                const safeDate = normalizeDate(item.date);
                
                const res = await pool.query(query, [
                    item.source, 
                    item.title, 
                    content,
                    item.link,
                    safeDate
                ]);

                const noticeId = res.rows[0].id;

                // AI로 날짜 추출 및 저장
                try {
                    await extractAndSaveDates({ id: noticeId, content: content });
                    log.info(`AI 분석 완료: ${item.title.substring(0, 15)}...`);
                } catch (aiErr) {
                    log.warning(`AI 분석 실패 (${item.title}): ${aiErr.message}`);
                }

                newCount++;
                log.info(`저장 완료: ${item.title.substring(0, 15)}...`);
                await new Promise(r => setTimeout(r, 1000));

            } catch (err) {
                log.error(`❌ 상세 크롤링 에러 (${item.title}): ${err.message}`);
            }
        }

        if (newCount > 0) log.info(`🎉 [${sourceName}] 총 ${newCount}개 신규 저장 완료!`);
        else log.info(`👍 [${sourceName}] 새로운 글이 없습니다.`);
    },
});

(async () => {
    try {
        console.log('상세 본문 수집 크롤러 시작...');
        await crawler.run([
            'https://cse.knu.ac.kr/bbs/board.php?bo_table=sub5_1&lang=kor',          //컴퓨터학부
            'https://www.knu.ac.kr/wbbs/wbbs/bbs/btin/stdList.action?menu_idx=42',   //경북대 학사공지
            'https://home.knu.ac.kr/HOME/aic/sub.htm?nav_code=aic1635293208',        //AI융합대학
            'https://see.knu.ac.kr/content/board/notice.html'                        //전자공학부
        ]);
        console.log('✅ 모든 작업 완료!');
    } catch (error) {
        console.error('에러:', error);
    } finally {
        await pool.end();
    }
})();