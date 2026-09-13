import path from 'path';
import { promises as fs } from 'fs';
import mime from 'mime';
import { authenticateRequest } from "@/libs/auth";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function GET(req) {
  try {
    const payload = await authenticateRequest(req);
    if (!payload) return new Response("Unauthorized", { status: 401 });
    // Parse URL and extract the file name
    const { searchParams } = new URL(req.url);
    let fileName = searchParams.get('file'); 

    if (!fileName) {
      return new Response('Missing "file" parameter', { status: 400 });
    }

    // Ensure fileName does not contain path traversal sequences
    fileName = path.basename(fileName);  // Prevents users from accessing files outside "uploads"

    // Construct the full file path safely
    const filePath = process.env.MONEYPOT_DATA_DIR
      ? path.join(process.env.MONEYPOT_DATA_DIR, 'uploads', fileName)
      : path.join(process.cwd(), 'public/uploads', fileName);

    // Read the file from the filesystem
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch {
      const bundledPublic = process.env.MONEYPOT_ASSET_DIR || path.join(process.cwd(), 'public');
      fileBuffer = await fs.readFile(path.join(bundledPublic, 'uploads', fileName));
    }
    const mimeType = mime.getType(filePath) || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) return new Response("Unsupported file type", { status: 415 });

    // Return the file as response
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return new Response('File not found', { status: 404 });
  }
}
