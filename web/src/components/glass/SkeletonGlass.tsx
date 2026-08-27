"use client";

import React from "react";

interface SkeletonGlassProps {
  className?: string;
  lines?: number;
}

export function SkeletonGlass({ className = "", lines = 3 }: SkeletonGlassProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm ${className}`}
    >
      <div className="h-4 w-1/3 rounded-md bg-slate-200" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-md bg-slate-100"
            style={{ width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTile({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-slate-200/80 bg-white/70 p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 rounded-full bg-slate-200" />
        <div className="h-4 w-12 rounded-full bg-slate-100" />
      </div>
      <div className="mt-3 h-5 w-3/4 rounded-md bg-slate-200" />
      <div className="mt-2 h-3 w-1/2 rounded-md bg-slate-100" />
    </div>
  );
}
