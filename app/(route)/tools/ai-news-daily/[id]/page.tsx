"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Copy, Share2 } from "lucide-react";
import Image from "next/image";

interface PreviewResponse {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  error?: string;
}

interface ArticleResponse {
  url: string;
  title?: string;
  byline?: string;
  excerpt?: string; // short fair-use text
  siteName?: string;
  publishedAt?: string;
  wordCount?: number;
  error?: string;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Wrapper page: provides Suspense boundary around client content using useSearchParams
export default function NewsDetailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8"><div className="max-w-4xl mx-auto text-gray-400">Loading…</div></main>}>
      <NewsDetailContent />
    </Suspense>
  );
}

function NewsDetailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const url = params.get("url") || "";
  const titleParam = params.get("title") || "";

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reader, setReader] = useState<ArticleResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load persisted expanded state per URL
  useEffect(() => {
    if (!url) return;
    try {
      const raw = sessionStorage.getItem(`news-expanded:${url}`);
      if (raw != null) setExpanded(raw === "1");
      const sum = sessionStorage.getItem(`news-summary:${url}`);
      if (sum) setSummary(sum);
    } catch {}
  }, [url]);
  // Fetch preview (OG meta)
  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!url) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        const data = (await res.json()) as PreviewResponse;
        if (mounted) setPreview(data);
      } catch {
        if (mounted) setPreview({ url });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [url]);

  // Fetch reader excerpt depending on expanded
  useEffect(() => {
    let mounted = true;
    if (!url) return;
    fetch(`/api/article?url=${encodeURIComponent(url)}&max=${expanded ? 2400 : 1200}`)
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setReader(d as ArticleResponse);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [url, expanded]);

  const title = useMemo(() => preview?.title || titleParam || url, [preview, titleParam, url]);

  // naive client-side summarizer (no external deps): take first sentences and keylines
  const generateSummary = async () => {
    if (!reader?.excerpt) return;
    setSummarizing(true);
    try {
      const text = reader.excerpt;
      const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 6);
      const keyLines = text
        .split(/\n+/)
        .filter((l) => /AI|model|open|launch|partnership|funding|acquire|release|update|research|paper|API/i.test(l))
        .slice(0, 3);
      const out = [...sentences, ...keyLines].join(" ");
      setSummary(out.length > 140 ? out.slice(0, 700) + (out.length > 700 ? "…" : "") : out);
      try {
        sessionStorage.setItem(`news-summary:${url}`, out);
      } catch {}
      toast.success("Summary ready");
    } finally {
      setSummarizing(false);
    }
  };

  const onToggleExpanded = () => {
    setExpanded((e) => {
      const next = !e;
      try {
        sessionStorage.setItem(`news-expanded:${url}`, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const copySummary = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success("Summary copied to clipboard");
    } catch {}
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  const onShare = async () => {
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  return (
    <main className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <article className="mt-6 bg-gray-800/70 rounded-2xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="h-56 bg-gray-700 animate-pulse" />
          ) : preview?.image ? (
            <Image src={preview.image} alt="Preview" width={1200} height={400} className="w-full h-56 object-cover" />
          ) : (
            <div className="h-20 bg-gray-700/50" />
          )}

          <div className="p-6">
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-gray-400">
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                <ExternalLink className="h-4 w-4" />
                {reader?.siteName || extractDomain(url)}
              </a>
              {reader?.byline && (
                <span className="text-xs text-gray-400/90">By {reader.byline}</span>
              )}
              {reader?.publishedAt && (
                <span className="text-xs text-gray-400/90">
                  {(() => {
                    const d = new Date(reader.publishedAt as string);
                    return isNaN(d.getTime()) ? reader.publishedAt : d.toLocaleDateString();
                  })()}
                </span>
              )}
              {(() => {
                const wc = reader?.wordCount || (reader?.excerpt ? reader.excerpt.split(/\s+/).filter(Boolean).length : 0);
                if (!wc) return null;
                const mins = Math.max(1, Math.ceil(wc / 200));
                return <span className="text-xs text-gray-400/90">{mins} min read</span>;
              })()}
              <button onClick={onCopy} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button onClick={onShare} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>

            {preview?.description && (
              <p className="mt-4 text-gray-200 leading-relaxed">
                {preview.description.replace(/&(#39|apos);/g, "'")
                  .replace(/&amp;/g, "&")
                  .replace(/&quot;/g, '"')
                  .replace(/&#x2F;/g, "/")}
              </p>
            )}

            <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Reader view</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleExpanded}
                    className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                  <button
                    onClick={generateSummary}
                    disabled={summarizing || !reader?.excerpt}
                    className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60"
                  >
                    {summarizing ? "Summarizing…" : summary ? "Re-summarize" : "Summarize"}
                  </button>
                  <button
                    onClick={copySummary}
                    disabled={!summary}
                    className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-60"
                  >
                    {copied ? "Copied" : "Copy summary"}
                  </button>
                </div>
              </div>
              {summary && (
                <div className="mt-3 p-3 rounded bg-blue-950/40 border border-blue-900 text-blue-100 text-sm whitespace-pre-wrap">
                  {summary}
                </div>
              )}
              <div className="mt-3 whitespace-pre-wrap text-gray-100 leading-relaxed">
                {reader?.excerpt || "Could not load article excerpt."}
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" /> Open original article
              </a>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
