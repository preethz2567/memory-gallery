const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const photosRouter = require("./routes/photos");
const reactionsRouter = require("./routes/reactions");

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded form data (for non-file form fields like caption)
app.use(express.urlencoded({ extended: true }));

// CORS — in development, React runs on a different port (5173)
// In production, both are served from the same origin so CORS isn't needed
// but it doesn't hurt to have it
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : "http://localhost:5173",
  })
);

// API routes
app.use("/api/photos", photosRouter);
app.use("/api/reactions", reactionsRouter);

// In production, serve the React build as static files
// The Dockerfile builds the React app first, output goes to client/dist
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  // For any route that isn't an API route, serve index.html
  // This lets React Router handle client-side navigation
  app.get("(.*)", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Global error handler — catches any error passed via next(err)
// Must have 4 parameters for Express to recognize it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;