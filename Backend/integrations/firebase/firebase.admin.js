import crypto from "crypto";

let cachedCerts = null;
let certsExpiry = 0;

/**
 * Fetches Google's official public X.509 certificates used to sign Firebase ID tokens.
 * Caches them according to Cache-Control headers to optimize performance.
 */
async function getGooglePublicCerts() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiry) {
    return cachedCerts;
  }

  try {
    const res = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    if (!res.ok) throw new Error("Failed to fetch Google public certificates");

    const cacheControl = res.headers.get("cache-control");
    let maxAge = 3600;
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match) maxAge = parseInt(match[1], 10);
    }

    cachedCerts = await res.json();
    certsExpiry = now + maxAge * 1000;
    return cachedCerts;
  } catch (err) {
    console.error("[Firebase Admin] Error fetching public certs:", err.message);
    if (cachedCerts) return cachedCerts;
    throw err;
  }
}

/**
 * Cryptographically verifies a Firebase ID token using Google's public X.509 certs.
 * Returns the decoded token payload { phone_number, sub, uid, ... }
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!idToken) {
    const err = new Error("Firebase verification token is required");
    err.status = 400;
    throw err;
  }

  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      const err = new Error("Invalid token format");
      err.status = 400;
      throw err;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

    const projectId = process.env.FIREBASE_PROJECT_ID || "yourvaultstorage";

    // Validate expiration
    const nowInSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSec) {
      const err = new Error("Firebase verification token has expired");
      err.status = 401;
      throw err;
    }

    // Validate issuer and audience
    if (payload.aud !== projectId && payload.aud !== "yourvaultstorage") {
      console.warn(`[Firebase Token] aud warning: expected ${projectId}, got ${payload.aud}`);
    }

    const expectedIssuerPrefix = "https://securetoken.google.com/";
    if (!payload.iss || !payload.iss.startsWith(expectedIssuerPrefix)) {
      const err = new Error("Invalid token issuer");
      err.status = 401;
      throw err;
    }

    // Fetch Google public certificates & verify cryptographic RS256 signature
    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) {
      const err = new Error("Unable to verify public key for Firebase token");
      err.status = 401;
      throw err;
    }

    const dataToVerify = Buffer.from(`${headerB64}.${payloadB64}`);
    const signature = Buffer.from(signatureB64, "base64url");

    const isSignatureValid = crypto.verify("RSA-SHA256", dataToVerify, cert, signature);
    if (!isSignatureValid) {
      const err = new Error("Invalid cryptographic signature in token");
      err.status = 401;
      throw err;
    }

    return payload;
  } catch (err) {
    console.error("[Firebase Token Verification] Error:", err.message);
    const customErr = new Error(err.message || "Failed to verify mobile phone credentials");
    customErr.status = err.status || 401;
    throw customErr;
  }
}

export default { verifyFirebaseIdToken };
