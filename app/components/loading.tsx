"use client";

import { Zap, Loader2 } from "lucide-react";

type LoadingProps = {
  text?: string;
  subtext?: string;
  fullScreen?: boolean;
  compact?: boolean;
};

export default function Loading({
  text = "Loading...",
  subtext = "Please wait a moment while we process your request",
  fullScreen = false,
  compact = false,
}: LoadingProps) {
  const content = (
    <div className="glass-neo-card p-8 sm:p-10 max-w-md mx-auto text-center space-y-5 border-3 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] animate-in fade-in duration-200">
      <div className="relative inline-flex items-center justify-center">
        {/* Animated outer glowing ring */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border-3 border-blue-600 animate-ping absolute inset-0 opacity-75" />
        
        {/* Main Icon Box */}
        <div className="relative w-16 h-16 bg-blue-600 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl flex items-center justify-center text-white">
          <Zap className="w-8 h-8 fill-amber-300 stroke-amber-300 animate-bounce" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {text}
          </h3>
        </div>
        {subtext && (
          <p className="text-xs font-semibold text-slate-600">
            {subtext}
          </p>
        )}
      </div>

      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border-2 border-slate-900">
        <div className="bg-blue-600 h-full w-2/3 rounded-full animate-pulse" />
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-2.5 glass-neo-card border-2 border-slate-900">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
        <span className="text-sm font-extrabold text-slate-900">{text}</span>
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] backdrop-blur-md bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-12 flex items-center justify-center">
      {content}
    </div>
  );
}
