const authService = require("../../mock-services/authService");
const userService = require("../../mock-services/userService");
const orderService = require("../../mock-services/orderService");

const SERVICES = {
  auth: {
    key: "auth",
    name: "Auth Service",
    port: Number(process.env.AUTH_SERVICE_PORT || 5001),
    path: "/api/v1/auth",
    healthPath: "/api/v1/auth/health",
    target: `http://localhost:${process.env.AUTH_SERVICE_PORT || 5001}`,
    instance: authService,
    stoppedSimulated: false
  },
  users: {
    key: "users",
    name: "User Service",
    port: Number(process.env.USER_SERVICE_PORT || 5002),
    path: "/api/v1/users",
    healthPath: "/api/v1/users/health",
    target: `http://localhost:${process.env.USER_SERVICE_PORT || 5002}`,
    instance: userService,
    stoppedSimulated: false
  },
  orders: {
    key: "orders",
    name: "Order Service",
    port: Number(process.env.ORDER_SERVICE_PORT || 5003),
    path: "/api/v1/orders",
    healthPath: "/api/v1/orders/health",
    target: `http://localhost:${process.env.ORDER_SERVICE_PORT || 5003}`,
    instance: orderService,
    stoppedSimulated: false
  }
};

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function startAllServices() {
  if (isVercel) return;
  for (const [key, svc] of Object.entries(SERVICES)) {
    try {
      if (svc.instance && svc.instance.startServer) {
        await svc.instance.startServer(svc.port);
      }
    } catch (err) {
      // Port might already be in use if run in a separate terminal
      console.warn(`[Service Manager] ${svc.name} port ${svc.port}: ${err.message}`);
    }
  }
}

async function stopAllServices() {
  for (const svc of Object.values(SERVICES)) {
    if (svc.instance && svc.instance.stopServer) {
      await svc.instance.stopServer();
    }
  }
}

async function startService(key) {
  const svc = SERVICES[key];
  if (!svc) throw new Error(`Unknown service: ${key}`);

  svc.stoppedSimulated = false;

  if (isVercel) {
    return { success: true, key, running: true, message: `${svc.name} started (Serverless mode)` };
  }

  if (svc.instance && svc.instance.startServer) {
    await svc.instance.startServer(svc.port);
  }

  return { success: true, key, running: true, port: svc.port, message: `${svc.name} started listening on port ${svc.port}` };
}

async function stopService(key) {
  const svc = SERVICES[key];
  if (!svc) throw new Error(`Unknown service: ${key}`);

  svc.stoppedSimulated = true;

  if (isVercel) {
    return { success: true, key, running: false, message: `${svc.name} stopped (Serverless mode)` };
  }

  if (svc.instance && svc.instance.stopServer) {
    await svc.instance.stopServer();
  }

  return { success: true, key, running: false, port: svc.port, message: `${svc.name} closed on port ${svc.port}` };
}

async function toggleService(key) {
  const svc = SERVICES[key];
  if (!svc) throw new Error(`Unknown service: ${key}`);

  const running = isServiceRunning(key);
  if (running) {
    return stopService(key);
  } else {
    return startService(key);
  }
}

function isServiceRunning(key) {
  const svc = SERVICES[key];
  if (!svc) return false;

  if (isVercel) {
    return !svc.stoppedSimulated;
  }

  if (svc.instance && typeof svc.instance.isRunning === "function") {
    return svc.instance.isRunning();
  }

  return !svc.stoppedSimulated;
}

function getServicesStatus() {
  const result = {};
  for (const [key, svc] of Object.entries(SERVICES)) {
    result[key] = {
      key,
      name: svc.name,
      port: svc.port,
      path: svc.path,
      target: svc.target,
      running: isServiceRunning(key),
      simulatedStop: svc.stoppedSimulated
    };
  }
  return result;
}

module.exports = {
  SERVICES,
  startAllServices,
  stopAllServices,
  startService,
  stopService,
  toggleService,
  isServiceRunning,
  getServicesStatus,
  isVercel
};

