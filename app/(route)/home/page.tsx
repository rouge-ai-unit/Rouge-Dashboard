"use client";

// app/(route)/home/page.tsx

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Removed ChatbotWidget to avoid duplicate chat icons
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/ui/tooltip";
import { Skeleton } from "../../../components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "../../../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Separator } from "../../../components/ui/separator";
import { 
  Loader2, Wrench, Rocket, Info, Sparkles, Search, BarChart2, 
  Newspaper, Briefcase, Lightbulb, Grid3X3, List, Filter, 
  SortAsc, SortDesc, Heart, Share2, Download, RefreshCw,
  TrendingUp, Clock, Users, Eye, Star, Zap, Shield,
  CheckCircle, AlertCircle, Calendar, Tag, ExternalLink,
  ChevronDown, X, Settings, Bookmark, ArrowUpRight,
  FileText, UserCog, Target, GraduationCap, BrainCircuit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tool = {
  id: string;
  name: string;
  href: string;
  description: string;
  unit?: string | null;
  status: string;
  progress?: number | null;
  criticality?: string | null;
  owner?: string | null;
  eta?: string | null;
  version?: string;
};


type ViewMode = "grid" | "list";


export default function Page() {
  const { status } = useSession();
  const router = useRouter();

  // All hooks must be called unconditionally
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [favorites, setFavorites] = useState<string[]>([]);
  // Removed refresh functionality as requested

  // Static tools data
  const staticTools: Tool[] = [
    {
      id: "/tools/ai-tools-request-form",
      name: "AI Tools Request Form",
      href: "/tools/ai-tools-request-form",
      description: "Streamline your workflow by requesting custom AI tools tailored to your specific needs. Submit detailed requirements, specify use cases, and collaborate with our AI specialists to develop cutting-edge solutions that enhance productivity and drive innovation in your projects.",
      status: "Available",
    },
    {
      id: "/tools/work-tracker",
      name: "Work Tracker",
      href: "/tools/work-tracker",
      description: "Comprehensive project management solution with advanced tracking capabilities. Monitor task progress, set milestones, track time spent, generate detailed reports, and maintain accountability across teams. Features include real-time updates, customizable dashboards, and integration with popular productivity platforms.",
      status: "Available",
    },
    {
      id: "/tools/ai-news-daily",
      name: "Ai News Daily",
      href: "/tools/ai-news-daily",
      description: "Stay ahead of the curve with curated daily AI news and insights. Get personalized news feeds, trending topics, expert analysis, and breaking developments in artificial intelligence. Features include smart filtering, bookmarking, sharing capabilities, and notifications for topics that matter most to you.",
      status: "Available",
    },
    {
      id: "/tools/startup-seeker",
      name: "Agritech Startup Seeker",
      href: "/tools/startup-seeker",
      description: "Discover innovative agritech startups revolutionizing agriculture. Explore comprehensive startup profiles, funding information, technology stacks, market impact, and investment opportunities. Connect with founders, track industry trends, and identify potential partners or acquisition targets in the growing agritech ecosystem.",
      status: "Available",
    },
    {
      id: "/tools/agritech-universities",
      name: "Agritech Universities",
      href: "/tools/agritech-universities",
      description: "Explore leading universities driving agritech research and innovation. Access detailed profiles of academic programs, research centers, faculty expertise, ongoing projects, and collaboration opportunities. Find potential partners for research, internships, or technology transfer initiatives in agricultural technology.",
      status: "Available",
    },
    {
      id: "/tools/content-idea-automation",
      name: "Content Idea Automation",
      href: "/tools/content-idea-automation",
      description: "Revolutionize your content creation process with AI-powered idea generation. Generate topic suggestions, content outlines, SEO-optimized headlines, and creative concepts based on your niche and audience. Features include trend analysis, competitor research, and automated content calendars to maintain consistent publishing schedules.",
      status: "Available",
    },
    {
      id: "/tools/cold-connect-automator",
      name: "Cold Connect Automator",
      href: "/tools/cold-connect-automator",
      description: "Automate personalized cold outreach campaigns with AI-powered message generation. Sync contacts with Notion CRM or Google Sheets, personalize messages with recipient context, and track campaign performance. Boost your productivity and never miss a follow-up.",
      status: "Available",
    },
    {
      id: "/tools/ai-outreach-agent",
      name: "AI Outreach Agent",
      href: "/tools/ai-outreach-agent",
      description: "Generate personalized outreach lists with strategic leads and tailored messaging for your business development. Create comprehensive lead portfolios with AI-powered analysis, advanced filtering, export capabilities, and lead management features. Features include real-time statistics, progress tracking, and enterprise-grade lead organization.",
      status: "Available",
    },
    {
      id: "/agtech-events",
      name: "AgTech Event Finder",
      href: "/agtech-events",
      description: "Discover upcoming AgTech startup conventions, expos, and networking events powered by AI. Search by location, filter by price, export results to CSV, and never miss an opportunity to connect with the agricultural technology ecosystem. Features advanced filters, multiple view modes, and real-time event discovery.",
      status: "Available",
    },
    {
      id: "/tools/sentiment-analyzer",
      name: "Sentiment Analyzer",
      href: "/tools/sentiment-analyzer",
      description: "Analyze public sentiment about companies using AI-powered news analysis. Search recent articles, get sentiment insights (positive, negative, neutral), and understand public perception. Features include real-time analysis, search history, usage tracking, and detailed reasoning for each sentiment classification.",
      status: "Available",
    },
  ];

  // Set static tools on mount
  useEffect(() => {
    setTools(staticTools);
    setLoading(false);
    setError(null);
  }, []);
  // Removed auto-refresh functionality

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);





  // Removed Tools In Progress logic as requested
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper Functions
  const getToolIcon = useCallback((toolName: string, category: string) => {
    const iconClass = "w-5 h-5 sm:w-6 sm:h-6";
    
    if (category === "analytics") return <BarChart2 className={`${iconClass} text-emerald-400`} />;
    if (category === "news") return <Newspaper className={`${iconClass} text-blue-400`} />;
    if (category === "productivity") return <Briefcase className={`${iconClass} text-amber-400`} />;
    if (category === "content") return <Lightbulb className={`${iconClass} text-orange-400`} />;
    if (category === "ai") return <Zap className={`${iconClass} text-purple-400`} />;
    if (category === "security") return <Shield className={`${iconClass} text-red-400`} />;
    
    // Fallback based on tool name
    if (/analytics|chart|data/i.test(toolName)) return <BarChart2 className={`${iconClass} text-emerald-400`} />;
    if (/news|article/i.test(toolName)) return <Newspaper className={`${iconClass} text-blue-400`} />;
    if (/work|tracker|task/i.test(toolName)) return <Briefcase className={`${iconClass} text-amber-400`} />;
    if (/content|idea|automation/i.test(toolName)) return <Lightbulb className={`${iconClass} text-orange-400`} />;
    
    return <Rocket className={`${iconClass} text-emerald-400`} />;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "Available": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Beta": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "In Progress": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Coming Soon": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Maintenance": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  }, []);

  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "text-emerald-400";
      case "Intermediate": return "text-amber-400";
      case "Advanced": return "text-red-400";
      default: return "text-gray-400";
    }
  }, []);

  const isToolNew = useCallback((createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }, []);

  const isToolUpdated = useCallback((updatedAt: string, createdAt: string) => {
    const updated = new Date(updatedAt);
    const created = new Date(createdAt);
    const diff = updated.getTime() - created.getTime();
    return diff > 24 * 60 * 60 * 1000; // Updated more than 24 hours after creation
  }, []);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  const toggleFavorite = useCallback((toolId: string) => {
    setFavorites(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  }, []);



  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Data Fetching - Removed, using static data now

  // Auto-refresh - Removed, using static data

  // Initial fetch - Removed, using static data

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case '1':
            e.preventDefault();
            setViewMode('grid');
            break;
          case '2':
            e.preventDefault();
            setViewMode('list');
            break;
        }
      }
      if (e.key === 'Escape') {
        setSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('tool-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('tool-favorites', JSON.stringify(favorites));
  }, [favorites]);


  // Only filter by search and status=Available
  const filteredAndSortedTools = useMemo(() => {
    return tools.filter(tool => {
      const statusMatch = tool.status === "Available";
      if (!debouncedSearch) return statusMatch;
      const searchMatch = tool.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        tool.description.toLowerCase().includes(debouncedSearch.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [tools, debouncedSearch]);

  const availableTools = filteredAndSortedTools;
  const betaTools = tools.filter(t => t.status === "Beta");
  const inProgressTools = tools.filter(t =>
    t.status === "In Progress" || t.status === "Coming Soon" || t.status === "Maintenance"
  );

  // Retry handler - Removed, using static data





  // Tool Card Component
  const ToolCard = React.memo(({ tool, index }: { tool: Tool; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group ${viewMode === 'list' ? 'col-span-full' : ''}`}
    >
      <Card
        className={`
          relative overflow-hidden bg-gray-900/50 backdrop-blur-sm border-gray-700/50
          hover:bg-gray-900/70 hover:border-gray-600/50 hover:shadow-2xl hover:shadow-blue-500/10
          transition-all duration-300 group h-auto cursor-pointer
          ${viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'}
          ${viewMode === 'grid' ? 'min-h-[200px] flex flex-col justify-between' : ''}
          focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50
        `}
        role="article"
        aria-labelledby={`tool-${tool.id}-title`}
      >
  <CardHeader className={`${viewMode === 'list' ? 'flex-shrink-0 w-64' : ''} pb-1`}> {/* Even less bottom padding */}
          <div className="flex items-start gap-2">
            {getToolIcon(tool.name, "")}
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex min-w-0 w-full items-start">
                <CardTitle
                  id={`tool-${tool.id}-title`}
                  className="text-lg sm:text-xl text-white font-bold group-hover:text-blue-400 transition-colors min-w-0 flex-1 break-words whitespace-normal leading-tight"
                >
                  {tool.name}
                </CardTitle>
                <div className="flex items-start gap-1 flex-shrink-0 ml-2 mt-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-800"
                          onClick={() => toggleFavorite(tool.id)}
                          tabIndex={0}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites.includes(tool.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400 hover:text-red-400'
                            }`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {favorites.includes(tool.id) ? 'Remove from favorites' : 'Add to favorites'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div> {/* Remove mt-1 for no extra gap */}
                <Badge className={`text-xs ${getStatusColor(tool.status)}`}>
                  {tool.status}
                </Badge>
                {tool.version && <span className="text-xs text-gray-400">v{tool.version}</span>}
              </div>
            </div>
          </div>
        </CardHeader>

  <CardContent className={`flex-1 ${viewMode === 'list' ? 'flex flex-col justify-between' : ''} pt-0`}> {/* Remove top padding */}
          <div>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-4 mb-2">
              {tool.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Click to explore</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4 pt-3 border-t border-gray-700/50"> {/* Reduce margin-top */}
            {tool.status === "Available" ? (
              <Link href={tool.href} className="block w-full">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 group focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label={`Open ${tool.name}`}
                >
                  Open Tool
                  <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Button disabled className="w-full bg-gray-700 text-gray-400 cursor-not-allowed">
                {tool.status}
                {tool.status === "In Progress" && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  ));

  ToolCard.displayName = "ToolCard";

  return (
    <TooltipProvider>
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>
      
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Sparkles className="w-8 h-7 text-blue-400 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 bg-blue-400/20 rounded-full animate-ping" />
              </div>
              <h1 className="text-4xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Rouge Tools Hub
              </h1>
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover and explore cutting-edge AI tools designed to supercharge your productivity
            </p>
            
            {/* Stats Bar removed as requested */}
          </motion.div>

          {/* Search and Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
            id="main-content"
            role="main"
            aria-labelledby="tools-section"
          >
            {/* Search Bar + Controls Row (aligned) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Search Bar */}
              <div className="relative w-full max-w-2xl">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center select-none pointer-events-none">
                  <Search className="w-5 h-5 text-white font-normal align-middle" />
                </span>
                <Input
                  ref={searchInputRef}
                  placeholder="Search tools... (Ctrl+K)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 pr-20 py-4 text-lg border-gray-700/50 text-white placeholder-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  aria-label="Search tools"
                  role="searchbox"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 select-none">
                  <span className="text-xs text-white">{filteredAndSortedTools.length} found</span>
                </span>
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-700"
                    onClick={() => setSearch("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Controls Row (aligned right) */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* View Mode Toggle */}


              </div>
            </div>


          </motion.div>



          {/* Content */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}
              >
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-gray-800/30 border-gray-700/50">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-6 rounded bg-gray-700" />
                        <Skeleton className="h-6 w-32 rounded bg-gray-700" />
                      </div>
                      <Skeleton className="h-4 w-16 rounded bg-gray-700 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2 rounded bg-gray-700" />
                      <Skeleton className="h-4 w-3/4 mb-2 rounded bg-gray-700" />
                      <Skeleton className="h-4 w-1/2 mb-4 rounded bg-gray-700" />
                      <Skeleton className="h-4 w-24 rounded bg-gray-700 mb-4" />
                      <Skeleton className="h-10 w-full rounded bg-gray-700" />
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12"
              >
                <Alert variant="destructive" className="max-w-md mx-auto bg-red-900/20 border-red-500/30 flex flex-col items-center text-center p-6">
                  <div className="flex flex-col items-center w-full">
                    <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
                    <AlertTitle className="text-lg font-bold mb-1">Error Loading Tools</AlertTitle>
                    <AlertDescription className="mb-4 text-base text-gray-300">
                      {error}
                    </AlertDescription>
                  </div>
                </Alert>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Tabs defaultValue="available" className="w-full" aria-labelledby="tools-section">
                  <h2 id="tools-section" className="sr-only">Tools Collection</h2>
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border border-gray-700/50 rounded-lg p-1">
                    <TabsTrigger 
                      value="available" 
                      className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                      aria-label={`${availableTools.length} available tools`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Available ({availableTools.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="beta" 
                      className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                      aria-label={`${betaTools.length} beta tools`}
                    >
                      <Zap className="w-4 h-4" />
                      Beta ({betaTools.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="upcoming" 
                      className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                      aria-label={`${inProgressTools.length} upcoming tools`}
                    >
                      <Clock className="w-4 h-4" />
                      Upcoming ({inProgressTools.length})
                    </TabsTrigger>

                  </TabsList>

                  <TabsContent value="available" className="mt-6">
                    {availableTools.length === 0 ? (
                      <div className="text-center py-12 col-span-full">
                        <div className="max-w-md mx-auto">
                          <Rocket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-400 mb-2">No tools found</h3>
                          <p className="text-gray-500 mb-4">
                            {debouncedSearch 
                              ? `No tools match "${debouncedSearch}". Try a different search term.`
                              : "No available tools at the moment. Check back later!"
                            }
                          </p>
                          {debouncedSearch && (
                            <Button 
                              variant="outline" 
                              onClick={() => setSearch("")}
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              Clear search
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`grid gap-6 ${
                        viewMode === 'grid'
                          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                          : 'grid-cols-1'
                      }`} style={viewMode === 'grid' ? { alignItems: 'stretch' } : {}}>
                        {availableTools.map((tool, index) => (
                          <ToolCard key={tool.id} tool={tool} index={index} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="beta" className="mt-6">
                    {betaTools.length === 0 ? (
                      <div className="text-center py-12">
                        <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No beta tools found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                      </div>
                    ) : (
                      <div className={`grid gap-6 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                          : 'grid-cols-1'
                      }`}>
                        {betaTools.map((tool, index) => (
                          <ToolCard key={tool.id} tool={tool} index={index} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="upcoming" className="mt-6">
                    {inProgressTools.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No upcoming tools found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                      </div>
                    ) : (
                      <div className={`grid gap-6 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                          : 'grid-cols-1'
                      }`}>
                        {inProgressTools.map((tool, index) => (
                          <ToolCard key={tool.id} tool={tool} index={index} />
                        ))}
                      </div>
                    )}
                  </TabsContent>



                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center text-gray-500 text-sm"
          >
            <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
              <span>Press Ctrl+K to search</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Ctrl+1/2 to switch view</span>
            </div>
            <p className="text-gray-400 text-xs">
              Built with ❤️ for productivity and innovation
            </p>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}

