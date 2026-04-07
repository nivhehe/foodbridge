const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'foodbridgeSecret2025';

router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, userType } = req.body;
    if (!password || !(email || phone) || !userType) return res.status(400).json({ message: "Missing fields" });
    if (await User.findOne({ $or: [{ email }, { phone }] })) return res.status(400).json({ message: 'Email or Phone exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, phone, password: hashed, userType });
    res.status(201).json({ message: 'Registered' });
  } catch (err) {
    res.status(400).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { emailOrPhone, password } = req.body;
  const user = await User.findOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
  const payload = { userId: user._id, userType: user.userType };
  const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });
  res.json({ token, userId: user._id, userType: user.userType });
});

module.exports = router;
