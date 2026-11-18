require("dotenv").config();
const { getClient, ensureTables, resetMemoryStore } = require("./dynamoClient");

let isConnected = true;

async function connectDB() {
  const { isUsingCloud } = getClient();
  try {
    const tableInfo = await ensureTables();
    isConnected = true;
    if (isUsingCloud) {
      console.log(`[Database] Connected successfully to Cloud Database.`);
    } else {
      console.log(`[Database] Ready in Local Persistent Storage mode.`);
    }
    return { status: "connected", cloud: isUsingCloud, tableInfo };
  } catch (error) {
    console.error("[Database] Initialization error:", error.message);
    isConnected = false;
    throw error;
  }
}

async function disconnectDB() {
  isConnected = false;
  console.log("[Database] Disconnected.");
}

function getDatabaseStatus() {
  const { isUsingCloud } = getClient();
  return {
    engine: "DynamoDB",
    type: isUsingCloud ? "Cloud Database" : "Local Persistent Store",
    connected: isConnected,
    region: process.env.AWS_REGION || "us-east-1",
    usersTable: process.env.DYNAMODB_USERS_TABLE || "ssd_users",
    ordersTable: process.env.DYNAMODB_ORDERS_TABLE || "ssd_orders"
  };
}

// Backward-compatibility shim for microservices and health checks
const mongooseShim = {
  connection: {
    get readyState() {
      return isConnected ? 1 : 0;
    },
    once: (event, cb) => {
      if (event === "open") setTimeout(cb, 50);
    }
  },
  Types: {
    ObjectId: {
      isValid: (id) => typeof id === "string" && id.trim().length >= 3
    }
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
  mongoose: mongooseShim
};
