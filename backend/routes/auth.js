import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import authenticateToken from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateStudentId, validatePassword, validateName } from '../middleware/validator.js';

const router = express.Router();
// JWT_SECRET_KEY와 일치시킴 (auth.js middleware와 동일한 환경 변수 사용)
const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'your_super_secret_key';

// 1. 회원가입: 비밀번호 해싱 적용 (Rate limiting 적용)
router.post('/register', authRateLimiter, async (req, res) => {
   const { student_id, password, name, grade, department, experience_summary } = req.body;

    // 입력 검증
    const studentIdValidation = validateStudentId(student_id);
    if (!studentIdValidation.valid) {
        return res.status(400).json({ success: false, message: studentIdValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
        return res.status(400).json({ success: false, message: nameValidation.message });
    }

    const sanitizedStudentId = studentIdValidation.value;
    const sanitizedPassword = passwordValidation.value;
    const sanitizedName = nameValidation.value;

    const client = await pool.connect(); // 트랜잭션을 위해 클라이언트 연결
    try {
        await client.query('BEGIN'); // 트랜잭션 시작

        // 중복 학번 체크
        const checkRes = await client.query("SELECT student_id FROM users WHERE student_id = $1", [sanitizedStudentId]);
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "이미 존재하는 학번입니다." });
        }

        // 비밀번호 해싱
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(sanitizedPassword, saltRounds);

        // 회원 정보 저장 (sanitized 값 사용)
        await client.query(
            "INSERT INTO users (student_id, password, name, grade, department, experience_summary) VALUES ($1, $2, $3, $4, $5, $6)",
            [sanitizedStudentId, hashedPassword, sanitizedName, grade || null, department || null, experience_summary || null]
        );

        await client.query('COMMIT'); // 성공 시 커밋
        res.status(201).json({ success: true, message: "회원가입 성공!" });

    } catch (e) {
        await client.query('ROLLBACK'); // 에러 시 롤백
        console.error('[회원가입 오류]:', e);
        res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    } finally {
        client.release();
    }
});

// 2. 로그인: 해시 비교 및 토큰 발행 (Rate limiting 적용)
router.post('/login', authRateLimiter, async (req, res) => {
    const { student_id, password } = req.body;
    
    // 입력 검증
    const studentIdValidation = validateStudentId(student_id);
    if (!studentIdValidation.valid) {
        return res.status(400).json({ success: false, message: studentIdValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const sanitizedStudentId = studentIdValidation.value;
    
    try {
        // 사용자 조회 (비밀번호는 해시로 저장되어 있음)
        const result = await pool.query(
            "SELECT * FROM users WHERE student_id = $1", 
            [sanitizedStudentId]
        );

        if (result.rows.length === 0) {
            // 보안: 존재하지 않는 사용자와 잘못된 비밀번호를 구분하지 않음
            return res.status(401).json({ success: false, message: "학번 또는 비밀번호가 틀렸습니다." });
        }

        const user = result.rows[0];
        
        // 해시된 비밀번호 비교
        const isPasswordValid = await bcrypt.compare(passwordValidation.value, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "학번 또는 비밀번호가 틀렸습니다." });
        }

        // JWT 토큰 발행
        const token = jwt.sign(
            { id: user.id, student_id: user.student_id },
            JWT_SECRET,
            { expiresIn: '7d' } // 7일 유효
        );

        delete user.password; // 비밀번호 제외하고 반환
        res.json({ 
            success: true, 
            user: user,
            token: token 
        });
    } catch (e) {
        console.error('[로그인 오류]:', e);
        res.status(500).json({ success: false, message: "서버 에러 발생" });
    }
});

// 3. 비밀번호 재설정: 해싱 적용 (Rate limiting 적용)
router.post('/reset-password', authRateLimiter, async (req, res) => {
    const { student_id, new_password } = req.body;

    // 입력 검증
    const studentIdValidation = validateStudentId(student_id);
    if (!studentIdValidation.valid) {
        return res.status(400).json({ success: false, message: studentIdValidation.message });
    }

    const passwordValidation = validatePassword(new_password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const sanitizedStudentId = studentIdValidation.value;

    try {
        // 비밀번호 해싱
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordValidation.value, saltRounds);

        const result = await pool.query(
            "UPDATE users SET password = $1 WHERE student_id = $2",
            [hashedPassword, sanitizedStudentId]
        );

        if (result.rowCount > 0) {
            res.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
        } else {
            res.status(404).json({ success: false, message: "존재하지 않는 학번입니다." });
        }
    } catch (e) {
        console.error('[비밀번호 재설정 오류]:', e);
        res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    }
});

// 4. 회원 정보 수정 (마이페이지용) - 인증 필요
router.post('/update', authenticateToken, async (req, res) => {
    // 토큰에서 사용자 ID 가져오기 (보안 강화)
    const userId = req.user.id;
    const { name, grade, department, experience_summary } = req.body;

    // 이름 검증 (선택적)
    if (name) {
        const nameValidation = validateName(name);
        if (!nameValidation.valid) {
            return res.status(400).json({ success: false, message: nameValidation.message });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. 사용자 정보 업데이트 (토큰의 userId 사용)
        const result = await client.query(
            `UPDATE users 
             SET name = COALESCE($1, name), grade = COALESCE($2, grade), department = COALESCE($3, department), experience_summary = COALESCE($4, experience_summary)
             WHERE id = $5 RETURNING id, *`,
            [name || null, grade || null, department || null, experience_summary || null, userId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "업데이트 실패: 사용자를 찾을 수 없습니다." });
        }

        const updatedUser = result.rows[0];

        // 2. 회원 정보 수정 시 기존 분석 결과 모두 삭제
        const deleteResult = await client.query(
            'DELETE FROM user_recommendations WHERE user_id = $1',
            [userId]
        );

        console.log(`[회원 정보 수정] 사용자 ID ${userId}의 분석 결과 ${deleteResult.rowCount}개 삭제됨`);

        await client.query('COMMIT');

        delete updatedUser.password;
        res.json({ 
            success: true, 
            message: "정보가 수정되었습니다. 기존 분석 결과가 초기화되었습니다.", 
            user: updatedUser 
        });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ success: false, message: "서버 에러" });
    } finally {
        client.release();
    }
});

export default router;