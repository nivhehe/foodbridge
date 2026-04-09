const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173'
];

const configuredOrigins = String(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || !configuredOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ✅ Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/food', require('./routes/food'));

// ✅ Test Route
app.get('/', (req, res) => {
  res.send("Backend is running 🚀");
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'foodbridge-backend' });
});

// ✅ ENV variables
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGODB_URI;

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
    console.log("🌐 Allowed origins:", configuredOrigins.length ? allowedOrigins.join(', ') : 'all origins allowed');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

startServer();
