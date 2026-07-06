const express = require("express");
const router = express.Router();
const pool = require("../db");

const ALLOWED_EMOJIS = ["❤️", "🌟", "😊"];

// POST /api/reactions — add a reaction to a photo
router.post("/", async (req, res) => {
  try {
    const { photo_id, emoji, reactor_name } = req.body;

    if (!photo_id || !emoji || !reactor_name?.trim()) {
      return res.status(400).json({
        error: "photo_id, emoji, and reactor_name are required",
      });
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return res.status(400).json({
        error: `emoji must be one of: ${ALLOWED_EMOJIS.join(", ")}`,
      });
    }

    // Confirm the photo exists before adding a reaction to it
    const photo = await pool.query(
      "SELECT id FROM photos WHERE id = $1",
      [photo_id]
    );
    if (photo.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const result = await pool.query(
      `INSERT INTO reactions (photo_id, emoji, reactor_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [photo_id, emoji, reactor_name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to add reaction:", err.message);
    res.status(500).json({ error: "Failed to add reaction" });
  }
});

// GET /api/reactions/:photoId — get all reactions for a photo
// grouped by emoji with the list of names for each
router.get("/:photoId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        emoji,
        COUNT(*) as count,
        ARRAY_AGG(reactor_name ORDER BY reacted_at DESC) as names
       FROM reactions
       WHERE photo_id = $1
       GROUP BY emoji`,
      [req.params.photoId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch reactions:", err.message);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

module.exports = router;