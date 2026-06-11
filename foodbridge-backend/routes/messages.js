const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Message = require('../models/Message');
const Order = require('../models/Order');

// Retrieve all messages for a specific order (claim)
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findById(orderId).populate('food');
    if (!order) {
      return res.status(404).json({ message: 'Order (claim) not found' });
    }

    // Authorization: User must be either the claiming NGO or the donating Restaurant
    const isNgo = String(order.ngo) === userId;
    const isRestaurant = order.food && String(order.food.postedBy) === userId;

    if (!isNgo && !isRestaurant) {
      return res.status(403).json({ message: 'Not authorized to view messages for this order' });
    }

    const messages = await Message.find({ order: orderId })
      .populate('sender', 'orgName userType')
      .sort({ createdAt: 1 }); // Chronological order

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving messages', error: err.message });
  }
});

// Post a new message for a specific order
router.post('/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const order = await Order.findById(orderId).populate('food');
    if (!order) {
      return res.status(404).json({ message: 'Order (claim) not found' });
    }

    // Authorization: User must be either the claiming NGO or the donating Restaurant
    const isNgo = String(order.ngo) === userId;
    const isRestaurant = order.food && String(order.food.postedBy) === userId;

    if (!isNgo && !isRestaurant) {
      return res.status(403).json({ message: 'Not authorized to send messages for this order' });
    }

    const message = new Message({
      order: orderId,
      sender: userId,
      text: text.trim()
    });

    await message.save();

    // Populate sender details for immediate use in UI
    const populated = await Message.findById(message._id).populate('sender', 'orgName userType');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Error saving message', error: err.message });
  }
});

// Delete a single message (only the sender can delete their own message)
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (String(message.sender) !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message', error: err.message });
  }
});

module.exports = router;
