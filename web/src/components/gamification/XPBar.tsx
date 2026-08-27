"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { getUserStats, type UserStatsDto } from "@/lib/agent-client";

interface XPBarProps {
  currentXP?: number;
  currentStreak?: number;
  recentGain?: number | null;
  className?: string;
}

export function XPBar({
  currentXP,
  currentStreak,
  recentGain,
  className = "",
}: XPBarProps) {
  const [stats, setStats] = useState<UserStatsDto>({
    xp: currentXP ?? 0,
    streak: currentStreak ?? 1,
    lastActive: null,
  });

  useEffect(() => {
    if (currentXP !== undefined) {
      setStats((prev) => ({
        ...prev,
        xp: currentXP,
        streak: currentStreak ?? prev.streak,
      }));
      return;
    }

    getUserStats()
      .then((s) => {
        if (s && s.xp >= 0) {
          setStats(s);
        }
      })
      .catch(() => {
        /* fallback to initial state */
      });
  }, [currentXP, currentStreak]);

  const level = Math.floor(stats.xp / 100) + 1;
  const currentLevelProgress = stats.xp % 100;
  const nextLevelXP = level * 100;

  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      {/* Level Badge */}
      <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-sm border border-slate-800">
        <Trophy className="h-3.5 w-3.5 text-amber-400" />
        <span>Lvl {level}</span>
      </div>

      {/* XP Progress Track */}
      <div className="relative flex flex-col justify-center min-w-[120px] sm:min-w-[160px]">
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-0.5">
          <span>{stats.xp} XP</span>
          <span>{nextLevelXP} XP</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/80">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(6, currentLevelProgress)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {/* Streak Flame */}
      <div
        className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200/90 shadow-sm"
        title={`${stats.streak} day learning streak!`}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
        </motion.div>
        <span className="font-mono text-xs">{stats.streak}d</span>
      </div>

      {/* Floating XP Gain Animation Toast */}
      <AnimatePresence>
        {recentGain && recentGain > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1.1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -top-2 right-0 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg"
          >
            <Sparkles className="h-3 w-3" />
            <span>+{recentGain} XP</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
