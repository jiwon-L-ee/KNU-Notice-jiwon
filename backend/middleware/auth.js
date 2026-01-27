import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    // .env와 이름 일치 확인: JWT_SECRET_KEY
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    // 유저 ID가 없는 비정상적인 토큰 차단
    if (!decoded.id) {
      return res.status(401).json({ success: false, error: 'Invalid token payload.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    res.status(403).json({ success: false, error: 'Invalid or tampered token.' });
  }
};

export default authenticateToken;