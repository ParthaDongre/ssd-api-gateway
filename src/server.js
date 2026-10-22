require("dotenv").config();

const express = require("express");

const {
  initializeConfig,
  resolveRoute,
  stopWatching
} = require("./config/configLoader");

const authMiddleware = require("./middleware/authMiddleware");
const { forwardRequest } = require("./proxy/proxyEngine");

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.disable("x-powered-by");

// The gateway handles requests and streams them downstream.
// It deliberately does not parse request bodies before proxying them.
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "dynamic-l7-api-gateway",
    status: "healthy",
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {
  const route = resolveRoute(req.path);

  if (!route) {
    return res.status(404).json({
      error: "No matching gateway route",
      status: 404,
      path: req.path
    });
  }

  req.gatewayRoute = route;

  console.log(
    `[Gateway] ${req.method} ${req.originalUrl} -> ${route.target}`
  );

  authMiddleware(req, res, () => {
    forwardRequest(req, res, route);
  });
});

app.use((err, req, res, next) => {
  console.error("[Gateway] Unhandled request error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: "Internal Gateway Error",
    status: 500
  });
});

let server;

function shutdown(signal) {
  console.log(`[Gateway] Received ${signal}; shutting down.`);

  stopWatching();

  if (!server) {
    process.exit(0);
    return;
  }

  server.close((error) => {
    if (error) {
      console.error("[Gateway] Shutdown error:", error.message);
      process.exitCode = 1;
    }

    process.exit();
  });

  // Prevent a graceful shutdown from waiting indefinitely.
  setTimeout(() => {
    console.error("[Gateway] Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in the .env file.");
  }

  initializeConfig();

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Gateway] Listening on http://localhost:${PORT}`);
    console.log("[Gateway] Dynamic routing and JWT authentication enabled.");
  });

  server.on("error", (error) => {
    console.error("[Gateway] Server error:", error.message);
    process.exitCode = 1;
  });

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer();