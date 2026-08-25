import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

const GuideContext = createContext();

const STORAGE_KEY = "vault_wally_tutorials_completed";
const SOUND_KEY = "vault_wally_sound_enabled";

// Web Audio API Sound Synthesizer for futuristic UI feedback
const playGuideSound = (type = "step") => {
  try {
    const isSoundEnabled = localStorage.getItem(SOUND_KEY) !== "false";
    if (!isSoundEnabled) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === "step" || type === "next") {
      // Soft high chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "start") {
      // Futuristic ascending greeting chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.05, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.25);
      });
    } else if (type === "complete") {
      // Celebration triumph fanfare
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.07, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.35);
      });
    }
  } catch {
    // Ignore audio context errors
  }
};

export const TOURS = {
  // ── 1. MASTER TOUR ──
  "master-onboarding": {
    id: "master-onboarding",
    title: "Vault OS Master Tour",
    description: "Learn how to navigate, search, store, and manage your encrypted assets with Wally.",
    icon: "Rocket",
    role: "all",
    badge: "Essential",
    steps: [
      {
        id: "welcome",
        target: null, // Centered modal
        position: "center",
        gesture: "waving",
        stickAngle: 0,
        title: "Hello! I am Wally, your Vault OS Guide",
        description: "Welcome to Vault OS! I am here to guide you step-by-step through every feature and keyboard shortcut. Let me show you around your secure command center.",
        actionTip: "Click Next or press Enter to begin the guided walkthrough.",
      },
      {
        id: "search",
        target: '[data-tour="command-bar-search"]',
        position: "bottom",
        gesture: "pointing",
        title: "Neural Search & Command Bar",
        description: "Locate any classified file, document, or repository instantly across your entire vault. Filter by extension, file size, or directory scope.",
        actionTip: "Pro-tip: Press Ctrl+K (or ⌘K) anywhere to quickly focus search.",
      },
      {
        id: "quick-actions",
        target: '[data-tour="quick-actions"]',
        position: "bottom",
        gesture: "pointing",
        title: "Quick Action Launchers",
        description: "One-click access to upload encrypted assets (Alt+U), create new directories (Alt+N), initialize code files (Alt+F), and share your vault directly (Alt+S).",
        actionTip: "Look for the color-coded action buttons in the top-right header.",
      },
      {
        id: "nav-rail",
        target: '[data-tour="nav-rail"]',
        position: "right",
        gesture: "pointing",
        title: "Navigation Rail",
        description: "Switch seamlessly between your Vault Chamber (Alt+1), Secure Relay (Alt+2), Activity Pulse (Alt+3), Priority Beacon (Alt+4), Recycle Vault (Alt+5), and Wally's Academy (Alt+T).",
        actionTip: "Hover over the left rail to expand labels and connected integrations.",
      },
      {
        id: "file-workspace",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "VS Code Style Keyboard Navigation",
        description: "Use Arrow keys (←, →, ↑, ↓) to navigate files and folders. Hold Shift + Arrow to multi-select adjacent items! Press Enter to open or preview, and F2 to rename.",
        actionTip: "Try using your keyboard right now to command the file workspace.",
      },
      {
        id: "system-core",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "System Core & Security Profile",
        description: "Manage your 2FA security, recovery keys, personal profile, and review active plan tier storage quotas in the System Core (Alt+8).",
        actionTip: "Always keep your zero-knowledge encryption recovery keys secure!",
      },
      {
        id: "finish-master",
        target: null,
        position: "center",
        gesture: "celebrating",
        title: "You're All Set!",
        description: "You're ready to command Vault OS like a pro. Remember, you can visit Wally's Academy anytime using the left rail or the Guidebook button in the bottom-right corner.",
        actionTip: "Click Finish to close this tutorial.",
      },
    ],
  },

  // ── 2. KEYBOARD SHORTCUTS ACADEMY ──
  "shortcuts-academy": {
    id: "shortcuts-academy",
    title: "Master Keyboard Navigation & Shortcuts",
    description: "Learn VS Code style arrow navigation, Shift multi-select, and custom hotkeys.",
    icon: "Keyboard",
    role: "all",
    badge: "Keyboard Master",
    steps: [
      {
        id: "shortcuts-intro",
        target: null,
        position: "center",
        gesture: "waving",
        title: "Wally's Shortcuts Training",
        description: "Vault OS gives you full keyboard control over every single operation. Let's practice the essential navigation and file action shortcuts.",
        actionTip: "Press Enter to start shortcut training.",
      },
      {
        id: "arrow-nav",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "Step 1: Arrow Key Navigation",
        description: "Press Arrow Left (←), Right (→), Up (↑), or Down (↓) to seamlessly move selection between files and folders without touching your mouse.",
        actionTip: "Focused item is automatically highlighted and selected.",
      },
      {
        id: "shift-select",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "Step 2: Shift + Arrow Multi-Selection",
        description: "Hold Shift and press any Arrow key to expand selection across multiple adjacent files. This lets you bulk copy, move, or share in seconds!",
        actionTip: "Try: Hold Shift + ArrowRight to select multiple adjacent files.",
      },
      {
        id: "item-actions",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "Step 3: Instant Item Actions",
        description: "Press Enter to open folders, Space to preview files, F2 to rename, Delete to recycle, and Alt+P to star.",
        actionTip: "You can customize all shortcuts in Wally's Academy!",
      },
    ],
  },

  // ── 3. OWNER SOVEREIGN COMMAND SUITE ──
  "owner-power-suite": {
    id: "owner-power-suite",
    title: "Owner Sovereign Command & System Configuration",
    description: "Realize your full Owner authority: configure global system limits, create plans, set pricing, and control system rules.",
    icon: "Crown",
    role: "owner",
    badge: "👑 Owner Only",
    steps: [
      {
        id: "owner-welcome",
        target: null,
        position: "center",
        gesture: "celebrating",
        title: "Welcome to the Sovereign Throne, Owner!",
        description: "As the Owner, you possess absolute authority over the entire Vault OS instance. You dictate system thresholds, create subscription plans, govern security policies, and manage all users. Wally will guide you through your supreme powers!",
        actionTip: "Press Next or Enter to explore your administrative capabilities.",
      },
      {
        id: "owner-system-limits",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "1. Global System Limits & Thresholds (Alt+O)",
        description: "In Owner Settings (Alt+O), you can enforce hard system ceilings: Maximum Devices per account, Maximum File Size limit (e.g. 100 MB), and Free Trial duration. Changing these will globally safeguard server bandwidth and prevent unauthorized session proliferation.",
        actionTip: "Shortcut: Press Alt+O anywhere to jump directly into Owner Settings.",
      },
      {
        id: "owner-plan-builder",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "2. Dynamic Plan Creation & Pricing Matrix",
        description: "Build custom subscription plans on the fly! Select categories (e.g., Professional, Enterprise), define max storage quotas (GB/TB), set recurring pricing in multiple currencies (USD, INR, EUR), and toggle monthly vs yearly periods.",
        actionTip: "New plans immediately become available across the entire platform.",
      },
      {
        id: "owner-features-catalogue",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "3. Zero-Knowledge Feature Switchboard",
        description: "Control which tiers get premium features: End-to-End Encryption, GitHub sync, Google Drive bridging, Transfer Manager high-speed queues, and custom branding.",
        actionTip: "Disabling a feature for a tier immediately locks it for users on that tier.",
      },
      {
        id: "owner-summary",
        target: null,
        position: "center",
        gesture: "explaining",
        title: "Your Owner Shortcuts Arsenal",
        description: "• Alt+O: Jump to Owner Settings & Plan Builder\n• Alt+M: Jump to User Management & Role Control\n• Alt+8: System Core & Security Profile\n• Alt+T: Wally's Academy & Hotkey Customizer",
        actionTip: "You have full power. Command with precision!",
      },
    ],
  },

  // ── 4. USER & TEAM MANAGEMENT MATRIX ──
  "user-management-matrix": {
    id: "user-management-matrix",
    title: "User & Team Authority Management",
    description: "Manage team credentials, assign roles (Owner, Manager, Admin, Member, Guest), enforce 2FA, and monitor active sessions.",
    icon: "Shield",
    role: "manager",
    badge: "🛡️ Owner & Manager",
    steps: [
      {
        id: "users-roster-intro",
        target: null,
        position: "center",
        gesture: "waving",
        title: "User Management & Role Hierarchy (Alt+M)",
        description: "The User Management portal gives you real-time visibility into all registered team accounts, storage usage, and active device sessions. Let's review what each role can do and what happens when you modify them.",
        actionTip: "Shortcut: Press Alt+M to quickly open the User Management console.",
      },
      {
        id: "roles-hierarchy",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "1. The 5-Tier Role Permission Matrix",
        description: "• OWNER: Supreme authority over plans, limits, and all users.\n• MANAGER: Manages team members, adjusts storage quotas, and moderates shared drives.\n• ADMIN: Moderates users, resets sessions, and oversees security.\n• MEMBER: Standard vault user with encrypted storage.\n• GUEST: Read-only access to specific shared relay tokens.",
        actionTip: "Elevating a user to Manager grants them user moderation and quota controls.",
      },
      {
        id: "storage-adjustments",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "2. Custom Storage Quota Overrides",
        description: "Need to grant a specific team member extra space? You can override default plan storage limits per user on the fly. If a user exceeds their limit, their account automatically switches to safe read-only mode until upgraded.",
        actionTip: "Storage adjustments take effect instantly across all node syncs.",
      },
      {
        id: "remote-logout-suspension",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "3. Remote Session Kill & Instant Suspension",
        description: "If a team device is compromised or lost, you can trigger 'Force Logout' to immediately terminate all active JWT tokens across all their browsers and phones. You can also 'Suspend' accounts to lock them out without deleting their encrypted files.",
        actionTip: "Suspended accounts cannot log in or generate new share tokens.",
      },
    ],
  },

  // ── 5. MANAGER COLLABORATIVE COMMAND SUITE ──
  "manager-command-suite": {
    id: "manager-command-suite",
    title: "Manager Operations & Collaborative Oversight",
    description: "Explore Manager-level capabilities: shared drive oversight, audit pulse tracking, and token relay controls.",
    icon: "Sliders",
    role: "manager",
    badge: "⚡ Manager Suite",
    steps: [
      {
        id: "manager-welcome",
        target: null,
        position: "center",
        gesture: "waving",
        title: "Welcome to the Manager Command Suite",
        description: "As a Manager, you coordinate collaboration, safeguard shared assets, and keep team productivity running at high velocity. Let's review the tools at your disposal.",
        actionTip: "Press Next to inspect Manager capabilities.",
      },
      {
        id: "manager-shared-relay",
        target: '[data-tour="nav-relay"]',
        position: "right",
        gesture: "pointing",
        title: "1. Secure Relay Moderation (Alt+2)",
        description: "Managers can audit all inbound and outbound share links. You can enforce token expiration policies, set password requirements, and immediately revoke any exposed cryptographic share tokens.",
        actionTip: "Press Alt+2 to quickly navigate to Secure Relay.",
      },
      {
        id: "manager-activity-pulse",
        target: '[data-tour="nav-rail"]',
        position: "right",
        gesture: "pointing",
        title: "2. Activity Pulse Audit Trail (Alt+3)",
        description: "Keep track of all file modifications, creations, and transfers across team drives in real-time. Use Activity Pulse to ensure data integrity and compliance.",
        actionTip: "Press Alt+3 to inspect recently active assets.",
      },
      {
        id: "manager-batch-ops",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "3. Bulk Relays & High-Speed Organization",
        description: "Use Shift + Arrow keys to batch-select dozens of files in seconds, then press Ctrl+C / Ctrl+V to organize team directories cleanly.",
        actionTip: "Remember: Press Alt+T to practice your keyboard gestures anytime!",
      },
    ],
  },

  // ── 6. ASSET UPLOAD & ENCRYPTION GUIDE ──
  "upload-guide": {
    id: "upload-guide",
    title: "Asset Upload & Encryption Guide",
    description: "Step-by-step walkthrough of client-side encryption and uploading files.",
    icon: "Upload",
    role: "all",
    badge: "Security",
    steps: [
      {
        id: "upload-trigger",
        target: '[data-tour="upload-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Step 1: Initiate File Upload (Alt+U)",
        description: "Click this cyan Upload button (or press Alt+U) to open the encrypted asset transfer portal.",
        actionTip: "Click the Upload button or click Next to view the dropzone.",
      },
      {
        id: "dropzone",
        target: '[data-tour="upload-dropzone"]',
        position: "bottom",
        gesture: "pointing",
        fallbackTarget: '[data-tour="upload-btn"]',
        title: "Step 2: Drag & Drop Assets",
        description: "Drag files directly from your desktop into this area, or click to browse files from your computer. You can upload multiple files at once!",
        actionTip: "Try dragging an image, document, or archive file here.",
      },
      {
        id: "encryption-guarantee",
        target: '[data-tour="upload-encryption-badge"]',
        position: "top",
        gesture: "pointing",
        fallbackTarget: '[data-tour="upload-btn"]',
        title: "Step 3: Zero-Knowledge AES-256 Encryption",
        description: "Every byte of your file is encrypted client-side in your browser before transmitting over the wire. Only your account key can decrypt and read the file.",
        actionTip: "Your raw, unencrypted files never touch any server unencrypted.",
      },
      {
        id: "confirm-upload",
        target: '[data-tour="upload-submit-btn"]',
        position: "top",
        gesture: "pointing",
        fallbackTarget: '[data-tour="upload-btn"]',
        title: "Step 4: Execute Encrypted Upload",
        description: "Once your files are queued, click the Upload button to stream encrypted chunks to your secure vault.",
        actionTip: "You can monitor live upload speed and progress in the Transfer Manager.",
      },
    ],
  },

  // ── 7. DIRECTORIES & IN-VAULT FILE CREATION ──
  "directory-files": {
    id: "directory-files",
    title: "Directories & In-Vault File Creation",
    description: "Learn how to organize folders and create files directly in Vault OS.",
    icon: "FolderPlus",
    role: "all",
    badge: "Organization",
    steps: [
      {
        id: "create-dir",
        target: '[data-tour="new-dir-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Create Secure Directories (Alt+N)",
        description: "Click this purple icon or press Alt+N to create nested directories and organize your confidential assets with custom permissions.",
        actionTip: "You can nest folders infinitely to match your project architecture.",
      },
      {
        id: "create-file",
        target: '[data-tour="new-file-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Create Files On-The-Fly (Alt+F)",
        description: "Click this orange icon or press Alt+F to initialize text files, Markdown documents, JSON configs, or code files (.js, .py, .ts) directly in your browser with live syntax highlighting.",
        actionTip: "Edit, preview, and save changes instantly with zero local installations.",
      },
      {
        id: "organize-actions",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "Batch Move, Copy & Rename",
        description: "Select multiple items with drag-selection or Shift+Arrows, then use Ctrl+C (Copy), Ctrl+X (Cut), and Ctrl+V (Paste) to organize.",
        actionTip: "You can also drag items and drop them straight into any folder!",
      },
    ],
  },

  // ── 8. SECURE RELAY & SHARING ──
  "secure-relay": {
    id: "secure-relay",
    title: "Secure Relay & Collaborator Sharing",
    description: "How to share files and folders securely with time-limited cryptographic tokens.",
    icon: "Share2",
    role: "all",
    badge: "Sharing",
    steps: [
      {
        id: "share-action",
        target: '[data-tour="share-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Share Vault & Assets (Alt+S)",
        description: "Click this button (or press Alt+S) to generate secure share links. You can set expiration timers, download limits, and password protections.",
        actionTip: "Recipients can access shared files without creating an account if permitted.",
      },
      {
        id: "relay-nav",
        target: '[data-tour="nav-relay"]',
        position: "right",
        gesture: "pointing",
        title: "Access Inbound Secure Relays (Alt+2)",
        description: "All vaults, folders, and documents shared with you by other verified vault nodes will appear inside the Secure Relay chamber.",
        actionTip: "Items in Secure Relay remain live and updated in real-time.",
      },
    ],
  },

  // ── 9. BILLING & PLAN TIERS ──
  "billing-plans-guide": {
    id: "billing-plans-guide",
    title: "Billing, Plan Tiers & Storage Expansion",
    description: "Manage subscription plans, activate free trials, and unlock storage expansions.",
    icon: "CreditCard",
    role: "all",
    badge: "Billing",
    steps: [
      {
        id: "billing-intro",
        target: null,
        position: "center",
        gesture: "waving",
        title: "Vault OS Storage Tiers (Alt+9)",
        description: "Explore flexible zero-knowledge storage plans. Choose from Free Trial, Professional, or Enterprise tiers with scalable GB/TB quotas.",
        actionTip: "Press Alt+9 to open the Billing & Plans page.",
      },
      {
        id: "billing-trial",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "Activate Free Trial & Unlock Features",
        description: "Start a free trial with zero credit card commitment. Get instant access to multi-device syncing, client-side encryption, and Google Drive & GitHub integrations.",
        actionTip: "Upgrading your plan automatically lifts all upload limits.",
      },
    ],
  },
};

export function GuideProvider({ children }) {
  const [activeTourId, setActiveTourId] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [completedTours, setCompletedTours] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const location = useLocation();

  // Save completed tours to localStorage
  const markTourCompleted = useCallback((tourId) => {
    setCompletedTours((prev) => {
      if (prev.includes(tourId)) return prev;
      const updated = [...prev, tourId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save tour completion", err);
      }
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_KEY, String(next));
      return next;
    });
  }, []);

  const startTour = useCallback((tourId, initialStepIndex = 0) => {
    if (!TOURS[tourId]) return;
    setActiveTourId(tourId);
    setCurrentStepIndex(initialStepIndex);
    setIsTourOpen(true);
    setIsMinimized(false);
    playGuideSound("start");
  }, []);

  const endTour = useCallback(() => {
    setIsTourOpen(false);
    setActiveTourId(null);
    setCurrentStepIndex(0);
  }, []);

  const completeTour = useCallback(() => {
    if (activeTourId) {
      markTourCompleted(activeTourId);
      playGuideSound("complete");
    }
    endTour();
  }, [activeTourId, markTourCompleted, endTour]);

  const skipTour = useCallback(() => {
    if (activeTourId) {
      markTourCompleted(activeTourId);
    }
    endTour();
  }, [activeTourId, markTourCompleted, endTour]);

  const nextStep = useCallback(() => {
    if (!activeTourId) return;
    const tour = TOURS[activeTourId];
    if (!tour) return;

    if (currentStepIndex < tour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      playGuideSound("next");
    } else {
      completeTour();
    }
  }, [activeTourId, currentStepIndex, completeTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      playGuideSound("step");
    }
  }, [currentStepIndex]);

  const resetAllTours = useCallback(() => {
    setCompletedTours([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Auto-launch master onboarding tour on first visit to /dashboard if never seen
  useEffect(() => {
    const isDashboard = location.pathname.startsWith("/dashboard");
    if (!isDashboard) return;

    const hasSeenMaster = completedTours.includes("master-onboarding");
    if (!hasSeenMaster && !isTourOpen && !activeTourId) {
      const timer = setTimeout(() => {
        startTour("master-onboarding", 0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, completedTours, isTourOpen, activeTourId, startTour]);

  const currentTour = activeTourId ? TOURS[activeTourId] : null;
  const currentStep = currentTour && currentTour.steps[currentStepIndex] ? currentTour.steps[currentStepIndex] : null;

  return (
    <GuideContext.Provider
      value={{
        tours: TOURS,
        activeTourId,
        currentTour,
        currentStep,
        currentStepIndex,
        totalSteps: currentTour ? currentTour.steps.length : 0,
        isTourOpen,
        isMinimized,
        setIsMinimized,
        completedTours,
        soundEnabled,
        toggleSound,
        startTour,
        endTour,
        completeTour,
        skipTour,
        nextStep,
        prevStep,
        resetAllTours,
        isTourCompleted: (id) => completedTours.includes(id),
      }}
    >
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error("useGuide must be used within a GuideProvider");
  }
  return context;
}
