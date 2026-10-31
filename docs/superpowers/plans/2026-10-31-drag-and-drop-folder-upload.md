# Drag-and-Drop Folder Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to drag and drop an entire folder (including nested subdirectories and files) directly into Vault storage, automatically creating the full folder hierarchy and uploading all contained files with accurate progress tracking, zero pseudo-file errors, and production-grade reliability.

**Architecture:**
1. A universal browser-side scanner (`folderDropScanner.js`) reads `DataTransferItemList` via `webkitGetAsEntry()` / `createReader()`, iteratively draining directory batches (`readEntries()` while loop) to preserve file hierarchy, relative paths, and empty directories.
2. An atomic backend endpoint (`POST /directory/ensure-tree`) resolves or creates the nested folder hierarchy in MongoDB/Redis in a single round-trip, returning a mapping of paths to database directory IDs (`_id`).
3. `TransferManager` and `DashboardLayout` accept path-aware upload items (`{ file, dirId, relativePath }`), displaying accurate folder paths in the transfer queue and preventing 0-byte directory pseudo-files from causing upload errors.

**Tech Stack:** React 19, Express 5, MongoDB / Mongoose 9, Redis, AWS SDK S3 / Backblaze B2, Zod, HTML5 File and Directory Entries API.

**Spec:** Current Vault frontend (`FileBrowser.jsx`, `TransferManager.jsx`, `FileUploadModal.jsx`) & backend (`directoryController.js`, `directory.service.js`, `fileController.js`).

---

## Global Constraints

- Never upload directory pseudo-files as binary blobs to B2/S3; directory entities must be created as database records and files mapped to their respective `parentDirId`.
- Preserve directory hierarchy: subdirectories (e.g. `Folder/Subfolder/file.ext`) must be created under their respective parent directories, not flattened to root.
- All directory creations must pass auth, plan limit, and write permission checks (`verifyItemAccess`).
- In `DirectoryReader.readEntries()`, repeatedly invoke `readEntries` in a loop until an empty array is returned, as Chromium batches entries at 100 per call.
- Follow existing design tokens (colors, font, spacing, motion) with zero ad-hoc styling.

---

## Review Focus

1. **Large folder with >100 entries**: Chromium cuts off `readEntries()` after 100 entries per call. The scanner must loop until empty so files 101+ are not lost.
2. **Empty folder drop**: Dropping a folder containing zero files must still create the empty folder in Vault without triggering transfer upload errors.
3. **Duplicate folder name**: Dropping a folder into a location that already contains a folder of the same name should resolve/reuse the existing directory tree rather than failing or creating corrupted duplicate hierarchies.
4. **Drop onto target folder card**: Dropping a folder directly onto an existing directory card must place the new folder inside the target folder, not current directory.
5. **Subscription / Storage limit check**: Attempting to drop a folder when storage limit is exceeded or no plan exists must display the subscription prompt before initiating tree creation or file transfers.

---

### Task 1: Backend Tree Creation API (`POST /directory/ensure-tree`)

**Files:**
- Modify: `Backend/services/directory.service.js`
- Modify: `Backend/controllers/directoryController.js`
- Modify: `Backend/validators/directorySchema.js`
- Modify: `Backend/routes/directoryRoutes.js`
- Create: `Backend/tests/directory-tree.test.js`

**Interfaces:**
- Produces: `ensureDirectoryTreeLogic({ parentDirId, paths, userId, userRole, rootDirId }) -> { [path: string]: string }` (mapping of relative folder paths to MongoDB `_id` strings).
- Produces: `POST /directory/ensure-tree` & `POST /directory/:parentDirId/ensure-tree` returning `{ success: true, tree: { [path: string]: string } }`.
- Modifies: `createDirectoryLogic` and `createDirectory` controller to return created directory object `{ _id, name, parentDir }`.

- [ ] **Step 1: Write the failing test for `ensureDirectoryTreeLogic`**

```javascript
// Backend/tests/directory-tree.test.js
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { ensureDirectoryTreeLogic } from "../services/directory.service.js";

async function testEnsureDirectoryTree() {
  const userId = new mongoose.Types.ObjectId().toString();
  const rootDirId = new mongoose.Types.ObjectId().toString();
  const paths = [
    "Mjo videos",
    "Mjo videos/Season 1",
    "Mjo videos/Season 1/Bonus"
  ];

  const result = await ensureDirectoryTreeLogic({
    parentDirId: rootDirId,
    paths,
    userId,
    userRole: "user",
    rootDirId,
  });

  assert.ok(result["Mjo videos"], "Mjo videos folder ID should exist");
  assert.ok(result["Mjo videos/Season 1"], "Season 1 folder ID should exist");
  assert.ok(result["Mjo videos/Season 1/Bonus"], "Bonus folder ID should exist");
  console.log("PASS: ensureDirectoryTreeLogic creates nested directory hierarchy");
}

testEnsureDirectoryTree().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node Backend/tests/directory-tree.test.js`
Expected: FAIL with "ensureDirectoryTreeLogic is not a function"

- [ ] **Step 3: Implement `ensureDirectoryTreeLogic` in `directory.service.js`**

Implement `ensureDirectoryTreeLogic`:
- Sort `paths` by segment depth so parents are resolved before children.
- Check write permission on `parentDirId`.
- Maintain a path-to-ID cache `resolved = { "": parentDirId }`.
- For each relative path, split into `parentPath` and `folderName`.
- Query `Directory.findOne({ parentDir: resolved[parentPath], name: folderName, userId: ownerId })`:
  - If exists: use existing `_id`.
  - If not: create `Directory` with `_id: new ObjectId()`, `name: folderName`, `parentDir: resolved[parentPath]`, `path: [...parentPathArr, newDirId]`.
- Del Redis cache `dir:contents:` and `dir:meta:` for affected parent directories.
- Return `resolved` mapping object.

- [ ] **Step 4: Update `createDirectoryLogic` and `directoryController.js` to return created directory**

Update `createDirectoryLogic` in `Backend/services/directory.service.js` to return `{ _id: dirId.toString(), name, parentDir: parentDirId, path: dirPath }`.
Update `createDirectory` in `Backend/controllers/directoryController.js` to return `res.status(201).json({ success: true, message: "Folder created successfully", directory: newDir })`.
Add `ensureDirectoryTree` controller in `directoryController.js`.
Add `ensureDirectoryTreeSchema` in `Backend/validators/directorySchema.js`:
```javascript
export const ensureDirectoryTreeSchema = {
  params: z.object({ parentDirId: optionalObjectIdSchema.optional() }),
  body: z.object({
    paths: z.array(z.string().min(1)).min(1),
  }),
};
```
Add route in `Backend/routes/directoryRoutes.js` before `/:parentDirId`:
`router.post(["/ensure-tree", "/:parentDirId/ensure-tree"], checkAuth, loadPlanContext, requireRule("allowUpload"), standardWriteLimiter, validate(ensureDirectoryTreeSchema), ensureDirectoryTree);`

- [ ] **Step 5: Run test to verify it passes**

Run: `node Backend/tests/directory-tree.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add Backend/services/directory.service.js Backend/controllers/directoryController.js Backend/validators/directorySchema.js Backend/routes/directoryRoutes.js Backend/tests/directory-tree.test.js
git commit -m "feat(backend): add ensure-tree directory creation API"
```

---

### Task 2: Universal Browser Folder Drop Scanner (`folderDropScanner.js`)

**Files:**
- Create: `Frontend/src/lib/folderDropScanner.js`
- Modify: `Frontend/src/api/files.api.js`

**Interfaces:**
- Produces: `scanDroppedItems(items: DataTransferItemList) -> Promise<{ files: Array<{ file: File, relativePath: string, folderPath: string }>, directories: string[], isFolderDrop: boolean, rootFolderName: string | null }>`
- Produces: `ensureDirectoryTree(parentDirId: string, paths: string[]) -> Promise<{ success: boolean, tree: Record<string, string> }>` in `files.api.js`

- [ ] **Step 1: Implement `ensureDirectoryTree` in `Frontend/src/api/files.api.js`**

Add API client method:
```javascript
export const ensureDirectoryTree = (parentDirId, paths) =>
  apiClient.post(parentDirId ? `/directory/${parentDirId}/ensure-tree` : '/directory/ensure-tree', { paths });
```

- [ ] **Step 2: Implement `folderDropScanner.js` with batch reader loop**

In `Frontend/src/lib/folderDropScanner.js`:
- `readAllDirectoryEntries(dirReader)`: Recursive while-loop calling `dirReader.readEntries()` until `batch.length === 0`.
- `traverseEntry(entry, currentPath)`:
  - If `entry.isFile`: call `entry.file()`, return `{ file, relativePath: path, folderPath: currentPath }`.
  - If `entry.isDirectory`: record `path` in `directories` array, read all entries, recurse on each child.
- `scanDroppedItems(dataTransferItems, fallbackFiles)`:
  - If `!dataTransferItems`: wrap `fallbackFiles` as non-folder file items.
  - Iterate `dataTransferItems`, call `item.webkitGetAsEntry()`.
  - Distinguish file entries from directory entries.
  - Return `{ files, directories, isFolderDrop, rootFolderName }`.

- [ ] **Step 3: Verification test for scanner**

Verify scanner returns structured directories and files given mock `FileSystemDirectoryEntry` and `FileSystemFileEntry`.

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/lib/folderDropScanner.js Frontend/src/api/files.api.js
git commit -m "feat(frontend): create universal folder drop scanner and ensure-tree client API"
```

---

### Task 3: Support Hierarchical & Path-Aware File Uploads in TransferManager

**Files:**
- Modify: `Frontend/src/components/drive/TransferManager.jsx:246-289`
- Modify: `Frontend/src/layouts/DashboardLayout.jsx:270-281`

**Interfaces:**
- Consumes: `files` array containing either raw `File` instances or descriptor objects `{ file: File, dirId: string, relativePath: string }`.
- Produces: Transfers queued with exact `dirId` destination, formatted `name` (with folder hierarchy), and exclusion of 0-byte directory pseudo-files.

- [ ] **Step 1: Update `TransferManager.jsx` `uploadFiles` signature & mapping**

In `Frontend/src/components/drive/TransferManager.jsx`:
- Update `uploadFiles`:
  ```javascript
  const uploadFiles = useCallback((items, defaultDirId) => {
    ...
    const newTransfers = items
      .filter((item) => {
        const fileObj = item.file || item;
        // Ignore directory pseudo-files (size 0, type empty string, and directory flag)
        return fileObj && typeof fileObj.slice === "function";
      })
      .map((item) => {
        const fileObj = item.file || item;
        const targetDir = item.dirId || fileObj.targetDirId || defaultDirId;
        const displayName = item.relativePath || fileObj.relativePath || fileObj.name;
        ...
        return {
          _id: generateObjectId(),
          type: "upload",
          name: displayName,
          progress: 0,
          loaded: 0,
          total: fileObj.size,
          status,
          errorMessage,
          speed: 0,
          timeRemaining: 0,
          file: fileObj,
          dirId: targetDir,
          relativePath: item.relativePath || fileObj.relativePath,
          requiresSubscription: isPlanBlocked,
        };
      });
  ```
- In transfer list item display, render `transfer.name` with clean truncate and folder icon if `relativePath` is present.

- [ ] **Step 2: Update `DashboardLayout.jsx` `handleUpload`**

In `Frontend/src/layouts/DashboardLayout.jsx`:
- Allow `handleUpload(files, targetId)` to accept array of file items/descriptors and forward directly to `transferRef.current.uploadFiles(fileArray, destination)`.

- [ ] **Step 3: Verify build / lint**

Run: `npm --prefix Frontend run build` (or check for syntax/compilation issues).
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/components/drive/TransferManager.jsx Frontend/src/layouts/DashboardLayout.jsx
git commit -m "feat(transfers): support path-aware transfers and directory item filtering"
```

---

### Task 4: FileBrowser Drag-and-Drop Folder Resolution & Instant UI Settle

**Files:**
- Modify: `Frontend/src/components/drive/FileBrowser.jsx:1669-2005`

**Interfaces:**
- Consumes: `scanDroppedItems` from `folderDropScanner.js`, `ensureDirectoryTree` from `files.api.js`.
- Produces: Seamless folder drop handling on browser background and folder cards.

- [ ] **Step 1: Import scanner and API in `FileBrowser.jsx`**

```javascript
import { scanDroppedItems } from "../../lib/folderDropScanner";
import { ensureDirectoryTree } from "../../api/files.api";
```

- [ ] **Step 2: Refactor `handleDrop` and `handleZoneDrop` in `FileBrowser.jsx`**

In `Frontend/src/components/drive/FileBrowser.jsx`:
- When dropping desktop files/folders:
  1. Call `const scanned = await scanDroppedItems(e.dataTransfer.items, e.dataTransfer.files)`.
  2. If `scanned.isFolderDrop`:
     - Determine `targetDirId = targetItem?._id || folderId || user?.rootDirId`.
     - Check subscription/plan restrictions: if restricted, dispatch `subscription:prompt` and return.
     - Call `const { tree } = await ensureDirectoryTree(targetDirId, scanned.directories)`.
     - Immediately invoke `fetchFiles()` so the newly created root folder(s) appear in the UI right away!
     - If `scanned.files.length > 0`:
       - Map each file's `folderPath` to `tree[file.folderPath] || targetDirId`.
       - Prepare transfer items: `{ file: f.file, dirId: targetFolderId, relativePath: f.relativePath }`.
       - Call `uploadFile(preparedFiles, targetDirId)`.
     - Return.
  3. If not a folder drop (pure files):
     - Proceed with standard single/multi file upload.

- [ ] **Step 3: Support dropping folder onto an existing folder card**

Verify `handleDrop(e, targetItem)` sets `targetDirId = targetItem._id` when dropped directly on a directory card, properly placing the dropped folder inside the target card.

- [ ] **Step 4: Verify in browser / build**

Run: `npm --prefix Frontend run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/components/drive/FileBrowser.jsx
git commit -m "feat(drive): integrate folder drop scanning and instant tree resolution in FileBrowser"
```

---

### Task 5: FileUploadModal Dropzone Folder Support

**Files:**
- Modify: `Frontend/src/components/drive/FileUploadModal.jsx:29-75`

**Interfaces:**
- Consumes: `scanDroppedItems` from `folderDropScanner.js`.
- Produces: Displays folder badges / relative paths in modal queue and passes folder tree descriptors on submit.

- [ ] **Step 1: Update `handleDrop` in `FileUploadModal.jsx`**

In `Frontend/src/components/drive/FileUploadModal.jsx`:
- When items are dropped into the modal dropzone:
  - Run `scanDroppedItems(e.dataTransfer.items, e.dataTransfer.files)`.
  - Store scanned items `{ file, relativePath, folderPath, directories }` in state.
  - In modal file list, display relative path with folder icon for files that belong to a folder.
- On `handleSubmit`:
  - Pass the scanned items to `onFilesSelected` / `onUpload`.

- [ ] **Step 2: Verify in build**

Run: `npm --prefix Frontend run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/components/drive/FileUploadModal.jsx
git commit -m "feat(upload-modal): support folder drag-and-drop in FileUploadModal"
```

---

### Task 6: End-to-End Verification & Edge-Case Guardrails

**Files:**
- Create: `Frontend/src/tests/folderUploadE2E.test.js` or manual verification plan.

- [ ] **Step 1: Test dragging an empty folder**
  - Drop empty folder "EmptyTest".
  - Expected: Folder "EmptyTest" is created in Vault; 0 transfer errors.

- [ ] **Step 2: Test dragging a multi-level nested folder ("Mjo videos")**
  - Drop "Mjo videos" containing `Season 1/ep1.mp4`, `Season 2/ep2.mp4`, and root files.
  - Expected: "Mjo videos" appears immediately in Vault. Files upload inside their respective subfolders. No "Error 0%" transfer card.

- [ ] **Step 3: Test dropping folder onto existing folder card**
  - Drag "Mjo videos" over folder card "Archive" and drop.
  - Expected: "Mjo videos" is created inside "Archive".

- [ ] **Step 4: Verify design tokens & responsive layout**
  - Check transfer card layout, badge truncation, dark/light theme consistency.
