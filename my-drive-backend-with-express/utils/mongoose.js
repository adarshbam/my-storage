import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb://adarsh:adarsh@localhost:27017/my-storage?replicaSet=myReplicaSet&authSource=my-storage",
    );
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
