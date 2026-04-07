const express = require('express');
const https = require('https');
const FoodItem = require('../models/FoodItem');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

function reverseGeocodeFromCoords(latitude, longitude) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    https.get(url, {
      headers: {
        'User-Agent': 'FoodBridge/1.0 (pickup-location-service)'
      }
    }, (response) => {
      let rawData = '';
      response.on('data', (chunk) => {
        rawData += chunk;
      });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed && parsed.display_name) {
            resolve(`Pickup is available at ${parsed.display_name}.`);
            return;
          }
        } catch (error) {
          // Fall through to coordinate-only sentence.
        }
        resolve(`Pickup is available at coordinates (${latitude}, ${longitude}).`);
      });
    }).on('error', () => {
      resolve(`Pickup is available at coordinates (${latitude}, ${longitude}).`);
    });
  });
}

// Post new food (restaurant only)
router.post('/', authenticate, async (req, res) => {
  const { name, category, quantity, unit, description, expiryTime, latitude, longitude } = req.body;
  if (!name || !category || !quantity || !unit || !expiryTime || latitude === undefined || longitude === undefined)
    return res.status(400).json({ message: 'Required fields missing' });

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
    return res.status(400).json({ message: 'Latitude and longitude must be valid numbers' });
  }

  const addressSentence = await reverseGeocodeFromCoords(parsedLatitude, parsedLongitude);

  const food = await FoodItem.create({
    name, category, quantity, unit, description, expiryTime,
    pickupLocation: {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      addressSentence
    },
    postedBy: req.user.userId
  });
  res.status(201).json(food);
});

// Get all non-expired food
router.get('/', async (req, res) => {
  const now = new Date();
  const foods = await FoodItem.find().populate('postedBy', 'orgName email phone address description');
  const nonExpired = foods.filter(food => {
    const expiresAt = new Date(food.createdAt.getTime() + food.expiryTime * 60 * 60 * 1000);
    return expiresAt > now && food.status === 'Active';
  });
  res.json(nonExpired);
});


// My Posts (restaurant)
router.get('/restaurant/:userId', authenticate, async (req, res) => {
  const now = new Date();
  const foods = await FoodItem.find({ postedBy: req.params.userId });
  const nonExpired = foods.filter(food => {
    const expiresAt = new Date(food.createdAt.getTime() + food.expiryTime * 60 * 60 * 1000);
    return expiresAt > now && food.status === 'Active';
  });
  res.json(nonExpired);
});

// Auto-remove expired
router.delete('/auto-remove', authenticate, async (req, res) => {
  const now = new Date();
  const foods = await FoodItem.find({ status: 'Active' });
  for (let food of foods) {
    const expiresAt = new Date(food.createdAt.getTime() + food.expiryTime * 60 * 60 * 1000);
    if (expiresAt < now) {
      await FoodItem.findByIdAndUpdate(food._id, { status: 'Claimed' });
    }
  }
  res.json({ message: "Expired foods updated" });
});

// Delete a post (only by the restaurant who posted it)
router.delete('/:foodId', authenticate, async (req, res) => {
  const food = await FoodItem.findById(req.params.foodId);
  if (!food) {
    return res.status(404).json({ message: 'Food post not found' });
  }

  if (String(food.postedBy) !== String(req.user.userId)) {
    return res.status(403).json({ message: 'You can delete only your own food posts' });
  }

  await FoodItem.findByIdAndDelete(req.params.foodId);
  return res.json({ message: 'Food post deleted successfully' });
});

module.exports = router;
