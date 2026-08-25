import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCDDE-n_Ef8GUIIUxuVd4aOZ3Jj3pCDutM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yourvaultstorage.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yourvaultstorage",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yourvaultstorage.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "471747616446",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:471747616446:web:5cc4c60c26908c8e2648ef",
};

let appInstance = null;
let authInstance = null;

try {
  appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(appInstance);
} catch (err) {
  console.warn("[Firebase] Initialization notice:", err.message);
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  try {
    if (!appInstance) {
      appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }
    authInstance = getAuth(appInstance);
    return authInstance;
  } catch (err) {
    console.warn("[Firebase] Auth get error:", err.message);
    return null;
  }
}

/**
 * Initializes RecaptchaVerifier on the given container
 */
export function setupRecaptchaVerifier(containerId = "firebase-phone-recaptcha") {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const auth = getFirebaseAuth();
  if (!auth) {
    console.warn("[Firebase] Auth instance not available for reCAPTCHA.");
    return null;
  }

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    window.recaptchaVerifier = null;
  }

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
  }

  try {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, container, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
      "expired-callback": () => {
        console.warn("[Firebase] reCAPTCHA expired, please try again.");
      },
    });

    return window.recaptchaVerifier;
  } catch (err) {
    console.warn("[Firebase] RecaptchaVerifier error:", err.message);
    return null;
  }
}

export const app = appInstance;
export const auth = authInstance;
export { RecaptchaVerifier, signInWithPhoneNumber };
export default appInstance;
