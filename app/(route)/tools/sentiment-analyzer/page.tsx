// ============================================================================
// SENTIMENT ANALYZER PAGE
// Enterprise-grade company sentiment analysis tool
// ============================================================================

"use client";

import SentimentAnalyzerTool from '@/components/SentimentAnalyzerTool';
import { ToolPageWrapper } from '@/components/guards';

export default function SentimentAnalyzerPage() {
  return (
    <ToolPageWrapper 
      allowedRoles={["admin", "leader", "co-leader"]}
      toolName="Sentiment Analyzer"
    >
      <div className="min-h-screen bg-background">
        <SentimentAnalyzerTool />
      </div>
    </ToolPageWrapper>
  );
}
