const mongoose = require("mongoose");

let isConnecting = false;

async function connectDB(customUri) {
  const uri = customUri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ssd_api_gateway";

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once("open", () => resolve(mongoose.connection));
      mongoose.connection.once("error", reject);
    });
  }

  isConnecting = true;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to: ${uri.replace(/\/\/.*@/, "//***@")}`);
    return mongoose.connection;
  } catch (error) {
    console.error(`[MongoDB] Connection error for ${uri}:`, error.message);
    throw error;
  } finally {
    isConnecting = false;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[MongoDB] Disconnected.");
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
