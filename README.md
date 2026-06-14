# FoodBridge — Eliminate Food Waste, Feed Communities

FoodBridge is a real-time web platform connecting local food businesses (restaurants, caterers) with NGOs and shelters to safely coordinate surplus food donation, reduce landfill waste, and support local communities. Built with Astro, Tailwind CSS v4, Node.js, Express, and MongoDB.

## Features

- **Real-Time Listings** — Donors post surplus food with quantity, category, expiry window, and pickup coordinates. Listings update live.
- **Live Discovery Feed** — NGOs browse, filter, and claim available donations instantly. Each listing shows restaurant info (name, address, contact).
- **Secure Auth** — JWT-based registration/login with support for email or phone. Separate onboarding for Donors (restaurants) and Receivers (NGOs).
- **Role-Based Dashboard** — Restaurants see "Post Food" and "My Posts"; NGOs see "Browse Food" with claim functionality. Both see a profile section.
- **Messaging** — In-app messaging tied to orders for donor-receiver coordination (`/api/messages`).
- **Order Management** — Track claimed donations with status, pickup details, and timestamps.
- **Auto-Expiry** — Expired food listings are automatically removed from the feed.
- **Geolocation** — Pickup coordinates with "Use My Current Location" support and auto-generated address sentences.
- **Wise-Inspired Design** — Clean, glassmorphic UI with a custom design system documented in `DESIGN.md`.

## Tech Stack

- **Frontend:** Astro, Tailwind CSS v4, custom glassmorphism, responsive layout (located in [callous-corot](file:///Users/nivedmohan/Documents/food%20bridge%20copy/callous-corot))
- **Backend:** Node.js, Express.js (REST API) (located in [foodbridge-backend](file:///Users/nivedmohan/Documents/food%20bridge%20copy/foodbridge-backend))
- **Database:** MongoDB + Mongoose ODM
- **Auth:** JWT + bcryptjs
- **Deployment:** Render (backend), Cloudflare Pages (frontend)

## Models

| Model | Fields |
|---|---|
| `User` | email, phone, password (bcrypt), userType (restaurant/ngo), orgName, address, description |
| `FoodItem` | name, category, quantity, unit, description, expiryTime, pickupLocation (lat/lng + addressSentence), postedBy (ref User), status |
| `Order` | foodItem (ref FoodItem), donor (ref User), receiver (ref User), status, timestamps |
| `Message` | order (ref Order), sender (ref User), text, timestamps |
| `Otp` | email/phone, otp, expiresAt |

## API Routes

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Register new user (email/phone + password + userType) |
| `POST /api/auth/login` | Login via email or phone |
| `GET /api/users/:id` | Get user profile |
| `PUT /api/users/:id` | Update user profile |
| `GET /api/food` | List all active food items |
| `GET /api/food/restaurant/:userId` | List restaurant's own posts |
| `POST /api/food` | Create a food listing |
| `DELETE /api/food/:id` | Delete a food post |
| `DELETE /api/food/auto-remove` | Auto-remove expired listings |
| `GET /api/orders` | List orders (filtered by role) |
| `POST /api/orders` | Create/claim an order |
| `PUT /api/orders/:id` | Update order status |
| `GET /api/messages/:orderId` | Get messages for an order |
| `POST /api/messages` | Send a message |

## Getting Started

```bash
# Backend
cd foodbridge-backend
npm install
cp .env.example .env   # Set MONGODB_URI, JWT_SECRET, PORT
npm start

# Frontend — open front end/index.html in browser
# or deploy front end/ to Vercel/Netlify
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (default: foodbridgeSecret2025) |
| `PORT` | Server port (default: 5001) |
| `CORS_ORIGIN` | Comma-separated allowed CORS origins |

## Design System

A complete Wise-inspired design token system is documented in `DESIGN.md`, including colors, typography scale (Wise Sans + Inter), spacing, border radius, and component specifications.
