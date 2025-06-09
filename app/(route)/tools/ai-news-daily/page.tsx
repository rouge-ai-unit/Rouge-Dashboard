"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Interfaces for type safety
interface NewsItem {
  id: number;
  content: string;
}

interface ApiResponse {
  message: string;
}

/**
 *
 */
const NewsSkeleton = () => (
  <div className="grid gap-4">
    {[...Array(3)].map((_, index) => (
      <div
        key={index}
        className="bg-gray-700 animate-pulse rounded-2xl p-5 h-24"
      />
    ))}
  </div>
);
/**
 *
 */
/**
 * Individual news item component with image preview
 */
const NewsCard = memo(({ content }: { content: string }) => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  // Common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;

  // Split content into parts: text and URLs
  const parts = content.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex) && part.match(imageExtensions)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mx-1"
          aria-label={`View image from ${part}`}
        >
          <img
            src={part}
            alt="News image"
            className="max-w-[150px] h-auto rounded-md border border-gray-600 hover:border-blue-500 transition-colors duration-200"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none"; // Hide broken images
            }}
          />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 shadow-sm rounded-2xl p-6 border border-gray-700 hover:bg-gray-700 hover:shadow-lg transition-all duration-300"
    >
      <p className="text-gray-200 text-base leading-relaxed">{parts}</p>
    </motion.li>
  );
});

NewsCard.displayName = "NewsCard";

export default function AiNewsPage() {
  const [aiNews, setAiNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);

  /**
   * Fetches AI news from the API with timeout and retry logic
   */
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbwNy6-HlszGlhQaMiZRZn21X6M79WHNXseGV9UHhh1ZveMiGyH5h33c-KL5T7PHxh46og/exec",
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error("Failed to fetch news.");
      }

      const data: ApiResponse = await res.json();

      if (data && typeof data.message === "string") {
        const lines = data.message
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line, index) => ({ id: index, content: line }));
        setAiNews(lines);
      } else {
        throw new Error("Invalid data format.");
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
  }, [retryCount]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return (
    <main className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            🧠 AI News of the Day
          </h1>
          <p className="mt-2 text-gray-400 text-sm sm:text-base">
            Stay updated with the latest advancements in artificial
            intelligence.
          </p>
        </header>

        <div className="flex justify-end mb-6">
          <button
            onClick={fetchNews}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Refresh news"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading && !aiNews.length ? (
          <NewsSkeleton />
        ) : error ? (
          <div
            className="bg-red-950 border border-red-800 text-red-300 p-4 rounded-lg text-center"
            role="alert"
          >
            {error}
          </div>
        ) : aiNews.length > 0 ? (
          <AnimatePresence>
            <ul className="grid gap-4">
              {aiNews.map((news) => (
                <NewsCard key={news.id} content={news.content} />
              ))}
            </ul>
          </AnimatePresence>
        ) : (
          <p className="text-center text-gray-400 text-lg">
            No AI news available at the moment.
          </p>
        )}
      </div>
    </main>
  );
}
