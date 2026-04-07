const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/food', require('./routes/food'));

// MongoDB & Server
mongoose.connect('mongodb://127.0.0.1:27017/foodbridge', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(5001, () => console.log('API running on http://localhost:5001')))
  .catch(err => console.log('MongoDB connection error', err));
