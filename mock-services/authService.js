const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5001;

app.use(express.json({ limit: "32kb" }));

const users = new Map([
  [
    "student",
    {
      username: "student",
      password: "password123",
      name: "Demo Student",
      role: "user"
    }
  ]
]);

app.get("/health", (req, res) => {
  res.json({
    service: "auth-service",
    status: "healthy",
    port: PORT
  });
});

app.post("/register", (req, res) => {
  const { username, password, name } = req.body || {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim().length < 3 ||
    password.length < 8 ||
    (name !== undefined && typeof name !== "string")
  ) {
    return res.status(400).json({
      error: "Username must have at least 3 characters and password at least 8 characters.",
      status: 400
    });
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (users.has(normalizedUsername)) {
    return res.status(409).json({
      error: "Username already exists",
      status: 409
    });
  }

  const user = {
    username: normalizedUsername,
    password,
    name: name ? name.trim() : normalizedUsername,
    role: "user"
  };

  users.set(normalizedUsername, user);

  return res.status(201).json({
    message: "User registered successfully",
    user: {
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      error: "Username and password are required",
      status: 400
    });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const user = users.get(normalizedUsername);

  if (!user || user.password !== password) {
    return res.status(401).json({
      error: "Invalid username or password",
      status: 401
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("[Auth Service] JWT_SECRET is not configured.");

    return res.status(500).json({
      error: "Authentication configuration error",
      status: 500
    });
  }

  const token = jwt.sign(
    {
      sub: user.username,
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
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Auth Service] Listening on http://localhost:${PORT}`);
  console.log("[Auth Service] Demo login: student / password123");
});