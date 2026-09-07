'use client';

// ============================================================================
// AI LIST — a maintained directory of the team's external AI assistants.
// Static list (kept in sync with `ai list.txt`). No API, no persistence.
// ============================================================================

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bot, ExternalLink } from 'lucide-react';

type Platform = 'ChatGPT' | 'Gemini';

interface AiEntry {
  title: string;
  platform: Platform;
  url: string;
  description?: string;
}

const AI_LIST: AiEntry[] = [
  {
    title: 'VC Associate',
    platform: 'ChatGPT',
    description: 'Lead finding & LinkedIn drafting',
    url: 'https://chatgpt.com/g/g-6a442a58cbcc8191baf5d6cbff6e3179-vc-associate',
  },
  {
    title: 'Agtech Company Finder',
    platform: 'Gemini',
    description: 'Finding AgTech VCs and startups',
    url: 'https://gemini.google.com/gem/1pZJnDqtA9h0QGH7dKvoyxlO1NKtbsDUW?usp=sharing',
  },
  {
    title: 'Leads Company Filter',
    platform: 'Gemini',
    description:
      'Portfolio screening — built by Henry during the recent AI class; Supratik plans to develop this further',
    url: 'https://gemini.google.com/gem/95013d6db181?usp=sharing',
  },
  {
    title: 'valuation tool',
    platform: 'Gemini',
    url: 'https://gemini.google.com/gem/0897810011d0?usp=sharing',
  },
  {
    title: 'Prompt Generator',
    platform: 'Gemini',
    url: 'https://gemini.google.com/gem/1iSM1UEd4gGPFlBlUXXXmXUE0Zq5p_3mD?usp=sharing',
  },
];

export default function AiListTool() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bot className="h-6 w-6 text-primary" />
          AI List
          <Badge variant="secondary" className="ml-1">Beta</Badge>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Active Gems &amp; GPTs the team maintains for VC work. Each one opens in a new tab.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {AI_LIST.map((ai) => (
          <Card key={ai.url} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{ai.title}</CardTitle>
                <Badge variant="outline" className="shrink-0">{ai.platform}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              {ai.description && (
                <p className="text-muted-foreground text-sm">{ai.description}</p>
              )}
              <Button asChild variant="secondary" className="w-fit">
                <a href={ai.url} target="_blank" rel="noopener noreferrer">
                  Open
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
