if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "supersecretkey123";
}

const { app } = require("../src/server");
const { initializeConfig } = require("../src/config/configLoader");
const { connectDB } = require("../src/db/connection");

try {
  initializeConfig();
} catch (e) {
  console.warn("[Serverless] Config init notice:", e.message);
}

connectDB().catch((err) => {
  console.warn("[Serverless] DB connect notice:", err.message);
});

// Vercel serverless function entrypoint
module.exports = app;

