"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** enable cursor-follow tilt micro-interaction (docs/06 §5) */
  interactive?: boolean;
}

const MAX_TILT = 4; // degrees — spec cap

export function GlassCard({ children, className = "", interactive = false }: GlassCardProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), {
    stiffness: 200,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), {
    stiffness: 200,
    damping: 20,
  });

  if (!interactive) {
    return <div className={`glass glass-sheen ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      className={`glass glass-sheen ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
