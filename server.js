const app = require("./src/app");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Memory Gallery server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});