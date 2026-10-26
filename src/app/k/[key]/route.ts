import { NextResponse } from "next/server";
import { KEY_COOKIE } from "@/lib/server";

/** Her private link: /k/<ACCESS_KEY>. Sets a long-lived cookie, then opens her pages. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const expected = process.env.ACCESS_KEY;
  const ok = !!expected && key === expected;
  const res = NextResponse.redirect(new URL(ok ? "/p" : "/", req.url));
  if (ok) {
    res.cookies.set(KEY_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
