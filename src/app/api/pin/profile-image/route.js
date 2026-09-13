import path from "path";
import { promises as fs } from "fs";
import mime from "mime";
import { getDb } from "@/libs/db";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function GET(request) {
  const userid = Number(new URL(request.url).searchParams.get("userid"));
  if (!Number.isInteger(userid) || userid < 1) return new Response("Not found", { status: 404 });

  const db = await getDb();
  const profile = await db.get("SELECT image FROM users WHERE userid=?", [userid]);
  if (!String(profile?.image || "").startsWith("/uploads/")) {
    return new Response("Not found", { status: 404 });
  }

  const filename = path.basename(profile.image);
  const uploadPath = process.env.MONEYPOT_DATA_DIR
    ? path.join(process.env.MONEYPOT_DATA_DIR, "uploads", filename)
    : path.join(process.cwd(), "public", "uploads", filename);
  let buffer;
  try {
    buffer = await fs.readFile(uploadPath);
  } catch {
    const bundledPublic = process.env.MONEYPOT_ASSET_DIR || path.join(process.cwd(), "public");
    buffer = await fs.readFile(path.join(bundledPublic, "uploads", filename)).catch(() => null);
  }
  if (!buffer) return new Response("Not found", { status: 404 });

  const contentType = mime.getType(filename) || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(contentType)) return new Response("Not found", { status: 404 });
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
