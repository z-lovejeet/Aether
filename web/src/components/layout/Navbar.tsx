"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Upload,
  BookOpen,
  Info,
  BarChart3,
  Layers,
  Menu,
  X,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/upload", label: "Studio", icon: Upload },
  { href: "/questions", label: "Practice", icon: BookOpen },
  { href: "/teacher", label: "Teacher", icon: GraduationCap },
  { href: "/analyzer", label: "Analyzer", icon: BarChart3 },
  { href: "/results", label: "Library", icon: Layers },
  { href: "/about", label: "About", icon: Info },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 15);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 py-3 sm:px-8 sm:py-4 transition-all duration-200">
      <div className="mx-auto max-w-7xl">
        <nav
          className={`liquid-dock relative flex items-center justify-between rounded-full px-4 py-2 sm:px-6 transition-all duration-200 ${
            scrolled ? "bg-white/90 shadow-md border-slate-200" : "bg-white/75"
          }`}
        >
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white font-display font-bold text-sm shadow-sm transition-transform duration-200 group-hover:scale-105">
              A
            </div>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Aether <span className="text-[10px] rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5 border border-slate-200 font-mono font-medium">OS</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-150 ${
                    isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-full bg-slate-100 border border-slate-200/80 -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            {/* Quick Upload CTA */}
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3 w-3" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden mt-2 rounded-3xl liquid-dock p-4 border border-slate-200 shadow-xl bg-white/95"
          >
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-indigo-600" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="mt-2 pt-3 border-t border-slate-100">
                <Link
                  href="/upload"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-slate-900 py-2 text-xs font-semibold text-white"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}
