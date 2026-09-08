import React from "react";

/**
 * Geometric, minimal, and scalable brand mark for VAULT 2.0.
 * Replaces the heavy 3D cube with a clean, developer-grade security geometry.
 */
export const VaultLogo = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer Hexagonal Shield Structure */}
    <path
      d="M16 2.5L28 8.5V17C28 23.5 22.8 28.5 16 30.5C9.2 28.5 4 23.5 4 17V8.5L16 2.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.08"
    />
    {/* Inner Geometric Secure Diamond Core */}
    <path
      d="M16 9L22 14.5L16 23L10 14.5L16 9Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.18"
    />
    {/* Central Encrypted Core Node */}
    <circle cx="16" cy="15.5" r="2.25" fill="currentColor" />
  </svg>
);

export const VaultMark = VaultLogo;

/**
 * Authentic Official GitHub Mark (Latest Vector)
 * Fully compatible with Light & Dark themes via currentColor.
 * Preserves custom SVG glow / drop-shadow styling.
 */
export const GitHubLogo = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 1024 1024"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
      transform="scale(64)"
    />
  </svg>
);

export const VaultGitIcon = GitHubLogo;

/**
 * Authentic Official Google Drive Logo (Latest 2026 Vector)
 * Beautiful modern multi-color gradient with alpha mask.
 * Compatible with Light & Dark themes, preserving glowing drop-shadows.
 */
export const GoogleDriveLogo = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 192 192"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <mask
      id="vault-gdrive-mask"
      width="168"
      height="154"
      x="12"
      y="18"
      maskUnits="userSpaceOnUse"
      style={{ maskType: "alpha" }}
    >
      <path
        fill="#b43333"
        d="M63.09 37c14.626-25.333 51.193-25.334 65.819 0l45.033 78c14.626 25.334-3.657 57.001-32.91 57.001H50.967c-29.253 0-47.536-31.667-32.91-57.001z"
      />
    </mask>
    <g mask="url(#vault-gdrive-mask)">
      <path
        fill="url(#vault-gdrive-grad-yellow)"
        d="M206.905 172.02h-91.888l-19.015-32.934 45.944-79.578z"
      />
      <path
        fill="url(#vault-gdrive-grad-blue)"
        d="M-14.919 172.006 50.04 59.494v.002L31.032 92.422h38.02L115 172.004l-129.918.001z"
      />
      <path
        fill="url(#vault-gdrive-grad-green)"
        d="M96.007-20.085 141.954 59.5l-19.011 32.928H31.048z"
      />
    </g>
    <defs>
      <linearGradient
        id="vault-gdrive-grad-yellow"
        x1="193.6"
        x2="103.09"
        y1="165.6"
        y2="111.21"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".09" stopColor="#ffe921" />
        <stop offset="1" stopColor="#fec700" />
      </linearGradient>
      <linearGradient
        id="vault-gdrive-grad-blue"
        x1="114.4"
        x2="15.53"
        y1="181.61"
        y2="121.8"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".15" stopColor="#a9a8ff" />
        <stop offset=".33" stopColor="#6d97ff" />
        <stop offset=".48" stopColor="#3186ff" />
      </linearGradient>
      <linearGradient
        id="vault-gdrive-grad-green"
        x1="128.88"
        x2="28.7"
        y1="37.88"
        y2="84.64"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".55" stopColor="#0ebc5f" />
        <stop offset=".85" stopColor="#78c9ff" />
      </linearGradient>
    </defs>
  </svg>
);

export const VaultDriveIcon = GoogleDriveLogo;

/**
 * Authentic Official Google 'G' Mark
 */
export const GoogleLogo = ({ className = "", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * ─────────────────────────────────────────────────────────────
 * VAULT VECTOR FILE TYPE ICON SYSTEM
 * Crisp, geometric, lightweight SVG vector icons with consistent proportions
 * ─────────────────────────────────────────────────────────────
 */

export const VaultFolderIcon = ({ className = "", size = 24, filled = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      fill={filled ? "currentColor" : "currentColor"}
      fillOpacity={filled ? "0.2" : "0.08"}
    />
  </svg>
);
export const VectorFolderIcon = VaultFolderIcon;

/**
 * Generic File Icon: Clean folded sheet with micro status node
 */
export const VaultGenericFileIcon = ({ className = "", size = 24, ext = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" strokeOpacity="0.5" />
    <line x1="8" y1="17" x2="13" y2="17" strokeOpacity="0.5" />
    {ext && (
      <text
        x="12"
        y="17"
        fill="currentColor"
        fontSize="4.5"
        fontWeight="bold"
        textAnchor="middle"
        fontFamily="monospace"
        letterSpacing="0.5"
      >
        {ext.toUpperCase().slice(0, 4)}
      </text>
    )}
  </svg>
);
export const VectorFileIcon = VaultGenericFileIcon;

/**
 * Document Icon: Folded sheet with text lines
 */
export const VaultDocIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
export const VectorDocIcon = VaultDocIcon;

/**
 * PDF Icon: Folded sheet with PDF indicator
 */
export const VaultPdfIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <polyline points="14 2 14 8 20 8" />
    <path d="M7 14h2a1.5 1.5 0 0 0 0-3H7v6" />
    <path d="M12 11v6" />
    <path d="M12 11h1.5a2.5 2.5 0 0 1 0 5H12" />
  </svg>
);

/**
 * Code File Icon: Sheet with code brackets
 */
export const VaultCodeIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <polyline points="14 2 14 8 20 8" />
    <polyline points="10 12 8 14 10 16" />
    <polyline points="14 12 16 14 14 16" />
  </svg>
);
export const VectorCodeIcon = VaultCodeIcon;

/**
 * Spreadsheet Icon: Sheet with table grid
 */
export const VaultSpreadsheetIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <polyline points="14 2 14 8 20 8" />
    <rect x="7" y="11" width="10" height="7" rx="1" />
    <line x1="7" y1="14.5" x2="17" y2="14.5" />
    <line x1="12" y1="11" x2="12" y2="18" />
  </svg>
);

/**
 * Image Icon: Frame with mountain and sun
 */
export const VaultImageIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.08" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
export const VectorImageIcon = VaultImageIcon;

/**
 * Video Icon: Film frame with play node
 */
export const VaultVideoIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.08" />
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
  </svg>
);
export const VectorVideoIcon = VaultVideoIcon;

/**
 * Audio Icon: Waveform node
 */
export const VaultAudioIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" fill="currentColor" fillOpacity="0.2" />
    <circle cx="18" cy="16" r="3" fill="currentColor" fillOpacity="0.2" />
  </svg>
);
export const VectorAudioIcon = VaultAudioIcon;

/**
 * Archive / Zip Icon: Package with zipper clasp
 */
export const VaultArchiveIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.08" />
    <line x1="12" y1="3" x2="12" y2="10" />
    <line x1="10" y1="6" x2="14" y2="6" />
    <line x1="10" y1="9" x2="14" y2="9" />
    <rect x="10" y="10" width="4" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3" />
  </svg>
);
export const VectorArchiveIcon = VaultArchiveIcon;

/**
 * Security & Status Badges
 */
export const EncryptionBadgeIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <rect x="9" y="11" width="6" height="5" rx="1" />
    <path d="M10 11V9a2 2 0 0 1 4 0v2" />
  </svg>
);

export const ScanLineIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12h18" />
    <path d="M3 7h18" strokeOpacity="0.4" />
    <path d="M3 17h18" strokeOpacity="0.4" />
  </svg>
);

export const NeuralSearchIcon = ({ className = "", size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <circle cx="11" cy="11" r="3" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

export const SecureRelayIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const ActivityPulseIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const PriorityBeaconIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const RecycleVaultIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const VaultCoreIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const VaultUploadCloudIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/**
 * Legacy Icons & Aliases Export Support
 */
export const VaultFilesIcon = VaultGenericFileIcon;
export const VaultChamberIcon = VaultFolderIcon;
export const SystemCoreIcon = VaultCoreIcon;
export const VaultRelayIcon = SecureRelayIcon;
export const VaultPulseIcon = ActivityPulseIcon;
export const VaultBeaconIcon = PriorityBeaconIcon;
export const VaultRecycleIcon = RecycleVaultIcon;
