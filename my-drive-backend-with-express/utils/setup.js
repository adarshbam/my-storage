import mongoose from "mongoose";
import "./mongoose.js";

export async function schemaUpdate() {
  try {
    const db = mongoose.connection.db;
    console.log(db.databaseName);

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log(collectionNames);

    if (!collectionNames.includes("users")) await db.createCollection("users");
    await db.command({
      collMod: "users",
      validator: {
        $jsonSchema: {
          required: ["name", "email", "password", "rootDirId"],
          properties: {
            _id: {
              bsonType: "objectId",
            },
            name: {
              bsonType: "string",
              description: "must be a string",
              minLength: 3,
              maxLength: 32,
            },
            email: {
              bsonType: "string",
              pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
              description: "must be a valid email address",
            },
            password: {
              bsonType: "string",
              minLength: 6,
              description: "must be between 6 and 32 characters long",
            },
            rootDirId: {
              bsonType: "objectId",
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });
    if (!collectionNames.includes("directories"))
      await db.createCollection("directories");
    await db.command({
      collMod: "directories",
      validator: {
        $jsonSchema: {
          required: ["name", "parentDir"],
          properties: {
            _id: {
              bsonType: "objectId",
            },
            name: {
              bsonType: "string",
            },
            parentDir: {
              bsonType: ["objectId", "null"],
            },
            userId: {
              bsonType: "objectId",
            },
            rootDirId: {
              bsonType: "objectId",
            },
            type: {
              bsonType: "string",
            },
            profilepic: {
              bsonType: ["string", "null"],
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });
    if (!collectionNames.includes("files")) await db.createCollection("files");
    await db.command({
      collMod: "files",
      validator: {
        $jsonSchema: {
          required: [
            "name",
            "parentDir",
            "size",
            "type",
            "extension",
            "hasThumbnail",
          ],
          properties: {
            _id: {
              bsonType: "objectId",
            },
            name: {
              bsonType: "string",
            },
            parentDir: {
              bsonType: ["objectId", "null"],
            },
            userId: {
              bsonType: "objectId",
            },
            rootDirId: {
              bsonType: "objectId",
            },
            size: {
              bsonType: "number",
            },
            type: {
              bsonType: "string",
            },
            extension: {
              bsonType: "string",
            },
            hasThumbnail: {
              bsonType: "bool",
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });

    if (!collectionNames.includes("trashes"))
      await db.createCollection("trashes");
    await db.command({
      collMod: "trashes",
      validator: {
        $jsonSchema: {
          required: ["name", "parentDir", "type"],
          properties: {
            _id: {
              bsonType: "objectId",
            },
            name: {
              bsonType: "string",
            },
            parentDir: {
              bsonType: ["objectId", "null"],
            },
            userId: {
              bsonType: "objectId",
            },
            rootDirId: {
              bsonType: "objectId",
            },
            size: {
              bsonType: "number",
            },
            type: {
              bsonType: "string",
            },
            extension: {
              bsonType: "string",
            },
            hasThumbnail: {
              bsonType: "bool",
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

schemaUpdate();
