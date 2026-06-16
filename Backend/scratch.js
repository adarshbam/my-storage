import mongoose from "mongoose";
import User from "./models/userModel.js";
import "./utils/mongoose.js";

setTimeout(async () => {
  try {
    console.log("Fetching users from Atlas...");
    const users = await User.find({}).lean();
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}, 2000);
