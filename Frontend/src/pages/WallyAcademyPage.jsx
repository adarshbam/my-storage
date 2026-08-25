import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShortcuts, normalizeKey, isRestrictedShortcut } from "../context/ShortcutContext";
import { useGuide } from "../context/GuideContext";
import WallMascot from "../components/guide/WallMascot";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import {
  Keyboard,
  Sparkles,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Folder,
  FileText,
  FileCode,
  Image,
  Shield,
  Layers,
  ArrowRight,
  Info,
  Sliders,
  Zap,
  Crown,
} from "lucide-react";

// Mock files for the Live Practice Sandbox
const SANDBOX_ITEMS = [
  { id: "s1", name: "Security_Audit_2026.pdf", type: "file", ext: "pdf", icon: FileText, size: "2.4 MB" },
  { id: "s2", name: "Source_Code_Vault.zip", type: "file", ext: "zip", icon: FileCode, size: "14.8 MB" },
  { id: "s3", name: "Quantum_Keys", type: "directory", ext: "folder", icon: Folder, size: "4 items" },
  { id: "s4", name: "System_Architecture.png", type: "file", ext: "png", icon: Image, size: "1.1 MB" },
  { id: "s5", name: "Confidential_Specs.md", type: "file", ext: "md", icon: FileText, size: "420 KB" },
  { id: "s6", name: "Production_Backup", type: "directory", ext: "folder", icon: Folder, size: "12 items" },
];

export default function WallyAcademyPage() {
  const {
    shortcuts,
    defaultShortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    checkConflict,
  } = useShortcuts();

  const { startTour, tours, completedTours } = useGuide();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTourFilter, setSelectedTourFilter] = useState("All");

  // Shortcut Customizer Modal State
  const [editingActionId, setEditingActionId] = useState(null);
  const [recordedKeys, setRecordedKeys] = useState("");
  const [validationError, setValidationError] = useState("");
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Live Practice Sandbox State
  const [sandboxFocusedIndex, setSandboxFocusedIndex] = useState(0);
  const [sandboxSelectedIds, setSandboxSelectedIds] = useState(["s1"]);
  const [sandboxAnchorIndex, setSandboxAnchorIndex] = useState(0);
  const [lastKeyPressed, setLastKeyPressed] = useState("");
  const [sandboxActionMessage, setSandboxActionMessage] = useState("");
  const [sandboxPreviewItem, setSandboxPreviewItem] = useState(null);

  // Quests Mastery state
  const [completedQuests, setCompletedQuests] = useState({
    arrowNav: false,
    shiftSelect: false,
    preview: false,
    rename: false,
  });

  const categories = useMemo(() => {
    const cats = new Set(Object.values(shortcuts).map((s) => s.category));
    return ["All", ...Array.from(cats)];
  }, [shortcuts]);

  const filteredShortcuts = useMemo(() => {
    return Object.values(shortcuts).filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const currentKey = item.customKey || item.defaultKey;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        currentKey.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [shortcuts, selectedCategory, searchQuery]);

  const filteredTours = useMemo(() => {
    return Object.values(tours).filter((tour) => {
      if (selectedTourFilter === "Owner") return tour.role === "owner";
      if (selectedTourFilter === "Manager") return tour.role === "manager" || tour.role === "owner";
      if (selectedTourFilter === "General") return tour.role === "all";
      return true;
    });
  }, [tours, selectedTourFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LIVE PRACTICE SANDBOX KEYBOARD HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleSandboxKeyDown = (e) => {
      // Don't intercept if modal is open or typing in search input
      if (editingActionId) return;
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      const key = e.key;
      let displayKey = key;
      if (e.shiftKey && key !== "Shift") displayKey = `Shift + ${key}`;
      if (e.ctrlKey && key !== "Control") displayKey = `Ctrl + ${key}`;
      if (e.altKey && key !== "Alt") displayKey = `Alt + ${key}`;
      setLastKeyPressed(displayKey);

      // Arrow navigation
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(key)) {
        e.preventDefault();
        const cols = 3; // 3 columns in sandbox grid
        let nextIndex = sandboxFocusedIndex;

        if (key === "ArrowRight") nextIndex = Math.min(SANDBOX_ITEMS.length - 1, sandboxFocusedIndex + 1);
        if (key === "ArrowLeft") nextIndex = Math.max(0, sandboxFocusedIndex - 1);
        if (key === "ArrowDown") nextIndex = Math.min(SANDBOX_ITEMS.length - 1, sandboxFocusedIndex + cols);
        if (key === "ArrowUp") nextIndex = Math.max(0, sandboxFocusedIndex - cols);

        setSandboxFocusedIndex(nextIndex);

        if (e.shiftKey) {
          // Multi select
          const start = Math.min(sandboxAnchorIndex, nextIndex);
          const end = Math.max(sandboxAnchorIndex, nextIndex);
          const range = SANDBOX_ITEMS.slice(start, end + 1).map((i) => i.id);
          setSandboxSelectedIds(range);
          setSandboxActionMessage(`Multi-selected ${range.length} items contiguous range!`);
          setCompletedQuests((prev) => ({ ...prev, shiftSelect: true }));
        } else {
          setSandboxAnchorIndex(nextIndex);
          setSandboxSelectedIds([SANDBOX_ITEMS[nextIndex].id]);
          setSandboxActionMessage(`Selected: ${SANDBOX_ITEMS[nextIndex].name}`);
          setCompletedQuests((prev) => ({ ...prev, arrowNav: true }));
        }
      } else if (key === " " || key === "Space") {
        e.preventDefault();
        const item = SANDBOX_ITEMS[sandboxFocusedIndex];
        setSandboxPreviewItem(item);
        setSandboxActionMessage(`Previewing asset: ${item.name}`);
        setCompletedQuests((prev) => ({ ...prev, preview: true }));
      } else if (key === "F2" || (e.altKey && key.toLowerCase() === "r")) {
        e.preventDefault();
        const item = SANDBOX_ITEMS[sandboxFocusedIndex];
        setSandboxActionMessage(`Rename triggered on: ${item.name}`);
        setCompletedQuests((prev) => ({ ...prev, rename: true }));
      }
    };

    window.addEventListener("keydown", handleSandboxKeyDown);
    return () => window.removeEventListener("keydown", handleSandboxKeyDown);
  }, [sandboxFocusedIndex, sandboxAnchorIndex, editingActionId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SHORTCUT RECORDER & VALIDATOR
  // ─────────────────────────────────────────────────────────────────────────────
  const startEditing = (actionId) => {
    setEditingActionId(actionId);
    setRecordedKeys("");
    setValidationError("");
    setValidationSuccess(false);
  };

  const handleRecordKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore standalone modifier presses
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.metaKey) parts.push("Meta");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    let mainKey = e.key;
    if (mainKey === " ") mainKey = "Space";
    else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
    parts.push(mainKey);

    const comboString = parts.join("+");
    setRecordedKeys(comboString);

    // Validate restricted shortcuts
    const restriction = isRestrictedShortcut(comboString);
    if (restriction.isRestricted) {
      setValidationError(`❌ Blocked: "${comboString}" is reserved by the browser/OS (${restriction.reason}). You cannot bind destructive browser shortcuts.`);
      setValidationSuccess(false);
      return;
    }

    // Validate conflicts
    const conflict = checkConflict(editingActionId, comboString);
    if (conflict) {
      setValidationError(`⚠️ Conflict: "${comboString}" is already used for "${conflict.conflictingActionName}".`);
      setValidationSuccess(false);
      return;
    }

    // Valid
    setValidationError("");
    setValidationSuccess(true);
  };

  const handleSaveRecordedShortcut = () => {
    if (!recordedKeys || !validationSuccess) return;
    const res = updateShortcut(editingActionId, recordedKeys);
    if (res.success) {
      setEditingActionId(null);
    } else {
      setValidationError(res.error);
    }
  };

  return (
    <div className="min-h-full pb-24 text-white space-y-8 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BANNER WITH WALLY MASCOT
         ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#071B16]/90 via-[#04100D]/90 to-[#0B1528]/90 border border-white/15 p-6 sm:p-8 backdrop-blur-3xl overflow-hidden shadow-2xl">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[radial-gradient(ellipse,rgba(0,207,255,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[radial-gradient(ellipse,rgba(16,185,129,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft border border-accent-border text-accent-primary text-xs font-black tracking-wider uppercase">
              <Sparkles size={14} />
              <span>Wally's Academy & Shortcut Config</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              VS Code Level Keyboard Shortcuts
            </h1>

            <p className="text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
              Command Vault OS with zero mouse latency. Navigate files with Arrow keys, multi-select with Shift, trigger client-side encryption, and customize every hotkey to match your muscle memory.
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                <Keyboard size={14} className="text-accent-primary" />
                <span>{Object.keys(shortcuts).length} Shortcuts Registered</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Shield size={14} />
                <span>Browser Protection Active</span>
              </div>
            </div>
          </div>

          {/* Wally Companion Avatar */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-28 h-28 sm:w-36 sm:h-36 relative">
              <WallMascot gesture="pointing" size={140} targetAngle={-35} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-accent-primary mt-1">
              Wally • Guide & Instructor
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE INTERACTIVE PRACTICE ARENA / SANDBOX
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-slate-900/60 dark:bg-vault-panel/60 border border-slate-200/10 backdrop-blur-2xl p-6 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Zap size={20} className="text-accent-primary" />
              <span>Live Keyboard Practice Sandbox</span>
            </h2>
            <p className="text-xs text-white/50">
              Practice navigating, selecting, and previewing files using only your keyboard in real-time.
            </p>
          </div>

          {/* Real-time Keystroke Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">Last Key:</span>
            <div className="px-3 py-1 rounded-xl bg-accent-soft border border-accent-border text-accent-primary font-mono font-black text-xs min-w-[70px] text-center shadow-sm">
              {lastKeyPressed || "Press any key..."}
            </div>
          </div>
        </div>

        {/* Quest Mastery Progress Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: "arrowNav", label: "1. Arrow Navigation", hint: "Press ← → ↑ ↓", done: completedQuests.arrowNav },
            { id: "shiftSelect", label: "2. Shift Multi-Select", hint: "Hold Shift + Arrow", done: completedQuests.shiftSelect },
            { id: "preview", label: "3. Space to Preview", hint: "Press Spacebar", done: completedQuests.preview },
            { id: "rename", label: "4. F2 to Rename", hint: "Press F2", done: completedQuests.rename },
          ].map((quest) => (
            <div
              key={quest.id}
              className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                quest.done
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-white/[0.03] border-white/10 text-white/60"
              }`}
            >
              <div>
                <p className="text-xs font-bold">{quest.label}</p>
                <p className="text-[10px] font-mono text-white/40">{quest.hint}</p>
              </div>
              {quest.done ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Sandbox Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-black/40 border border-white/5">
          {SANDBOX_ITEMS.map((item, idx) => {
            const isFocused = sandboxFocusedIndex === idx;
            const isSelected = sandboxSelectedIds.includes(item.id);
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSandboxFocusedIndex(idx);
                  setSandboxSelectedIds([item.id]);
                  setSandboxAnchorIndex(idx);
                }}
                className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 select-none ${
                  isSelected
                    ? "bg-accent-soft/80 border-accent-primary shadow-[0_0_15px_rgba(0,207,255,0.25)]"
                    : isFocused
                    ? "bg-white/10 border-white/30"
                    : "bg-white/[0.04] border-white/5 hover:bg-white/[0.08]"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === "directory"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-accent-soft text-accent-primary"
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-white truncate">{item.name}</p>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">{item.size}</p>
                </div>

                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Live Feedback Status */}
        {sandboxActionMessage && (
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-primary px-3 py-2 rounded-xl bg-accent-soft/50 border border-accent-border/30 animate-fade-in">
            <Info size={14} />
            <span>{sandboxActionMessage}</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ALL SHORTCUTS CATALOG & CUSTOMIZATION MANAGER
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-slate-900/60 dark:bg-vault-panel/60 border border-slate-200/10 backdrop-blur-2xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sliders size={20} className="text-accent-primary" />
              <span>Custom Shortcut Keybindings</span>
            </h2>
            <p className="text-xs text-white/50">
              Customize any keybinding to match your preferences. Built-in conflict prevention and browser safety checks.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={resetAllShortcuts}
            className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw size={14} />
            <span>Reset All to Defaults</span>
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search shortcuts by action name or key (e.g. F2, Shift, Enter, Upload)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-accent-primary transition-all font-medium"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-accent-primary text-accent-foreground shadow-accent-glow"
                    : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts Table / Cards */}
        <div className="space-y-2.5">
          {filteredShortcuts.map((item) => {
            const activeKey = item.customKey || item.defaultKey;
            const isCustom = !!item.customKey;

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all duration-200"
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-medium">
                      {item.category}
                    </span>
                    {isCustom && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
                        Customized
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Keyboard Badge */}
                  <kbd className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs font-mono font-black text-accent-primary shadow-sm tracking-wider">
                    {activeKey}
                  </kbd>

                  {/* Edit Button */}
                  <button
                    onClick={() => startEditing(item.id)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-accent-primary hover:text-accent-foreground text-xs font-bold text-white transition-all active:scale-95"
                  >
                    Edit
                  </button>

                  {/* Reset Single */}
                  {isCustom && (
                    <button
                      onClick={() => resetShortcut(item.id)}
                      className="p-1.5 text-white/40 hover:text-rose-400 transition-colors"
                      title="Reset this shortcut to default"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE TUTORIAL WALKTROUGHS WITH WALLY
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-slate-900/60 dark:bg-vault-panel/60 border border-slate-200/10 backdrop-blur-2xl p-6 sm:p-7 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles size={20} className="text-accent-primary" />
              <span>Interactive Guided Tours with Wally</span>
            </h2>
            <p className="text-xs text-white/50">
              Launch step-by-step interactive spotlights where Wally points his stick directly to each feature on your screen.
            </p>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {[
              { id: "All", label: "All Tours" },
              { id: "Owner", label: "👑 Owner Power" },
              { id: "Manager", label: "🛡️ Managers & Admins" },
              { id: "General", label: "🚀 General Users" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTourFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedTourFilter === tab.id
                    ? "bg-accent-primary text-accent-foreground shadow-accent-glow"
                    : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredTours.map((tour) => {
            const isCompleted = completedTours.includes(tour.id);
            return (
              <div
                key={tour.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-accent-border/50 transition-all duration-200"
              >
                <div className="space-y-1.5 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{tour.title}</h4>
                    {tour.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tour.role === "owner"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : tour.role === "manager"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}
                      >
                        {tour.badge}
                      </span>
                    )}
                    {isCompleted && <CheckCircle2 size={14} className="text-emerald-400" />}
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{tour.description}</p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => startTour(tour.id)}
                  className="text-xs font-black px-4 py-2 shrink-0 flex items-center gap-1.5 self-center"
                >
                  <Play size={12} className="fill-current" />
                  <span>{isCompleted ? "Replay" : "Start"}</span>
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. SHORTCUT RECORDER MODAL
         ───────────────────────────────────────────────────────────── */}
      {editingActionId && shortcuts[editingActionId] && (
        <Modal
          isOpen={true}
          onClose={() => setEditingActionId(null)}
          title={`Remap Shortcut: ${shortcuts[editingActionId].name}`}
          className="max-w-lg"
        >
          <div className="space-y-5 text-white">
            <p className="text-xs text-white/70">
              Press the desired key combination on your keyboard. Modifiers like Ctrl, Alt, and Shift can be combined.
            </p>

            {/* Recorder Target Box */}
            <div
              tabIndex={0}
              onKeyDown={handleRecordKeyDown}
              className="relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-accent-primary bg-accent-soft/30 outline-none focus:ring-4 focus:ring-accent-primary/20 transition-all cursor-pointer select-none"
            >
              <Keyboard size={32} className="text-accent-primary mb-3 animate-pulse" />
              <p className="text-sm font-bold text-white mb-1">
                {recordedKeys ? recordedKeys : "Press key combination on your keyboard..."}
              </p>
              <p className="text-[11px] text-white/40">
                (Click here and type your new shortcut)
              </p>
            </div>

            {/* Validation Feedback */}
            {validationError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-snug">{validationError}</span>
              </div>
            )}

            {validationSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>Valid shortcut! No conflicts detected and browser safe.</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setEditingActionId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!recordedKeys || !validationSuccess}
                onClick={handleSaveRecordedShortcut}
                className="px-6"
              >
                Save Shortcut
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Simulated Sandbox File Preview Modal */}
      {sandboxPreviewItem && (
        <Modal
          isOpen={true}
          onClose={() => setSandboxPreviewItem(null)}
          title={`Quick Look: ${sandboxPreviewItem.name}`}
          className="max-w-md"
        >
          <div className="space-y-4 text-white text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary mx-auto flex items-center justify-center">
              <FileText size={32} />
            </div>
            <h3 className="text-base font-bold text-white">{sandboxPreviewItem.name}</h3>
            <p className="text-xs text-white/50">
              Zero-knowledge decrypted asset preview test. Size: {sandboxPreviewItem.size}
            </p>
            <Button variant="primary" onClick={() => setSandboxPreviewItem(null)} className="w-full">
              Close Preview
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
