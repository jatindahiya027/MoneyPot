// src/app/api/upload/route.js
import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
//console.log(uploadDir);
// Ensure upload directory exists
fs.mkdirSync(uploadDir, { recursive: true });

export async function POST(req) {
  const formData = await req.formData();

  const file = formData.get("file");
 // Check if a file is received
 if (!file) {
  // If no file is received, return a JSON response with an error and a 400 status code
  return NextResponse.json({ error: "No files received." }, { status: 400 });
}

// Convert the file data to a Buffer
const buffer = Buffer.from(await file.arrayBuffer());

// Replace spaces in the file name with underscores
const filename = file.name.replaceAll(" ", "_");
// Generate a random suffix
  
    // Generate a random suffix of 50 characters
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomSuffix = '';
    for (let i = 0; i < 50; i++) {
        randomSuffix += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Find the position of the last dot to get the file extension
    const lastDotIndex = filename.lastIndexOf(".");
    let newFilename;

    if (lastDotIndex !== -1) {
        // If there's an extension, insert the random suffix before the extension
        const name = filename.substring(0, lastDotIndex);
        const extension = filename.substring(lastDotIndex);
        newFilename = `${name}_${randomSuffix}${extension}`;
    } else {
        // If there's no extension, just append the random suffix
        newFilename = `${filename}_${randomSuffix}`;
    }
// //console.log(newFilename);

try {
  // Write the file to the specified directory (public/assets) with the modified filename
  await writeFile(
    path.join(process.cwd(), "public/uploads/" + newFilename),
    buffer
  );

  // Return a JSON response with a success message and a 201 status code
  return NextResponse.json({ Message: "/uploads/"+newFilename, status: 201 });
} catch (error) {
  // If an error occurs during file writing, log the error and return a JSON response with a failure message and a 500 status code
  //console.log("Error occurred ", error);
  return NextResponse.json({ Message: "Failed", status: 500 });
}
};