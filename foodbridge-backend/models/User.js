const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  phone: String,
  password: String,
  userType: String, // 'restaurant' or 'ngo'
  orgName: String,  // Restaurant/NGO name
  address: String,
  description: String
});

module.exports = mongoose.model('User', userSchema);
