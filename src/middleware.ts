import { NextResponse, type NextRequest } from "next/server";

/** Her pages, her book and the upload screen need her private link; /demo stays open. */
export function middleware(req: NextRequest) {
  const expected = process.env.ACCESS_KEY;
  if (expected && req.cookies.get("pothi_key")?.value === expected) return NextResponse.next();
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = { matcher: ["/p", "/p/:path*", "/book", "/admin"] };
