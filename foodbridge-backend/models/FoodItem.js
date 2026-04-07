const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: Number,
  unit: String,
  description: String,
  expiryTime: Number, // hours
  pickupLocation: {
    latitude: Number,
    longitude: Number,
    addressSentence: String
  },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' }, // or 'Claimed'
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('FoodItem', foodSchema);
