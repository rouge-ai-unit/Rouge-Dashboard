'use client';

// ============================================================================
// AI LIST — a maintained directory of the team's external AI assistants.
// Data lives in lib/ai-list.ts (kept in sync with `ai list.txt`).
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
import { AI_LIST } from '@/lib/ai-list';

export default function AiListTool() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bot className="h-6 w-6 text-primary" />
          AI List
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
