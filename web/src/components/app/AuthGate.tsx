"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { GlassCard } from "@/components/glass/GlassCard";

interface AuthGateProps {
  children: React.ReactNode;
  allowGuest?: boolean;
}

export function AuthGate({ children, allowGuest = true }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check local guest flag
    if (typeof window !== "undefined" && sessionStorage.getItem("mastery_guest") === "true") {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="animate-pulse text-sm text-[var(--text-secondary)]">Loading…</p>
      </div>
    );
  }

  if (user || isGuest) {
    return <>{children}</>;
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      if (authError) throw authError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    }
  }

  function handleGuest() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mastery_guest", "true");
    }
    setIsGuest(true);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <GlassCard className="w-full max-w-md p-8 text-center" interactive>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Welcome to Mastery Engine
        </p>
        <h2 className="display text-3xl font-bold">Sign in to save your progress</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Your personalized Learning DNA will adapt to every study session.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-[rgba(52,211,153,0.12)] p-4 text-sm text-[var(--color-mastery)]">
            ✉️ Check your inbox for a sign-in link! Click it and return here.
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="glass w-full rounded-2xl p-3.5 text-sm outline-none placeholder:text-white/30 focus:border focus:border-[var(--color-accent)]"
            />
            {error && (
              <p className="text-left text-xs text-[var(--color-forget)]">{error}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--color-accent)] py-3 font-display text-sm font-semibold shadow-lg shadow-purple-500/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Send magic link →
            </button>
          </form>
        )}

        {allowGuest && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <button
              onClick={handleGuest}
              className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors underline"
            >
              Or continue as guest (skip login for now)
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
