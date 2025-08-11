import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isHttpUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 9000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(resource, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        ...options.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trimToSentences(text: string, maxChars = 1200) {
  if (text.length <= maxChars) return text;
  const trimmed = text.slice(0, maxChars);
  const lastPeriod = Math.max(trimmed.lastIndexOf("."), trimmed.lastIndexOf("!"), trimmed.lastIndexOf("?"));
  return (lastPeriod > 200 ? trimmed.slice(0, lastPeriod + 1) : trimmed) + "\n\n…";
}

function getMeta(html: string, prop: string) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(regex);
  return m ? m[1] : undefined;
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function removeBoilerplateBlocks(html: string) {
  const bp =
    "ad|ads|advert|advertisement|sponsor|sponsored|promo|outbrain|taboola|newsletter|subscribe|consent|cookie|paywall|share|social|breadcrumb|related|recommend|recirc|trending|popular|sidebar|ticker|market|lang|language|locale|menu|nav|header|footer|cta|login|register|signup|sign-up|sign in|sign-in|widgets?";
  const tagGroup = "div|section|aside|nav|header|footer|ul|ol";
  let out = html;
  // Remove blocks with suspicious class/id keywords (2 passes to catch nesting)
  const pattern = new RegExp(
    `<(?:${tagGroup})[^>]*(?:class|id)=["'][^"']*(?:${bp})[^"']*["'][^>]*>[\\s\\S]*?<\\/(?:${tagGroup})>`,
    "gi"
  );
  out = out.replace(pattern, "");
  out = out.replace(pattern, "");
  return out;
}

function findBestContent(html: string) {
  const candidates: string[] = [];
  // article elements
  const artMatches = html.matchAll(/<article[\s\S]*?<\/article>/gi);
  for (const m of artMatches) candidates.push(m[0]);
  // main elements
  const mainMatches = html.matchAll(/<main[\s\S]*?<\/main>/gi);
  for (const m of mainMatches) candidates.push(m[0]);
  // role=main
  const roleMainMatches = html.matchAll(/<[^>]*role=["']main["'][^>]*>[\s\S]*?<\/(?:div|main|section)>/gi);
  for (const m of roleMainMatches) candidates.push(m[0]);
  // content-like divs
  const contentKeys =
    "content|post|article|story|entry|body|markdown|post-body|article-body|postcontent|content-body|news|post-text|rich-text|prose";
  const contentMatches = html.matchAll(
    new RegExp(
      `<div[^>]*(?:class|id)=["'][^"']*(?:${contentKeys})[^"']*["'][^>]*>[\\s\\S]*?<\\/div>`,
      "gi"
    )
  );
  for (const m of contentMatches) candidates.push(m[0]);

  if (candidates.length === 0) return html;

  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const cleaned = removeBoilerplateBlocks(c);
    const pCount = (cleaned.match(/<p[\s>]/gi) || []).length;
    const len = stripHtml(cleaned).length;
    const score = pCount * 1000 + len;
    if (score > bestScore) {
      best = cleaned;
      bestScore = score;
    }
  }
  return best;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  // configurable excerpt length (fair-use capped)
  const maxParam = req.nextUrl.searchParams.get("max");
  const maxChars = Math.max(600, Math.min(4000, maxParam ? parseInt(maxParam, 10) || 1200 : 1200));
  try {
    const res = await fetchWithTimeout(url, { redirect: "follow" }, 10000);
    if (!res.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  const html = await res.text();

  // Heuristic extraction of main content (simple and dependency-free)
  let extracted: { title?: string; byline?: string; content?: string } = {};
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    extracted.title = getMeta(html, "og:title") || getMeta(html, "twitter:title") || titleMatch?.[1];
    // Byline detection from common meta tags and simple JSON-LD patterns
    const bylineMeta =
      getMeta(html, "author") ||
      getMeta(html, "article:author") ||
      getMeta(html, "twitter:creator") ||
      getMeta(html, "parsely-author") ||
      getMeta(html, "dc.creator") ||
      undefined;
    if (bylineMeta) {
      extracted.byline = bylineMeta.replace(/^@/, "").trim();
    } else {
      const jsonLdAuthor = html.match(/"author"\s*:\s*{[^}]*?"name"\s*:\s*"([^"]+)"/i);
      if (jsonLdAuthor?.[1]) extracted.byline = jsonLdAuthor[1];
    }
  let raw = findBestContent(html);
  raw = removeBoilerplateBlocks(raw);
  const paraMatches = Array.from(raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => stripHtml(m[1] || ""))
    .map((t) => decodeEntities(t))
    .filter((p) => {
      const words = p.trim().split(/\s+/).filter(Boolean).length;
      const punct = (p.match(/[.!?]/g) || []).length;
      if (p.length < 25) return false; // drop tiny nav crumbs
      if (words > 80 && punct === 0) return false; // likely menu/category cloud
      if (
        /(advert|advertisement|sponsored|subscribe|newsletter|cookie|consent|login|register|sign in|privacy|terms|outbrain|taboola|©)/i.test(
          p
        )
      )
        return false;
      return true;
    });
  const parasText = paraMatches.join("\n\n").trim();
  const stripped = stripHtml(raw);
  extracted.content = parasText.length > 120 ? parasText : decodeEntities(stripped);

  const excerpt = extracted.content ? trimToSentences(extracted.content, maxChars) : undefined;
    const siteName = getMeta(html, "og:site_name");
    const published =
      getMeta(html, "article:published_time") ||
      getMeta(html, "og:updated_time") ||
      getMeta(html, "date") ||
      getMeta(html, "pubdate") ||
      undefined;
    const wordCount = extracted.content ? extracted.content.split(/\s+/).filter(Boolean).length : undefined;

    return NextResponse.json({
      url,
      title: extracted.title,
      byline: extracted.byline,
      excerpt,
      siteName: siteName,
      publishedAt: published,
      wordCount,
      // do not return full content to avoid copyright issues
    });
  } catch (e: unknown) {
    const status = (e && typeof e === "object" && (e as { name?: string }).name === "AbortError") ? 504 : 500;
    return NextResponse.json({ error: "article-extract-failed" }, { status });
  }
}
