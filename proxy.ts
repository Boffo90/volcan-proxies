import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function getExpectedSessionToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "default-secret-change-me";
  const data = new TextEncoder().encode(password + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
	.map((b) => b.toString(16).padStart(2, "0"))
	.join("");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Auth de admin (contraseña única) ---
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
	if (pathname === "/admin/login" || pathname === "/api/admin/login") {
  	return NextResponse.next();
	}

	const session = req.cookies.get("admin_session")?.value;
	const isValid = !!session && session === (await getExpectedSessionToken());

	if (!isValid) {
  	if (pathname.startsWith("/api/admin")) {
    	return new NextResponse(
      	JSON.stringify({ error: "Unauthorized" }),
      	{ status: 401, headers: { "Content-Type": "application/json" } }
    	);
  	}
  	return NextResponse.redirect(new URL("/admin/login", req.url));
	}

	return NextResponse.next();
  }

  // --- Refresco de sesión de Supabase Auth (clientes) ---
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	{
  	cookies: {
    	getAll() {
      	return req.cookies.getAll();
    	},
    	setAll(cookiesToSet) {
      	cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
      	response = NextResponse.next({ request: req });
      	cookiesToSet.forEach(({ name, value, options }) =>
        	response.cookies.set(name, value, options)
      	);
    	},
  	},
	}
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
	"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
