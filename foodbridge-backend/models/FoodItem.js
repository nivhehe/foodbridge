const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: Number,
  unit: String,
  description: String,
  expiryTime: Number,
  pickupLocation: {
    latitude: Number,
    longitude: Number,
    addressSentence: String
  },
  status: { type: String, default: 'Active' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FoodItem', foodSchema);
