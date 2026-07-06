const multer = require("multer");

// memoryStorage keeps the file as a Buffer in memory
// instead of writing it to disk — we upload straight to S3
// so we never need a local copy
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files — reject anything else immediately
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP and GIF images are allowed"), false);
    }
  },
});

module.exports = upload;