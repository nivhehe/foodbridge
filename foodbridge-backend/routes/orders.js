const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Place an order (by NGO)
router.post('/', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch(err) {
    res.status(400).json({ message: 'Order failed', error: err.message });
  }
});

// List all orders for a user
router.get('/ngo/:ngoId', async (req, res) => {
  const orders = await Order.find({ ngo: req.params.ngoId }).populate('food');
  res.json(orders);
});

module.exports = router;
