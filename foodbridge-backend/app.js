const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/food', require('./routes/food'));

// Test route (to check if server is running)
app.get('/', (req, res) => {
  res.send("Backend is running 🚀");
});

// ENV variables
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGODB_URI;

// 🔍 Debug log (IMPORTANT)
console.log("MONGO_URI:", MONGO_URI);

// ❌ If ENV missing → stop app
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

// MongoDB & Server
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("✅ MongoDB connected");

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error("❌ MongoDB connection error:", err);
});