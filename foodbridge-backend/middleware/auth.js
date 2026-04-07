const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'foodbridgeSecret2025';

function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ message: 'Invalid token' });
  }
}

module.exports = { authenticate };
