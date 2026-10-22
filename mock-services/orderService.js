const express = require("express");

const app = express();
const PORT = 5003;

app.disable("x-powered-by");

const orders = [
  {
    id: "ORD-1001",
    item: "Laptop",
    amount: 65000,
    status: "Delivered"
  },
  {
    id: "ORD-1002",
    item: "Wireless Mouse",
    amount: 1200,
    status: "Shipped"
  },
  {
    id: "ORD-1003",
    item: "Keyboard",
    amount: 2500,
    status: "Processing"
  }
];

app.get("/health", (req, res) => {
  res.json({
    service: "order-service",
    status: "healthy",
    port: PORT
  });
});

app.get("/history", (req, res) => {
  res.status(200).json({
    service: "order-service",
    message: "Order history retrieved successfully",
    count: orders.length,
    orders
  });
});

app.get("/:orderId", (req, res) => {
  const order = orders.find(
    (item) => item.id === req.params.orderId
  );

  if (!order) {
    return res.status(404).json({
      error: "Order not found",
      status: 404
    });
  }

  return res.json({
    service: "order-service",
    order
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Order Service] Listening on http://localhost:${PORT}`);
});