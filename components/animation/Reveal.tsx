"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
	if (reduceMotion) {
  	setVisible(true);
  	return;
	}
	const obs = new IntersectionObserver(
  	([entry]) => {
    	if (entry.isIntersecting) {
      	setVisible(true);
      	obs.disconnect();
    	}
  	},
  	{ threshold: 0.15 }
	);
	if (ref.current) obs.observe(ref.current);
	return () => obs.disconnect();
  }, [reduceMotion]);

  return (
	<motion.div
  	ref={ref}
  	initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
  	animate={visible ? { opacity: 1, y: 0 } : {}}
  	transition={{ duration: 0.5, delay }}
  	className={className}
	>
  	{children}
	</motion.div>
  );
}
