import { jwtVerify } from "jose";

export function getJwtSecretKey() {
  // Server-only — never use NEXT_PUBLIC_ prefix for secrets
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) throw new Error("JWT_SECRET_KEY env var is not set");
  return new TextEncoder().encode(secret);
}

export async function verifyJwtToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch {
    return null;
  }
}