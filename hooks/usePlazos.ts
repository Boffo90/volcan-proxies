"use client";

import { useState, useEffect } from "react";
import { getPlazos, PLAZOS_DEFAULT, type Plazos } from "@/lib/plazos";

export function usePlazos(): { plazos: Plazos; loading: boolean } {
  const [plazos, setPlazos] = useState<Plazos>(PLAZOS_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	let cancelled = false;
	getPlazos().then((p) => {
  	if (!cancelled) {
    	setPlazos(p);
    	setLoading(false);
  	}
	});
	return () => {
  	cancelled = true;
	};
  }, []);

  return { plazos, loading };
}
