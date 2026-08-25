import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

const GuideContext = createContext();

const STORAGE_KEY = "vault_wall_tutorials_completed";
const SOUND_KEY = "vault_wall_sound_enabled";

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
  } catch (err) {
    // Ignore audio context errors if blocked by browser policy
  }
};

export const TOURS = {
  "master-onboarding": {
    id: "master-onboarding",
    title: "Vault OS Master Tour",
    description: "Learn how to navigate, search, store, and manage your encrypted assets.",
    icon: "Rocket",
    steps: [
      {
        id: "welcome",
        target: null, // Centered modal
        position: "center",
        gesture: "waving",
        stickAngle: 0,
        title: "Hello! I am Wall, your Vault OS Guide",
        description: "Welcome to Vault OS! I am here to guide you step-by-step through every feature. Let me show you around your secure command center.",
        actionTip: "Click Next or press Enter to begin the guided walkthrough.",
      },
      {
        id: "search",
        target: '[data-tour="command-bar-search"]',
        position: "bottom",
        gesture: "pointing",
        title: "Neural Search & Command Bar",
        description: "Locate any classified file, document, or repository instantly across your entire vault. Filter by extension, file size, or directory scope.",
        actionTip: "Pro-tip: Press ⌘+K (or Ctrl+K) anywhere to quickly focus search.",
      },
      {
        id: "quick-actions",
        target: '[data-tour="quick-actions"]',
        position: "bottom",
        gesture: "pointing",
        title: "Quick Action Launchers",
        description: "One-click access to upload encrypted assets, create new directories, initialize code files, and share your vault directly with collaborators.",
        actionTip: "Look for the color-coded action buttons in the top-right header.",
      },
      {
        id: "nav-rail",
        target: '[data-tour="nav-rail"]',
        position: "right",
        gesture: "pointing",
        title: "Navigation Rail",
        description: "Switch seamlessly between your Vault Chamber (root storage), Secure Relay (shared drives), Activity Pulse (recent files), Priority Beacon (starred), and Recycle Vault.",
        actionTip: "Hover over the left rail to expand labels and connected integrations.",
      },
      {
        id: "file-workspace",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "Vault Workspace & Gestures",
        description: "Manage your files in Grid or List view. You can drag to box-select multiple files, right-click for quick actions (Copy, Cut, Rename, Star, Share), or drag & drop directly into folders.",
        actionTip: "Right-click any asset to inspect metadata and cryptographic hashes.",
      },
      {
        id: "system-core",
        target: '[data-tour="system-core"]',
        position: "top",
        gesture: "pointing",
        title: "System Core & Security Profile",
        description: "Manage your 2FA security, recovery keys, personal profile, and review active plan tier storage quotas in the System Core.",
        actionTip: "Always keep your zero-knowledge encryption recovery keys secure!",
      },
      {
        id: "finish-master",
        target: null,
        position: "center",
        gesture: "celebrating",
        title: "You're All Set!",
        description: "You're ready to command Vault OS like a pro. Remember, you can re-summon me anytime using the Guidebook button in the bottom-right corner.",
        actionTip: "Click Finish to close this tutorial.",
      },
    ],
  },

  "upload-guide": {
    id: "upload-guide",
    title: "Asset Upload & Encryption Guide",
    description: "Step-by-step walkthrough of client-side encryption and uploading files.",
    icon: "Upload",
    steps: [
      {
        id: "upload-trigger",
        target: '[data-tour="upload-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Step 1: Initiate File Upload",
        description: "Click this cyan Upload button (or press the upload icon in empty folders) to open the encrypted asset transfer portal.",
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

  "directory-files": {
    id: "directory-files",
    title: "Directories & In-Vault File Creation",
    description: "Learn how to organize folders and create files directly in Vault OS.",
    icon: "FolderPlus",
    steps: [
      {
        id: "create-dir",
        target: '[data-tour="new-dir-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Create Secure Directories",
        description: "Click this purple icon to create nested directories and organize your confidential assets with custom permissions.",
        actionTip: "You can nest folders infinitely to match your project architecture.",
      },
      {
        id: "create-file",
        target: '[data-tour="new-file-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Create Files On-The-Fly",
        description: "Click this orange icon to initialize text files, Markdown documents, JSON configs, or code files (.js, .py, .ts) directly in your browser with live syntax highlighting.",
        actionTip: "Edit, preview, and save changes instantly with zero local installations.",
      },
      {
        id: "organize-actions",
        target: '[data-tour="file-grid"]',
        position: "top",
        gesture: "pointing",
        title: "Batch Move, Copy & Rename",
        description: "Select multiple items with drag-selection, then use the bottom action bar to copy, cut, or move assets between directories.",
        actionTip: "You can also drag items and drop them straight into any folder!",
      },
    ],
  },

  "secure-relay": {
    id: "secure-relay",
    title: "Secure Relay & Collaborator Sharing",
    description: "How to share files and folders securely with time-limited cryptographic tokens.",
    icon: "Share2",
    steps: [
      {
        id: "share-action",
        target: '[data-tour="share-btn"]',
        position: "bottom",
        gesture: "pointing",
        title: "Share Vault & Assets",
        description: "Click this button (or right-click any item) to generate secure share links. You can set expiration timers, download limits, and password protections.",
        actionTip: "Recipients can access shared files without creating an account if permitted.",
      },
      {
        id: "relay-nav",
        target: '[data-tour="nav-relay"]',
        position: "right",
        gesture: "pointing",
        title: "Access Inbound Secure Relays",
        description: "All vaults, folders, and documents shared with you by other verified vault nodes will appear inside the Secure Relay chamber.",
        actionTip: "Items in Secure Relay remain live and updated in real-time.",
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
