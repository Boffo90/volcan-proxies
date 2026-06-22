"use client";

import { useState, useEffect } from "react";
import { getPrecios, PRECIOS_DEFAULT, type Precios } from "@/lib/pricing";

export function usePrecios(): { precios: Precios; loading: boolean } {
  const [precios, setPrecios] = useState<Precios>(PRECIOS_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	let cancelled = false;
	getPrecios().then((p) => {
  	if (!cancelled) {
    	setPrecios(p);
    	setLoading(false);
  	}
	});
	return () => {
  	cancelled = true;
	};
  }, []);

  return { precios, loading };
}

