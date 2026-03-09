import mongoose from "mongoose";

await mongoose.connect(
  "mongodb://adarsh:adarsh@localhost:27017/my-storage?replicaSet=myReplicaSet&authSource=my-storage",
);

console.log("✅ MongoDB connected with mongoose");
