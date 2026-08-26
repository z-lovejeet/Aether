"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { useState, useRef } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

const MAX_TILT = 3.5; // degrees

export function GlassCard({
  children,
  className = "",
  interactive = false,
  onClick,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), {
    stiffness: 240,
    damping: 24,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), {
    stiffness: 240,
    damping: 24,
  });

  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - r.left) / r.width;
    const yPct = (e.clientY - r.top) / r.height;
    mx.set(xPct - 0.5);
    my.set(yPct - 0.5);
    sheenX.set(xPct * 100);
    sheenY.set(yPct * 100);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    mx.set(0);
    my.set(0);
  }

  if (!interactive) {
    return (
      <div
        className={`liquid-glass specular-rim relative rounded-3xl p-6 border-slate-200/80 bg-white/85 text-slate-800 ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="perspective-1000">
      <motion.div
        ref={cardRef}
        className={`liquid-glass specular-rim relative cursor-pointer overflow-hidden rounded-3xl p-6 border-slate-200/80 bg-white/85 text-slate-800 ${className}`}
        style={{
          rotateX: rx,
          rotateY: ry,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {/* Dynamic Light Sheen */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(350px circle at ${sheenX.get()}% ${sheenY.get()}%, rgba(99, 102, 241, 0.05), transparent 70%)`,
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 [transform:translateZ(4px)]">{children}</div>
      </motion.div>
    </div>
  );
}
