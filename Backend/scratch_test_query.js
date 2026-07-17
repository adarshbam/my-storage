import mongoose from "mongoose";
import File from "./models/fileModel.js";

async function run() {
  try {
    const dbUrl = process.env.DB_URL;
    console.log("Connecting to:", dbUrl);
    await mongoose.connect(dbUrl);
    console.log("Connected to DB");

    const allFiles = await File.find().lean();
    console.log("Files in DB:", allFiles.length);
    allFiles.forEach(f => {
      console.log(`ID: ${f._id} (type: ${typeof f._id}), Name: ${f.name}, ParentDir: ${f.parentDir}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

run();
