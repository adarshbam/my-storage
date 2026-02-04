import fs from "fs";

const DB_PATH = "./directoryDB.json";

try {
  const rawData = fs.readFileSync(DB_PATH, "utf8");
  console.log(`Original size: ${rawData.length} bytes`);

  // The corruption pattern is repeated "child" data appended.
  // The valid JSON should end with '}]'.
  // We search for the *first* valid closing of the main array if we assume the first write was correct but interrupted?
  // Or maybe the *last* valid one?
  // Given the corruption "}]Dir":null...", it seems the valid array closed, and then garbage was appended.
  // So we should find the *first* occurrence of "}]" that forms a valid JSON structure from the start?
  // Or the last one?

  // Let's try to find the last "}]" and see if substring(0, index+2) is valid JSON.
  // If not, try the previous "}]", etc.

  let fixed = false;
  let attemptData = rawData;

  while (!fixed && attemptData.length > 0) {
    const lastIndex = attemptData.lastIndexOf("}]");
    if (lastIndex === -1) break;

    const candidate = attemptData.substring(0, lastIndex + 2);
    try {
      JSON.parse(candidate);
      console.log("Found valid JSON!");
      fs.writeFileSync(DB_PATH, candidate);
      console.log("Fixed directoryDB.json");
      fixed = true;
    } catch (e) {
      console.log("Candidate failed, trying smaller chunk...");
      attemptData = attemptData.substring(0, lastIndex);
    }
  }

  if (!fixed) {
    console.error(
      "Could not repair the file automatically. Please check manual backup.",
    );
  }
} catch (e) {
  console.error("Error:", e);
}
