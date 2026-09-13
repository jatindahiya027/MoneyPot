import path from "path";
import { unlink } from "fs/promises";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/libs/auth";
import { getDb } from "@/libs/db";
import { checkRateLimit, requestIdentity } from "@/libs/rateLimit";
import { deleteUserData } from "@/libs/accountDeletion.mjs";

function clearSession(response) {
  response.cookies.set({
    name: "token",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 0,
  });
  return response;
}

export async function DELETE(request) {
  const payload = await authenticateRequest(request);
  if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const rate = checkRateLimit(`delete-account:${payload.id}:${requestIdentity(request)}`, 5, 30 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: "Too many attempts. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfter) },
    });
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== "DELETE" || !body.password) {
    return NextResponse.json({ success: false, error: "Enter your password and type DELETE to confirm." }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.get("SELECT userid,password,image FROM users WHERE userid=?", [payload.id]);
  if (!user || !(await bcrypt.compare(String(body.password), user.password))) {
    return NextResponse.json({ success: false, error: "Incorrect password." }, { status: 403 });
  }

  try {
    await deleteUserData(db, payload.id);
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json({ success: false, error: "Account deletion failed. No data was removed." }, { status: 500 });
  }

  // Uploaded avatars are account data. Remove an avatar only when no remaining
  // account references it; bundled/default images are never touched.
  if (String(user.image || "").startsWith("/uploads/")) {
    const shared = await db.get("SELECT 1 FROM users WHERE image=? LIMIT 1", [user.image]);
    if (!shared) {
      const uploadsDir = process.env.MONEYPOT_DATA_DIR
        ? path.join(process.env.MONEYPOT_DATA_DIR, "uploads")
        : path.join(process.cwd(), "public", "uploads");
      await unlink(path.join(uploadsDir, path.basename(user.image))).catch(() => {});
    }
  }

  return clearSession(NextResponse.json({ success: true }));
}
