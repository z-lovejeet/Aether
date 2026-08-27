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
  interactive = false,
  glowColor = "rgba(99, 102, 241, 0.05)",
  onClick,
}: LiquidGlassCardProps) {
  if (!interactive) {
    return (
      <div
        className={`liquid-glass specular-rim relative rounded-3xl p-6 border border-slate-200/90 bg-white/95 text-slate-800 shadow-xs transition-colors ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className={`liquid-glass specular-rim relative cursor-pointer overflow-hidden rounded-3xl p-6 border border-slate-200/90 bg-white/95 text-slate-800 shadow-xs hover:border-slate-300 hover:shadow-md transition-all ${className}`}
    >
      {/* Ambient Top Rim Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent" />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
