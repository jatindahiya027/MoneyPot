import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Clear the httpOnly cookie — JS can't do this directly
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
