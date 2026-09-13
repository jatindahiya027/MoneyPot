import { jwtVerify } from "jose";

export function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET_KEY
    || (process.env.NODE_ENV !== "production" ? "moneypot-development-session-key-not-for-production" : "");
  if (!secret) throw new Error("JWT_SECRET_KEY is required outside the Electron runtime");
  return new TextEncoder().encode(secret);
}

export async function verifyJwtToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: "moneypot",
      audience: "moneypot-desktop",
    });
    return payload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(request) {
  const bearer = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const cookie = request.cookies?.get("token")?.value;
  return verifyJwtToken(cookie || bearer || "");
}
