/**
 * Universal Folder Drop Scanner for Vault Cloud Storage
 * Reads full folder hierarchies from HTML5 DataTransferItemList using
 * the standard File and Directory Entries API (webkitGetAsEntry).
 */

/**
 * Reads all entries from a DirectoryReader, repeatedly fetching batches
 * until empty (Chromium limits each readEntries() call to 100 items).
 *
 * @param {FileSystemDirectoryReader} reader
 * @returns {Promise<FileSystemEntry[]>}
 */
export function readAllDirectoryEntries(reader) {
  const allEntries = [];

  return new Promise((resolve, reject) => {
    const readNextBatch = () => {
      reader.readEntries((entries) => {
        if (!entries || entries.length === 0) {
          resolve(allEntries);
        } else {
          allEntries.push(...entries);
          // Keep reading until an empty batch confirms no more entries exist
          readNextBatch();
        }
      }, (err) => {
        console.warn("DirectoryReader batch error:", err);
        // Resolve whatever entries were collected rather than aborting entirely
        resolve(allEntries);
      });
    };

    readNextBatch();
  });
}

/**
 * Extracts a native File object from a FileSystemFileEntry.
 *
 * @param {FileSystemFileEntry} fileEntry
 * @returns {Promise<File>}
 */
export function getFileFromEntry(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => resolve(file),
      (err) => {
        console.warn(`Failed to read file from entry "${fileEntry.name}":`, err);
        reject(err);
      }
    );
  });
}

/**
 * Recursively traverses a FileSystemEntry tree, gathering files and relative folder paths.
 *
 * @param {FileSystemEntry} entry
 * @param {string} parentPath
 * @param {Array<{ file: File, relativePath: string, folderPath: string }>} files
 * @param {Set<string>} directories
 */
async function traverseEntry(entry, parentPath, files, directories) {
  if (!entry) return;

  const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    try {
      const file = await getFileFromEntry(entry);
      // Augment file with relative path metadata
      file.relativePath = currentPath;
      files.push({
        file,
        name: file.name,
        size: file.size,
        relativePath: currentPath,
        folderPath: parentPath, // The directory this file resides in
      });
    } catch (err) {
      console.error(`Skipping unreadable file "${currentPath}":`, err);
    }
  } else if (entry.isDirectory) {
    // Register the directory path (even if empty, so the folder is preserved)
    directories.add(currentPath);

    try {
      const reader = entry.createReader();
      const entries = await readAllDirectoryEntries(reader);

      for (const childEntry of entries) {
        await traverseEntry(childEntry, currentPath, files, directories);
      }
    } catch (err) {
      console.error(`Failed to read directory entries for "${currentPath}":`, err);
    }
  }
}

/**
 * Scans dropped items from a drag-and-drop event.
 *
 * @param {DataTransferItemList} dataTransferItems
 * @param {FileList|File[]} [fallbackFiles]
 * @returns {Promise<{
 *   files: Array<{ file: File, name: string, size: number, relativePath: string, folderPath: string }>,
 *   directories: string[],
 *   isFolderDrop: boolean,
 *   rootFolderName: string | null
 * }>}
 */
export async function scanDroppedItems(dataTransferItems, fallbackFiles = []) {
  const fallbackList = Array.from(fallbackFiles || []);

  // If DataTransferItemList is not available, return standard files
  if (!dataTransferItems || dataTransferItems.length === 0) {
    return {
      files: fallbackList.map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
        relativePath: f.name,
        folderPath: "",
      })),
      directories: [],
      isFolderDrop: false,
      rootFolderName: null,
    };
  }

  const entries = [];
  let containsDirectory = false;
  let firstDirectoryName = null;

  // Extract FileSystemEntries
  for (let i = 0; i < dataTransferItems.length; i++) {
    const item = dataTransferItems[i];
    if (item.kind !== "file") continue;

    if (typeof item.webkitGetAsEntry === "function") {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        entries.push(entry);
        if (entry.isDirectory) {
          containsDirectory = true;
          if (!firstDirectoryName) firstDirectoryName = entry.name;
        }
      }
    }
  }

  // If no directories were found in the drop items, fallback to normal file list
  if (!containsDirectory || entries.length === 0) {
    return {
      files: fallbackList.map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
        relativePath: f.name,
        folderPath: "",
      })),
      directories: [],
      isFolderDrop: false,
      rootFolderName: null,
    };
  }

  const files = [];
  const directoriesSet = new Set();

  for (const entry of entries) {
    await traverseEntry(entry, "", files, directoriesSet);
  }

  // Sort directories by depth (shallowest first)
  const sortedDirectories = Array.from(directoriesSet).sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });

  return {
    files,
    directories: sortedDirectories,
    isFolderDrop: true,
    rootFolderName: firstDirectoryName,
  };
}
