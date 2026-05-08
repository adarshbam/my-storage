import archiver from "archiver";
import fs from "fs";

console.log("Archiver type:", typeof archiver);

try {
    const archive = archiver("zip");
    console.log("Archive created successfully");
} catch (e) {
    console.error("Failed to create archive:", e);
}

if (typeof fetch === "function") {
    console.log("Fetch is available globally");
} else {
    console.log("Fetch is NOT available globally");
}
