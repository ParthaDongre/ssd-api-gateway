require("dotenv").config();

const express = require("express");

const {
  initializeConfig,
  resolveRoute,
  stopWatching,
  getActiveRoutes
} = require("./config/configLoader");

const authMiddleware = require("./middleware/authMiddleware");
const { forwardRequest } = require("./proxy/proxyEngine");
const { connectDB, getDatabaseStatus } = require("./db/connection");
const {
  startAllServices,
  stopAllServices,
  startService,
  stopService,
  toggleService,
  isServiceRunning,
  getServicesStatus,
  SERVICES,
  isVercel
} = require("./services/serviceManager");

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.disable("x-powered-by");

// Parse JSON specifically for gateway control endpoints
const jsonParser = express.json();

// CORS headers to enable seamless local frontend and dev tool integration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Gateway System Health Check
app.get("/health", (req, res) => {
  const dbStatus = getDatabaseStatus();
  res.status(200).json({
    service: "dynamic-l7-api-gateway",
    status: "healthy",
    port: PORT,
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Read-only configuration introspection endpoint for developer dashboard
app.get("/api/v1/gateway/routes", (req, res) => {
  const routes = getActiveRoutes ? getActiveRoutes() : {};
  res.status(200).json({
    service: "dynamic-l7-api-gateway",
    status: "healthy",
    count: Object.keys(routes).length,
    routes
  });
});

// Database & AWS DynamoDB status
app.get("/api/v1/gateway/db-status", (req, res) => {
  const dbStatus = getDatabaseStatus();
  res.status(200).json({
    service: "dynamic-l7-api-gateway",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Service Manager: Get live status of all downstream microservices
app.get("/api/v1/gateway/services/status", (req, res) => {
  const services = getServicesStatus();
  res.status(200).json({
    service: "dynamic-l7-api-gateway",
    mode: isVercel ? "serverless" : "tcp-microservices",
    services
  });
});

// Service Manager: Stop a specific microservice with 1 click
app.post("/api/v1/gateway/services/:key/stop", async (req, res) => {
  const { key } = req.params;
  try {
    const result = await stopService(key);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message, status: 400 });
  }
});

// Service Manager: Start a specific microservice with 1 click
app.post("/api/v1/gateway/services/:key/start", async (req, res) => {
  const { key } = req.params;
  try {
    const result = await startService(key);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message, status: 400 });
  }
});

// Service Manager: Toggle running state
app.post("/api/v1/gateway/services/:key/toggle", async (req, res) => {
  const { key } = req.params;
  try {
    const result = await toggleService(key);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message, status: 400 });
  }
});

// Helper to map route prefix to service key
function getServiceKeyForRoute(prefix) {
  if (prefix.includes("auth")) return "auth";
  if (prefix.includes("users")) return "users";
  if (prefix.includes("orders")) return "orders";
  return null;
}

// Gateway Dynamic Routing & Proxy Pipeline
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
  const svcKey = getServiceKeyForRoute(route.prefix);

  // Check if service was stopped by user in the UI
  if (svcKey && !isServiceRunning(svcKey)) {
    console.warn(`[Gateway] Request rejected: Target service '${svcKey}' is stopped.`);
    return res.status(503).json({
      error: "Downstream Service Unavailable",
      status: 503,
      code: "ECONNREFUSED",
      service: svcKey,
      target: route.target,
      message: `The downstream service at ${route.target} (${SERVICES[svcKey]?.name || svcKey}) is currently offline or stopped.`,
      gateway: {
        route: route.prefix,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      }
    });
  }

  console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${route.target}`);

  authMiddleware(req, res, () => {
    // In Vercel serverless environment:
    // Dispatch in-process to the express apps since background TCP listeners don't exist in serverless
    if (isVercel && svcKey && SERVICES[svcKey]?.instance?.app) {
      const targetApp = SERVICES[svcKey].instance.app;
      // Strip prefix if required
      if (route.stripPrefix) {
        req.url = req.originalUrl.replace(new RegExp(`^${route.prefix}`), "") || "/";
      }
      if (req.user && req.user.sub) {
        req.headers["x-authenticated-user"] = String(req.user.sub);
        if (req.user.username) {
          req.headers["x-authenticated-username"] = String(req.user.username);
        }
      }
      return targetApp(req, res, next);
    }

    // In local / standard Node.js environment: forward through HTTP reverse proxy
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
  stopAllServices().catch(() => {});

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

  setTimeout(() => {
    console.error("[Gateway] Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

async function startServer(port = PORT) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in the .env file.");
  }

  initializeConfig();

  // Initialize DynamoDB connection and verify tables
  try {
    await connectDB();
  } catch (err) {
    console.warn("[Gateway] Database connect notice:", err.message);
  }

  // Automatically start all downstream mock microservices if running locally
  if (!isVercel) {
    await startAllServices();
  }

  return new Promise((resolve, reject) => {
    server = app.listen(port, "0.0.0.0", () => {
      console.log(`[Gateway] Listening on http://localhost:${port}`);
      console.log("[Gateway] Dynamic routing, AWS DynamoDB, and Server Control enabled.");
      resolve(server);
    });

    server.on("error", (error) => {
      console.error("[Gateway] Server error:", error.message);
      reject(error);
    });

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  });
}

if (require.main === module) {
  startServer().catch(() => {
    process.exit(1);
  });
}

module.exports = { app, startServer, shutdown };
