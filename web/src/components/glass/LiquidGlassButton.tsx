"use client";

import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface LiquidGlassButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
  > {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "glass";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
}

export function LiquidGlassButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className = "",
  disabled,
  ...props
}: LiquidGlassButtonProps) {
  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs rounded-full gap-1.5",
    md: "px-5 py-2.5 text-sm rounded-full gap-2",
    lg: "px-6 py-3 text-sm sm:text-base rounded-full gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-slate-900 hover:bg-slate-800 text-white shadow-sm shadow-slate-900/10 border border-slate-800 active:bg-slate-950",
    secondary:
      "bg-white hover:bg-slate-50 !text-slate-900 text-slate-900 border border-slate-300 shadow-sm hover:border-slate-400 active:bg-slate-100",
    glass:
      "bg-slate-100 hover:bg-slate-200/80 !text-slate-800 text-slate-800 border border-slate-300/80 backdrop-blur-md shadow-none",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-sm",
    ghost:
      "bg-transparent hover:bg-slate-100 !text-slate-700 text-slate-700 hover:!text-slate-900 border-transparent",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.015, y: -1 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      disabled={disabled || loading}
      className={`group relative inline-flex items-center justify-center font-display font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Processing…</span>
        </span>
      ) : (
        <>
          {icon && <span className="shrink-0 transition-transform group-hover:scale-105">{icon}</span>}
          <span className="truncate">{children}</span>
        </>
      )}
    </motion.button>
  );
}
