// ============================================================================
// SENTIMENT ANALYZER PAGE
// Enterprise-grade company sentiment analysis tool
// ============================================================================

import { Metadata } from 'next';
import SentimentAnalyzerTool from '@/components/SentimentAnalyzerTool';

export const metadata: Metadata = {
  title: 'Company Sentiment Analyzer | Rouge Dashboard',
  description: 'Analyze public sentiment about companies using AI-powered news analysis. Get insights from recent articles and news coverage.',
  keywords: ['sentiment analysis', 'company analysis', 'news analysis', 'AI', 'business intelligence'],
};

export default function SentimentAnalyzerPage() {
  return (
    <div className="min-h-screen bg-background">
      <SentimentAnalyzerTool />
    </div>
  );
}
