// src/app/api/get-uploaded-file/route.js
import path from 'path';
import { promises as fs } from 'fs';
import mime from 'mime';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('file'); // Assume this is the relative file name
//   console.log("*************************************");
//    console.log(fileName);
//   const filePath = path.join(process.cwd(), 'public/uploads', fileName);

  try {
    const fileBuffer = await fs.readFile("./public"+fileName);
    const mimeType = mime.getType(fileName);
    // console.log("--------------------------------");
    // console.log(fileBuffer);
    // console.log("+++++++++++++++++++++++++++++++++++++");
    // console.log(mimeType);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
      },
    });
  } catch (err) {
    return new Response('File not found', { status: 404 });
  }
}
