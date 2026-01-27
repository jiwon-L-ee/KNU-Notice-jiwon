import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  // --- 상태 관리 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [category, setCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  const keywordGuide = ["장학", "근로", "수강신청", "졸업", "인턴", "채용", "현장실습", "해외파견", "SW중심대학"];

  // --- 1. 데이터 로딩 ---
  useEffect(() => {
    if (isLoggedIn) {
      fetch('http://127.0.0.1:5000/api/notices')
        .then(res => res.json())
        .then(data => setNotices(data))
        .catch(err => console.error("데이터 로딩 실패:", err));
    }
  }, [isLoggedIn]);

  // 로그인 직후 키워드 체크
  useEffect(() => {
    if (isLoggedIn && userInfo) {
      if (!userInfo.keywords || userInfo.keywords.length === 0) {
        setShowGuideModal(true);
      } else {
        setSelectedKeywords(userInfo.keywords);
      }
    }
  }, [isLoggedIn, userInfo]);

  // --- 2. 핸들러 함수들 ---
  const toggleKeyword = (word) => {
    if (selectedKeywords.includes(word)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== word));
    } else if (selectedKeywords.length < 3) {
      setSelectedKeywords([...selectedKeywords, word]);
    } else {
      alert("키워드는 최대 3개까지만 선택 가능합니다!");
    }
  };

  const saveKeywords = () => {
    fetch('http://127.0.0.1:5000/api/update-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        student_id: userInfo.student_id, 
        keywords: selectedKeywords 
      }),
    })
    .then(res => res.json())
    .then(data => {
      if(data.success) {
        alert("키워드 설정 완료!");
        setShowGuideModal(false);
        setUserInfo({ ...userInfo, keywords: selectedKeywords });
      } else {
        alert("저장 실패: " + data.message);
      }
    })
    .catch(err => alert("서버 연결 실패 (API를 확인하세요)"));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const student_id = e.target.sid.value;
    const password = e.target.pw.value;
    fetch('http://127.0.0.1:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, password }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsLoggedIn(true);
          setUserInfo(data.user);
        } else {
          alert(data.message);
        }
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const formData = {
      student_id: e.target.sid.value,
      password: e.target.pw.value,
      name: e.target.name.value,
      grade: e.target.grade.value,
      department: e.target.dept.value,
    };
    fetch('http://127.0.0.1:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("회원가입 성공!");
          setIsRegisterMode(false);
        } else {
          alert("실패: " + data.message);
        }
      });
  };

  const handResetPassword = (e) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: e.target.sid.value, new_password: e.target.new_pw.value }),
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        if (data.success) setIsResetMode(false);
      });
  };

  // --- 3. 필터링 및 페이지네이션 ---
  const recommendedNotices = notices.filter(notice => 
    (userInfo?.keywords || []).some(keyword => notice.title.includes(keyword))
  );

  const filteredNotices = notices.filter(notice => {
    const matchesCategory = category === '전체' || notice.dept === category;
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const postsPerPage = 10;
  const currentNotices = filteredNotices.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  const pageNumbers = Array.from({ length: Math.ceil(filteredNotices.length / postsPerPage) }, (_, i) => i + 1);

  const categories = ['전체', '경북대 학사공지', '컴퓨터학부', '전자공학부', 'AI융합대학'];

  const handleNoticeClick = (url) => {
    if (!url) return;
    const cleanUrl = url.replace(/btin\.page=[^&]*/g, 'btin.page=1').replace(/\/>/g, '').replace(/%3E/g, '');
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  // --- [화면 렌더링] ---
  if (isLoggedIn) {
    return (
      <div className="container">
        <div className="bg-overlay"></div>
        {showGuideModal && (
          <div className="modal-overlay">
            <div className="keyword-modal">
              <h2>🎯 관심 키워드 설정</h2>
              <div className="keyword-grid">
                {keywordGuide.map(word => (
                  <button key={word} className={`keyword-tag ${selectedKeywords.includes(word) ? 'active' : ''}`} onClick={() => toggleKeyword(word)}>{word}</button>
                ))}
              </div>
              <button className="save-btn" onClick={saveKeywords} disabled={selectedKeywords.length === 0}>설정 완료 ({selectedKeywords.length}/3)</button>
            </div>
          </div>
        )}
        <header className="header">
          <div className="user-bar">
            <span><b>{userInfo?.name}</b>님 ({userInfo?.department})</span>
            <button onClick={() => setIsLoggedIn(false)} className="logout-btn">로그아웃</button>
          </div>
          <h1>KNU 공지사항 피드</h1>
        </header>

        {/* 추천 섹션 */}
        {userInfo?.keywords?.length > 0 && (
          <div className="recommend-section">
            <h3 style={{color: '#b11030'}}>✨ 맞춤 추천 공지</h3>
            <div className="notice-list recommended">
              {recommendedNotices.slice(0, 3).map((notice, i) => (
                <div key={i} className="notice-card highlight" onClick={() => handleNoticeClick(notice.link)}>
                  <span className="dept-tag">추천</span>
                  <h3 className="notice-title">{notice.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="search-container">
          <input type="text" className="search-input" placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="filter-container">
          {categories.map(cat => (
            <button key={cat} className={`filter-btn ${category === cat ? 'active' : ''}`} onClick={() => { setCategory(cat); setCurrentPage(1); }}>{cat}</button>
          ))}
        </div>

        <div className="notice-list">
          {currentNotices.map((notice, i) => (
            <div key={i} className="notice-card" onClick={() => handleNoticeClick(notice.link)}>
              <span className="dept-tag">{notice.dept}</span>
              <h3 className="notice-title">{notice.title}</h3>
              <p className="notice-date">{notice.date}</p>
            </div>
          ))}
        </div>

        <div className="pagination">
          {pageNumbers.map(n => (
            <button key={n} className={`page-btn ${currentPage === n ? 'active' : ''}`} onClick={() => {setCurrentPage(n); window.scrollTo(0,0);}}>{n}</button>
          ))}
        </div>

        <button className="floating-btn" onClick={() => setShowGuideModal(true)}>🔑 키워드 변경</button>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="bg-overlay"></div>
      {isResetMode ? (
        <form className="login-box" onSubmit={handResetPassword}>
          <h2>비밀번호 재설정</h2>
          <input name="sid" placeholder="학번" required />
          <input name="new_pw" type="password" placeholder="새 비밀번호" required />
          <button type="submit">변경하기</button>
          <p onClick={() => setIsResetMode(false)} className="toggle-link">돌아가기</p>
        </form>
      ) : isRegisterMode ? (
        <form className="login-box" onSubmit={handleRegister}>
          <h2>KNU 가입하기</h2>
          <input name="sid" placeholder="학번" required />
          <input name="pw" type="password" placeholder="비밀번호" required />
          <input name="name" placeholder="이름" required />
          <input name="grade" type="number" placeholder="학년" required />
          <select name="dept" required>
            <option value="컴퓨터학부">컴퓨터학부</option>
            <option value="전자공학부">전자공학부</option>
            <option value="AI융합대학">AI융합대학</option>
            <option value="경북대 학사공지">경북대 학사공지</option>
          </select>
          <button type="submit">회원가입</button>
          <p onClick={() => setIsRegisterMode(false)} className="toggle-link">이미 계정이 있나요? 로그인</p>
        </form>
      ) : (
        <form className="login-box" onSubmit={handleLogin}>
          <h2>KNU 공지사항</h2>
          <input name="sid" placeholder="학번" required />
          <input name="pw" type="password" placeholder="비밀번호" required />
          <button type="submit">로그인</button>
          <div className="auth-links">
            <span onClick={() => setIsResetMode(true)}>비밀번호 찾기</span> | 
            <span onClick={() => setIsRegisterMode(true)}> 회원가입</span>
          </div>
        </form>
      )}
    </div>
  );
}

export default App;