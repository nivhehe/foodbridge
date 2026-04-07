require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ✅ Middleware
app.use(cors({
  origin: "https://foodbridge-tau.vercel.app", // your frontend
}));
app.use(express.json());

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/food', require('./routes/food'));
app.use('/api/orders', require('./routes/Orders'));

// ✅ Test Route
app.get('/', (req, res) => {
  res.send('FoodBridge backend is running 🚀');
});

// ✅ ENV variables
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGODB_URI;

// ❌ Stop if missing
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

// ✅ Fix mongoose warning
mongoose.set('strictQuery', false);

// ✅ Start Server after DB connects
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();