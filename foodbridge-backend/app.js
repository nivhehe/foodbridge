const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or curl/postman requests with no origin header.
    if (!origin) return callback(null, true);
    // Allow file:// opened frontend pages (Origin: null) in local development.
    if (origin === 'null') return callback(null, true);

    const allowedExact = new Set([
      "https://foodbridge-tau.vercel.app",
      process.env.FRONTEND_URL
    ].filter(Boolean));

    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isVercelPreview = /^https:\/\/.*\.vercel\.app$/.test(origin);

    if (allowedExact.has(origin) || isLocalhost || isVercelPreview) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  }
}));
app.use(express.json());

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/food', require('./routes/food'));

// ✅ Test Route
app.get('/', (req, res) => {
  res.send("Backend is running 🚀");
});

// ✅ ENV variables
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGODB_URI;

// 🔍 Debug (optional)
console.log("MONGO_URI:", MONGO_URI);

// ❌ Stop if ENV missing
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

// ✅ Remove mongoose warning
mongoose.set('strictQuery', false);

// ✅ Connect DB and Start Server
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

startServer();
