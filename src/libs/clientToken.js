/**
 * clientToken.js — JWT storage for client-side fetch calls.
 *
 * Storage strategy:
 *   localStorage  — persists across page refreshes and new tabs (same origin).
 *                   The JWT's own `exp` claim is the expiry — we validate it
 *                   before use and auto-clear if expired.
 *
 * Why not sessionStorage?
 *   sessionStorage is wiped on every page refresh. After a hard refresh
 *   (F5 / browser reload) the token would be gone, causing 401s on all API
 *   calls even though the httpOnly cookie (used by middleware) is still valid.
 *
 * Why not the cookie directly?
 *   The token cookie is httpOnly — intentionally unreadable by JS — so the
 *   middleware can protect server-side routes. We keep both:
 *     • httpOnly cookie  → middleware / server-side route protection
 *     • localStorage     → client-side fetch Authorization headers
 */

const KEY = "mp_token";

/** Decode JWT payload without verifying signature (client-side only). */
function decodePayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns the stored token if it exists and hasn't expired, otherwise null. */
export function getToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(KEY);
  if (!token) return null;

  // Check JWT expiry client-side — clear if expired so we don't send dead tokens
  const payload = decodePayload(token);
  if (payload?.exp && Date.now() / 1000 > payload.exp) {
    localStorage.removeItem(KEY);
    return null;
  }
  return token;
}

/** Persist the token. Called right after a successful login response. */
export function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, token);
}

/** Remove the token (logout). */
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
