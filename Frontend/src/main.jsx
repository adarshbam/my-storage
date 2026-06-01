import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

// 🔒 Professional Security Hardening: Self-XSS Console Warning (Discord-style brand matching)
console.log(
  "%cWait!",
  "font-size: 60px; font-weight: 900; color: #10b981; text-shadow: 0 0 20px rgba(16, 185, 129, 0.4); font-family: system-ui, -apple-system, sans-serif; margin-bottom: 12px;"
);
console.log(
  "%cIf someone told you to copy/paste something here, there's an 11/10 chance you're being scammed.",
  "font-size: 18px; font-weight: 700; color: #34d399; font-family: system-ui, -apple-system, sans-serif; margin-bottom: 12px;"
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
    <GoogleOAuthProvider clientId="621477951745-lmj5ogqo7fkmd9sv50t97dj11kdjffpa.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
