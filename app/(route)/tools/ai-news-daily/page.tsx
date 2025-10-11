"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ExternalLink,
  Copy,
  Share2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

// --- Types ---
interface ApiResponse {
  message: string;
}

interface NewsArticle {
  id: number;
  title: string;
  url?: string;
}

interface PreviewResponse {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  error?: string;
}

// --- Utils ---
const urlRegex = /(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)/i;
const isSeparator = (line: string) => /^[-_\s]{3,}$/.test(line.trim());
const isHeader = (line: string) => /ai\s*news/i.test(line.trim());
const isUrl = (line: string) => /^https?:\/\//i.test(line.trim());
const extractDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function parseNewsMessage(message: string): NewsArticle[] {
  const lines = message
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !isSeparator(l) && !isHeader(l));

  const articles: NewsArticle[] = [];
  let current: Partial<NewsArticle> | null = null;

  const itemPattern = /^(?:\(?\d+\)?[.)-]|•|-)\s*(.+)$/; // "1) ", "1.", "-", bullet

  for (const line of lines) {
    if (isUrl(line)) {
      // attach URL to current item if exists, else create a new one
      if (!current) current = { title: line.replace(urlRegex, "") };
      current.url = line;
      continue;
    }

    const m = line.match(itemPattern);
    if (m) {
      // push previous
      if (current && current.title) {
        articles.push({ id: articles.length, title: current.title, url: current.url });
      }
      current = { title: m[1] };
      continue;
    }

    // Fallback: Lines that look like titles without numbering; if previous has URL, start a new article
    if (!current || (current && current.title && current.url)) {
      if (current && current.title) {
        articles.push({ id: articles.length, title: current.title, url: current.url });
      }
      current = { title: line };
    } else if (current && current.title && !current.url) {
      // Append extra text to title
      current.title = `${current.title} ${line}`.trim();
    }
  }

  if (current && current.title) {
    articles.push({ id: articles.length, title: current.title, url: current.url });
  }

  // de-dup simple repeats
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = `${a.title}|${a.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CACHE_KEY = "ai-news-cache-v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const NewsSkeleton = () => (
  <div className="grid gap-4">
    {[...Array(6)].map((_, index) => (
      <div key={index} className="bg-gray-900/50 backdrop-blur-sm animate-pulse rounded-2xl p-5 h-28 border border-gray-700/50" />
    ))}
  </div>
);

function ArticleCard({ article }: { article: NewsArticle }) {
  const domain = article.url ? extractDomain(article.url) : undefined;
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!article.url) return;
      const cacheKey = `og-preview:${article.url}`;
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
        if (cached) {
          const parsed = JSON.parse(cached) as { ts: number; data: PreviewResponse };
          if (Date.now() - parsed.ts < 6 * 60 * 60 * 1000) {
            if (mounted) setPreview(parsed.data);
            return;
          }
        }
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(article.url)}`);
        const data = (await res.json()) as PreviewResponse;
        if (mounted) setPreview(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [article.url]);

  const onCopy = async () => {
    if (!article.url) return;
    try {
      await navigator.clipboard.writeText(article.url);
    } catch {
      // ignore
    }
  };

  const onShare = async () => {
    if (!article.url) return;
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ title: article.title, url: article.url });
      } else {
        await navigator.clipboard.writeText(article.url);
      }
    } catch {
      // ignore
    }
  };

  const detailHref = article.url
    ? `/tools/ai-news-daily/${article.id}?title=${encodeURIComponent(article.title)}&url=${encodeURIComponent(
        article.url
      )}`
    : undefined;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 hover:border-gray-600/50 transition-all duration-300"
    >
      {/* Image header */}
      {preview?.image && !imgError ? (
        <Link href={detailHref || "#"} aria-label="Open details">
          <Image
            src={preview.image}
            alt="Preview"
            width={960}
            height={400}
            className="w-full h-40 sm:h-48 object-cover"
            onError={() => setImgError(true)}
          />
        </Link>
      ) : (
        <div className="h-3 bg-gray-700/40" />
      )}

      <div className="p-5 flex flex-col gap-3">
        <Link href={detailHref || "#"} className="group">
          <h3 className="text-gray-100 text-base sm:text-lg leading-snug font-medium group-hover:underline">
            {article.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between gap-3">
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="truncate max-w-[16rem] sm:max-w-none">{domain}</span>
            </a>
          ) : (
            <span className="text-gray-400">No link provided</span>
          )}

          <div className="flex items-center gap-2">
            {article.url && (
              <Link
                href={detailHref || "#"}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500"
              >
                View
              </Link>
            )}
            {article.url && (
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"
                aria-label="Copy link"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            )}
            {article.url && (
              <button
                onClick={onShare}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"
                aria-label="Share link"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export default function AiNewsPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const fetchNews = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = opts?.force ?? false;
      setLoading(true);
      setError(null);

      try {
        // Cache layer
        if (!force && typeof window !== "undefined") {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              ts: number;
              message: string;
              articles?: NewsArticle[];
            };
            if (Date.now() - parsed.ts < CACHE_TTL_MS) {
              const arts = parsed.articles ?? parseNewsMessage(parsed.message);
              setArticles(arts);
              setLastUpdated(parsed.ts);
              setLoading(false);
              return;
            }
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(
          "https://script.google.com/macros/s/AKfycbwNy6-HlszGlhQaMiZRZn21X6M79WHNXseGV9UHhh1ZveMiGyH5h33c-KL5T7PHxh46og/exec",
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Failed to fetch news.");

        const data: ApiResponse = await res.json();
        if (!data || typeof data.message !== "string") throw new Error("Invalid data format.");

        const parsedArticles = parseNewsMessage(data.message);
        setArticles(parsedArticles);
        setLastUpdated(Date.now());

        if (typeof window !== "undefined") {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), message: data.message, articles: parsedArticles })
          );
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error && err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          setError("Failed to fetch AI news. Please try again later.");
        }
        if (retryCount < 2) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            fetchNews();
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    },
    [retryCount]
  );

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Handle deep link ?new=1: focus search to quickly filter/share
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new") === "1") {
        setTimeout(() => searchRef.current?.focus(), 40);
        router.replace("/tools/ai-news-daily", { scroll: false });
      }
    } catch {}
  }, [router]);

  // Derived
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(q));
  }, [articles, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return null;
    const diff = Date.now() - lastUpdated;
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 minute ago";
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.round(mins / 60);
    if (hrs === 1) return "1 hour ago";
    return `${hrs} hours ago`;
  }, [lastUpdated]);

  return (
    <main className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">🧠 AI News of the Day</h1>
              <p className="mt-1 text-gray-400 text-sm sm:text-base">Stay updated with the latest in artificial intelligence.</p>
              {lastUpdatedText && (
                <p className="mt-1 text-xs text-gray-500">Last updated {lastUpdatedText}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNews({ force: true })}
                disabled={loading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Refresh news"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
                  fetchNews({ force: true });
                }}
                className="hidden sm:inline-flex items-center px-3 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600"
              >
                Clear cache
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search headlines..."
                className="w-full bg-gray-800/50 backdrop-blur-sm text-gray-100 placeholder:text-gray-400 pl-9 pr-3 py-2 rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                ref={searchRef}
              />
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-gray-800/50 backdrop-blur-sm text-gray-100 px-3 py-2 rounded-lg border border-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value={6}>6 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>
        </header>

        {loading && articles.length === 0 ? (
          <NewsSkeleton />
        ) : error ? (
          <div className="bg-red-950 border border-red-800 text-red-300 p-4 rounded-lg text-center" role="alert">
            {error}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <AnimatePresence initial={false}>
              <ul className="grid gap-4">
                {pageItems.map((art) => (
                  <ArticleCard key={`${art.id}-${art.title}`} article={art} />
                ))}
              </ul>
            </AnimatePresence>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-gray-400 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-400 text-lg">No AI news available at the moment.</p>
        )}
      </div>
    </main>
  );
}
