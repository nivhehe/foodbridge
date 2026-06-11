const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  phone: String,
  password: String,
  userType: String,
  orgName: String,
  address: String,
  description: String
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
