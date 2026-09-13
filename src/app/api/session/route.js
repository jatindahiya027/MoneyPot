import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/libs/auth";

export async function GET(request) {
  const token = request.cookies.get("token")?.value;
  if (!token || !(await verifyJwtToken(token))) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
