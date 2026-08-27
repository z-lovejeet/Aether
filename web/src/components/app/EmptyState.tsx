"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title = "No Data Found",
  description = "Your first system is sixty seconds away.",
  actionHref = "/upload",
  actionLabel = "Launch Studio",
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <LiquidGlassCard
      depth="medium"
      className={`mx-auto max-w-md p-8 text-center border-slate-200/90 bg-white/95 shadow-sm ${className}`}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
        {icon || <Sparkles className="h-6 w-6 text-indigo-600" />}
      </div>

      <h3 className="font-display text-lg font-bold text-slate-900 leading-snug">
        {title}
      </h3>

      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
        {description}
      </p>

      <div className="mt-6 flex justify-center">
        {onAction ? (
          <LiquidGlassButton
            onClick={onAction}
            variant="primary"
            size="sm"
            icon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            {actionLabel}
          </LiquidGlassButton>
        ) : actionHref ? (
          <Link href={actionHref}>
            <LiquidGlassButton
              variant="primary"
              size="sm"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              {actionLabel}
            </LiquidGlassButton>
          </Link>
        ) : null}
      </div>
    </LiquidGlassCard>
  );
}
