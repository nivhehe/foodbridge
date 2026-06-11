const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const { authenticate } = require('../middleware/auth');

// Place an order / Claim food (by NGO)
router.post('/', authenticate, async (req, res) => {
  try {
    const { food, ngo } = req.body;
    if (!food || !ngo) {
      return res.status(400).json({ message: 'Food ID and NGO ID are required' });
    }
    
    // Check if food is already claimed or deleted
    const foodItem = await FoodItem.findById(food);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    if (foodItem.status === 'Claimed') {
      return res.status(400).json({ message: 'Food item has already been claimed by another NGO' });
    }

    // Generate handshake code
    const handshakeCode = `FB-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = new Order({
      food,
      ngo,
      quantity: foodItem.quantity,
      handshakeCode,
      status: 'pending'
    });
    
    await order.save();

    // Update food item status to Claimed
    foodItem.status = 'Claimed';
    await foodItem.save();

    res.status(201).json(order);
  } catch(err) {
    res.status(400).json({ message: 'Order failed', error: err.message });
  }
});

// List all orders for an NGO
router.get('/ngo/:ngoId', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ ngo: req.params.ngoId })
      .populate({
        path: 'food',
        populate: { path: 'postedBy', select: 'orgName email phone address description' }
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch(err) {
    res.status(500).json({ message: 'Failed to get orders', error: err.message });
  }
});

// List all orders for a restaurant (for their food items)
router.get('/restaurant/:restaurantId', authenticate, async (req, res) => {
  try {
    const foods = await FoodItem.find({ postedBy: req.params.restaurantId });
    const foodIds = foods.map(f => f._id);
    const orders = await Order.find({ food: { $in: foodIds } })
      .populate('food')
      .populate('ngo', 'orgName email phone address description')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch(err) {
    res.status(500).json({ message: 'Failed to get restaurant orders', error: err.message });
  }
});

// Release a claim (by NGO)
router.delete('/food/:foodId', authenticate, async (req, res) => {
  try {
    // Find the pending order for this food
    const order = await Order.findOne({ food: req.params.foodId, status: 'pending' });
    if (!order) {
      return res.status(404).json({ message: 'Pending claim not found' });
    }

    // Delete the order
    await Order.findByIdAndDelete(order._id);

    // Update the food item status back to Active
    await FoodItem.findByIdAndUpdate(req.params.foodId, { status: 'Active' });

    res.json({ message: 'Claim released successfully' });
  } catch(err) {
    res.status(400).json({ message: 'Release failed', error: err.message });
  }
});

// Verify handshake code (by NGO or restaurant)
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { foodId, handshakeCode } = req.body;
    if (!foodId || !handshakeCode) {
      return res.status(400).json({ message: 'Food ID and Handshake Code are required' });
    }
    
    // Find pending order for this food
    const order = await Order.findOne({ food: foodId, status: 'pending' });
    if (!order) {
      return res.status(404).json({ message: 'No pending claim found for this item' });
    }

    if (order.handshakeCode.toUpperCase() !== handshakeCode.toUpperCase()) {
      return res.status(400).json({ message: 'Invalid handshake code' });
    }

    // Update order status to completed
    order.status = 'completed';
    await order.save();

    res.json({ message: 'Handshake verified successfully' });
  } catch(err) {
    res.status(400).json({ message: 'Verification failed', error: err.message });
  }
});

module.exports = router;
