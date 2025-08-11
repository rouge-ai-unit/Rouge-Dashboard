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

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 8000) {
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

function extractOg(html: string) {
  const getMeta = (prop: string) => {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const m = html.match(regex);
    return m ? m[1] : undefined;
  };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return {
    title: getMeta("og:title") || getMeta("twitter:title") || titleMatch?.[1],
    description: getMeta("og:description") || getMeta("twitter:description"),
    image: getMeta("og:image") || getMeta("twitter:image"),
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout(url, { redirect: "follow" }, 9000);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load" }, { status: 502 });
    }
    const html = await res.text();
    const data = extractOg(html);

    // Resolve relative image URLs
    if (data.image && !/^https?:\/\//i.test(data.image)) {
      try {
        data.image = new URL(data.image, url).toString();
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      url,
      ...data,
    });
  } catch (e: unknown) {
    const status = (e && typeof e === "object" && (e as { name?: string }).name === "AbortError") ? 504 : 500;
    return NextResponse.json({ error: "preview-failed" }, { status });
  }
}
