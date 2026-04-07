const express = require('express');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/:id', authenticate, async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json({
    orgName: user.orgName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    description: user.description
  });
});

router.put('/:id', authenticate, async (req, res) => {
  const { orgName, email, phone, address, description } = req.body;
  await User.findByIdAndUpdate(req.params.id, { orgName, email, phone, address, description });
  res.json({ message: "Profile updated" });
});

module.exports = router;
