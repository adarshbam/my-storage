import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SERVER_URL } from "./api";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatSpeed = (bytesPerSec) => {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return "-";
  const kb = 1024;
  if (bytesPerSec < kb) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < kb * kb) return `${(bytesPerSec / kb).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (kb * kb)).toFixed(2)} MB/s`;
};

export const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds <= 0) return "0s";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
};

export const formatSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0)
    return "0 B";
  const k = 1024;
  const types = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + types[i];
};

export const joinUrl = (...parts) => {
  return parts
    .map((p, i) => {
      if (i === 0) return String(p).replace(/\/+$/g, "");
      return String(p).replace(/^\/+|\/+$/g, "");
    })
    .filter(Boolean)
    .join("/");
};

export async function getUser(setUser) {
  try {
    const response = await fetch(`${SERVER_URL}/user`, {
      credentials: "include",
    });
    if (response.ok) {
      const userInfo = await response.json();
      console.log(userInfo);
      setUser(userInfo);
    } else {
      setUser(null);
    }
  } catch (err) {
    console.error("Failed to fetch user", err);
    setUser(null);
  }
}

export const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const isSpecialFolder = (item, specialView = null) => {
  if (!item) return false;
  if (item.isExternalIntegration) return true;

  // When browsing inside an external integration view, items inside are regular files/folders
  if (
    specialView === "google-drive" ||
    specialView === "google-drive-folder" ||
    specialView === "github" ||
    specialView === "github-repo"
  ) {
    return false;
  }

  const provider = item.provider || "local";
  const name = (item.name || "").trim().toLowerCase();

  // Root integration mount points shown on the Vault surface
  if (
    name === "github" ||
    name === "google drive" ||
    name === "dropbox" ||
    provider === "google_drive" ||
    provider === "github" ||
    provider === "dropbox" ||
    provider === "shared_drive"
  ) {
    return true;
  }

  return false;
};

export const getProfilePicUrl = (profilepic) => {
  if (!profilepic) return null;
  if (typeof profilepic === "object") {
    if (profilepic.externalUrl) return profilepic.externalUrl;
    if (profilepic._id) return `${SERVER_URL}/user/profilepic?id=${profilepic._id}`;
    return null;
  }
  const str = String(profilepic).trim();
  if (!str) return null;
  if (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:") ||
    str.startsWith("blob:")
  ) {
    return str;
  }
  if (str.startsWith("/user/profilepic") || str.startsWith("user/profilepic")) {
    return `${SERVER_URL}${str.startsWith("/") ? "" : "/"}${str}`;
  }
  return `${SERVER_URL}/user/profilepic?id=${encodeURIComponent(str)}`;
};

export const getInitials = (name, email) => {
  if (name && typeof name === "string" && name.trim()) {
    return name.trim()[0].toUpperCase();
  }
  if (email && typeof email === "string" && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "U";
};

