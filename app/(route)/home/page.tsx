"use client";

// app/(route)/home/page.tsx

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Input } from "../../../components/ui/input";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Search, X, BarChart2, Newspaper, Target, TrendingUp, Bot, Rocket, ExternalLink, AlertCircle,
} from "lucide-react";
import { AI_LIST } from "@/lib/ai-list";

type Tool = {
  id: string;
  name: string;
  href: string;
  description: string;
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  "/tools/contact-finder": "Look up work emails via Hunter.io — by name and company, or by job title and company. Results are checked for deliverability.",
  "/tools/ai-list": "The team's Gems and GPTs for VC work — lead finding, portfolio screening, valuation and more.",
  "/tools/ai-news-daily": "A ready-made daily AI & AgTech news prompt. Open it in Grok, Gemini or ChatGPT with one click.",
  "/tools/startup-seeker": "Find and score agritech startups by location, readiness and feasibility.",
  "/tools/sentiment-analyzer": "Analyze public sentiment about a company from recent news articles.",
};

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/tools/contact-finder": Search,
  "/tools/ai-list": Bot,
  "/tools/ai-news-daily": Newspaper,
  "/tools/startup-seeker": Target,
  "/tools/sentiment-analyzer": TrendingUp,
};

const trackToolOpen = (href: string) => {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolName: href, action: "open" }),
  }).catch((err) => console.error("Failed to track tool usage", err));
};

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "admin";

  // Redirect admins to choice page if they just logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as any)?.role;

      // Check if this is a fresh login (no referrer from admin-choice)
      if (userRole === "admin" && typeof window !== "undefined") {
        const fromAdminChoice = sessionStorage.getItem("from_admin_choice");
        const adminChoiceShown = sessionStorage.getItem("admin_choice_shown");

        // Show choice page only once per session (after login)
        if (!fromAdminChoice && !adminChoiceShown) {
          // Mark that we've shown the choice page
          sessionStorage.setItem("admin_choice_shown", "true");
          router.push("/admin-choice");
          return;
        }
      }
    }
  }, [status, session, router]);

  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch accessible tools dynamically from API
  useEffect(() => {
    const fetchTools = async () => {
      if (status === "authenticated" && session?.user) {
        try {
          setLoading(true);
          const response = await fetch('/api/user/accessible-tools');
          if (response.ok) {
            const data = await response.json();
            const apiTools = data.tools
              .filter((tool: any) => tool.href !== '/home' && tool.href !== '/admin/dashboard')
              .map((tool: any) => ({
                id: tool.href,
                name: tool.title,
                href: tool.href,
                description: TOOL_DESCRIPTIONS[tool.href] ?? "",
              }));
            setTools(apiTools);
            setError(null);
          } else {
            setError("Failed to load tools");
          }
        } catch (error) {
          console.error('Error fetching tools:', error);
          setError("Error loading tools");
        } finally {
          setLoading(false);
        }
      } else if (status === "unauthenticated") {
        setLoading(false);
      }
    };

    fetchTools();
  }, [status, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  // Ctrl/Cmd+K focuses search, Escape clears it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const query = search.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(query);

  const filteredTools = useMemo(
    () => (query ? tools.filter((t) => matches(t.name) || matches(t.description)) : tools),
    [tools, query]
  );

  const filteredAi = useMemo(
    () => (query ? AI_LIST.filter((a) => matches(a.title) || matches(a.description ?? "") || matches(a.platform)) : AI_LIST),
    [query]
  );

  const cardClass =
    "block h-full rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 transition-colors hover:border-gray-600 hover:bg-gray-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500";

  return (
    <div className="mx-auto max-w-5xl px-2 py-6 text-left">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Rouge Tools</h1>
        <p className="mt-1 text-sm text-gray-400">Internal tools and AI assistants for the team.</p>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={searchInputRef}
          placeholder="Search tools and assistants (Ctrl+K)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-lg border-gray-700/60 bg-gray-900/40 pl-9 pr-9 text-white placeholder:text-gray-500"
          aria-label="Search tools"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tools */}
      <section className="mb-10" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
          Tools
        </h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-gray-800/60" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        ) : filteredTools.length === 0 ? (
          <p className="text-sm text-gray-500">No tools match &quot;{search}&quot;.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => {
              const Icon = TOOL_ICONS[tool.href] ?? Rocket;
              return (
                <div key={tool.id} className="relative">
                  <Link href={tool.href} onClick={() => trackToolOpen(tool.href)} className={cardClass}>
                    <div className="flex items-center gap-2 pr-8">
                      <Icon className="h-4 w-4 shrink-0 text-gray-300" />
                      <h3 className="font-medium text-white">{tool.name}</h3>
                    </div>
                    {tool.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-400">{tool.description}</p>
                    )}
                  </Link>
                  {isAdmin && (
                    <Link
                      href={`/tools/analytics/${tool.href.split('/').pop()}`}
                      className="absolute right-3 top-3 rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-white"
                      aria-label={`View usage analytics for ${tool.name}`}
                      title="Usage analytics"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AI List */}
      <section aria-labelledby="ai-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="ai-heading" className="text-xs font-medium uppercase tracking-wide text-gray-500">
            AI List
          </h2>
          <Link href="/tools/ai-list" className="text-xs text-gray-400 hover:text-white">
            View all
          </Link>
        </div>
        {filteredAi.length === 0 ? (
          <p className="text-sm text-gray-500">No assistants match &quot;{search}&quot;.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAi.map((ai) => (
              <a key={ai.url} href={ai.url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-white">{ai.title}</h3>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
                    {ai.platform}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
                {ai.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">{ai.description}</p>
                )}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
