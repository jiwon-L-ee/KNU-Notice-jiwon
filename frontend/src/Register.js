// frontend/src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: '', password: '', student_id: '', grade: '', department: '', name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      alert("회원가입 완료! 학번으로 로그인하세요.");
      navigate('/login');
    } else {
      alert("중복된 아이디 혹은 오류 발생");
    }
  };

  return (
    <div className="auth-form">
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="아이디" onChange={e => setFormData({...formData, id: e.target.value})} required />
        <input type="text" placeholder="학번 (비밀번호로 사용됨)" onChange={e => {
            setFormData({...formData, student_id: e.target.value, password: e.target.value});
        }} required />
        <input type="text" placeholder="이름" onChange={e => setFormData({...formData, name: e.target.value})} required />
        <input type="text" placeholder="학과" onChange={e => setFormData({...formData, department: e.target.value})} required />
        <input type="text" placeholder="학년" onChange={e => setFormData({...formData, grade: e.target.value})} required />
        <button type="submit">가입하기</button>
      </form>
    </div>
  );
}

export default Register;