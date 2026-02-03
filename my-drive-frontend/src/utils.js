import { SERVER_URL } from "./api";

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
  if (bytes === 0) return "0 B";
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
  const response = await fetch(`${SERVER_URL}/user`, {
    credentials: "include",
  });
  if (response.ok) {
    const userInfo = await response.json();
    console.log(userInfo);
    setUser(userInfo);
  }
}
