"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  BarChart2,
  Sparkles,
  Zap,
  ShieldCheck,
  Globe2,
  ArrowRight,
} from "lucide-react";

export default function CreateLinkForm() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setShortUrl("");
    setShortCode("");
    setLoading(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create short URL");
        return;
      }

      const generatedUrl = `${window.location.origin}/${data.shortCode}`;
      setShortUrl(generatedUrl);
      setShortCode(data.shortCode);
      setOriginalUrl("");
    } catch {
      setError("Something went wrong while creating your short link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="w-full max-w-4xl mx-auto py-6 space-y-12">
      {/* Hero Header */}
      <section className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-neo-card text-xs font-black uppercase tracking-wider text-blue-700 shadow-[3px_3px_0px_0px_#0f172a]">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 animate-pulse-fast" />
          <span>Fast & Real-Time URL Shortener</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
          Shorten Links with <br className="hidden sm:inline" />
          <span className="text-blue-600 underline decoration-4 decoration-slate-900 underline-offset-4">
            Superpowers
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 font-medium max-w-2xl mx-auto">
          Lightning-fast redirects, high-precision analytics, and real-time SSE click streams built for extreme speed and scalability.
        </p>
      </section>

      {/* URL Input Form */}
      <section className="glass-neo-card p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="originalUrl" className="block text-sm font-black text-slate-900 uppercase tracking-wide">
            Enter Destination URL
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 z-10">
                <Globe2 className="w-5 h-5" />
              </div>
              <input
                id="originalUrl"
                type="url"
                placeholder="https://example.com/very-long-url-path-to-shorten"
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                required
                className="neo-input text-base font-semibold"
                style={{ paddingLeft: "3.25rem" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn neo-btn-primary px-8 py-3.5 text-base font-extrabold whitespace-nowrap gap-2 min-w-[160px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-amber-300 stroke-amber-300" />
                  Shorten Now
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-100 border-3 border-red-600 text-red-900 font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_#dc2626]">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black">
              !
            </div>
            <span>{error}</span>
          </div>
        )}

        {/* Shortened Result Card */}
        {shortUrl && (
          <div className="glass-neo-card-blue p-6 rounded-xl space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <span className="neo-badge neo-badge-green text-xs">
                <Check className="w-3.5 h-3.5" /> Link Ready!
              </span>
              <span className="text-xs font-bold text-blue-900 uppercase">
                Code: <code className="bg-white/80 px-2 py-0.5 rounded border border-blue-900 font-mono text-blue-900">{shortCode}</code>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border-3 border-blue-900 shadow-[4px_4px_0px_0px_#1d4ed8]">
              <div className="flex items-center gap-2 overflow-hidden px-2">
                <LinkIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-700 hover:text-blue-900 hover:underline truncate text-base sm:text-lg font-mono"
                >
                  {shortUrl}
                </a>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopy}
                  type="button"
                  className={`neo-btn px-4 py-2 text-sm font-bold gap-2 ${
                    copied
                      ? "bg-green-500 text-white border-slate-900"
                      : "neo-btn-primary"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy
                    </>
                  )}
                </button>

                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="neo-btn neo-btn-dark p-2 text-white"
                  title="Open Link"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-black text-blue-900 hover:text-blue-700 hover:underline uppercase tracking-wide"
              >
                View Live Click Stats <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Feature Teasers */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-neo-card p-6 space-y-3 glass-neo-card-hover">
          <div className="w-12 h-12 bg-amber-400 rounded-xl border-3 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center">
            <Zap className="w-6 h-6 text-slate-900 fill-slate-900" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900">Redis-Cached Speed</h3>
          <p className="text-sm font-medium text-slate-600">
            Redirects are cached with Redis for microsecond lookup times and instant redirection.
          </p>
        </div>

        <div className="glass-neo-card p-6 space-y-3 glass-neo-card-hover">
          <div className="w-12 h-12 bg-blue-500 rounded-xl border-3 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center text-white">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900">Real-Time Streams</h3>
          <p className="text-sm font-medium text-slate-600">
            Watch click counts update live as visitors open your shortened URLs via Server-Sent Events.
          </p>
        </div>

        <div className="glass-neo-card p-6 space-y-3 glass-neo-card-hover">
          <div className="w-12 h-12 bg-emerald-400 rounded-xl border-3 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center text-slate-900">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900">User Isolated</h3>
          <p className="text-sm font-medium text-slate-600">
            Your shortened links and analytics are securely mapped exclusively to your account.
          </p>
        </div>
      </section>
    </main>
  );
}
