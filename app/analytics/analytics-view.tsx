"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  MousePointerClick,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Search,
  ArrowUpDown,
  Radio,
  Sparkles,
  Zap,
  TrendingUp,
  Inbox,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Loading from "@/app/components/loading";

type LinkItem = {
  id: number;
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  createdAt: string;
};

export default function AnalyticsView() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "clicks" | "oldest">(
    "newest",
  );
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<number | null>(
    null,
  );
  const [sseConnected, setSseConnected] = useState(false);

  // Delete modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function fetchAnalytics() {
    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load analytics");
        return;
      }

      setLinks(data.links || []);
    } catch {
      setError("Something went wrong loading analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("/api/analytics/stream");

    eventSource.onopen = () => {
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type !== "click") {
          return;
        }

        setRecentlyUpdatedId(data.linkId);
        setTimeout(() => setRecentlyUpdatedId(null), 1500);

        setLinks((currentLinks) => {
          const linkExists = currentLinks.some(
            (link) => link.id === data.linkId,
          );

          if (!linkExists) {
            fetchAnalytics();
            return currentLinks;
          }

          return currentLinks.map((link) =>
            link.id === data.linkId
              ? {
                  ...link,
                  clickCount: data.clickCount,
                }
              : link,
          );
        });
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  async function handleCopy(id: number, shortCode: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${shortCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDeleteLink(id: number) {
    setDeletingId(id);
    setDeleteError("");

    try {
      const response = await fetch(`/api/links/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete link");
        return;
      }

      // Remove deleted link from local state
      setLinks((current) => current.filter((l) => l.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setDeleteError("Failed to delete link. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // Dashboard Stats
  const totalClicks = useMemo(() => {
    return links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
  }, [links]);

  const topPerformingLink = useMemo(() => {
    if (links.length === 0) return null;
    return [...links].sort((a, b) => b.clickCount - a.clickCount)[0];
  }, [links]);

  // Filtered & Sorted Links
  const filteredLinks = useMemo(() => {
    return links
      .filter(
        (link) =>
          link.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        if (sortBy === "clicks") return b.clickCount - a.clickCount;
        if (sortBy === "oldest")
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [links, searchQuery, sortBy]);

  if (loading) {
    return (
      <main className="w-full max-w-5xl mx-auto py-12">
        <Loading
          text="Loading Analytics..."
          subtext="Fetching live telemetry, click stream data, and link statistics"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full max-w-5xl mx-auto py-8">
        <div className="p-6 glass-neo-card bg-red-50 border-red-600 text-red-900 space-y-3">
          <h2 className="font-extrabold text-xl">Error Loading Analytics</h2>
          <p className="font-medium">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              fetchAnalytics();
            }}
            className="neo-btn neo-btn-danger px-4 py-2 text-sm font-bold gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-5xl mx-auto py-6 space-y-8">
      {/* Header */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Link Analytics
            </h1>
            <span
              className={`neo-badge ${
                sseConnected ? "neo-badge-green" : "neo-badge-white"
              } text-xs gap-1.5`}
              title={
                sseConnected
                  ? "Realtime SSE Stream Connected"
                  : "Connecting to stream..."
              }
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  sseConnected ? "text-white animate-pulse" : "text-slate-400"
                }`}
              />
              {sseConnected ? "LIVE STREAM" : "OFFLINE"}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Real-time click telemetry and performance breakdown for all your
            links.
          </p>
        </div>

        <Link
          href="/"
          className="neo-btn neo-btn-primary px-5 py-2.5 text-sm font-extrabold gap-2 shrink-0"
        >
          <Zap className="w-4 h-4 fill-amber-300 stroke-amber-300" />
          Create Short Link
        </Link>
      </section>

      {/* Global Delete Error Alert if any */}
      {deleteError && (
        <div className="p-4 rounded-xl bg-red-100 border-2 border-red-600 text-red-900 font-bold flex items-center justify-between shadow-[3px_3px_0px_0px_#dc2626]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button
            onClick={() => setDeleteError("")}
            className="text-xs text-red-800 underline font-black"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-neo-card p-5 space-y-2 border-3 border-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Total Links
            </span>
            <div className="p-2 bg-blue-100 rounded-lg border border-slate-900">
              <Link2 className="w-4 h-4 text-blue-700" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {links.length}
          </div>
          <p className="text-xs font-bold text-slate-500">
            Active shortened aliases
          </p>
        </div>

        <div className="glass-neo-card p-5 space-y-2 border-3 border-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Total Clicks
            </span>
            <div className="p-2 bg-emerald-100 rounded-lg border border-slate-900">
              <MousePointerClick className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600">{totalClicks}</div>
          <p className="text-xs font-bold text-slate-500">
            Across all destinations
          </p>
        </div>

        <div className="glass-neo-card p-5 space-y-2 border-3 border-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Top Performing
            </span>
            <div className="p-2 bg-amber-100 rounded-lg border border-slate-900">
              <TrendingUp className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 truncate">
            {topPerformingLink ? (
              <span className="font-mono text-blue-700">
                /{topPerformingLink.shortCode}
              </span>
            ) : (
              "—"
            )}
          </div>
          <p className="text-xs font-bold text-slate-500">
            {topPerformingLink
              ? `${topPerformingLink.clickCount} total clicks`
              : "No activity yet"}
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      {links.length > 0 && (
        <section className="glass-neo-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-3 border-slate-900">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 z-10">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by code or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input text-sm font-semibold"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-600 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "clicks" | "oldest")
              }
              className="neo-input py-2 text-sm font-bold bg-white cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="clicks">Most Clicks</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </section>
      )}

      {/* Links List */}
      {filteredLinks.length === 0 ? (
        <section className="glass-neo-card p-12 text-center space-y-4 border-3 border-slate-900">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] mx-auto flex items-center justify-center text-blue-600">
            <Inbox className="w-8 h-8" />
          </div>
          {links.length === 0 ? (
            <>
              <h3 className="text-2xl font-black text-slate-900">
                No Links Created Yet
              </h3>
              <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto">
                You haven't generated any short links yet. Get started by
                shortening your first URL!
              </p>
              <Link
                href="/"
                className="inline-flex neo-btn neo-btn-primary px-6 py-3 text-sm font-extrabold gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4" /> Create Your First Short Link
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-xl font-black text-slate-900">
                No matching links found
              </h3>
              <p className="text-sm font-semibold text-slate-600">
                Try adjusting your search query "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="neo-btn neo-btn-white px-4 py-2 text-xs font-bold"
              >
                Clear Search Filter
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {filteredLinks.map((link) => {
            const isJustUpdated = recentlyUpdatedId === link.id;
            const isConfirmingDelete = confirmDeleteId === link.id;
            const isDeletingThis = deletingId === link.id;

            return (
              <div
                key={link.id}
                className={`glass-neo-card p-5 space-y-4 transition-all border-3 border-slate-900 ${
                  isJustUpdated
                    ? "ring-4 ring-blue-500 scale-[1.01] bg-blue-50/90"
                    : "glass-neo-card-hover"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-lg text-blue-700 bg-white px-3 py-1 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                      /{link.shortCode}
                    </span>

                    {/* Click Count Badge */}
                    <div
                      className={`neo-badge ${
                        link.clickCount > 0
                          ? "neo-badge-blue"
                          : "neo-badge-white"
                      } text-xs transition-transform ${
                        isJustUpdated ? "scale-110" : ""
                      }`}
                    >
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>
                        {link.clickCount}{" "}
                        {link.clickCount === 1 ? "click" : "clicks"}
                      </span>
                    </div>

                    {isJustUpdated && (
                      <span className="neo-badge neo-badge-green text-[10px] animate-pulse">
                        +1 CLICK JUST NOW!
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopy(link.id, link.shortCode)}
                      className={`neo-btn px-3 py-1.5 text-xs font-bold gap-1.5 ${
                        copiedId === link.id
                          ? "bg-green-500 text-white border-slate-900"
                          : "neo-btn-white"
                      }`}
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-700" /> Copy
                        </>
                      )}
                    </button>



                    <a
                      href={`/${link.shortCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="neo-btn neo-btn-dark px-3 py-1.5 text-xs font-bold gap-1.5 text-white"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Delete Button */}
                    <button
                      onClick={() =>
                        setConfirmDeleteId(isConfirmingDelete ? null : link.id)
                      }
                      className="neo-btn neo-btn-white p-1.5 text-red-600 hover:bg-red-50 hover:border-red-600"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Delete Confirmation Prompt */}
                {isConfirmingDelete && (
                  <div className="p-3 bg-red-50 rounded-xl border-2 border-red-600 text-red-900 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        Delete short code <strong>/{link.shortCode}</strong>{" "}
                        permanently?
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        disabled={isDeletingThis}
                        className="neo-btn neo-btn-danger px-3 py-1 text-xs font-extrabold"
                      >
                        {isDeletingThis ? "Deleting..." : "Yes, Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="neo-btn neo-btn-white px-3 py-1 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Target URL Info */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">
                      Destination:
                    </span>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate"
                    >
                      {link.originalUrl}
                    </a>
                  </div>

                  <div className="text-xs font-bold text-slate-600 shrink-0">
                    {new Date(link.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>


              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
