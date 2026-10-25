const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const { connectDB, disconnectDB } = require("../src/db/connection");
const User = require("../src/models/User");
const Order = require("../src/models/Order");

async function seed() {
  console.log("🌱 [Seed] Starting MongoDB database seed...");

  try {
    await connectDB();

    const isReset = process.argv.includes("--reset");
    if (isReset) {
      console.log("⚠️  [Seed] --reset flag detected: clearing existing users and orders...");
      await User.deleteMany({});
      await Order.deleteMany({});
      console.log("🧹 [Seed] Collections cleared.");
    }

    // 1. Seed Demo User 1: student
    let student = await User.findOne({ username: "student" });
    if (!student) {
      student = new User({
        username: "student",
        email: "student@example.com",
        password: "password123",
        name: "Demo Student",
        department: "Computer Engineering",
        role: "user"
      });
      await student.save();
      console.log(`✅ [Seed] Created user: student (${student._id})`);
    } else {
      console.log(`ℹ️  [Seed] User 'student' already exists (${student._id}). Skipping creation.`);
    }

    // 2. Seed Demo User 2: demo_user
    let demoUser = await User.findOne({ username: "demo_user" });
    if (!demoUser) {
      demoUser = new User({
        username: "demo_user",
        email: "demo@example.com",
        password: "password123",
        name: "Alice Engineer",
        department: "Software Systems",
        role: "user"
      });
      await demoUser.save();
      console.log(`✅ [Seed] Created user: demo_user (${demoUser._id})`);
    } else {
      console.log(`ℹ️  [Seed] User 'demo_user' already exists (${demoUser._id}). Skipping creation.`);
    }

    // 3. Seed orders for student
    const studentOrdersCount = await Order.countDocuments({ user: student._id });
    if (studentOrdersCount === 0) {
      await Order.insertMany([
        {
          orderId: "ORD-1001",
          user: student._id,
          item: "MacBook Pro 16-inch M3",
          amount: 249900,
          status: "Delivered"
        },
        {
          orderId: "ORD-1002",
          user: student._id,
          item: "Logitech MX Master 3S Wireless Mouse",
          amount: 8995,
          status: "Shipped"
        },
        {
          orderId: "ORD-1003",
          user: student._id,
          item: "Keychron K2 Mechanical Keyboard",
          amount: 7499,
          status: "Processing"
        }
      ]);
      console.log("✅ [Seed] Seeded 3 sample orders for 'student'");
    } else {
      console.log(`ℹ️  [Seed] 'student' already has ${studentOrdersCount} orders. Skipping orders seed.`);
    }

    // 4. Seed orders for demo_user (completely different orders to prove user data isolation)
    const demoOrdersCount = await Order.countDocuments({ user: demoUser._id });
    if (demoOrdersCount === 0) {
      await Order.insertMany([
        {
          orderId: "ORD-2001",
          user: demoUser._id,
          item: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
          amount: 48500,
          status: "Delivered"
        },
        {
          orderId: "ORD-2002",
          user: demoUser._id,
          item: "CalDigit TS4 Thunderbolt 4 Dock",
          amount: 32000,
          status: "Shipped"
        }
      ]);
      console.log("✅ [Seed] Seeded 2 sample orders for 'demo_user'");
    } else {
      console.log(`ℹ️  [Seed] 'demo_user' already has ${demoOrdersCount} orders. Skipping orders seed.`);
    }

    console.log("\n========================================================");
    console.log("🎉 Database seeding complete!");
    console.log("========================================================");
    console.log("Available Demo Credentials:");
    console.log("  1) Username: student     Password: password123 (3 orders)");
    console.log("  2) Username: demo_user   Password: password123 (2 orders)");
    console.log("========================================================\n");
  } catch (error) {
    console.error("❌ [Seed] Error during seeding:", error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
