"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	const sb = supabaseBrowser();

	sb.auth.getUser().then(({ data }) => {
  	setUser(data.user);
  	setLoading(false);
	});

	const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
  	setUser(session?.user ?? null);
	});

	return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
