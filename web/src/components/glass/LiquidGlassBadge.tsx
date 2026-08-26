"use client";

import type { ReactNode } from "react";

interface LiquidGlassBadgeProps {
  children: ReactNode;
  variant?: "indigo" | "cyan" | "emerald" | "amber" | "rose" | "neutral";
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export function LiquidGlassBadge({
  children,
  variant = "indigo",
  icon,
  className = "",
  size = "md",
}: LiquidGlassBadgeProps) {
  const variantStyles = {
    indigo: "bg-indigo-50/90 border-indigo-200/80 text-indigo-700",
    cyan: "bg-sky-50/90 border-sky-200/80 text-sky-700",
    emerald: "bg-emerald-50/90 border-emerald-200/80 text-emerald-700",
    amber: "bg-amber-50/90 border-amber-200/80 text-amber-800",
    rose: "bg-rose-50/90 border-rose-200/80 text-rose-700",
    neutral: "bg-slate-100/90 border-slate-200/80 text-slate-700",
  };

  const dotColors = {
    indigo: "bg-indigo-500",
    cyan: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    neutral: "bg-slate-400",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[11px] gap-1.5",
    md: "px-3.5 py-1 text-xs gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-md font-medium shadow-none transition-all ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      <span>{children}</span>
    </span>
  );
}
