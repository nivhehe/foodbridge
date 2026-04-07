const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'foodbridgeSecret2025';

router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, userType } = req.body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    const normalizedPhone = phone ? String(phone).trim() : '';
    if (!password || !(normalizedEmail || normalizedPhone) || !userType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const duplicateQuery = [];
    if (normalizedEmail) duplicateQuery.push({ email: normalizedEmail });
    if (normalizedPhone) duplicateQuery.push({ phone: normalizedPhone });
    if (duplicateQuery.length && await User.findOne({ $or: duplicateQuery })) {
      return res.status(400).json({ message: 'Email or Phone exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email: normalizedEmail, phone: normalizedPhone, password: hashed, userType });
    res.status(201).json({ message: 'Registered' });
  } catch (err) {
    res.status(400).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const rawIdentifier = req.body.emailOrPhone || req.body.email || req.body.phone || '';
  const password = String(req.body.password || '');
  const identifier = String(rawIdentifier).trim();
  const identifierEmail = identifier.toLowerCase();

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  const user = await User.findOne({
    $or: [
      { email: identifierEmail },
      { email: identifier }, // fallback for older records not normalized
      { phone: identifier }
    ]
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  let passwordMatched = false;
  if (typeof user.password === 'string' && user.password.startsWith('$2')) {
    passwordMatched = await bcrypt.compare(password, user.password);
  } else if (String(user.password || '') === password) {
    // Backward compatibility for any legacy plaintext records.
    passwordMatched = true;
    user.password = await bcrypt.hash(password, 10);
    await user.save();
  }

  if (!passwordMatched) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const payload = { userId: user._id, userType: user.userType };
  const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });
  res.json({ token, userId: user._id, userType: user.userType });
});

module.exports = router;
