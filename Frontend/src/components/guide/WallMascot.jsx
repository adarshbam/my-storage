import { useMemo } from "react";
import { motion } from "framer-motion";

export default function WallMascot({
  gesture = "pointing",
  targetAngle = -25, // angle in degrees towards target
  className = "",
  size = 120,
  interactive = false,
}) {
  // Compute stick rotation and hand position based on gesture
  const stickRotation = useMemo(() => {
    if (gesture === "waving") return -65;
    if (gesture === "celebrating") return -80;
    if (gesture === "explaining") return -10;
    if (gesture === "idle") return 30;
    return targetAngle; // Dynamic angle towards the target element
  }, [gesture, targetAngle]);

  return (
    <div
      className={`relative select-none flex items-center justify-center pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={{
          y: [-3, 3, -3],
          rotate: [-1, 1, -1],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Ambient Glow Aura */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-60 bg-[radial-gradient(circle,rgba(0,207,255,0.4)_0%,rgba(16,185,129,0.2)_60%,transparent_80%)]"
        />

        {/* Mascot SVG */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-[0_8px_20px_rgba(0,207,255,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Linear & Radial Gradients */}
            <linearGradient id="wall-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A374A" />
              <stop offset="50%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="wall-head" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38495F" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>

            <linearGradient id="wall-visor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030A0E" />
              <stop offset="100%" stopColor="#01141A" />
            </linearGradient>

            <linearGradient id="wall-cyan-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#00A3FF" />
            </linearGradient>

            <linearGradient id="wall-emerald-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="stick-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            <filter id="laser-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Antennas / Radar Node */}
          <g>
            <line x1="80" y1="36" x2="80" y2="24" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
            <circle cx="80" cy="22" r="4.5" fill="url(#wall-cyan-accent)" filter="url(#laser-glow)" />
            
            {/* Ear Pods */}
            <rect x="42" y="52" width="6" height="14" rx="3" fill="#475569" />
            <rect x="112" y="52" width="6" height="14" rx="3" fill="#475569" />
          </g>

          {/* Main Head Unit */}
          <rect
            x="46"
            y="34"
            width="68"
            height="50"
            rx="18"
            fill="url(#wall-head)"
            stroke="#475569"
            strokeWidth="2.5"
          />

          {/* Visor Screen */}
          <rect
            x="52"
            y="42"
            width="56"
            height="34"
            rx="12"
            fill="url(#wall-visor)"
            stroke="#00F0FF"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />

          {/* Visor Scanline shimmer */}
          <path
            d="M54 52 Q80 48 106 52"
            stroke="rgba(0, 240, 255, 0.25)"
            strokeWidth="1"
            fill="none"
          />

          {/* Expressive Eyes based on gesture */}
          {gesture === "celebrating" ? (
            /* Joyful ^ ^ eyes */
            <g filter="url(#laser-glow)">
              <path d="M60 60 L68 53 L76 60" stroke="#00F0FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M84 60 L92 53 L100 60" stroke="#00F0FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          ) : gesture === "waving" ? (
            /* Friendly wide eyes with blink */
            <g filter="url(#laser-glow)">
              <circle cx="68" cy="58" r="6" fill="#00F0FF" />
              <circle cx="70" cy="56" r="2" fill="#FFFFFF" />
              <circle cx="92" cy="58" r="6" fill="#00F0FF" />
              <circle cx="94" cy="56" r="2" fill="#FFFFFF" />
              {/* Smile curve */}
              <path d="M75 67 Q80 70 85 67" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          ) : (
            /* Focused Guide Eyes */
            <g filter="url(#laser-glow)">
              {/* Left Eye */}
              <rect x="62" y="52" width="12" height="11" rx="4" fill="#00F0FF" />
              <circle cx="65" cy="55" r="2" fill="#FFFFFF" />
              {/* Right Eye */}
              <rect x="86" y="52" width="12" height="11" rx="4" fill="#00F0FF" />
              <circle cx="89" cy="55" r="2" fill="#FFFFFF" />
              {/* Subtle smile */}
              <path d="M76 68 Q80 71 84 68" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* Neck Joint */}
          <rect x="74" y="83" width="12" height="6" rx="2" fill="#334155" />

          {/* Torso */}
          <rect
            x="54"
            y="88"
            width="52"
            height="40"
            rx="14"
            fill="url(#wall-body)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Cyber Reactor Core */}
          <circle cx="80" cy="106" r="8" fill="#09161E" stroke="#00F0FF" strokeWidth="1.5" />
          <circle cx="80" cy="106" r="4.5" fill="url(#wall-cyan-accent)" filter="url(#laser-glow)" />

          {/* Left Arm / Stabilizer */}
          <g>
            <path
              d="M54 94 Q40 102 44 116"
              stroke="#475569"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="44" cy="116" r="4.5" fill="#334155" />
          </g>

          {/* Floating Anti-Gravity Thruster Base */}
          <ellipse cx="80" cy="132" rx="14" ry="4.5" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <motion.ellipse
            animate={{
              ry: [3, 6, 3],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            cx="80"
            cy="136"
            rx="9"
            ry="4"
            fill="url(#wall-cyan-accent)"
            filter="url(#laser-glow)"
          />

          {/* ─────────────────────────────────────────────────────────────
              DYNAMIC POINTER STICK / WAND (Right Arm)
              Rotates from shoulder pivot (106, 94)
             ───────────────────────────────────────────────────────────── */}
          <motion.g
            animate={{
              rotate: stickRotation,
            }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 18,
            }}
            style={{
              transformOrigin: "106px 94px",
            }}
          >
            {/* Shoulder to Hand Arm */}
            <path
              d="M106 94 Q116 94 122 88"
              stroke="#475569"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Hand Grip */}
            <circle cx="122" cy="88" r="5" fill="#334155" stroke="#475569" strokeWidth="1.5" />

            {/* Pointer Stick Shaft */}
            <line
              x1="122"
              y1="88"
              x2="168"
              y2="60"
              stroke="url(#stick-gradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Stick Gold/Cyber Rings */}
            <circle cx="132" cy="82" r="2.5" fill="#FFD166" />
            <circle cx="148" cy="72" r="2.5" fill="#00F0FF" />

            {/* Pulsing Beacon Crystal at Tip of Stick */}
            <g transform="translate(168, 60)">
              {/* Outer pulsing ring */}
              <circle cx="0" cy="0" r="8" fill="none" stroke="#00F0FF" strokeWidth="1.5" opacity="0.6" />
              {/* Inner glowing core */}
              <polygon
                points="0,-6 5,0 0,6 -5,0"
                fill="#FFFFFF"
                stroke="#00F0FF"
                strokeWidth="1.5"
                filter="url(#laser-glow)"
              />
              {/* Radiating pointer spark */}
              <circle cx="0" cy="0" r="3" fill="#00F0FF" filter="url(#laser-glow)" />
            </g>
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
