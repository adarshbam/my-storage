import { MongoClient } from "mongodb";

// 🔴 paste YOUR atlas or local URL here
const uri = "mongodb://localhost:27017";
// OR Atlas:
// const uri = "mongodb+srv://username:password@cluster.mongodb.net/";

const client = new MongoClient(uri);

let db;

export async function connectToDB() {
  if (db) return db; // ✅ reuse connection

  await client.connect();
  db = client.db("my-storage"); // ← your DB name

  console.log("✅ MongoDB connected");
  return db;
}
