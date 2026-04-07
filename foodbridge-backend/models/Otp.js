const mongoose = require('mongoose');
const OtpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  otpCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Otp', OtpSchema);
