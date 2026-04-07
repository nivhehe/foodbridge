const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Middleware
app.use(cors({
  origin: "https://foodbridge-tau.vercel.app", // allow all (you can restrict later)
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