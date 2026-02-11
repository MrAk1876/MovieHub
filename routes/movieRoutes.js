const express = require("express");
const mongoose = require("mongoose");
const Movie = require("../models/Movie");

const router = express.Router();

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function validateMoviePayload({ title, image, link, year, priorityNumber }) {
  if (
    !title ||
    !image ||
    !link ||
    year === undefined ||
    year === null ||
    priorityNumber === undefined ||
    priorityNumber === null
  ) {
    return "Title, image URL, watch link, year, and priority number are required.";
  }

  if (!isValidUrl(image) || !isValidUrl(link)) {
    return "Image and watch link must be valid URLs.";
  }

  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2100) {
    return "Year must be a valid number between 1888 and 2100.";
  }

  if (!parsePositiveInteger(priorityNumber)) {
    return "Priority number must be a positive integer.";
  }

  return null;
}

async function isOrderTaken(orderNumber, excludeMovieId = null) {
  const query = { order: orderNumber };
  if (excludeMovieId) {
    query._id = { $ne: excludeMovieId };
  }

  const existing = await Movie.findOne(query).select("_id");
  return Boolean(existing);
}

// GET /api/movies
// Global sorting contract:
// 1) order ascending (single unique ordering across all movies)
router.get("/", async (req, res, next) => {
  try {
    const movies = await Movie.find().sort({ order: 1, createdAt: 1, _id: 1 });
    res.json(movies);
  } catch (error) {
    next(error);
  }
});

// POST /api/movies
// Requires unique positive priority number (mapped to order field).
router.post("/", async (req, res, next) => {
  try {
    const { title, image, link, year, priorityNumber } = req.body;
    const validationError = validateMoviePayload({
      title,
      image,
      link,
      year,
      priorityNumber,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const orderNumber = parsePositiveInteger(priorityNumber);
    if (await isOrderTaken(orderNumber)) {
      return res.status(409).json({
        message: "Priority number already exists. Choose a unique number.",
      });
    }

    const movie = await Movie.create({
      title: title.trim(),
      image: image.trim(),
      link: link.trim(),
      year: Number(year),
      seen: false,
      order: orderNumber,
    });

    res.status(201).json(movie);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Priority number already exists. Choose a unique number.",
      });
    }
    next(error);
  }
});

// PUT /api/movies/reorder-global
// Reassigns global order sequentially (1..n) based on provided ordered IDs.
router.put("/reorder-global", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: "orderedIds must be an array." });
    }

    if (new Set(orderedIds).size !== orderedIds.length) {
      return res.status(400).json({ message: "orderedIds must not contain duplicates." });
    }

    const invalidId = orderedIds.find((id) => !validateObjectId(id));
    if (invalidId) {
      return res.status(400).json({ message: `Invalid movie id in orderedIds: ${invalidId}` });
    }

    const allMovies = await Movie.find().select("_id");
    if (orderedIds.length !== allMovies.length) {
      return res.status(400).json({
        message: "orderedIds must include every movie ID.",
      });
    }

    const expectedSet = new Set(allMovies.map((movie) => String(movie._id)));
    const receivedSet = new Set(orderedIds.map((id) => String(id)));

    if (expectedSet.size !== receivedSet.size) {
      return res.status(400).json({
        message: "orderedIds does not match movie IDs in database.",
      });
    }

    for (const id of expectedSet) {
      if (!receivedSet.has(id)) {
        return res.status(400).json({
          message: "orderedIds does not match movie IDs in database.",
        });
      }
    }

    const toFinalOrder = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    if (toFinalOrder.length) {
      // Shift every order away from the target range to avoid unique index collisions.
      await Movie.updateMany({}, { $inc: { order: 1000000 } });
      await Movie.bulkWrite(toFinalOrder);
    }

    const updatedMovies = await Movie.find().sort({ order: 1, createdAt: 1, _id: 1 });
    res.json({
      message: "Global order updated successfully.",
      movies: updatedMovies,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/movies/:id
// Supports editing priority number (order).
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid movie id." });
    }

    const { title, image, link, year, priorityNumber } = req.body;
    const validationError = validateMoviePayload({
      title,
      image,
      link,
      year,
      priorityNumber,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const orderNumber = parsePositiveInteger(priorityNumber);
    if (await isOrderTaken(orderNumber, id)) {
      return res.status(409).json({
        message: "Priority number already exists. Choose a unique number.",
      });
    }

    const updatedMovie = await Movie.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        image: image.trim(),
        link: link.trim(),
        year: Number(year),
        order: orderNumber,
      },
      { new: true, runValidators: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    res.json(updatedMovie);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Priority number already exists. Choose a unique number.",
      });
    }
    next(error);
  }
});

// DELETE /api/movies/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid movie id." });
    }

    const deletedMovie = await Movie.findByIdAndDelete(id);
    if (!deletedMovie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    res.json({ message: "Movie deleted successfully." });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/movies/:id/toggle
// Toggle watched state without changing global order.
router.patch("/:id/toggle", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid movie id." });
    }

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    movie.seen = !movie.seen;
    const updatedMovie = await movie.save();
    res.json(updatedMovie);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
