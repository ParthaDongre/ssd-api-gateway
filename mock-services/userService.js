const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const express = require("express");
const { connectDB, mongoose } = require("../src/db/connection");
const User = require("../src/models/User");

const app = express();
const PORT = Number(process.env.USER_SERVICE_PORT || 5002);

app.disable("x-powered-by");
app.use(express.json());

connectDB().catch((err) => {
  console.error("[User Service] Initial MongoDB connection failed:", err.message);
});

app.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    service: "user-service",
    status: "healthy",
    port: PORT,
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.get("/profile", async (req, res) => {
  try {
    const authenticatedUserId = req.get("X-Authenticated-User");

    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Authentication required: missing verified identity header",
        status: 401
      });
    }

    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      return res.status(400).json({
        error: "Invalid user identifier format",
        status: 400
      });
    }

    const user = await User.findById(authenticatedUserId).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        error: "User profile not found in database",
        status: 404
      });
    }

    return res.status(200).json({
      service: "user-service",
      message: "User profile retrieved successfully",
      data: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        department: user.department,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      gateway: {
        authenticatedUser: authenticatedUserId
      }
    });
  } catch (error) {
    console.error("[User Service] Profile fetch error:", error.message);
    return res.status(500).json({
      error: "Internal server error fetching user profile",
      status: 500
    });
  }
});

// Profile access by ID with strict ownership validation
const handleUserById = async (req, res) => {
  try {
    const authenticatedUserId = req.get("X-Authenticated-User");
    const targetId = req.params.id;

    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Authentication required",
        status: 401
      });
    }

    // Enforce that users cannot view another user's private record by changing URL ID
    if (targetId !== authenticatedUserId) {
      return res.status(403).json({
        error: "Forbidden: You are not authorized to view another user's private profile.",
        status: 403
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        error: "Invalid user identifier format",
        status: 400
      });
    }

    const user = await User.findById(targetId).select("-password -__v");
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        status: 404
      });
    }

    return res.status(200).json({
      service: "user-service",
      userId: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      department: user.department,
      status: "active"
    });
  } catch (error) {
    console.error("[User Service] Get by ID error:", error.message);
    return res.status(500).json({
      error: "Internal server error",
      status: 500
    });
  }
};

app.get("/users/:id", handleUserById);
app.get("/:id", handleUserById);

let serverInstance;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    serverInstance = app.listen(port, "0.0.0.0", () => {
      console.log(`[User Service] Listening on http://localhost:${port}`);
      resolve(serverInstance);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };