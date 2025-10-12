'use client';

// ============================================================================
// SENTIMENT ANALYZER TOOL - REDESIGNED
// Modern, enterprise-grade sentiment analysis with advanced UI/UX
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Search, TrendingUp, TrendingDown, Minus, ExternalLink, 
  History, BarChart3, Filter, Download, RefreshCw, Sparkles,
  Clock, Calendar, Globe, Brain, Zap, AlertCircle, CheckCircle2,
  XCircle, Info, ChevronDown, ChevronUp, SortAsc, SortDesc, Grid3x3, List
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  SentimentArticle, 
  SearchSentimentResponse, 
  GetUsageResponse,
  GetHistoryResponse,
  SENTIMENT_COLORS,
  SENTIMENT_ICONS 
} from '@/types/sentiment-analyzer';

export default function SentimentAnalyzerTool() {
  const { data: session } = useSession();
  
  // State management
  const [companyQuery, setCompanyQuery] = useState('');
  const [country, setCountry] = useState('');
  const [aiModel, setAiModel] = useState<'gemini' | 'deepseek'>('gemini');
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<SentimentArticle[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [usage, setUsage] = useState({ count: 0, limit: 100, remaining: 100 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'sentiment'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const articlesPerPage = viewMode === 'grid' ? 9 : 6;

  // Fetch usage on mount
  useEffect(() => {
    fetchUsage();
    fetchSearchHistory();
  }, []);

  // Fetch API usage
  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/sentiment-analyzer/usage');
      const data: GetUsageResponse = await response.json();
      
      if (data.success) {
        setUsage({
          count: data.count,
          limit: data.limit,
          remaining: data.remaining,
        });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  // Fetch search history
  const fetchSearchHistory = async () => {
    try {
      const response = await fetch('/api/sentiment-analyzer/history?limit=10');
      const data: GetHistoryResponse = await response.json();
      
      if (data.success) {
        const uniqueCompanies = Array.from(
          new Set(data.history.map(h => h.companyQuery))
        );
        setSearchHistory(uniqueCompanies);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyQuery.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    if (usage.remaining <= 0) {
      toast.error('Daily limit reached. Please try again tomorrow.');
      return;
    }

    setLoading(true);
    setArticles([]);
    setCurrentPage(1);

    try {
      const response = await fetch('/api/sentiment-analyzer/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyQuery, country, aiModel }),
      });

      const data: SearchSentimentResponse = await response.json();

      if (data.success) {
        setArticles(data.articles);
        toast.success(`Analyzed ${data.count} articles successfully!`);
        fetchUsage();
        fetchSearchHistory();
      } else {
        toast.error(data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle history click
  const handleHistoryClick = (company: string) => {
    setCompanyQuery(company);
  };

  // Clear search history
  const clearHistory = async () => {
    try {
      const response = await fetch('/api/sentiment-analyzer/history', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSearchHistory([]);
        toast.success('Search history cleared successfully');
      } else {
        toast.error(data.message || 'Failed to clear history');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('An error occurred while clearing history');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (articles.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Company', 'Title', 'Sentiment', 'Reasoning', 'Link', 'Date'];
    const rows = articles.map(a => [
      a.companyQuery,
      a.title,
      a.sentiment,
      a.reasoning,
      a.link,
      new Date(a.createdAt).toISOString().split('T')[0]
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentiment-analysis-${companyQuery}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported to CSV');
  };

  // Filter and sort articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = articles;

    // Filter by sentiment
    if (filterSentiment !== 'all') {
      filtered = filtered.filter(a => a.sentiment === filterSentiment);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const sentimentOrder = { positive: 3, neutral: 2, negative: 1 };
        const scoreA = sentimentOrder[a.sentiment];
        const scoreB = sentimentOrder[b.sentiment];
        return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      }
    });

    return filtered;
  }, [articles, filterSentiment, sortBy, sortOrder]);

  // Pagination
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = filteredAndSortedArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(filteredAndSortedArticles.length / articlesPerPage);

  // Sentiment stats
  const sentimentStats = {
    positive: articles.filter(a => a.sentiment === 'positive').length,
    negative: articles.filter(a => a.sentiment === 'negative').length,
    neutral: articles.filter(a => a.sentiment === 'neutral').length,
    total: articles.length,
  };

  const usagePercentage = (usage.count / usage.limit) * 100;
  const usageColor = usagePercentage > 90 ? 'text-red-500' : usagePercentage > 70 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            Sentiment Analyzer
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered company sentiment analysis from recent news articles
          </p>
        </div>
        
        {/* Usage Badge */}
        <Card className="w-full md:w-auto">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${usageColor}`}>
                {usage.remaining}
              </div>
              <div className="text-sm text-muted-foreground">
                <div>searches left</div>
                <div className="text-xs">of {usage.limit} daily</div>
              </div>
            </div>
            <Progress value={usagePercentage} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Search Form */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Company
          </CardTitle>
          <CardDescription>
            Enter a company name and select your preferences to analyze sentiment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Company Input */}
              <div className="w-full">
                <Input
                  placeholder="Enter company name (e.g., Apple, Tesla, Microsoft)"
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  disabled={loading}
                  className="h-12 text-base"
                />
              </div>

              {/* Second Row: Country, AI Model, Search Button */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Country Input */}
                <div className="md:col-span-3">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Country (e.g., US, UK, India) or leave blank for Worldwide"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={loading}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                {/* AI Model Selector */}
                <div className="md:col-span-3">
                  <Select value={aiModel} onValueChange={(v) => setAiModel(v as 'gemini' | 'deepseek')} disabled={loading}>
                    <SelectTrigger className="h-11">
                      <div className="flex items-center gap-2">
                        {aiModel === 'gemini' ? (
                          <>
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span>Gemini AI</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 text-purple-500" />
                            <span>DeepSeek AI</span>
                          </>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-500" />
                          <span>Gemini AI</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="deepseek">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          <span>DeepSeek AI</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Button */}
                <div className="md:col-span-6">
                  <Button 
                    type="submit" 
                    disabled={loading || usage.remaining <= 0}
                    className="w-full h-11"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Analyze Sentiment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {articles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{sentimentStats.total}</div>
                      <div className="text-xs text-muted-foreground">Total Articles</div>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{sentimentStats.positive}</div>
                      <div className="text-xs text-muted-foreground">Positive</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-600">{sentimentStats.negative}</div>
                      <div className="text-xs text-muted-foreground">Negative</div>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-500/10 border-gray-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-600">{sentimentStats.neutral}</div>
                      <div className="text-xs text-muted-foreground">Neutral</div>
                    </div>
                    <Minus className="h-8 w-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Buttons */}
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        variant={filterSentiment === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterSentiment('all')}
                        className="h-8"
                      >
                        All ({articles.length})
                      </Button>
                      <Button
                        variant={filterSentiment === 'positive' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterSentiment('positive')}
                        className="h-8 text-green-600 hover:text-green-600"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Positive ({sentimentStats.positive})
                      </Button>
                      <Button
                        variant={filterSentiment === 'negative' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterSentiment('negative')}
                        className="h-8 text-red-600 hover:text-red-600"
                      >
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Negative ({sentimentStats.negative})
                      </Button>
                      <Button
                        variant={filterSentiment === 'neutral' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterSentiment('neutral')}
                        className="h-8 text-gray-600 hover:text-gray-600"
                      >
                        <Minus className="h-3 w-3 mr-1" />
                        Neutral ({sentimentStats.neutral})
                      </Button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        variant={sortBy === 'date' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (sortBy === 'date') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('date');
                            setSortOrder('desc');
                          }
                        }}
                        className="h-8"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Date
                        {sortBy === 'date' && (
                          sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                      <Button
                        variant={sortBy === 'sentiment' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (sortBy === 'sentiment') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('sentiment');
                            setSortOrder('desc');
                          }
                        }}
                        className="h-8"
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Sentiment
                        {sortBy === 'sentiment' && (
                          sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Mode */}
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 w-8 p-0"
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-8 w-8 p-0"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Export */}
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Articles Grid/List */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
              {currentArticles.map((article) => (
                <Card 
                  key={article.id} 
                  className={`group hover:shadow-xl transition-all duration-300 border-l-4 ${
                    article.sentiment === 'positive' ? 'border-l-green-500 hover:border-l-green-600' :
                    article.sentiment === 'negative' ? 'border-l-red-500 hover:border-l-red-600' :
                    'border-l-gray-500 hover:border-l-gray-600'
                  }`}
                >
                  <CardHeader className="pb-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="relative group/badge">
                        <Badge 
                          className={`${SENTIMENT_COLORS[article.sentiment]} cursor-help transition-all`}
                        >
                          {article.sentiment === 'positive' && <TrendingUp className="h-3 w-3 mr-1" />}
                          {article.sentiment === 'negative' && <TrendingDown className="h-3 w-3 mr-1" />}
                          {article.sentiment === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
                          {article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)}
                        </Badge>
                        {/* Tooltip */}
                        <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all z-50">
                          {article.sentiment === 'positive' && '✅ Positive sentiment indicates favorable news, achievements, or growth'}
                          {article.sentiment === 'negative' && '⚠️ Negative sentiment indicates criticism, problems, or concerns'}
                          {article.sentiment === 'neutral' && 'ℹ️ Neutral sentiment indicates factual reporting without clear bias'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setExpandedCard(expandedCard === article.id ? null : article.id)}
                      >
                        {expandedCard === article.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    <CardTitle className="text-base leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {article.snippet && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {article.snippet}
                      </p>
                    )}
                    
                    {expandedCard === article.id && (
                      <div className="bg-muted/50 p-3 rounded-lg space-y-2 border border-border/50">
                        <div className="flex items-start gap-2">
                          <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                            <Brain className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold mb-1">AI Analysis</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {article.reasoning}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <Calendar className="h-3 w-3" />
                          {new Date(article.createdAt).toISOString().split('T')[0]}
                        </div>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      onClick={() => window.open(article.link, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Read Full Article
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Search History */}
            {searchHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Recent Searches
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {searchHistory.map((company, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryClick(company)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {company}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <Search className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <strong className="text-foreground">Search</strong>
                    <p className="text-xs">We find recent news articles about the company</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <Brain className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <strong className="text-foreground">Analyze</strong>
                    <p className="text-xs">AI analyzes sentiment from article content</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <BarChart3 className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <strong className="text-foreground">Results</strong>
                    <p className="text-xs">View sentiment breakdown with reasoning</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && articles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-primary/10 rounded-full p-6 mb-4">
              <Search className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Enter a company name above to start analyzing sentiment from recent news articles. 
              Get insights powered by AI in seconds.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCompanyQuery('Apple')}>
                Try Apple
              </Button>
              <Button variant="outline" onClick={() => setCompanyQuery('Tesla')}>
                Try Tesla
              </Button>
              <Button variant="outline" onClick={() => setCompanyQuery('Microsoft')}>
                Try Microsoft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
