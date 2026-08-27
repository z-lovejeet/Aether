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
      className={`liquid-glass specular-rim relative cursor-pointer overflow-hidden rounded-3xl p-6 border border-slate-200/90 bg-white/95 text-slate-800 shadow-xs hover:border-slate-300 hover:shadow-md transition-all ${className}`}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
