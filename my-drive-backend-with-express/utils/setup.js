import { connectToDB, client } from "./db.js";

export async function schemaUpdate() {
  try {
    const db = await connectToDB();

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
              bsonType: ["string", "null"],
            },
            email: {
              bsonType: "string",
            },
            password: {
              bsonType: "string",
            },
            rootDirId: {
              bsonType: "string",
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });
    await db.command({
      collMod: "directories",
      validator: {
        $jsonSchema: {
          required: ["_id", "name", "parentDir", "userId"],
          properties: {
            _id: {
              bsonType: "objectId",
            },
            name: {
              bsonType: "string",
            },
            parentDir: {
              bsonType: ["string", "null"],
            },
            userId: {
              bsonType: "string",
            },
            rootDirId: {
              bsonType: "string",
            },
            type: {
              bsonType: "string",
            },
            id: {
              bsonType: "string",
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });
    await db.command({
      collMod: "files",
      validator: {
        $jsonSchema: {
          required: [
            "_id",
            "name",
            "parentDir",
            "userId",
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
              bsonType: ["string", "null"],
            },
            userId: {
              bsonType: "string",
            },
            rootDirId: {
              bsonType: "string",
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
            id: {
              bsonType: "string",
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });

    await db.command({
      collMod: "trash",
      validator: {
        $jsonSchema: {
          required: [
            "_id",
            "name",
            "parentDir",
            "userId",
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
              bsonType: ["string", "null"],
            },
            userId: {
              bsonType: "string",
            },
            rootDirId: {
              bsonType: "string",
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
            id: {
              bsonType: "string",
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
    await client.close();
  }
}

schemaUpdate();
