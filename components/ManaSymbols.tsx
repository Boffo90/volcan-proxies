"use client";

import { useEffect, useState } from "react";
import { getSymbology } from "@/lib/scryfall";

let symbolsCache: Record<string, string> | null = null;

export default function ManaSymbols({
  text,
  size = 16,
}: {
  text: string;
  size?: number;
}) {
  const [symbols, setSymbols] = useState<Record<string, string>>(
	symbolsCache || {}
  );

  useEffect(() => {
	if (symbolsCache) {
  	setSymbols(symbolsCache);
  	return;
	}
	getSymbology().then((data) => {
  	const map: Record<string, string> = {};
  	data.forEach((s) => {
    	map[s.symbol] = s.svg_uri;
  	});
  	symbolsCache = map;
  	setSymbols(map);
	});
  }, []);

  if (!text) return null;

  const parts = text.split(/(\{[^}]+\})/g);

  return (
	<span className="inline">
  	{parts.map((part, idx) => {
    	if (part.startsWith("{") && part.endsWith("}")) {
      	const svgUri = symbols[part];
      	if (svgUri) {
        	return (
          	<img
            	key={idx}
            	src={svgUri}
            	alt={part}
            	style={{
              	width: size,
              	height: size,
              	display: "inline-block",
              	verticalAlign: "middle",
              	margin: "0 1px",
            	}}
          	/>
        	);
      	}
      	return <span key={idx}>{part}</span>;
    	}
    	return <span key={idx}>{part}</span>;
  	})}
	</span>
  );
}

