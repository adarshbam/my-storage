import mongoose from "mongoose";

export async function connectDB() {
  let DB_URL = process.env.DB_URL;
  try {
    await mongoose.connect(DB_URL);
    console.log("✅ MongoDB connected with mongoose");
  } catch (err) {
    console.log(err);
    console.log("Could Not Connect to the database");
    process.exit(1);
  }
}
await connectDB();

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("✅ MongoDB disconnected");
  process.exit(0);
});
