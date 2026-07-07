import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	{
  	cookies: {
    	getAll() {
      	return cookieStore.getAll();
    	},
    	setAll(cookiesToSet) {
      	try {
        	cookiesToSet.forEach(({ name, value, options }) =>
          	cookieStore.set(name, value, options)
        	);
      	} catch {
        	// setAll fue llamado desde un Server Component sin poder escribir
        	// cookies (ej. durante render); el refresco de sesión lo maneja proxy.ts.
      	}
    	},
  	},
	}
  );
}
