"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type Ember = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
};

function makeEmbers(count: number): Ember[] {
  return Array.from({ length: count }, (_, id) => ({
	id,
	left: Math.random() * 100,
	size: 2 + Math.random() * 4,
	duration: 8 + Math.random() * 10,
	delay: Math.random() * 8,
	drift: (Math.random() - 0.5) * 60,
  }));
}

export default function Embers({ count = 18 }: { count?: number }) {
  const [embers, setEmbers] = useState<Ember[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
	if (reduceMotion) return;
	setEmbers(makeEmbers(count));
  }, [count, reduceMotion]);

  if (reduceMotion) return null;

  return (
	<div
  	aria-hidden
  	className="absolute inset-0 overflow-hidden pointer-events-none"
	>
  	{embers.map((e) => (
    	<motion.span
      	key={e.id}
      	className="absolute rounded-full"
      	style={{
        	left: e.left + "%",
        	bottom: -20,
        	width: e.size,
        	height: e.size,
        	background:
          	"radial-gradient(circle, rgba(255,180,120,0.95) 0%, rgba(255,79,26,0.6) 55%, transparent 75%)",
        	boxShadow: "0 0 " + e.size * 3 + "px rgba(255,120,50,0.8)",
      	}}
      	initial={{ y: 0, x: 0, opacity: 0 }}
      	animate={{
        	y: [-0, -220, -420],
        	x: [0, e.drift, e.drift * 1.6],
        	opacity: [0, 0.9, 0],
      	}}
      	transition={{
        	duration: e.duration,
        	delay: e.delay,
        	repeat: Infinity,
        	ease: "easeOut",
      	}}
    	/>
  	))}
	</div>
  );
}
