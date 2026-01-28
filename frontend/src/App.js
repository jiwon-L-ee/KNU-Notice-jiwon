import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  // --- 상태 관리 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isMyPage, setIsMyPage] = useState(false);

  const [userInfo, setUserInfo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectedDept, setSelectedDept] = useState('전체');

  const keywordGuide = ["장학", "근로", "수강신청", "졸업", "인턴", "채용", "현장실습", "해외파견", "SW중심대학"];

  // --- 1. 데이터 로딩 ---
  useEffect(() => {
    if (isLoggedIn) {
      fetch('http://127.0.0.1:5000/notices')
        .then(res => res.json())
        .then(data => setNotices(data))
        .catch(err => console.error("데이터 로딩 실패:", err));
    }
  }, [isLoggedIn]);

  // [수정됨] useEffect 분리: 로그인 시 모달 표시
  useEffect(() => {
    if (isLoggedIn) {
        // 로그인 하면 항상 키워드 가이드 모달 띄우기 (마이페이지가 아닐 때)
        // isMyPage 상태는 초기값이 false이므로 로그인 직후엔 보통 false입니다.
        setShowGuideModal(true);
    }
  }, [isLoggedIn]);

  // [수정됨] useEffect 분리: 사용자 정보(userInfo)가 변경되면 부서 자동 선택
  useEffect(() => {
    if (userInfo) {
      const deptOptions = ["전체", "경북대 학사공지", "컴퓨터학부", "전자공학부", "AI융합대학"];
      // 유저 학과가 옵션에 있으면 해당 학과 선택, 없으면 '전체'
      const userDept = deptOptions.includes(userInfo.department) ? userInfo.department : '전체';
      setSelectedDept(userDept);
    }
  }, [userInfo]);

  // selectedDept 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDept]);

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
    localStorage.setItem(`keywords_${userInfo.student_id}`, JSON.stringify(selectedKeywords));
    setShowGuideModal(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const student_id = e.target.sid.value;
    const password = e.target.pw.value;
    fetch('http://127.0.0.1:5000/auth/login', {
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
      experience_summary: e.target.experience.value
    };
    fetch('http://127.0.0.1:5000/auth/register', {
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

  const handleUpdateUser = (e) => {
    e.preventDefault();
    const formData = {
      student_id: userInfo.student_id,
      name: e.target.name.value,
      grade: e.target.grade.value,
      department: e.target.dept.value,
      experience_summary: e.target.experience.value
    };

    fetch('http://127.0.0.1:5000/auth/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("정보가 수정되었습니다.");
            setUserInfo(data.user); // 상태 업데이트 -> useEffect([userInfo]) 실행됨 -> 학과 자동 변경
            setIsMyPage(false);
        } else {
            alert(data.message);
        }
    });
  };

  const handResetPassword = (e) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/auth/reset-password', {
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
  const filteredNotices = notices.filter(notice => {
    const matchesDept = selectedDept === '전체' || notice.dept === selectedDept;
    const matchesKeywords = selectedKeywords.length === 0 || selectedKeywords.some(keyword => notice.title.toLowerCase().includes(keyword.toLowerCase()));
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesKeywords && matchesSearch;
  });

  const postsPerPage = 10;
  const currentNotices = filteredNotices.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  const pageNumbers = Array.from({ length: Math.ceil(filteredNotices.length / postsPerPage) }, (_, i) => i + 1);

  const handleNoticeClick = (url) => {
    if (!url) return;
    const cleanUrl = url.replace(/btin\.page=[^&]*/g, 'btin.page=1').replace(/\/>/g, '').replace(/%3E/g, '');
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  // --- [화면 렌더링] ---
  if (isLoggedIn) {
    if (isMyPage) {
        return (
            <div className="auth-wrapper">
                <div className="bg-overlay"></div>
                <form className="login-box" onSubmit={handleUpdateUser} style={{maxWidth: '500px'}}>
                    <h2>마이페이지 (정보 수정)</h2>
                    <div style={{textAlign:'left', width: '100%', marginBottom: '10px'}}>
                        <label>이름</label>
                        <input name="name" defaultValue={userInfo.name} required />
                    </div>
                    <div style={{textAlign:'left', width: '100%', marginBottom: '10px'}}>
                        <label>학년</label>
                        <input name="grade" type="number" defaultValue={userInfo.grade} required />
                    </div>
                    <div style={{textAlign:'left', width: '100%', marginBottom: '10px'}}>
                        <label>학과</label>
                        <select name="dept" defaultValue={userInfo.department} required style={{width: '100%', padding: '10px'}}>
                            <option value="컴퓨터학부">컴퓨터학부</option>
                            <option value="전자공학부">전자공학부</option>
                            <option value="AI융합대학">AI융합대학</option>
                            <option value="경북대 학사공지">경북대 학사공지</option>
                        </select>
                    </div>
                    <div style={{textAlign:'left', width: '100%', marginBottom: '10px'}}>
                        <label>활동 이력 및 관심사</label>
                        <textarea 
                            name="experience" 
                            defaultValue={userInfo.experience_summary || ''} 
                            rows="5"
                            placeholder="동아리, 프로젝트 경험, 관심 분야 등을 적어주세요."
                            style={{width: '100%', padding: '10px', marginTop: '5px'}}
                        />
                    </div>
                    <button type="submit">수정 완료</button>
                    <p onClick={() => setIsMyPage(false)} className="toggle-link">돌아가기</p>
                </form>
            </div>
        );
    }

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
              {selectedKeywords.length > 0 && (
                <div className="selected-keywords">
                  <p><strong>선택된 키워드:</strong> {selectedKeywords.join(', ')}</p>
                </div>
              )}
              <button className="save-btn" onClick={saveKeywords}>설정 완료 ({selectedKeywords.length}/3)</button>
            </div>
          </div>
        )}
        <header className="header">
          <div className="user-bar">
            <span><b>{userInfo?.name}</b>님 ({userInfo?.department})</span>
            <div className="header-buttons">
              <button onClick={() => setShowGuideModal(true)} className="keyword-btn">🔑 키워드 설정</button>
              <button onClick={() => setIsMyPage(true)} className="mypage-btn" style={{marginRight: '10px'}}>👤 마이페이지</button>
              <button onClick={() => setIsLoggedIn(false)} className="logout-btn">로그아웃</button>
            </div>
          </div>
          <h1>KNU 공지사항 피드</h1>
        </header>

        <div className="search-container">
          <input type="text" className="search-input" placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select className="dept-select" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            <option value="전체">전체</option>
            <option value="경북대 학사공지">경북대 학사공지</option>
            <option value="컴퓨터학부">컴퓨터학부</option>
            <option value="전자공학부">전자공학부</option>
            <option value="AI융합대학">AI융합대학</option>
          </select>
        </div>

        <div className="notice-list">
          {currentNotices.length > 0 ? (
            currentNotices.map((notice, i) => (
              <div key={i} className="notice-card" onClick={() => handleNoticeClick(notice.link)}>
                <span className="dept-tag">{notice.dept}</span>
                <h3 className="notice-title">{notice.title}</h3>
                <p className="notice-date">{notice.date}</p>
              </div>
            ))
          ) : (
            <div className="no-notices">
              <p>조건에 맞는 공지가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="pagination">
          {pageNumbers.map(n => (
            <button key={n} className={`page-btn ${currentPage === n ? 'active' : ''}`} onClick={() => {setCurrentPage(n); window.scrollTo(0,0);}}>{n}</button>
          ))}
        </div>
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
          <textarea 
            name="experience" 
            placeholder="활동 이력 및 관심 분야 (선택)" 
            rows="3" 
            style={{width: '100%', marginTop: '10px', padding: '10px'}}
          />
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