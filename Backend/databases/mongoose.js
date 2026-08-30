import mongoose from "mongoose";
import { DB_URL } from "../config/config.js";

export async function connectDB() {
  try {
    if (!DB_URL) {
      throw new Error("DB_URL is not defined in .env");
    }
    await mongoose.connect(DB_URL);
    console.log("✅ MongoDB connected with mongoose");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
await connectDB();

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("✅ MongoDB disconnected");
  process.exit(0);
});
