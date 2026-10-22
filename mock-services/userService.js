const express = require("express");

const app = express();
const PORT = 5002;

app.disable("x-powered-by");

app.get("/health", (req, res) => {
  res.json({
    service: "user-service",
    status: "healthy",
    port: PORT
  });
});

app.get("/profile", (req, res) => {
  res.status(200).json({
    service: "user-service",
    message: "User profile retrieved successfully",
    data: {
      id: 101,
      name: "Demo Student",
      username: "student",
      email: "student@example.com",
      department: "Computer Engineering",
      year: 3
    },
    gateway: {
      authenticatedUser: req.get("X-Authenticated-User") || null
    }
  });
});

app.get("/users/:id", (req, res) => {
  res.json({
    service: "user-service",
    userId: req.params.id,
    name: "Demo User",
    status: "active"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[User Service] Listening on http://localhost:${PORT}`);
});