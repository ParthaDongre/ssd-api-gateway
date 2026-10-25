const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const express = require("express");
const { connectDB, mongoose } = require("../src/db/connection");
const Order = require("../src/models/Order");

const app = express();
const PORT = Number(process.env.ORDER_SERVICE_PORT || 5003);

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

connectDB().catch((err) => {
  console.error("[Order Service] Initial MongoDB connection failed:", err.message);
});

app.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    service: "order-service",
    status: "healthy",
    port: PORT,
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.get("/history", async (req, res) => {
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
        error: "Invalid user identifier",
        status: 400
      });
    }

    // Strictly enforce ownership by querying only orders belonging to the authenticated user
    const orders = await Order.find({ user: authenticatedUserId }).sort({ createdAt: -1 });

    return res.status(200).json({
      service: "order-service",
      message: "Order history retrieved successfully",
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("[Order Service] Order history error:", error.message);
    return res.status(500).json({
      error: "Internal server error fetching order history",
      status: 500
    });
  }
});

// Create a new order for the authenticated user
const handleCreateOrder = async (req, res) => {
  try {
    const authenticatedUserId = req.get("X-Authenticated-User");

    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Authentication required",
        status: 401
      });
    }

    if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
      return res.status(400).json({
        error: "Invalid user identifier",
        status: 400
      });
    }

    const { item, amount, status } = req.body || {};

    if (!item || typeof item !== "string" || item.trim().length < 2) {
      return res.status(400).json({
        error: "Item description is required and must be at least 2 characters long",
        status: 400
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        error: "Amount must be a valid non-negative number",
        status: 400
      });
    }

    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered"];
    const orderStatus = (status && validStatuses.includes(status)) ? status : "Processing";

    // Strictly derive owner from verified header, ignoring any client-provided user in body
    const order = new Order({
      user: authenticatedUserId,
      item: item.trim(),
      amount: numericAmount,
      status: orderStatus
    });

    await order.save();

    return res.status(201).json({
      service: "order-service",
      message: "Order created successfully",
      order
    });
  } catch (error) {
    console.error("[Order Service] Create order error:", error.message);
    return res.status(500).json({
      error: "Internal server error creating order",
      status: 500
    });
  }
};

app.post("/", handleCreateOrder);
app.post("/create", handleCreateOrder);

// Fetch single order by orderId or document ID with ownership check
app.get("/:orderId", async (req, res) => {
  try {
    const authenticatedUserId = req.get("X-Authenticated-User");

    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Authentication required",
        status: 401
      });
    }

    const { orderId } = req.params;

    // Search by human-readable orderId or Mongo ObjectId
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { $or: [{ orderId }, { _id: orderId }] }
      : { orderId };

    const order = await Order.findOne(query);

    // Return 404 if order does not exist OR belongs to another user
    // This prevents information leakage regarding the existence of other users' orders
    if (!order || order.user.toString() !== authenticatedUserId) {
      return res.status(404).json({
        error: "Order not found",
        status: 404
      });
    }

    return res.status(200).json({
      service: "order-service",
      order
    });
  } catch (error) {
    console.error("[Order Service] Get single order error:", error.message);
    return res.status(500).json({
      error: "Internal server error",
      status: 500
    });
  }
});

let serverInstance;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    serverInstance = app.listen(port, "0.0.0.0", () => {
      console.log(`[Order Service] Listening on http://localhost:${port}`);
      resolve(serverInstance);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };