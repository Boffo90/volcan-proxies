import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
	return NextResponse.next();
  }

  const session = req.cookies.get("admin_session")?.value;

  if (!session) {
	if (pathname.startsWith("/admin")) {
  	return NextResponse.redirect(new URL("/admin/login", req.url));
	}
	if (pathname.startsWith("/api/admin")) {
  	return new NextResponse(
    	JSON.stringify({ error: "Unauthorized" }),
    	{ status: 401, headers: { "Content-Type": "application/json" } }
  	);
	}
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

