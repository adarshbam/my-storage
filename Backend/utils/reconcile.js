import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";

export const reconcileDirectoryPathsAndSizes = async () => {
  console.log("Starting directory path and size reconciliation...");
  
  try {
    const users = await User.find({});
    for (const user of users) {
      if (user.rootDirId) {
        // Fix Root Directory
        await Directory.updateOne(
          { _id: user.rootDirId },
          { $set: { path: [user.rootDirId] } }
        );
      }
    }

    // Recursively fix paths and calculate sizes
    const fixPathAndSize = async (dirId, currentPath) => {
      let currentDirSize = 0;

      // Get direct subdirectories
      const subdirs = await Directory.find({ parentDir: dirId });
      for (const subdir of subdirs) {
        const subdirPath = [...currentPath, subdir._id];
        await Directory.updateOne({ _id: subdir._id }, { $set: { path: subdirPath } });
        const subdirSize = await fixPathAndSize(subdir._id, subdirPath);
        currentDirSize += subdirSize;
      }

      // Get direct files
      const files = await File.find({ parentDir: dirId });
      for (const file of files) {
        const validSize = Number(file.size) || 0;
        
        // Fix file size and path if needed
        const filePath = [...currentPath, file._id];
        await File.updateOne(
          { _id: file._id }, 
          { $set: { size: validSize, path: filePath } }
        );

        currentDirSize += validSize;
      }

      // Update directory size. Avoid NaN.
      const validDirSize = Number(currentDirSize) || 0;
      await Directory.updateOne({ _id: dirId }, { $set: { size: validDirSize } });

      return validDirSize;
    };

    for (const user of users) {
      if (user.rootDirId) {
        const rootPath = [user.rootDirId];
        await fixPathAndSize(user.rootDirId, rootPath);
      }
    }

    console.log("Directory path and size reconciliation complete.");
  } catch (error) {
    console.error("Error during directory reconciliation:", error);
  }
};
