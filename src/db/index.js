const { Pool } = require("pg");
require("dotenv").config();

// A connection pool reuses existing DB connections instead of
// opening a new one for every request — essential for performance
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // In production (AWS RDS), we need SSL — locally we don't
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

// Test the connection on startup so you know immediately if DB is unreachable
pool.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Database connected successfully");
  }
});

module.exports = pool;