import React from 'react';
import type { Lead } from '@/types/ai-outreach-agent';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeadCardProps {
  lead: Lead;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{lead.name}</CardTitle>
          <Badge variant="outline">{lead.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Why they&apos;re relevant:</h4>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{lead.relevance}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Suggested opening:</h4>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{lead.outreach_suggestion}</p>
        </div>
      </CardContent>
    </Card>
  );
};