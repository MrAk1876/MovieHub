const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required."],
    trim: true,
  },
  image: {
    type: String,
    required: [true, "Image URL is required."],
    trim: true,
  },
  link: {
    type: String,
    required: [true, "Watch link is required."],
    trim: true,
  },
  year: {
    type: Number,
    required: [true, "Release year is required."],
    min: [1888, "Year must be 1888 or later."],
    max: [2100, "Year must be 2100 or earlier."],
  },
  order: {
    type: Number,
    required: [true, "Order number is required."],
    unique: true,
    min: [1, "Order number must be a positive integer."],
  },
  seen: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Movie", movieSchema);
