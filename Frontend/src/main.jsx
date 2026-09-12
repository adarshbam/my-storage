import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

// 🛡️ Suppress benign Google Identity Services / OAuth COOP popup polling warning
if (typeof window !== "undefined") {
  const isCoopWarning = (arg) => {
    if (!arg) return false;
    const str = typeof arg === "string" ? arg : (arg.message || String(arg));
    return (
      str.includes("Cross-Origin-Opener-Policy") &&
      (str.includes("window.closed") || str.includes("window.close") || str.includes("window.postMessage"))
    );
  };

  const origError = console.error;
  console.error = function (...args) {
    if (args.some(isCoopWarning)) return;
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = function (...args) {
    if (args.some(isCoopWarning)) return;
    origWarn.apply(console, args);
  };
}

// 🔒 Professional Security Hardening: Self-XSS Console Warning (Discord-style brand matching)
console.log(
  "%cWait!",
  "font-size: 60px; font-weight: 900; color: #f43f5e; text-shadow: 0 0 20px rgba(244, 63, 94, 0.4); font-family: system-ui, -apple-system, sans-serif; margin-bottom: 12px;"
);
console.log(
  "%cIf someone told you to copy/paste something here, there's an 11/10 chance you're being scammed.",
  "font-size: 18px; font-weight: 700; color: #fb7185; font-family: system-ui, -apple-system, sans-serif; margin-bottom: 12px;"
);
console.log(
  "%cPasting anything in here could give attackers access to your Vault storage account and files.",
  "font-size: 18px; font-weight: 800; color: #ef4444; font-family: system-ui, -apple-system, sans-serif; margin-bottom: 12px;"
);
console.log(
  "%cUnless you are a security expert or developer and understand exactly what you are doing, close this window immediately to keep your account safe.",
  "font-size: 14px; font-weight: 500; color: #94a3b8; font-family: system-ui, -apple-system, sans-serif;"
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENTID || "621477951745-lmj5ogqo7fkmd9sv50t97dj11kdjffpa.apps.googleusercontent.com"}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
