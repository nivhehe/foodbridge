const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: Number,
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
