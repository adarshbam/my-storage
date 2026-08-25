import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlan } from "../context/PlanContext";

export const SPEED_CHANGE_EVENT = "vault:speed-changed";

export const SPEED_LEVELS = [
  {
    level: 1,
    id: "level-1",
    label: "Level 1: 500 KB/s",
    shortLabel: "500 KB/s",
    bytesPerSec: 500 * 1024,
    minTier: "Novice",
    tierBadge: "Novice",
    description: "Standard Speed (Lowest)",
  },
  {
    level: 2,
    id: "level-2",
    label: "Level 2: 2 MB/s",
    shortLabel: "2 MB/s",
    bytesPerSec: 2 * 1024 * 1024,
    minTier: "Professional",
    tierBadge: "Pro",
    description: "Fast Speed",
  },
  {
    level: 3,
    id: "level-3",
    label: "Level 3: 5 MB/s",
    shortLabel: "5 MB/s",
    bytesPerSec: 5 * 1024 * 1024,
    minTier: "Professional",
    tierBadge: "Pro",
    description: "Turbo Speed",
  },
  {
    level: 4,
    id: "level-4",
    label: "Level 4: 10 MB/s",
    shortLabel: "10 MB/s",
    bytesPerSec: 10 * 1024 * 1024,
    minTier: "Ultimate",
    tierBadge: "Ultimate",
    description: "Ultra Fast Speed",
  },
  {
    level: 5,
    id: "level-5",
    label: "Level 5: Unlimited (No Limit)",
    shortLabel: "Unlimited",
    bytesPerSec: 0,
    minTier: "Ultimate",
    tierBadge: "Ultimate",
    description: "Maximum Speed (Infinite)",
  },
];

// In-memory active cache for instantaneous sub-millisecond lookups
let activeSpeedLimitBytes = null;
let activeSpeedLevel = null;

export function getCurrentSpeedLimit() {
  if (activeSpeedLimitBytes !== null) {
    return activeSpeedLimitBytes;
  }
  const saved = typeof window !== "undefined" ? localStorage.getItem("vault_speed_level") : null;
  const levelNum = saved ? parseInt(saved, 10) : 5;
  const levelObj = SPEED_LEVELS.find((l) => l.level === levelNum) || SPEED_LEVELS[SPEED_LEVELS.length - 1];
  activeSpeedLimitBytes = levelObj.bytesPerSec;
  activeSpeedLevel = levelObj.level;
  return activeSpeedLimitBytes;
}

export function getCurrentSpeedLevel() {
  if (activeSpeedLevel !== null) {
    return activeSpeedLevel;
  }
  const saved = typeof window !== "undefined" ? localStorage.getItem("vault_speed_level") : null;
  const levelNum = saved ? parseInt(saved, 10) : 5;
  activeSpeedLevel = levelNum;
  return activeSpeedLevel;
}

export function setGlobalSpeedLevel(newLevel) {
  const levelObj = SPEED_LEVELS.find((l) => l.level === newLevel) || SPEED_LEVELS[0];
  activeSpeedLevel = levelObj.level;
  activeSpeedLimitBytes = levelObj.bytesPerSec;

  if (typeof window !== "undefined") {
    localStorage.setItem("vault_speed_level", levelObj.level.toString());
    window.dispatchEvent(
      new CustomEvent(SPEED_CHANGE_EVENT, {
        detail: {
          level: levelObj.level,
          bytesPerSec: levelObj.bytesPerSec,
          speedObj: levelObj,
        },
      })
    );
  }
  return levelObj;
}

/**
 * Dynamic, interruptible speed pacing engine.
 * Wakes up immediately (<1ms) if speed limit changes to Unlimited or increases.
 */
export async function applyDynamicSpeedPacing(chunkLength, startTime, signal) {
  let targetBytesPerSec = getCurrentSpeedLimit();
  if (targetBytesPerSec <= 0) return;

  while (true) {
    if (signal?.aborted) return;
    targetBytesPerSec = getCurrentSpeedLimit();
    if (targetBytesPerSec <= 0) {
      // Instantly wake up and return when set to unlimited
      return;
    }

    const expectedDurationMs = (chunkLength / targetBytesPerSec) * 1000;
    const elapsedMs = performance.now() - startTime;
    const remainingMs = expectedDurationMs - elapsedMs;

    if (remainingMs <= 0) {
      return;
    }

    // Wait for the smaller of remainingMs or 40ms, or wake up instantaneously if speed changes
    const sliceMs = Math.min(remainingMs, 40);
    await new Promise((resolve) => {
      let timeoutId;
      const onSpeedChanged = () => {
        clearTimeout(timeoutId);
        window.removeEventListener(SPEED_CHANGE_EVENT, onSpeedChanged);
        resolve();
      };

      timeoutId = setTimeout(() => {
        window.removeEventListener(SPEED_CHANGE_EVENT, onSpeedChanged);
        resolve();
      }, sliceMs);

      window.addEventListener(SPEED_CHANGE_EVENT, onSpeedChanged, { once: true });
    });
  }
}

export function useSpeedGovernor() {
  const { planTier, isFreeTrial } = usePlan();

  const planSlug = (planTier?.slug || planTier?.type || "").toLowerCase();
  const isTrial = isFreeTrial || planSlug.includes("trial");
  const isUltimate = isTrial || planSlug.includes("ultimate") || planSlug.includes("enterprise");
  const isProfessional = planSlug.includes("pro");
  const isNovice = !isUltimate && !isProfessional;

  // Novice: Level 1 only (500 KB/s)
  // Pro: Levels 1..3 (up to 5 MB/s)
  // Ultimate / Trial: All 5 Levels (up to Unlimited)
  const maxAllowedLevel = isUltimate ? 5 : isProfessional ? 3 : 1;

  const [selectedLevel, setSelectedLevel] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("vault_speed_level") : null;
    const parsed = saved ? parseInt(saved, 10) : (isUltimate ? 5 : isProfessional ? 3 : 1);
    const clamped = Math.min(Math.max(parsed || 1, 1), maxAllowedLevel);
    activeSpeedLevel = clamped;
    const obj = SPEED_LEVELS.find((l) => l.level === clamped) || SPEED_LEVELS[0];
    activeSpeedLimitBytes = obj.bytesPerSec;
    return clamped;
  });

  useEffect(() => {
    // Clamp if plan changes
    setSelectedLevel((prev) => {
      const clamped = Math.min(prev, maxAllowedLevel);
      if (clamped !== prev) {
        setGlobalSpeedLevel(clamped);
      }
      return clamped;
    });
  }, [maxAllowedLevel]);

  useEffect(() => {
    const handleSpeedChange = (e) => {
      if (e.detail?.level) {
        setSelectedLevel(e.detail.level);
      }
    };
    window.addEventListener(SPEED_CHANGE_EVENT, handleSpeedChange);
    return () => {
      window.removeEventListener(SPEED_CHANGE_EVENT, handleSpeedChange);
    };
  }, []);

  const currentLevelObj = useMemo(
    () => SPEED_LEVELS.find((l) => l.level === selectedLevel) || SPEED_LEVELS[0],
    [selectedLevel]
  );

  const setSpeedLevel = useCallback(
    (level) => {
      const clamped = Math.min(Math.max(level, 1), maxAllowedLevel);
      setGlobalSpeedLevel(clamped);
      setSelectedLevel(clamped);
    },
    [maxAllowedLevel]
  );

  return {
    selectedLevel,
    speedLimit: currentLevelObj.bytesPerSec,
    speedObj: currentLevelObj,
    maxAllowedLevel,
    setSpeedLevel,
    isUltimate,
    isProfessional,
    isNovice,
    SPEED_LEVELS,
  };
}
