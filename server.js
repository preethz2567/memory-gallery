const app = require("./src/app");
const pool = require("./src/db");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    const schema = fs.readFileSync(
      path.join(__dirname, "src/db/schema.sql"),
      "utf8"
    );
    await pool.query(schema);
    console.log("Database schema applied successfully");
  } catch (err) {
    console.error("Failed to apply schema:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Memory Gallery server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();