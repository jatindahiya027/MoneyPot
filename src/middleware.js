import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/libs/auth";

const AUTH_PAGES = ["/"];

const isAuthPages = (url) => AUTH_PAGES.some((page) => page.startsWith(url));

export async function middleware(request, res, next) {
  
  const { url, nextUrl, cookies } = request;
  const token = cookies.get("token")?.value;
  const isAuthPageRequested = isAuthPages(nextUrl.pathname);

  if (isAuthPageRequested) {
    if (!token) {
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }
    const hasVerifiedToken = await verifyJwtToken(token);
    if (hasVerifiedToken) {
      return NextResponse.redirect(new URL(`/protected`, url));
    } else {
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }
  }

  if (!token) {
    const searchParams = new URLSearchParams(nextUrl.searchParams);
    searchParams.set("next", nextUrl.pathname);
    const response = NextResponse.redirect(new URL(`/?${searchParams}`, url));
    response.cookies.delete("token");
    return response;
  }

  const hasVerifiedToken = await verifyJwtToken(token);
  if (!hasVerifiedToken) {
    const searchParams = new URLSearchParams(nextUrl.searchParams);
    searchParams.set("next", nextUrl.pathname);
    const response = NextResponse.redirect(new URL(`/?${searchParams}`, url));
    response.cookies.delete("token");
    return response;
  }

  return NextResponse.next();
}

export const config = { matcher: ["/", "/protected/:path*"] };
