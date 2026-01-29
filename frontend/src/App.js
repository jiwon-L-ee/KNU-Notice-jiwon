import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  // --- 상태 관리 (기존과 동일) ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState(null); // JWT 토큰 저장
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

  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzingNoticeId, setAnalyzingNoticeId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [hiddenNoticeIds, setHiddenNoticeIds] = useState([]); // 마이페이지에서 숨긴 공지사항 ID 목록
  const [showTrashModal, setShowTrashModal] = useState(false); // 휴지통 모달 표시 여부

  const keywordGuide = ["장학", "근로", "수강신청", "졸업", "인턴", "채용", "현장실습", "해외파견", "SW중심대학"];

  // --- 1. 데이터 로딩 ---
  useEffect(() => {
    if (isLoggedIn && userInfo?.id) {
      // 공지사항과 분석 결과를 함께 로드
      fetch(`http://127.0.0.1:5000/notices?userId=${userInfo.id}`)
        .then(res => res.json())
        .then(data => setNotices(data))
        .catch(err => console.error("데이터 로딩 실패:", err));
    }
  }, [isLoggedIn, userInfo?.id]);

  useEffect(() => {
    if (isLoggedIn) setShowGuideModal(true);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isMyPage && userInfo?.id) {
      loadAnalysisHistory();
    }
  }, [isMyPage, userInfo?.id]);

  useEffect(() => {
    if (userInfo) {
      const deptOptions = ["전체", "경북대 학사공지", "컴퓨터학부", "전자공학부", "AI융합대학"];
      const userDept = deptOptions.includes(userInfo.department) ? userInfo.department : '전체';
      setSelectedDept(userDept);
    }
  }, [userInfo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDept]);

  // --- 2. 핸들러 함수들 (기존과 동일) ---
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
          // 로그인 성공 시 JWT 토큰과 사용자 정보 저장
          setIsLoggedIn(true);
          setUserInfo(data.user);
          if (data.token) {
            setAuthToken(data.token);
            // 필요하다면 새로고침 이후에도 유지 가능
            // localStorage.setItem('authToken', data.token);
          }
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
      experience_summary: e.target.experience.value || ''
    };

    // 변경사항이 있는지 확인
    const hasChanges = 
      formData.name !== (userInfo.name || '') ||
      formData.grade !== (userInfo.grade || '') ||
      formData.department !== (userInfo.department || '') ||
      formData.experience_summary !== (userInfo.experience_summary || '');

    // 변경사항이 없으면 그냥 리턴
    if (!hasChanges) {
      alert('변경된 내용이 없습니다.');
      return;
    }
    
    // 변경사항이 있을 때만 경고 메시지 표시
    const confirmMessage = `⚠️ 주의\n\n변경된 정보(학년, 학과, 활동 이력 등)를 바탕으로 재분석하기 위해 기존 분석 결과가 모두 초기화됩니다.\n\n수정하시겠습니까?`;
    
    if (!window.confirm(confirmMessage)) {
      return; // 사용자가 취소하면 중단
    }

    fetch('http://127.0.0.1:5000/auth/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(formData),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("✅ 정보가 수정되었습니다.\n기존 분석 결과가 초기화되었습니다.");
            setUserInfo(data.user);
            // 분석 이력 초기화 (회원 정보 수정 시 모든 분석 결과 삭제됨)
            setAnalysisHistory([]);
            // 공지사항 목록도 새로고침하여 분석 결과 제거
            if (userInfo?.id) {
              fetch(`http://127.0.0.1:5000/notices?userId=${data.user.id}`)
                .then(res => res.json())
                .then(noticesData => setNotices(noticesData))
                .catch(err => console.error("공지사항 새로고침 실패:", err));
            }
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

  // --- 3. 필터링, 정렬 및 페이지네이션 ---
  const filteredNotices = (() => {
    // 1. 기본 필터링 (학과, 검색어, 날짜 기준만 적용)
    const baseFiltered = notices.filter(notice => {
      const matchesDept = selectedDept === '전체' || notice.dept === selectedDept;
      const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const noticeDate = new Date(notice.date); 
      const start = searchStartDate ? new Date(searchStartDate) : null;
      const end = searchEndDate ? new Date(searchEndDate) : null;

      const matchesStart = !start || noticeDate >= start;
      const matchesEnd = !end || noticeDate <= end;

      return matchesDept && matchesSearch && matchesStart && matchesEnd;
    });

    // 2. 키워드 기반 우선순위 정렬 (키워드가 설정된 경우에만 수행)
    if (selectedKeywords.length === 0) return baseFiltered;

    const priorityNotices = [];
    const regularNotices = [];

    baseFiltered.forEach(notice => {
      const hasKeyword = selectedKeywords.some(keyword => 
        notice.title.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        priorityNotices.push(notice);
      } else {
        regularNotices.push(notice);
      }
    });

    // 키워드 포함 공지를 앞으로, 나머지를 뒤로 합쳐서 반환
    return [...priorityNotices, ...regularNotices];
  })();

  const postsPerPage = 10;
  const currentNotices = filteredNotices.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  const pageNumbers = Array.from({ length: Math.ceil(filteredNotices.length / postsPerPage) }, (_, i) => i + 1);

  const handleNoticeClick = (url) => {
    if (!url) return;
    const cleanUrl = url.replace(/btin\.page=[^&]*/g, 'btin.page=1').replace(/\/>/g, '').replace(/%3E/g, '');
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAnalyzeClick = async (e, noticeId) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    
    if (!userInfo?.id) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingNoticeId(noticeId);
    setShowAnalysisModal(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/recommendations/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        // 서버는 토큰에서 userId를 읽으므로 noticeId만 전송
        body: JSON.stringify({ noticeId })
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data);
        // 분석 완료 후 공지사항 목록 새로고침 (분석 결과 반영)
        fetch(`http://127.0.0.1:5000/notices?userId=${userInfo.id}`)
          .then(res => res.json())
          .then(data => setNotices(data))
          .catch(err => console.error("데이터 새로고침 실패:", err));
      } else {
        setAnalysisResult({ error: data.message || '분석 중 오류가 발생했습니다.' });
      }
    } catch (error) {
      console.error('분석 요청 실패:', error);
      setAnalysisResult({ error: '서버 연결에 실패했습니다.' });
    } finally {
      setIsAnalyzing(false);
      setAnalyzingNoticeId(null);
    }
  };

  const loadAnalysisHistory = async () => {
    if (!userInfo?.id) return;
    
    try {
      const response = await fetch('http://127.0.0.1:5000/recommendations/history', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      const data = await response.json();
      if (data.success) {
        setAnalysisHistory(data.data);
      }
    } catch (error) {
      console.error('분석 이력 로드 실패:', error);
    }
  };

  const handleDeleteAnalysis = (noticeId) => {
    if (!window.confirm('목록에서 제거하시겠습니까?')) {
      return;
    }

    // 숨김 목록에 추가 (로컬 상태만 변경, DB 삭제 안 함)
    setHiddenNoticeIds([...hiddenNoticeIds, noticeId]);
  };

  const handleRestoreAnalysis = (noticeId) => {
    // 숨김 목록에서 제거하여 다시 표시
    setHiddenNoticeIds(hiddenNoticeIds.filter(id => id !== noticeId));
  };

  const handlePermanentDelete = async (noticeId) => {
    if (!userInfo?.id) return;
    
    if (!window.confirm('정말 영구 삭제하시겠습니까?\n삭제된 분석 결과는 복구할 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/recommendations/${noticeId}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 숨김 목록에서도 제거
        setHiddenNoticeIds(hiddenNoticeIds.filter(id => id !== noticeId));
        // 분석 이력 새로고침
        loadAnalysisHistory();
        // 공지사항 목록도 새로고침
        fetch(`http://127.0.0.1:5000/notices?userId=${userInfo.id}`)
          .then(res => res.json())
          .then(noticesData => setNotices(noticesData))
          .catch(err => console.error("공지사항 새로고침 실패:", err));
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('영구 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // --- [화면 렌더링] ---
  if (isLoggedIn) {
    if (isMyPage) {
        // [마이페이지] - 프로필 수정 + 분석 이력
        return (
            <div className="auth-wrapper">
                <div className="bg-overlay"></div>
                <div style={{display: 'flex', gap: '20px', maxWidth: '1200px', width: '100%', flexWrap: 'wrap'}}>
                    {/* 프로필 수정 폼 */}
                    <form className="login-box" onSubmit={handleUpdateUser} style={{maxWidth: '500px', flex: '1', minWidth: '300px'}}>
                        <h2>마이페이지</h2>
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
                            </select>
                        </div>
                        <div style={{textAlign:'left', width: '100%', marginBottom: '10px'}}>
                            <label>활동이력 및 관심분야</label>
                            <textarea 
                                name="experience" 
                                defaultValue={userInfo.experience_summary || ''} 
                                rows="5"
                                placeholder="내용 입력..."
                                style={{width: '100%', padding: '10px', marginTop: '5px'}}
                            />
                        </div>
                        <button type="submit">수정 완료</button>
                        <p onClick={() => setIsMyPage(false)} className="toggle-link">돌아가기</p>
                    </form>

                    {/* 나의 분석결과 */}
                    <div className="login-box" style={{maxWidth: '600px', flex: '1', minWidth: '300px', maxHeight: '80vh', overflowY: 'auto'}}>
                        <h2>나의 분석결과</h2>
                        
                        {/* 분석 목록 */}
                        {analysisHistory.filter(item => !hiddenNoticeIds.includes(item.notice_id)).length > 0 ? (
                            <div className="history-list">
                                {analysisHistory
                                  .filter(item => !hiddenNoticeIds.includes(item.notice_id))
                                  .map((item, idx) => (
                                    <div key={idx} className="history-item">
                                        <div className="history-header">
                                            <span className={`dept-tag ${item.dept === '경북대 학사공지' ? 'global' : 'major'}`}>
                                                {item.dept}
                                            </span>
                                            <span className="history-date">{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="history-title">{item.title}</h4>
                                        <div className="history-score">
                                            <span className="score-badge">점수: {item.ai_score}/100</span>
                                        </div>
                                        <p className="history-reason">{item.ai_reason}</p>
                                        <div className="history-footer">
                                            <span className="history-time">{new Date(item.calculated_at).toLocaleString()}</span>
                                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                                <button 
                                                    className="history-link-btn"
                                                    onClick={() => window.open(item.link, '_blank')}
                                                >
                                                    공지보기
                                                </button>
                                                <button 
                                                    className="history-delete-btn"
                                                    onClick={() => handleDeleteAnalysis(item.notice_id)}
                                                >
                                                    숨기기
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                  ))}
                            </div>
                        ) : (
                            <div className="no-history">
                                <p>아직 분석한 공지사항이 없습니다.</p>
                                <p style={{fontSize: '0.9rem', color: '#999', marginTop: '10px'}}>
                                    공지사항 목록에서 "Gemini 분석 결과 보기" 버튼을 클릭하여 분석을 시작하세요.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 마이페이지 내 휴지통 아이콘 */}
                {hiddenNoticeIds.length > 0 && (
                  <button 
                    className="trash-icon-bottom"
                    onClick={() => setShowTrashModal(true)}
                    title={`숨겨진 공지 ${hiddenNoticeIds.length}개`}
                  >
                    🗑️ <span className="trash-count-bottom">{hiddenNoticeIds.length}</span>
                  </button>
                )}

                {/* 휴지통 모달 */}
                {showTrashModal && (
                  <div className="modal-overlay" onClick={() => setShowTrashModal(false)}>
                    <div className="trash-modal" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>🗑️ 숨겨진 공지</h3>
                        <button className="close-btn" onClick={() => setShowTrashModal(false)}>×</button>
                      </div>
                      <div className="modal-content" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                        {analysisHistory.filter(item => hiddenNoticeIds.includes(item.notice_id)).length > 0 ? (
                          <div className="history-list">
                            {analysisHistory
                              .filter(item => hiddenNoticeIds.includes(item.notice_id))
                              .map((item, idx) => (
                                <div key={idx} className="history-item" style={{opacity: 0.8}}>
                                  <div className="history-header">
                                    <span className={`dept-tag ${item.dept === '경북대 학사공지' ? 'global' : 'major'}`}>
                                      {item.dept}
                                    </span>
                                    <span className="history-date">{new Date(item.date).toLocaleDateString()}</span>
                                  </div>
                                  <h4 className="history-title">{item.title}</h4>
                                  <div className="history-score">
                                    <span className="score-badge">점수: {item.ai_score}/100</span>
                                  </div>
                                  <p className="history-reason">{item.ai_reason}</p>
                                  <div className="history-footer">
                                    <span className="history-time">{new Date(item.calculated_at).toLocaleString()}</span>
                                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                      <button 
                                        className="history-restore-btn"
                                        onClick={() => {
                                          handleRestoreAnalysis(item.notice_id);
                                          if (hiddenNoticeIds.length === 1) {
                                            setShowTrashModal(false);
                                          }
                                        }}
                                      >
                                        다시 추가
                                      </button>
                                      <button 
                                        className="history-permanent-delete-btn"
                                        onClick={() => {
                                          handlePermanentDelete(item.notice_id);
                                          if (hiddenNoticeIds.length === 1) {
                                            setShowTrashModal(false);
                                          }
                                        }}
                                      >
                                        영구 삭제
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="no-history">
                            <p>숨겨진 공지사항이 없습니다.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </div>
        );
    }

    // [메인 피드 화면] - ★ 구조 변경: 헤더 + (사이드바 | 콘텐츠)
    return (
      <div className="app-shell">
        <div className="bg-overlay"></div>
        
        {/* 1. 상단 고정 헤더 */}
        <header className="app-header">
          <div className="header-left">
            <img 
              src="https://www.knu.ac.kr/wbbs/img/intro/ui_emblem01.jpg"
              alt="KNU Logo" 
              className="header-logo" 
            />
            <h1>KNU 맞춤형 공지사항 종합</h1>
          </div>
          <div className="header-right">
            <span className="user-info"><b>{userInfo?.name}</b>님 ({userInfo?.department})</span>
            <button onClick={() => setIsMyPage(true)} className="mypage-btn">👤 마이페이지</button>
            <button onClick={() => setIsLoggedIn(false)} className="logout-btn">로그아웃</button>
          </div>
        </header>

        {/* 2. 메인 영역 (사이드바 + 리스트) */}
        <div className="dashboard-container">
          
          {/* [왼쪽 사이드바] 검색 및 필터 */}
          <aside className="sidebar">
            <div className="sidebar-group">
                <h3>📂 게시판 필터</h3>
                <select className="sidebar-select" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                    <option value="전체">전체 보기</option>
                    <option value="경북대 학사공지">경북대 학사공지</option>
                    <option value="컴퓨터학부">컴퓨터학부</option>
                    <option value="전자공학부">전자공학부</option>
                    <option value="AI융합대학">AI융합대학</option>
                </select>
            </div>

            <div className="sidebar-group">
                <h3>🔍 제목 검색</h3>
                <input 
                    type="text" 
                    className="sidebar-input" 
                    placeholder="검색어 입력..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>

            <div className="sidebar-group">
                <h3>📅 게시일 조회</h3>
                <label className="date-label">시작일</label>
                <input 
                    type="date" 
                    className="sidebar-date"
                    value={searchStartDate} 
                    onChange={(e) => setSearchStartDate(e.target.value)}
                />
                <label className="date-label">종료일</label>
                <input 
                    type="date" 
                    className="sidebar-date"
                    value={searchEndDate} 
                    onChange={(e) => setSearchEndDate(e.target.value)}
                />
                {(searchStartDate || searchEndDate) && (
                    <button className="reset-btn-small" onClick={() => {setSearchStartDate(''); setSearchEndDate('');}}>
                        날짜 초기화
                    </button>
                )}
            </div>

            <div className="sidebar-group">
                <h3>🔑 관심 키워드</h3>
                <div className="keyword-display">
                    {selectedKeywords.length > 0 ? (
                        selectedKeywords.map(k => <span key={k} className="mini-tag">{k}</span>)
                    ) : (
                        <p className="no-keyword-msg">설정된 키워드 없음</p>
                    )}
                </div>
                <button onClick={() => setShowGuideModal(true)} className="keyword-btn-small">키워드 설정하기</button>
            </div>
          </aside>

          {/* [오른쪽 콘텐츠] 공지사항 리스트 */}
          <main className="feed-content">
            <h2 className="feed-title">
                공지사항 목록 <span className="count">({filteredNotices.length})</span>
            </h2>

            <div className="notice-list">
              {currentNotices.length > 0 ? (
                currentNotices.map((notice, i) => {
                  // 공지사항 목록의 표시는 "분석 기록(DB) 존재"만 기준으로 한다.
                  // 마이페이지에서 숨기더라도(로컬 UI) 공지 목록의 분석 표시는 유지.
                  const isAnalyzed = !!notice.is_analyzed;
                  const hasKeyword = selectedKeywords.some(keyword => 
                    notice.title.toLowerCase().includes(keyword.toLowerCase())
                  );

                  return (
                    <div key={i} className={`notice-card ${hasKeyword ? 'highlight-card' : ''}`}>
                      <div onClick={() => handleNoticeClick(notice.link)} style={{ cursor: 'pointer' }}>
                        <div className="card-header">
                            <span className={`dept-tag ${notice.dept === '경북대 학사공지' ? 'global' : 'major'}`}>
                                {notice.dept}
                            </span>
                            {hasKeyword && <span className="keyword-badge" style={{ marginLeft: '8px' }}>🔥 관심 키워드</span>}
                            {isAnalyzed && (
                              <span className="analyzed-badge">✓ 분석 완료</span>
                            )}
                        </div>
                        <h3 className="notice-title">{notice.title}</h3>
                        {isAnalyzed && notice.ai_score !== null && (
                          <div className="card-analysis-preview">
                            <div className="preview-score">
                              <span className="score-number">{notice.ai_score}</span>
                              <span className="score-max">/100</span>
                            </div>
                            <div className="preview-reason">
                              {notice.ai_reason ? notice.ai_reason.split('.').slice(0, 1).join('.') + '.' : ''}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="card-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="notice-date" style={{ color: '#888', fontSize: '0.85rem' }}>
                          {notice.date}
                        </span>
                        <button 
                          className={`analyze-btn ${isAnalyzed ? 'analyzed' : ''}`}
                          onClick={(e) => handleAnalyzeClick(e, notice.id)}
                          disabled={isAnalyzing && analyzingNoticeId === notice.id}
                        >
                          {isAnalyzing && analyzingNoticeId === notice.id 
                            ? '분석 중...' 
                            : isAnalyzed 
                              ? '📊 분석 결과 다시 보기' 
                              : '🤖 Gemini 분석 결과 보기'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-notices">
                  <p>조건에 맞는 공지가 없습니다.</p>
                </div>
              )}
            </div>

            <div className="pagination">
              {pageNumbers.map(n => (
                <button key={n} className={`page-btn ${currentPage === n ? 'active' : ''}`} onClick={() => {setCurrentPage(n); document.querySelector('.feed-content').scrollTop = 0;}}>{n}</button>
              ))}
            </div>
          </main>
        </div>

        {/* 키워드 모달 (기존 코드 유지) */}
        {showGuideModal && (
          <div className="modal-overlay">
            <div className="keyword-modal">
              <h2>🎯 관심 키워드 설정</h2>
              <div className="keyword-grid">
                {keywordGuide.map(word => (
                  <button key={word} className={`keyword-tag ${selectedKeywords.includes(word) ? 'active' : ''}`} onClick={() => toggleKeyword(word)}>{word}</button>
                ))}
              </div>
              <button className="save-btn" onClick={saveKeywords}>설정 완료 ({selectedKeywords.length}/3)</button>
            </div>
          </div>
        )}

        {/* Gemini 분석 결과 모달 */}
        {showAnalysisModal && (
          <div className="modal-overlay" onClick={() => setShowAnalysisModal(false)}>
            <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🤖 Gemini AI 분석 결과</h2>
                <button className="close-btn" onClick={() => setShowAnalysisModal(false)}>×</button>
              </div>
              <div className="modal-content">
                {isAnalyzing ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>AI가 공지사항을 분석하고 있습니다...</p>
                  </div>
                ) : analysisResult?.error ? (
                  <div className="error-state">
                    <p className="error-message">❌ {analysisResult.error}</p>
                  </div>
                ) : analysisResult ? (
                  <div className="analysis-result">
                    <div className="score-section">
                      <div className="score-label">추천 점수</div>
                      <div className="score-value">{analysisResult.ai_score || analysisResult.score}/100</div>
                    </div>
                    <div className="reason-section">
                      <div className="reason-label">분석 이유</div>
                      <div className="reason-text">{analysisResult.ai_reason || analysisResult.reason}</div>
                    </div>
                    {analysisResult.source && (
                      <div className="source-badge">
                        {analysisResult.source === 'database' ? '📦 캐시된 결과' : '✨ 새로 분석된 결과'}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* 웹페이지 하단 휴지통 아이콘 */}
        {(isLoggedIn || isMyPage) && hiddenNoticeIds.length > 0 && (
          <button 
            className="trash-icon-bottom"
            onClick={() => setShowTrashModal(true)}
            title={`숨겨진 공지 ${hiddenNoticeIds.length}개`}
          >
            🗑️ <span className="trash-count-bottom">{hiddenNoticeIds.length}</span>
          </button>
        )}

        {/* 휴지통 모달 */}
        {showTrashModal && (
          <div className="modal-overlay" onClick={() => setShowTrashModal(false)}>
            <div className="trash-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🗑️ 숨겨진 공지</h3>
                <button className="close-btn" onClick={() => setShowTrashModal(false)}>×</button>
              </div>
              <div className="modal-content" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                {analysisHistory.filter(item => hiddenNoticeIds.includes(item.notice_id)).length > 0 ? (
                  <div className="history-list">
                    {analysisHistory
                      .filter(item => hiddenNoticeIds.includes(item.notice_id))
                      .map((item, idx) => (
                        <div key={idx} className="history-item" style={{opacity: 0.8}}>
                          <div className="history-header">
                            <span className={`dept-tag ${item.dept === '경북대 학사공지' ? 'global' : 'major'}`}>
                              {item.dept}
                            </span>
                            <span className="history-date">{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                          <h4 className="history-title">{item.title}</h4>
                          <div className="history-score">
                            <span className="score-badge">점수: {item.ai_score}/100</span>
                          </div>
                          <p className="history-reason">{item.ai_reason}</p>
                          <div className="history-footer">
                            <span className="history-time">{new Date(item.calculated_at).toLocaleString()}</span>
                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                              <button 
                                className="history-restore-btn"
                                onClick={() => {
                                  handleRestoreAnalysis(item.notice_id);
                                  if (hiddenNoticeIds.length === 1) {
                                    setShowTrashModal(false);
                                  }
                                }}
                              >
                                다시 추가
                              </button>
                              <button 
                                className="history-permanent-delete-btn"
                                onClick={() => {
                                  handlePermanentDelete(item.notice_id);
                                  if (hiddenNoticeIds.length === 1) {
                                    setShowTrashModal(false);
                                  }
                                }}
                              >
                                영구 삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="no-history">
                    <p>숨겨진 공지사항이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- [로그인/가입 화면] (기존 코드 유지) ---
  return (
    <div className="auth-wrapper">
      <div className="bg-overlay"></div>
      {/* ... (기존 로그인/회원가입/비번찾기 폼 코드 그대로 유지) ... */}
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
          </select>
          <textarea name="experience" placeholder="활동이력 및 관심분야 " rows="3" style={{width:'100%', marginTop:'10px', padding:'10px'}}/>
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