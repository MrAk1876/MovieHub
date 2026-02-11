const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const movieRoutes = require("./routes/movieRoutes");
const Movie = require("./models/Movie");

const app = express();
const PORT = process.env.PORT || 5000;
// Atlas-first connection strategy:
// 1) Use ATLAS_MONGO_URI when provided
// 2) Optional fallback to LOCAL_MONGO_URI for local development only
const ATLAS_MONGO_URI = process.env.ATLAS_MONGO_URI;
const LOCAL_MONGO_URI = process.env.LOCAL_MONGO_URI;
const MONGO_URI = ATLAS_MONGO_URI || LOCAL_MONGO_URI;

if (!MONGO_URI) {
  throw new Error(
    "Database URI is missing. Set ATLAS_MONGO_URI in .env (LOCAL_MONGO_URI is optional fallback)."
  );
}

app.use(cors());
app.use(express.json());

app.use("/api/movies", movieRoutes);
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

// Centralized error handler keeps API responses consistent.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong.",
  });
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected successfully (${ATLAS_MONGO_URI ? "Atlas" : "Local"}).`);

    // One-time safety pass for upgraded projects:
    // if legacy per-section order values created duplicates/invalid values,
    // normalize them into a valid global sequence (1..n).
    await normalizeLegacyGlobalOrder();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

async function normalizeLegacyGlobalOrder() {
  const movies = await Movie.find()
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .select("_id order");

  if (!movies.length) return;

  const seenOrders = new Set();
  let requiresNormalization = false;

  for (const movie of movies) {
    const order = Number(movie.order);
    const isValid = Number.isInteger(order) && order > 0;
    const duplicate = seenOrders.has(order);

    if (!isValid || duplicate) {
      requiresNormalization = true;
      break;
    }

    seenOrders.add(order);
  }

  if (!requiresNormalization) return;

  const resetBatch = movies.map((movie, index) => ({
    updateOne: {
      filter: { _id: movie._id },
      update: { $set: { order: index + 1 } },
    },
  }));

  if (resetBatch.length) {
    // Move away from the target range first to avoid unique-index collisions.
    await Movie.updateMany({}, { $inc: { order: 1000000 } });
    await Movie.bulkWrite(resetBatch);
  }

  console.log("Normalized legacy movie order to global unique sequence.");
}

startServer();
