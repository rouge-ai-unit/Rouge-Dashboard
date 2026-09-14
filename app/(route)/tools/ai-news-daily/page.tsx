"use client";

// AI News Daily — a prompt to run in a public LLM instead of a custom news feed.
// The previous feed implementation is kept in components/ai-news-daily/LegacyNewsFeed.tsx.

import { useEffect, useState } from "react";
import PromptLauncher from "@/components/PromptLauncher";

const buildNewsPrompt = (date: string) => `You are a research analyst for Rouge, a venture capital firm investing in AI and AgTech.

Today is ${date}. Search the web for the most important news from the last 24 hours and write a daily briefing.

Cover these sections:
1. AI — major model releases, product launches, research breakthroughs, policy and regulation.
2. AgTech & Food Tech — new technologies, company news, adoption in agriculture.
3. Funding & Deals — notable venture rounds, M&A and IPOs in AI or AgTech (include amount, stage and lead investors when known).
4. Asia focus — anything significant from Southeast Asia, Japan, Korea, China or India.

For each item:
- A one-line headline
- 2 lines on why it matters for an early-stage VC investor
- The source name and a direct link

Rules:
- Only include news from the last 24 hours, and only from credible sources. Do not invent links.
- 3 to 5 items per section, most important first. Skip a section if there is nothing notable.
- End with "Top 3 takeaways" — the three things our team should pay attention to today.`;

export default function AiNewsDailyPage() {
  const [date, setDate] = useState("today");

  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-US", { dateStyle: "long" }));
  }, []);

  return (
    <PromptLauncher
      title="AI News Daily"
      description="Get today's AI and AgTech briefing from a public LLM. Copy the prompt or open it directly in ChatGPT, Claude, Gemini or Grok."
      prompt={buildNewsPrompt(date)}
    />
  );
}
