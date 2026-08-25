import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ShortcutContext = createContext();

const STORAGE_KEY = "vault_custom_shortcuts_v1";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFAULT KEYBINDINGS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_SHORTCUTS = {
  // ── Navigation & Selection in File View ──
  nav_next: {
    id: "nav_next",
    name: "Select Next Item",
    category: "Item Navigation",
    defaultKey: "ArrowRight",
    description: "Move cursor focus to the next file or folder in grid/list",
    scope: "vault_view",
  },
  nav_prev: {
    id: "nav_prev",
    name: "Select Previous Item",
    category: "Item Navigation",
    defaultKey: "ArrowLeft",
    description: "Move cursor focus to the previous file or folder in grid/list",
    scope: "vault_view",
  },
  nav_down: {
    id: "nav_down",
    name: "Select Item Below",
    category: "Item Navigation",
    defaultKey: "ArrowDown",
    description: "Move cursor focus down one row in grid or list view",
    scope: "vault_view",
  },
  nav_up: {
    id: "nav_up",
    name: "Select Item Above",
    category: "Item Navigation",
    defaultKey: "ArrowUp",
    description: "Move cursor focus up one row in grid or list view",
    scope: "vault_view",
  },
  select_range_next: {
    id: "select_range_next",
    name: "Multi-Select Range Right",
    category: "Item Navigation",
    defaultKey: "Shift+ArrowRight",
    description: "Expand contiguous selection to the adjacent item on the right",
    scope: "vault_view",
  },
  select_range_prev: {
    id: "select_range_prev",
    name: "Multi-Select Range Left",
    category: "Item Navigation",
    defaultKey: "Shift+ArrowLeft",
    description: "Expand contiguous selection to the adjacent item on the left",
    scope: "vault_view",
  },
  select_range_down: {
    id: "select_range_down",
    name: "Multi-Select Range Down",
    category: "Item Navigation",
    defaultKey: "Shift+ArrowDown",
    description: "Expand contiguous selection downwards by one row",
    scope: "vault_view",
  },
  select_range_up: {
    id: "select_range_up",
    name: "Multi-Select Range Up",
    category: "Item Navigation",
    defaultKey: "Shift+ArrowUp",
    description: "Expand contiguous selection upwards by one row",
    scope: "vault_view",
  },
  open_item: {
    id: "open_item",
    name: "Open Item / Enter Directory",
    category: "Item Navigation",
    defaultKey: "Enter",
    description: "Enter selected directory or open preview for selected file",
    scope: "vault_view",
  },
  navigate_parent: {
    id: "navigate_parent",
    name: "Go to Parent Directory",
    category: "Item Navigation",
    defaultKey: "Alt+ArrowUp",
    description: "Navigate up one level in directory hierarchy",
    scope: "vault_view",
  },

  // ── File & Directory Operations ──
  new_folder: {
    id: "new_folder",
    name: "Create New Directory",
    category: "File Operations",
    defaultKey: "Alt+N",
    description: "Open dialog to create a new folder in current directory",
    scope: "global",
  },
  new_file: {
    id: "new_file",
    name: "Create New File",
    category: "File Operations",
    defaultKey: "Alt+F",
    description: "Initialize and edit a new text or code file in-browser",
    scope: "global",
  },
  upload_file: {
    id: "upload_file",
    name: "Upload Assets",
    category: "File Operations",
    defaultKey: "Alt+U",
    description: "Open encrypted client-side file upload modal",
    scope: "global",
  },
  share_vault: {
    id: "share_vault",
    name: "Share Vault / Items",
    category: "File Operations",
    defaultKey: "Alt+S",
    description: "Open secure relay token share modal for selected items",
    scope: "global",
  },
  rename_item: {
    id: "rename_item",
    name: "Rename Selected Item",
    category: "File Operations",
    defaultKey: "F2",
    description: "Rename the currently selected directory or file",
    scope: "vault_view",
  },
  delete_item: {
    id: "delete_item",
    name: "Delete to Recycle Vault",
    category: "File Operations",
    defaultKey: "Delete",
    description: "Move selected file(s) or folder(s) to Recycle Vault",
    scope: "vault_view",
  },
  preview_item: {
    id: "preview_item",
    name: "Quick Look / Preview",
    category: "File Operations",
    defaultKey: "Space",
    description: "Open instant preview modal for selected file asset",
    scope: "vault_view",
  },
  star_item: {
    id: "star_item",
    name: "Toggle Priority Beacon (Star)",
    category: "File Operations",
    defaultKey: "Alt+P",
    description: "Star or unstar the selected asset for quick access",
    scope: "vault_view",
  },
  download_item: {
    id: "download_item",
    name: "Download Asset",
    category: "File Operations",
    defaultKey: "Alt+D",
    description: "Download decrypted file to local machine",
    scope: "vault_view",
  },
  select_all: {
    id: "select_all",
    name: "Select All Items",
    category: "Selection",
    defaultKey: "Ctrl+A",
    description: "Select all files and directories in the current view",
    scope: "vault_view",
  },
  deselect_all: {
    id: "deselect_all",
    name: "Deselect All / Cancel",
    category: "Selection",
    defaultKey: "Escape",
    description: "Clear current selection box and close active modals",
    scope: "global",
  },

  // ── Global App & Views Navigation ──
  neural_search: {
    id: "neural_search",
    name: "Neural Search Focus",
    category: "App Navigation",
    defaultKey: "Ctrl+K",
    description: "Focus Neural Search input in Command Bar",
    scope: "global",
  },
  toggle_view_mode: {
    id: "toggle_view_mode",
    name: "Toggle Grid / List View",
    category: "App Navigation",
    defaultKey: "Alt+V",
    description: "Switch between Vault Grid and List view layouts",
    scope: "vault_view",
  },
  go_chamber: {
    id: "go_chamber",
    name: "Go to Vault Chamber (Root)",
    category: "App Navigation",
    defaultKey: "Alt+1",
    description: "Navigate to primary root vault chamber",
    scope: "global",
  },
  go_shared: {
    id: "go_shared",
    name: "Go to Secure Relay (Shared)",
    category: "App Navigation",
    defaultKey: "Alt+2",
    description: "Navigate to Secure Relay inbound shared drives",
    scope: "global",
  },
  go_recent: {
    id: "go_recent",
    name: "Go to Activity Pulse (Recent)",
    category: "App Navigation",
    defaultKey: "Alt+3",
    description: "Navigate to recently modified asset index",
    scope: "global",
  },
  go_starred: {
    id: "go_starred",
    name: "Go to Priority Beacon (Starred)",
    category: "App Navigation",
    defaultKey: "Alt+4",
    description: "Navigate to starred critical assets",
    scope: "global",
  },
  go_trash: {
    id: "go_trash",
    name: "Go to Recycle Vault",
    category: "App Navigation",
    defaultKey: "Alt+5",
    description: "Navigate to Recycle Vault / Deleted items",
    scope: "global",
  },
  go_drive: {
    id: "go_drive",
    name: "Go to Google Drive Integration",
    category: "App Navigation",
    defaultKey: "Alt+6",
    description: "Navigate to synced Google Drive cloud storage",
    scope: "global",
  },
  go_github: {
    id: "go_github",
    name: "Go to GitHub Repositories",
    category: "App Navigation",
    defaultKey: "Alt+7",
    description: "Navigate to linked GitHub repositories workspace",
    scope: "global",
  },
  go_profile: {
    id: "go_profile",
    name: "Go to System Core (Profile & 2FA)",
    category: "App Navigation",
    defaultKey: "Alt+8",
    description: "Navigate to security credentials and profile settings",
    scope: "global",
  },
  go_billing: {
    id: "go_billing",
    name: "Go to Storage & Plan Tiers",
    category: "App Navigation",
    defaultKey: "Alt+9",
    description: "Navigate to storage quotas and subscription plans",
    scope: "global",
  },
  go_tutorials: {
    id: "go_tutorials",
    name: "Open Wally's Academy & Shortcut Config",
    category: "App Navigation",
    defaultKey: "Alt+T",
    description: "Navigate to Wally's Tutorials & Shortcuts Configuration Center",
    scope: "global",
  },
  go_owner_settings: {
    id: "go_owner_settings",
    name: "Go to Owner Settings (Plan Builder & Limits)",
    category: "Admin & Owner",
    defaultKey: "Alt+O",
    description: "Navigate to Owner Sovereign Control, System Ceilings, and Pricing Builder",
    scope: "global",
  },
  go_user_management: {
    id: "go_user_management",
    name: "Go to User Management & Team Roster",
    category: "Admin & Owner",
    defaultKey: "Alt+M",
    description: "Navigate to Team Roster, Role Permissions, and Session Termination",
    scope: "global",
  },
  open_guidebook: {
    id: "open_guidebook",
    name: "Summon Wally Guidebook",
    category: "App Navigation",
    defaultKey: "Alt+W",
    description: "Open floating Wally Guidebook menu",
    scope: "global",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. RESTRICTED BROWSER & SYSTEM SHORTCUTS PROTECTION
// ─────────────────────────────────────────────────────────────────────────────
export const RESTRICTED_SHORTCUTS = {
  "ctrl+w": "Closes the active browser tab.",
  "meta+w": "Closes the active browser tab.",
  "ctrl+shift+w": "Closes the entire browser window.",
  "meta+shift+w": "Closes the entire browser window.",
  "alt+f4": "Closes the application / browser window.",
  "ctrl+t": "Opens a new browser tab.",
  "meta+t": "Opens a new browser tab.",
  "ctrl+shift+t": "Reopens the last closed browser tab.",
  "meta+shift+t": "Reopens the last closed browser tab.",
  "ctrl+n": "Opens a new browser window.",
  "meta+n": "Opens a new browser window.",
  "ctrl+shift+n": "Opens a new incognito / private window.",
  "meta+shift+n": "Opens a new incognito / private window.",
  "ctrl+q": "Quits the browser application.",
  "meta+q": "Quits the browser application.",
  "f5": "Reloads the webpage from scratch.",
  "ctrl+r": "Reloads the webpage.",
  "meta+r": "Reloads the webpage.",
  "ctrl+shift+r": "Hard reloads the webpage clearing cache.",
  "meta+shift+r": "Hard reloads the webpage clearing cache.",
  "ctrl+p": "Opens the browser print dialog.",
  "meta+p": "Opens the browser print dialog.",
  "ctrl+o": "Opens browser file selection dialog.",
  "meta+o": "Opens browser file selection dialog.",
  "f12": "Opens browser Developer Tools.",
  "ctrl+shift+i": "Opens browser Developer Tools.",
  "meta+alt+i": "Opens browser Developer Tools.",
  "ctrl+shift+j": "Opens browser Console.",
  "meta+alt+j": "Opens browser Console.",
  "ctrl+shift+c": "Inspects element in Developer Tools.",
  "meta+alt+c": "Inspects element in Developer Tools.",
  "ctrl+h": "Opens browser history.",
  "meta+y": "Opens browser history.",
  "ctrl+j": "Opens browser downloads list.",
  "ctrl+d": "Bookmarks the current page.",
  "meta+d": "Bookmarks the current page.",
};

// Normalize shortcut key combination string (e.g. "Ctrl+Alt+F" -> "ctrl+alt+f")
export const normalizeKey = (keyString) => {
  if (!keyString) return "";
  const parts = keyString
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);

  const modifiers = [];
  let mainKey = "";

  parts.forEach((p) => {
    if (["ctrl", "control"].includes(p)) modifiers.push("ctrl");
    else if (["meta", "cmd", "command"].includes(p)) modifiers.push("meta");
    else if (["alt", "option"].includes(p)) modifiers.push("alt");
    else if (["shift"].includes(p)) modifiers.push("shift");
    else mainKey = p;
  });

  modifiers.sort();
  return [...modifiers, mainKey].join("+");
};

// Check if a shortcut is restricted
export const isRestrictedShortcut = (keyString) => {
  const norm = normalizeKey(keyString);
  const reason = RESTRICTED_SHORTCUTS[norm];
  return {
    isRestricted: !!reason,
    reason: reason || null,
  };
};

export function ShortcutProvider({ children }) {
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SHORTCUTS, ...parsed };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SHORTCUTS;
  });

  // Save to localStorage whenever shortcuts update
  const saveCustomShortcuts = useCallback((newMap) => {
    setShortcuts(newMap);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
    } catch (err) {
      console.error("Failed to save custom shortcuts", err);
    }
  }, []);

  // Conflict Checker: Checks if combo is already assigned to another action
  const checkConflict = useCallback(
    (actionId, candidateKey) => {
      const normCandidate = normalizeKey(candidateKey);
      if (!normCandidate) return null;

      for (const [id, item] of Object.entries(shortcuts)) {
        if (id === actionId) continue;
        const currentKey = item.customKey || item.defaultKey;
        if (normalizeKey(currentKey) === normCandidate) {
          return {
            conflictingActionId: id,
            conflictingActionName: item.name,
          };
        }
      }
      return null;
    },
    [shortcuts]
  );

  // Update a single shortcut with validation
  const updateShortcut = useCallback(
    (actionId, newKey) => {
      if (!shortcuts[actionId]) return { success: false, error: "Action not found" };

      // 1. Check browser restriction
      const restriction = isRestrictedShortcut(newKey);
      if (restriction.isRestricted) {
        return {
          success: false,
          error: `Restricted shortcut: "${newKey}" is reserved by the browser/OS. (${restriction.reason})`,
        };
      }

      // 2. Check conflict
      const conflict = checkConflict(actionId, newKey);
      if (conflict) {
        return {
          success: false,
          error: `Conflict: "${newKey}" is already assigned to "${conflict.conflictingActionName}". Please choose another combination or reassign the other action first.`,
        };
      }

      const updated = {
        ...shortcuts,
        [actionId]: {
          ...shortcuts[actionId],
          customKey: newKey,
        },
      };

      saveCustomShortcuts(updated);
      return { success: true };
    },
    [shortcuts, checkConflict, saveCustomShortcuts]
  );

  // Reset a single action to default
  const resetShortcut = useCallback(
    (actionId) => {
      if (!shortcuts[actionId]) return;
      const updated = {
        ...shortcuts,
        [actionId]: {
          ...shortcuts[actionId],
          customKey: undefined,
        },
      };
      saveCustomShortcuts(updated);
    },
    [shortcuts, saveCustomShortcuts]
  );

  // Reset all to defaults
  const resetAllShortcuts = useCallback(() => {
    saveCustomShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem(STORAGE_KEY);
  }, [saveCustomShortcuts]);

  // Get active keybinding string for an action
  const getShortcutKey = useCallback(
    (actionId) => {
      const item = shortcuts[actionId];
      if (!item) return "";
      return item.customKey || item.defaultKey;
    },
    [shortcuts]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. GLOBAL KEYBOARD EVENT DISPATCHER
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore when typing in editable elements unless Escape
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
        e.target.isContentEditable ||
        e.target.classList.contains("npm__react-simple-code-editor__textarea");

      // Construct normalized key representation of event
      const parts = [];
      if (e.ctrlKey) parts.push("ctrl");
      if (e.metaKey) parts.push("meta");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");

      let keyName = e.key;
      if (keyName === " ") keyName = "Space";
      if (!["Control", "Shift", "Alt", "Meta"].includes(keyName)) {
        parts.push(keyName.toLowerCase());
      }

      const pressedCombo = parts.join("+");

      // Match against registered shortcuts
      for (const [actionId, item] of Object.entries(shortcuts)) {
        const activeKey = item.customKey || item.defaultKey;
        const normActive = normalizeKey(activeKey);

        if (pressedCombo === normActive) {
          // If typing inside an input, only allow Escape or Search (Ctrl+K)
          if (isInput && !["deselect_all", "neural_search"].includes(actionId)) {
            continue;
          }

          // Special: Space should not prevent typing spaces in textareas
          if (isInput && actionId === "preview_item") {
            continue;
          }

          // Dispatch custom action event
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("vault:shortcut", {
              detail: { actionId, item, event: e },
            })
          );
          break;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [shortcuts]);

  return (
    <ShortcutContext.Provider
      value={{
        shortcuts,
        defaultShortcuts: DEFAULT_SHORTCUTS,
        restrictedShortcuts: RESTRICTED_SHORTCUTS,
        getShortcutKey,
        updateShortcut,
        resetShortcut,
        resetAllShortcuts,
        checkConflict,
        isRestrictedShortcut,
      }}
    >
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error("useShortcuts must be used within a ShortcutProvider");
  }
  return context;
}
