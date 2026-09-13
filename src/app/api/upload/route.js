// src/app/api/upload/route.js
import { NextResponse } from "next/server";
import path from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { authenticateRequest } from "@/libs/auth";
import { getDb } from "@/libs/db";

const uploadDir = process.env.MONEYPOT_DATA_DIR
  ? path.join(process.env.MONEYPOT_DATA_DIR, 'uploads')
  : path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGES = {
  "image/jpeg": { extension: ".jpg", signature: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: ".png", signature: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/gif": { extension: ".gif", signature: buffer => ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")) },
  "image/webp": { extension: ".webp", signature: buffer => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP" },
};

export async function POST(req) {
  const payload = await authenticateRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Select an image to upload." }, { status: 400 });
    }
    const imageType = ALLOWED_IMAGES[file.type];
    if (!imageType) {
      return NextResponse.json({ error: "Use a JPEG, PNG, GIF, or WebP image." }, { status: 415 });
    }
    if (file.size < 1 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Image must be between 1 byte and 5 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!imageType.signature(buffer)) {
      return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 415 });
    }

    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}${imageType.extension}`;
    await writeFile(path.join(uploadDir, filename), buffer, { flag: "wx", mode: 0o600 });
    return NextResponse.json({ Message: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Profile image upload failed:", error);
    return NextResponse.json({ error: "Image upload failed." }, { status: 500 });
  }
}

export async function DELETE(req) {
  const payload = await authenticateRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filename = path.basename(new URL(req.url).searchParams.get("file") || "");
  if (!/^[0-9a-f-]+\.(?:jpg|png|gif|webp)$/i.test(filename)) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const image = `/uploads/${filename}`;
  const db = await getDb();
  const referenced = await db.get("SELECT 1 FROM users WHERE image=? LIMIT 1", [image]);
  if (referenced) return NextResponse.json({ error: "Upload is in use" }, { status: 409 });
  await unlink(path.join(uploadDir, filename)).catch(() => {});
  return NextResponse.json({ success: true });
}
