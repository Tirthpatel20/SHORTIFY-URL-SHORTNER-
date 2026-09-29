"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, BarChart3, LogOut, Link2, Sparkles } from "lucide-react";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 bg-blue-600 border-3 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] rounded-xl flex items-center justify-center text-white group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0px_0px_#0f172a] transition-all">
            <Zap className="w-6 h-6 fill-amber-300 stroke-amber-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 flex items-center gap-1">
              Zip<span className="text-blue-600">Link</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 -mt-1">
              Fast & Real-Time Shortener
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        {!isAuthPage && (
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border-2 transition-all ${
                pathname === "/"
                  ? "bg-blue-600 text-white border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
                  : "bg-white/80 text-slate-700 border-slate-900/40 hover:border-slate-900 hover:bg-white hover:shadow-[3px_3px_0px_0px_#0f172a]"
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Shorten URL</span>
            </Link>

            <Link
              href="/analytics"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border-2 transition-all ${
                pathname === "/analytics"
                  ? "bg-blue-600 text-white border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
                  : "bg-white/80 text-slate-700 border-slate-900/40 hover:border-slate-900 hover:bg-white hover:shadow-[3px_3px_0px_0px_#0f172a]"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              type="button"
              className="neo-btn neo-btn-white px-3 sm:px-4 py-2 text-sm font-bold text-slate-800 border-2 gap-2"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        )}

        {/* Auth page state */}
        {isAuthPage && (
          <div className="flex items-center gap-2">
            <span className="neo-badge neo-badge-blue hidden sm:inline-flex">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Instant Access
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
