const express = require("express");
const router = express.Router();
const pool = require("../db");
const upload = require("../middleware/upload");
const { uploadToS3, deleteFromS3 } = require("../s3");

// Middleware that checks the admin password before allowing upload/delete
// Password comes from env var — never hardcoded
function requireAdmin(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// GET /api/photos — returns all photos with their reaction counts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.s3_url,
        p.caption,
        p.uploaded_at,
        COUNT(r.id) AS reaction_count
      FROM photos p
      LEFT JOIN reactions r ON r.photo_id = p.id
      GROUP BY p.id
      ORDER BY p.uploaded_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch photos:", err.message);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

// GET /api/photos/:id — returns one photo with all its reactions
router.get("/:id", async (req, res) => {
  try {
    const photo = await pool.query(
      "SELECT * FROM photos WHERE id = $1",
      [req.params.id]
    );
    if (photo.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const reactions = await pool.query(
      "SELECT emoji, reactor_name, reacted_at FROM reactions WHERE photo_id = $1 ORDER BY reacted_at DESC",
      [req.params.id]
    );

    res.json({ ...photo.rows[0], reactions: reactions.rows });
  } catch (err) {
    console.error("Failed to fetch photo:", err.message);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});

// POST /api/photos — upload a new photo (admin only)
router.post("/", requireAdmin, upload.single("photo"), async (req, res) => {
  try {
    const { caption } = req.body;
    if (!caption || !caption.trim()) {
      return res.status(400).json({ error: "Caption is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Photo file is required" });
    }

    // Upload the file buffer to S3
    const { key, url } = await uploadToS3(req.file.buffer, req.file.mimetype);

    // Save the metadata to PostgreSQL
    const result = await pool.query(
      "INSERT INTO photos (s3_key, s3_url, caption) VALUES ($1, $2, $3) RETURNING *",
      [key, url, caption.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to upload photo:", err.message);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

// DELETE /api/photos/:id — delete a photo (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const photo = await pool.query(
      "SELECT s3_key FROM photos WHERE id = $1",
      [req.params.id]
    );
    if (photo.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    // Delete from S3 first, then from DB
    // Order matters: if DB delete fails, S3 file is already gone but
    // we can re-try; if S3 delete fails, the DB row still references
    // a valid file so nothing is broken
    await deleteFromS3(photo.rows[0].s3_key);
    await pool.query("DELETE FROM photos WHERE id = $1", [req.params.id]);

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error("Failed to delete photo:", err.message);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

module.exports = router;