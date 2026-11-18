require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
  BatchWriteCommand
} = require("@aws-sdk/lib-dynamodb");

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "ssd_users";
const ORDERS_TABLE = process.env.DYNAMODB_ORDERS_TABLE || "ssd_orders";
const REGION = process.env.AWS_REGION || "us-east-1";

// Persistent disk storage file for offline development
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel
  ? path.join("/tmp", "ssd_data")
  : path.resolve(__dirname, "../../data");

const DB_FILE =
  process.env.NODE_ENV === "test"
    ? path.join(DATA_DIR, "test_db.json")
    : path.join(DATA_DIR, "local_db.json");

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[Database] Notice creating data directory:", err.message);
}

const memoryStore = {
  users: new Map(),
  orders: new Map()
};

function saveToDisk() {
  try {
    const data = {
      users: Array.from(memoryStore.users.values()),
      orders: Array.from(memoryStore.orders.values())
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("[Database] Notice saving to local disk:", err.message);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf8");
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed.users && Array.isArray(parsed.users)) {
          memoryStore.users.clear();
          for (const u of parsed.users) {
            memoryStore.users.set(u.id, u);
          }
        }
        if (parsed.orders && Array.isArray(parsed.orders)) {
          memoryStore.orders.clear();
          for (const o of parsed.orders) {
            memoryStore.orders.set(o.orderId, o);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Database] Notice loading from local disk:", err.message);
  }
}

// Auto-seed default accounts so login NEVER fails on a fresh machine or server boot
function ensureDefaultSeed() {
  loadFromDisk();

  const hasStudent = Array.from(memoryStore.users.values()).some(
    (u) => u.username === "student"
  );

  if (!hasStudent) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync("password123", salt);

    const studentUser = {
      id: "student-demo-id",
      username: "student",
      email: "student@example.com",
      password: hashedPassword,
      name: "Demo Student",
      department: "Computer Engineering",
      role: "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const demoUser = {
      id: "demo-user-demo-id",
      username: "demo_user",
      email: "demo@example.com",
      password: hashedPassword,
      name: "Alice Engineer",
      department: "Software Systems",
      role: "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryStore.users.set(studentUser.id, studentUser);
    memoryStore.users.set(demoUser.id, demoUser);

    // Default sample orders for student
    const studentOrders = [
      {
        orderId: "ORD-1001",
        user: studentUser.id,
        item: "MacBook Pro 16-inch M3",
        amount: 249900,
        status: "Delivered",
        createdAt: "2026-01-01T10:00:00.000Z",
        updatedAt: "2026-01-01T10:00:00.000Z"
      },
      {
        orderId: "ORD-1002",
        user: studentUser.id,
        item: "Logitech MX Master 3S Wireless Mouse",
        amount: 8995,
        status: "Shipped",
        createdAt: "2026-01-02T11:30:00.000Z",
        updatedAt: "2026-01-02T11:30:00.000Z"
      },
      {
        orderId: "ORD-1003",
        user: studentUser.id,
        item: "Keychron K2 Mechanical Keyboard",
        amount: 7499,
        status: "Processing",
        createdAt: "2026-01-03T15:45:00.000Z",
        updatedAt: "2026-01-03T15:45:00.000Z"
      }
    ];

    // Default sample orders for demo_user
    const demoOrders = [
      {
        orderId: "ORD-2001",
        user: demoUser.id,
        item: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
        amount: 48500,
        status: "Delivered",
        createdAt: "2026-01-01T09:00:00.000Z",
        updatedAt: "2026-01-01T09:00:00.000Z"
      },
      {
        orderId: "ORD-2002",
        user: demoUser.id,
        item: "CalDigit TS4 Thunderbolt 4 Dock",
        amount: 32000,
        status: "Shipped",
        createdAt: "2026-01-02T14:20:00.000Z",
        updatedAt: "2026-01-02T14:20:00.000Z"
      }
    ];

    for (const o of [...studentOrders, ...demoOrders]) {
      memoryStore.orders.set(o.orderId, o);
    }

    saveToDisk();
    console.log("[Database] Pre-seeded demo accounts ('student', 'demo_user') with password 'password123'.");
  }
}

// Initialize seed
ensureDefaultSeed();

function hasAwsCredentials() {
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!key || !secret) return false;
  if (key === "YOUR_AWS_ACCESS_KEY_ID" || secret === "YOUR_AWS_SECRET_ACCESS_KEY") return false;
  return true;
}

let ddbRawClient = null;
let docClient = null;
let isUsingCloud = false;

function getClient() {
  if (docClient) return { docClient, isUsingCloud };

  if (hasAwsCredentials()) {
    try {
      const config = {
        region: REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
        }
      };

      if (process.env.AWS_SESSION_TOKEN && process.env.AWS_SESSION_TOKEN.trim()) {
        config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN.trim();
      }

      if (process.env.DYNAMODB_ENDPOINT) {
        config.endpoint = process.env.DYNAMODB_ENDPOINT.trim();
      }

      ddbRawClient = new DynamoDBClient(config);
      docClient = DynamoDBDocumentClient.from(ddbRawClient, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertEmptyValues: true
        }
      });
      isUsingCloud = true;
      console.log(`[Database] Connected to Cloud Database (Region: ${REGION})`);
    } catch (err) {
      console.warn(`[Database] Cloud client warning: ${err.message}. Falling back to persistent local storage.`);
      isUsingCloud = false;
    }
  } else {
    isUsingCloud = false;
  }

  return { docClient, isUsingCloud };
}

async function waitForTable(tableName) {
  if (!ddbRawClient) return;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await ddbRawClient.send(new DescribeTableCommand({ TableName: tableName }));
      if (res.Table && res.Table.TableStatus === "ACTIVE") {
        return;
      }
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function ensureTables() {
  const { isUsingCloud } = getClient();
  if (!isUsingCloud || !ddbRawClient) {
    return { status: "local_persistent", tables: [USERS_TABLE, ORDERS_TABLE] };
  }

  try {
    // 1. Users Table
    try {
      await ddbRawClient.send(new DescribeTableCommand({ TableName: USERS_TABLE }));
    } catch (err) {
      if (err.name === "ResourceNotFoundException") {
        console.log(`[Database] Creating table '${USERS_TABLE}' in AWS DynamoDB...`);
        await ddbRawClient.send(
          new CreateTableCommand({
            TableName: USERS_TABLE,
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
              { AttributeName: "id", AttributeType: "S" },
              { AttributeName: "username", AttributeType: "S" },
              { AttributeName: "email", AttributeType: "S" }
            ],
            KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
            GlobalSecondaryIndexes: [
              {
                IndexName: "username-index",
                KeySchema: [{ AttributeName: "username", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" }
              },
              {
                IndexName: "email-index",
                KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" }
              }
            ]
          })
        );
        await waitForTable(USERS_TABLE);
      } else {
        throw err;
      }
    }

    // 2. Orders Table
    try {
      await ddbRawClient.send(new DescribeTableCommand({ TableName: ORDERS_TABLE }));
    } catch (err) {
      if (err.name === "ResourceNotFoundException") {
        console.log(`[Database] Creating table '${ORDERS_TABLE}' in AWS DynamoDB...`);
        await ddbRawClient.send(
          new CreateTableCommand({
            TableName: ORDERS_TABLE,
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
              { AttributeName: "orderId", AttributeType: "S" },
              { AttributeName: "user", AttributeType: "S" },
              { AttributeName: "createdAt", AttributeType: "S" }
            ],
            KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
            GlobalSecondaryIndexes: [
              {
                IndexName: "user-index",
                KeySchema: [
                  { AttributeName: "user", KeyType: "HASH" },
                  { AttributeName: "createdAt", KeyType: "RANGE" }
                ],
                Projection: { ProjectionType: "ALL" }
              }
            ]
          })
        );
        await waitForTable(ORDERS_TABLE);
      } else {
        throw err;
      }
    }

    return { status: "cloud", region: REGION, tables: [USERS_TABLE, ORDERS_TABLE] };
  } catch (error) {
    console.warn("[Database] Error ensuring tables:", error.message);
    disableCloudMode(error);
    return { status: "fallback_local", error: error.message };
  }
}

function disableCloudMode(err) {
  if (isUsingCloud) {
    console.warn(
      `[Database] Notice: AWS Cloud session inactive or token expired (${err ? err.name || err.message : 'session closed'}). Seamlessly switching to local persistent storage.`
    );
    isUsingCloud = false;
  }
}

function resetMemoryStore() {
  memoryStore.users.clear();
  memoryStore.orders.clear();
  saveToDisk();
}

module.exports = {
  getClient,
  ensureTables,
  hasAwsCredentials,
  disableCloudMode,
  resetMemoryStore,
  memoryStore,
  saveToDisk,
  loadFromDisk,
  ensureDefaultSeed,
  USERS_TABLE,
  ORDERS_TABLE,
  REGION,
  ddbRawClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
  BatchWriteCommand
};
