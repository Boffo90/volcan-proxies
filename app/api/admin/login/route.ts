import { NextResponse } from "next/server";
import { verifyPassword, getExpectedSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!verifyPassword(password)) {
	return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", getExpectedSessionToken(), {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax",
	path: "/",
	maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

