import { SERVER_URL } from "./api";
import { getUser } from "./utils";

/**
 * Shared Google OAuth handler used by both Login and Register pages.
 * Sends the Google credential to the backend, fetches the user info
 * on success, and navigates to the dashboard (or triggers 2FA).
 *
 * @param {string} credential — Google ID token from useGoogleLogin
 * @param {Object} opts
 * @param {Function} opts.setUser — AuthContext setter
 * @param {Function} opts.navigate — react-router navigate
 * @param {Function} opts.setError — local error state setter
 * @param {Function} [opts.onTwoFactorRequired] — callback when 2FA is needed
 */
export async function handleGoogleAuth(
  credential,
  { setUser, navigate, setError, onTwoFactorRequired },
) {
  try {
    const res = await fetch(`${SERVER_URL}/user/auth/google`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Google sign-in failed");
      return;
    }

    if (data.twoFactorRequired && data.tempToken) {
      if (onTwoFactorRequired) {
        onTwoFactorRequired(data.tempToken);
      } else {
        navigate(`/login?twoFactorRequired=true&tempToken=${data.tempToken}`);
      }
      return;
    }

    // Fetch the full user object and set it in context
    await getUser(setUser);
    navigate("/dashboard");
  } catch (err) {
    console.error("Google auth error:", err);
    setError("Server unreachable. Please try again.");
  }
}
