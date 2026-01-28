import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key'; // .env에 꼭 저장하세요!

// 1. 회원가입: 비밀번호 해싱 적용
router.post('/register', async (req, res) => {
   const { student_id, password, name, grade, department, experience_summary } = req.body;

    const client = await pool.connect(); // 트랜잭션을 위해 클라이언트 연결
    try {
        await client.query('BEGIN'); // 트랜잭션 시작

        // 중복 학번 체크
        const checkRes = await client.query("SELECT student_id FROM users WHERE student_id = $1", [student_id]);
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.json({ success: false, message: "이미 존재하는 학번입니다." });
        }

        // 회원 정보 저장
        await client.query(
            "INSERT INTO users (student_id, password, name, grade, department, experience_summary) VALUES ($1, $2, $3, $4, $5, $6)",
            [student_id, password, name, grade, department, experience_summary]
        );

        await client.query('COMMIT'); // 성공 시 커밋
        res.json({ success: true, message: "회원가입 성공!" });

    } catch (e) {
        await client.query('ROLLBACK'); // 에러 시 롤백
        res.json({ success: false, message: e.message });
    } finally {
        client.release();
    }
});

// 2. 로그인: 해시 비교 및 토큰 발행
router.post('/login', async (req, res) => {
    const { student_id, password } = req.body;
    
    try {
        // 파라미터 바인딩 ($1, $2)를 사용하여 보안 강화
        const result = await pool.query(
            "SELECT * FROM users WHERE student_id = $1 AND password = $2", 
            [student_id, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            delete user.password; // 비밀번호 제외하고 반환
            res.json({ success: true, user: user });
        } else {
            res.json({ success: false, message: "학번 또는 비밀번호가 틀렸습니다." });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "서버 에러 발생" });
    }
});

// 3. 비밀번호 재설정: 해싱 잊지 마세요!
router.post('/reset-password', async (req, res) => {
    const { student_id, new_password } = req.body;

    try {
        const result = await pool.query(
            "UPDATE users SET password = $1 WHERE student_id = $2",
            [new_password, student_id]
        );

        if (result.rowCount > 0) {
            res.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
        } else {
            res.json({ success: false, message: "존재하지 않는 학번입니다." });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 4. 회원 정보 수정 (마이페이지용)
router.post('/update', async (req, res) => {
    const { student_id, name, grade, department, experience_summary } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users 
             SET name = $1, grade = $2, department = $3, experience_summary = $4 
             WHERE student_id = $5 RETURNING *`,
            [name, grade, department, experience_summary, student_id]
        );

        if (result.rows.length > 0) {
            const updatedUser = result.rows[0];
            delete updatedUser.password;
            res.json({ success: true, message: "정보가 수정되었습니다.", user: updatedUser });
        } else {
            res.json({ success: false, message: "업데이트 실패" });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "서버 에러" });
    }
});

export default router;