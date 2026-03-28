import path from 'path';
import { promises as fs } from 'fs';
import mime from 'mime';

export async function GET(req) {
  try {
    // Parse URL and extract the file name
    const { searchParams } = new URL(req.url);
    let fileName = searchParams.get('file'); 

    if (!fileName) {
      return new Response('Missing "file" parameter', { status: 400 });
    }

    // Ensure fileName does not contain path traversal sequences
    fileName = path.basename(fileName);  // Prevents users from accessing files outside "uploads"

    // Construct the full file path safely
    const filePath = path.join(process.cwd(), 'public/uploads', fileName);

    // Read the file from the filesystem
    const fileBuffer = await fs.readFile(filePath);
    const mimeType = mime.getType(filePath) || 'application/octet-stream';

    // Return the file as response
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
      },
    });
  } catch (err) {
    return new Response('File not found', { status: 404 });
  }
}
