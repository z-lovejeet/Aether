"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { useState, useRef } from "react";

interface LiquidGlassCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  glowColor?: string;
  onClick?: () => void;
  depth?: "low" | "medium" | "high";
}

export function LiquidGlassCard({
  children,
  className = "",
  interactive = true,
  glowColor = "rgba(99, 102, 241, 0.05)",
  onClick,
  depth = "medium",
}: LiquidGlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tilt tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const maxTilt = depth === "high" ? 5 : depth === "medium" ? 3 : 1.5;

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 240,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 240,
    damping: 24,
  });

  // Dynamic light sheen position
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    mouseX.set(xPct - 0.5);
    mouseY.set(yPct - 0.5);

    sheenX.set(xPct * 100);
    sheenY.set(yPct * 100);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }

  if (!interactive) {
    return (
      <div
        className={`liquid-glass specular-rim relative rounded-3xl p-6 transition-all duration-200 border-slate-200/80 bg-white/85 text-slate-800 ${className}`}
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
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`liquid-glass specular-rim relative cursor-pointer overflow-hidden rounded-3xl p-6 border-slate-200/80 bg-white/85 text-slate-800 transition-shadow ${className}`}
      >
        {/* Dynamic cursor-following subtle light sheen */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(350px circle at ${sheenX.get()}% ${sheenY.get()}%, ${glowColor}, transparent 70%)`,
            }}
          />
        )}

        {/* Ambient Top Rim Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Card Content */}
        <div className="relative z-10 [transform:translateZ(4px)]">{children}</div>
      </motion.div>
    </div>
  );
}
