const KEY = "mp_token";

// Compatibility marker for existing fetch call sites. It is not a credential.
// The verified HttpOnly cookie is injected into authenticated API requests by
// middleware and is never exposed to client-side JavaScript.
export function getToken() {
  return "cookie";
}

export function setToken() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
