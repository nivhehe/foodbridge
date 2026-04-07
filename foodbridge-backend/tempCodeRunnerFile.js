require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection (Atlas)
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Auth (login/OTP) routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// User profile/details routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Food posting/listing routes
const foodRoutes = require('./routes/food');
app.use('/api/food', foodRoutes);

// Order creation/listing routes
const orderRoutes = require('./routes/Orders');
app.use('/api/orders', orderRoutes);

// Optional root health check
app.get('/', (req, res) => {
  res.send('FoodBridge backend is running!');
});

app.listen(5001, () => console.log('Server running on port 5001'));
