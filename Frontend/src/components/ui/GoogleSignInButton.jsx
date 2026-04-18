import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { useState, useCallback } from "react";

/**
 * A custom Google sign-in button styled to match the app's
 * green glassmorphic design in both dark and light modes.
 *
 * Uses @react-oauth/google's useGoogleLogin with the implicit flow
 * to get an access token, then exchanges it for user info on the backend.
 *
 * Note: This uses the "implicit" flow which gives an access_token.
 * The backend needs to handle this differently from the id_token flow.
 * We use `ux_mode: "popup"` for the best UX.
 *
 * ACTUALLY: We use Google Identity Services' `credential` callback
 * directly, which is what GoogleLogin wraps internally. The
 * GoogleOAuthProvider already loads the GIS script for us.
 *
 * @param {Object} props
 * @param {string} [props.label="Sign in with Google"]
 * @param {(response: {credential: string}) => void} props.onSuccess
 * @param {() => void} [props.onError]
 */
export default function GoogleSignInButton({
  label = "Sign in with Google",
  onSuccess,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(() => {
    setLoading(true);

    const clientId =
      "621477951745-lmj5ogqo7fkmd9sv50t97dj11kdjffpa.apps.googleusercontent.com";

    if (!window.google?.accounts?.id) {
      setLoading(false);
      onError?.();
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        setLoading(false);
        if (response.credential) {
          onSuccess?.(response);
        } else {
          onError?.();
        }
      },
    });

    // Use prompt() which shows the One Tap / account chooser popup
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was suppressed (e.g. user previously dismissed it).
        // Fall back to rendering the standard Google button in a hidden div
        // and clicking it programmatically.
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "-9999px";
        container.style.left = "-9999px";
        document.body.appendChild(container);

        window.google.accounts.id.renderButton(container, {
          type: "standard",
          size: "large",
        });

        // Click the rendered button after a short delay to ensure it's ready
        setTimeout(() => {
          const btn =
            container.querySelector('[role="button"]') ||
            container.querySelector("div[id^='g_id']");
          if (btn) {
            btn.click();
          } else {
            setLoading(false);
          }
          // Clean up after some time
          setTimeout(() => container.remove(), 5000);
        }, 100);
      }
    });
  }, [onSuccess, onError]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="
        w-full flex items-center justify-center gap-3
        px-4 py-3 rounded-xl
        bg-white/60 dark:bg-white/[0.06]
        backdrop-blur-sm
        border border-black/10 dark:border-white/10
        text-slate-700 dark:text-slate-200
        font-medium text-sm
        transition-all duration-300
        hover:bg-white/80 dark:hover:bg-white/[0.1]
        hover:border-[#14b8a6]/40 dark:hover:border-[#14b8a6]/40
        hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] dark:hover:shadow-[0_0_20px_rgba(20,184,166,0.25)]
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {loading ? (
        <Loader2 className="animate-spin text-[#14b8a6]" size={18} />
      ) : (
        <>
          {/* Google "G" logo — full color */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
