import mongoose from "mongoose";

export async function connectDB() {
  let DB_URL = process.env.DB_URL;
  try {
    await mongoose.connect(DB_URL);
    console.log("✅ MongoDB connected with mongoose");

    // Perform database migration to rename all root directories to "Vault"
    const db = mongoose.connection.db;
    try {
      const users = await db.collection("users").find({}).toArray();
      const rootDirIds = users.map(u => u.rootDirId).filter(Boolean);
      const result = await db.collection("directories").updateMany(
        {
          $or: [
            { _id: { $in: rootDirIds } },
            { parentDir: null },
            { parentDirId: null },
            { name: { $regex: /^root/ } }
          ]
        },
        { $set: { name: "Vault" } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Root directories migration: Updated ${result.modifiedCount} directories to 'Vault'`);
      }
    } catch (migErr) {
      console.error("⚠️ Migration failed:", migErr);
    }
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
