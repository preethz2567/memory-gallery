const express = require("express");
const router = express.Router();
const pool = require("../db");

// POST /api/comments — add a comment to a photo
router.post("/", async (req, res) => {
  try {
    const { photo_id, commenter_name, text } = req.body;

    if (!photo_id || !commenter_name?.trim() || !text?.trim()) {
      return res.status(400).json({
        error: "photo_id, commenter_name, and text are required",
      });
    }

    // Confirm the photo exists before adding a comment to it
    const photo = await pool.query(
      "SELECT id FROM photos WHERE id = $1",
      [photo_id]
    );
    if (photo.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const result = await pool.query(
      `INSERT INTO comments (photo_id, commenter_name, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [photo_id, commenter_name.trim(), text.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to add comment:", err.message);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// GET /api/comments/:photoId — get all comments for a photo
router.get("/:photoId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, commenter_name, text, created_at
       FROM comments
       WHERE photo_id = $1
       ORDER BY created_at ASC`,
      [req.params.photoId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch comments:", err.message);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

module.exports = router;
