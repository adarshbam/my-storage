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
              bsonType: "objectId",
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
          required: ["name", "parentDir", "userId"],
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

    await db.command({
      collMod: "trash",
      validator: {
        $jsonSchema: {
          required: ["name", "parentDir", "userId", "type"],
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
    await client.close();
  }
}

schemaUpdate();
