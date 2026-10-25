const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const express = require("express");
const jwt = require("jsonwebtoken");
const { connectDB, mongoose } = require("../src/db/connection");
const User = require("../src/models/User");

const app = express();
const PORT = Number(process.env.AUTH_SERVICE_PORT || 5001);

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

// Connect to MongoDB upon service startup
connectDB().catch((err) => {
  console.error("[Auth Service] Initial MongoDB connection failed:", err.message);
});

app.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    service: "auth-service",
    status: "healthy",
    port: PORT,
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.post("/register", async (req, res) => {
  try {
    const { username, password, email, name, department } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.trim().length < 3 ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: "Validation failed: Username must be at least 3 characters and password at least 8 characters.",
        status: 400
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = (email && typeof email === "string" && email.trim())
      ? email.trim().toLowerCase()
      : `${normalizedUsername}@example.com`;

    // Reject self-registration as admin
    const safeRole = "user";

    // Check for duplicate username or email
    const existing = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }]
    });

    if (existing) {
      const field = existing.username === normalizedUsername ? "Username" : "Email";
      return res.status(409).json({
        error: `${field} already exists. Please choose another one.`,
        status: 409
      });
    }

    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      name: name && typeof name === "string" ? name.trim() : normalizedUsername,
      department: department && typeof department === "string" ? department.trim() : "Computer Engineering",
      role: safeRole
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("[Auth Service] Registration error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Username or email already exists.",
        status: 409
      });
    }
    return res.status(500).json({
      error: "Internal server error during registration",
      status: 500
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Username and password are required",
        status: 400
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Support login via username or email
    const user = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedUsername }]
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid username or password",
        status: 401
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid username or password",
        status: 401
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[Auth Service] JWT_SECRET is not configured.");
      return res.status(500).json({
        error: "Authentication service configuration error",
        status: 500
      });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        issuer: "ssd-api-gateway-auth"
      }
    );

    return res.status(200).json({
      message: "Login successful",
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("[Auth Service] Login error:", error.message);
    return res.status(500).json({
      error: "Internal server error during login",
      status: 500
    });
  }
});

let serverInstance;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    serverInstance = app.listen(port, "0.0.0.0", () => {
      console.log(`[Auth Service] Listening on http://localhost:${port}`);
      resolve(serverInstance);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };