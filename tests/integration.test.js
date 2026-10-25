const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const jwt = require("jsonwebtoken");

// Enforce test configuration before loading modules
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/ssd_api_gateway_test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_12345";
process.env.JWT_EXPIRES_IN = "1h";
process.env.PORT = "8000";
process.env.AUTH_SERVICE_PORT = "5001";
process.env.USER_SERVICE_PORT = "5002";
process.env.ORDER_SERVICE_PORT = "5003";

const { connectDB, disconnectDB, mongoose } = require("../src/db/connection");
const User = require("../src/models/User");
const Order = require("../src/models/Order");

const authService = require("../mock-services/authService");
const userService = require("../mock-services/userService");
const orderService = require("../mock-services/orderService");
const gateway = require("../src/server");

const GATEWAY_URL = "http://localhost:8000";

let authServer;
let userServer;
let orderServer;
let gatewayServer;

describe("Dynamic L7 API Gateway & MongoDB Integration Suite", () => {
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;
  let userBOrderId;

  before(async () => {
    // 1. Connect to isolated test database
    await connectDB(process.env.MONGODB_URI);

    // 2. Clean test database completely
    await User.deleteMany({});
    await Order.deleteMany({});

    // 3. Start all backend microservices
    authServer = await authService.startServer(5001);
    userServer = await userService.startServer(5002);
    orderServer = await orderService.startServer(5003);

    // 4. Start API Gateway
    gatewayServer = await gateway.startServer(8000);
  });

  after(async () => {
    // Graceful teardown
    const { stopWatching } = require("../src/config/configLoader");
    stopWatching();

    if (gatewayServer) await new Promise((res) => gatewayServer.close(res));
    if (orderServer) await new Promise((res) => orderServer.close(res));
    if (userServer) await new Promise((res) => userServer.close(res));
    if (authServer) await new Promise((res) => authServer.close(res));
    await disconnectDB();
  });

  test("1. Successful registration", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_usera",
        password: "password123",
        email: "usera@example.com",
        name: "User Alpha"
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.message, "User registered successfully");
    assert.strictEqual(data.user.username, "test_usera");
    assert.strictEqual(data.user.email, "usera@example.com");
    assert.strictEqual(data.user.password, undefined, "Password must not be returned in API response");
    userAId = data.user.id;
    assert.ok(userAId, "User ID should be returned");
  });

  test("2. Duplicate registration rejection", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_usera", // Duplicate
        password: "password123",
        email: "usera@example.com"
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.ok(data.error.includes("already exists"));
  });

  test("3. Successful login", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_usera",
        password: "password123"
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.message, "Login successful");
    assert.strictEqual(data.tokenType, "Bearer");
    assert.ok(data.token, "JWT token must be returned");
    assert.strictEqual(data.user.username, "test_usera");
    userAToken = data.token;

    // Verify token claims
    const decoded = jwt.decode(userAToken);
    assert.strictEqual(decoded.sub, userAId, "JWT sub must match MongoDB ObjectId");
    assert.strictEqual(decoded.username, "test_usera");
  });

  test("4. Incorrect password rejection", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_usera",
        password: "wrongpassword999"
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.error, "Invalid username or password");
  });

  test("5. Missing JWT rejection on protected endpoints", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/users/profile`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.error, "Authorization token is required");
  });

  test("6. Expired JWT rejection", async () => {
    const expiredToken = jwt.sign(
      { sub: userAId, username: "test_usera" },
      process.env.JWT_SECRET,
      { expiresIn: "0s" } // Instantly expired
    );

    const res = await fetch(`${GATEWAY_URL}/api/v1/users/profile`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`
      }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.error, "Token has expired");
  });

  test("7. User A receives User A's profile", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/users/profile`, {
      headers: {
        Authorization: `Bearer ${userAToken}`
      }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.username, "test_usera");
    assert.strictEqual(data.data.id, userAId);
    assert.strictEqual(data.gateway.authenticatedUser, userAId);
  });

  test("8. User B receives User B's profile", async () => {
    // Register User B
    const regRes = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_userb",
        password: "password123",
        email: "userb@example.com",
        name: "User Beta"
      })
    });
    const regData = await regRes.json();
    userBId = regData.user.id;

    // Login User B
    const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_userb",
        password: "password123"
      })
    });
    const loginData = await loginRes.json();
    userBToken = loginData.token;

    // Fetch User B profile
    const res = await fetch(`${GATEWAY_URL}/api/v1/users/profile`, {
      headers: {
        Authorization: `Bearer ${userBToken}`
      }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.username, "test_userb");
    assert.strictEqual(data.data.id, userBId);
    assert.notStrictEqual(data.data.id, userAId, "User B must have distinct identity from User A");
  });

  test("9. User A cannot access User B's private order", async () => {
    // User B creates an order
    const createRes = await fetch(`${GATEWAY_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({
        item: "Confidential Hardware Package",
        amount: 45000,
        status: "Processing"
      })
    });

    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    userBOrderId = createData.order.orderId || createData.order.id;
    assert.ok(userBOrderId, "Order ID should be created");

    // User A attempts to access User B's order
    const accessRes = await fetch(`${GATEWAY_URL}/api/v1/orders/${userBOrderId}`, {
      headers: {
        Authorization: `Bearer ${userAToken}`
      }
    });

    const accessData = await accessRes.json();
    assert.strictEqual(accessRes.status, 404, "Must return 404 to avoid leaking existence of another user's order");
    assert.strictEqual(accessData.order, undefined);

    // User B accesses their own order successfully
    const ownerRes = await fetch(`${GATEWAY_URL}/api/v1/orders/${userBOrderId}`, {
      headers: {
        Authorization: `Bearer ${userBToken}`
      }
    });
    const ownerData = await ownerRes.json();
    assert.strictEqual(ownerRes.status, 200);
    assert.strictEqual(ownerData.order.item, "Confidential Hardware Package");
  });

  test("10. An order is saved and remains available after a service restart", async () => {
    // Verify order exists before restart
    const beforeRes = await fetch(`${GATEWAY_URL}/api/v1/orders/history`, {
      headers: {
        Authorization: `Bearer ${userBToken}`
      }
    });
    const beforeData = await beforeRes.json();
    assert.strictEqual(beforeData.count, 1);

    // Restart the Order Service
    await new Promise((res) => orderServer.close(res));
    orderServer = await orderService.startServer(5003);

    // Verify order persists from MongoDB after restart
    const afterRes = await fetch(`${GATEWAY_URL}/api/v1/orders/history`, {
      headers: {
        Authorization: `Bearer ${userBToken}`
      }
    });
    const afterData = await afterRes.json();
    assert.strictEqual(afterRes.status, 200);
    assert.strictEqual(afterData.count, 1);
    assert.strictEqual(afterData.orders[0].item, "Confidential Hardware Package");
  });

  test("11. A request to a stopped downstream service returns a controlled 503", async () => {
    // Stop the Order Service temporarily
    await new Promise((res) => orderServer.close(res));

    const res = await fetch(`${GATEWAY_URL}/api/v1/orders/history`, {
      headers: {
        Authorization: `Bearer ${userAToken}`
      }
    });

    const data = await res.json();
    assert.strictEqual(res.status, 503);
    assert.strictEqual(data.error, "Downstream Service Unavailable");

    // Bring Order Service back up
    orderServer = await orderService.startServer(5003);
  });

  test("12. The gateway still performs route matching and path rewriting correctly", async () => {
    // 12a. Public route bypassing authentication
    const publicRes = await fetch(`${GATEWAY_URL}/api/v1/auth/health`);
    const publicData = await publicRes.json();
    assert.strictEqual(publicRes.status, 200);
    assert.strictEqual(publicData.service, "auth-service");

    // 12b. Non-existent gateway route
    const unmappedRes = await fetch(`${GATEWAY_URL}/api/v1/unmapped-service/test`);
    assert.strictEqual(unmappedRes.status, 404);

    // 12c. Path prefix rewriting: /api/v1/users/health -> /health on port 5002
    const rewriteRes = await fetch(`${GATEWAY_URL}/api/v1/users/health`);
    const rewriteData = await rewriteRes.json();
    assert.strictEqual(rewriteRes.status, 200);
    assert.strictEqual(rewriteData.service, "user-service");
  });
});
