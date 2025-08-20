"use client";

// Hydration-safe LastUpdatedFooter component
import { Switch } from "../../../components/ui/switch";
import { useEffect as useClientEffect, useState as useClientState } from "react";

function LastUpdatedFooter({ lastRefresh, autoRefresh, setAutoRefresh }: {
  lastRefresh: Date;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
}) {
  const [timeAgo, setTimeAgo] = useClientState("just now");

  useClientEffect(() => {
    function updateTimeAgo() {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
      if (diff < 60) setTimeAgo("just now");
      else if (diff < 3600) setTimeAgo(`${Math.floor(diff / 60)} min ago`);
      else if (diff < 86400) setTimeAgo(`${Math.floor(diff / 3600)} hr ago`);
      else setTimeAgo(`${Math.floor(diff / 86400)}d ago`);
    }
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
      <span className="text-xs text-gray-400">Last updated: {timeAgo}</span>
      <button
        type="button"
        className={`flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 select-none ${autoRefresh ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'}`}
        aria-pressed={autoRefresh}
        onClick={() => setAutoRefresh(!autoRefresh)}
        style={{ minWidth: 110 }}
      >
        <span className={`inline-block w-4 h-4 rounded-full border mr-1 transition-all duration-200 flex items-center justify-center ${autoRefresh ? 'bg-white border-white' : 'bg-gray-700 border-gray-500'}`}>
          {autoRefresh && (
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-600">
              <path d="M4 8l3 3 5-5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        Auto-refresh
      </button>
    </div>
  );
}

// ...existing code...
import dynamic from "next/dynamic";

// Dynamically import ChatbotWidget to avoid SSR issues
const ChatbotWidget = dynamic(() => import("../../../components/ChatbotWidget"), { ssr: false });
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  ChevronDown, X, Settings, Bookmark, ArrowUpRight
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


export default function LandingPage() {
  // Core State
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  

  // Search State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);



  // --- Tools In Progress Table Logic (cleaned) ---
  type ProgressTool = {
    name: string;
    href: string;
    unit: string | null;
    progress: number;
    criticality: string | null;
    status: string;
    owner: string | null;
    eta: string | null;
  };

  const progressTools = useMemo<ProgressTool[]>(
    () =>
      tools
        .filter((t: Tool) => ["Planning", "In Progress", "Testing"].includes(t.status))
        .map((t: Tool) => ({
          name: t.name,
          href: t.href,
          unit: t.unit ?? null,
          progress: Math.max(0, Math.min(100, Number(t.progress ?? 0))),
          criticality: t.criticality ?? null,
          status: t.status,
          owner: t.owner ?? null,
          eta: t.eta ?? null,
        })),
    [tools]
  );

  const filteredSortedProgressTools = useMemo<ProgressTool[]>(() => {
    return progressTools;
  }, [progressTools]);
  // --- End Tools In Progress Table Logic ---
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

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

  // Data Fetching
  const fetchTools = useCallback(async (showRetrying = false) => {
    if (showRetrying) setRetrying(true);
    else setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/tools", { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data: Tool[] = await res.json();
      
  // No extra validation, just set tools as returned from API
  setTools(data);
      setLastRefresh(new Date());
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred";
      setError(`Failed to load tools: ${errorMessage}`);
      console.error("Error fetching tools:", e);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchTools(true);
      }, 60000); // Refresh every 1 minute
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, fetchTools]);

  // Initial fetch
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'r':
            e.preventDefault();
            fetchTools(true);
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
  }, [fetchTools]);

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

  // Retry handler
  const handleRetry = useCallback(() => {
    fetchTools();
  }, [fetchTools]);





  // Tool Card Component
  const ToolCard = ({ tool, index }: { tool: Tool; index: number }) => (
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
          transition-all duration-300 group h-auto
          ${viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'}
          ${viewMode === 'grid' ? 'min-h-[180px] flex flex-col justify-between' : ''}
        `}
      >
  <CardHeader className={`${viewMode === 'list' ? 'flex-shrink-0 w-64' : ''} pb-1`}> {/* Even less bottom padding */}
          <div className="flex items-start gap-2">
            {getToolIcon(tool.name, "")}
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex min-w-0 w-full items-start">
                <CardTitle
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
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
              {tool.description}
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-3 pt-3 border-t border-gray-700/50"> {/* Reduce margin-top */}
            {tool.status === "Available" ? (
              <Link href={tool.href} className="block w-full">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 group">
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
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
                  className="pl-12 pr-20 py-4 text-lg border-gray-700/50 text-white placeholder-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div className="flex bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-blue-700 text-white shadow-lg font-bold" : ""}`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={`h-8 w-8 p-0 ${viewMode === "list" ? "bg-blue-700 text-white shadow-lg font-bold" : ""}`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                {/* Refresh Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchTools(true)}
                        disabled={retrying}
                        className="h-10 w-10 bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700"
                        aria-label="Refresh tools"
                      >
                        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Refresh tools (Ctrl+R)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>


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
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2 rounded bg-gray-700" />
                      <Skeleton className="h-4 w-3/4 mb-4 rounded bg-gray-700" />
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
                    <Button 
                      onClick={handleRetry}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md mt-2"
                      disabled={retrying}
                    >
                      {retrying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </>
                      )}
                    </Button>
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
                <Tabs defaultValue="available" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-gray-700/50">
                    <TabsTrigger value="available" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold">
                      <CheckCircle className="w-4 h-4" />
                      Available ({availableTools.length})
                    </TabsTrigger>
                    <TabsTrigger value="beta" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold">
                      <Zap className="w-4 h-4" />
                      Beta ({betaTools.length})
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold">
                      <Clock className="w-4 h-4" />
                      Upcoming ({inProgressTools.length})
                    </TabsTrigger>
                    <TabsTrigger value="progress" className="flex items-center gap-2 data-[state=active]:bg-yellow-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-bold">
                      <Wrench className="w-4 h-4" />
                      Tools In Progress
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="available" className="mt-6">
                    {availableTools.length === 0 ? (
                      <div className="text-center py-12">
                        <Rocket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No available tools found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
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

                  <TabsContent value="progress" className="mt-6">
                    {/* Tools In Progress Table (cleaned) */}
                    <motion.section
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.35 }}
                      className="mb-16 bg-[#232526] rounded-xl p-8 shadow-lg border border-gray-700 transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wrench className="h-6 w-6 text-yellow-400" /> Tools In Progress
                          <span className="ml-2 text-xs font-normal text-gray-400">{filteredSortedProgressTools.length} items</span>
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-green-400"><span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" /> live</span>
                        </h2>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-700">
                        <table className="w-full text-sm">
                          <thead className="bg-[#191A1A] text-gray-300 sticky top-0 z-10">
                            <tr>
                              <th className="p-3 font-semibold text-left">Name</th>
                              <th className="p-3 font-semibold text-left">Unit</th>
                              <th className="p-3 font-semibold text-left">Owner</th>
                              <th className="p-3 font-semibold text-left">ETA</th>
                              <th className="p-3 font-semibold text-left">Progress</th>
                              <th className="p-3 font-semibold text-left">Criticality</th>
                              <th className="p-3 font-semibold text-left">Status</th>
                              <th className="p-3 font-semibold text-left">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSortedProgressTools
                              .map((tool, idx) => (
                                <motion.tr key={`${tool.name}-${idx}`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.25, delay: idx * 0.03 }} className="border-b border-gray-700 hover:bg-[#1d2021]">
                                  <td className="p-3 text-white font-semibold">{tool.name}</td>
                                  <td className="p-3 text-gray-300">{tool.unit ?? "—"}</td>
                                  <td className="p-3 text-gray-300">{tool.owner ?? "—"}</td>
                                  <td className="p-3 text-gray-300">{tool.eta ?? "—"}</td>
                                  <td className="p-3">
                                    <div className="w-full bg-gray-800 rounded-full h-3 relative overflow-hidden">
                                      <div
                                        className={`h-3 rounded-full transition-all duration-500 ${tool.progress > 80 ? "bg-green-500" : tool.progress > 50 ? "bg-yellow-400" : "bg-blue-500"}`}
                                        style={{ width: `${tool.progress}%` }}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-bold">{tool.progress}%</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${(tool.criticality === "Critical" || tool.criticality === "Urgent") ? "text-red-400 border-red-400/40 bg-red-900/20" : tool.criticality === "High" ? "text-yellow-300 border-yellow-300/40 bg-yellow-900/10" : "text-blue-300 border-blue-300/40 bg-blue-900/10"}`}>{tool.criticality}</span>
                                  </td>
                                  <td className={`p-3 font-semibold ${tool.status === "In Progress" ? "text-yellow-400" : tool.status === "Testing" ? "text-green-400" : "text-blue-400"}`}>{tool.status}</td>
                                  <td className="p-3">
                                    <div className="flex justify-end">
                                      {tool.href ? (
                                        <Link href={tool.href} className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800">Open</Link>
                                      ) : (
                                        <span className="text-xs text-gray-500">—</span>
                                      )}
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            {progressTools.length === 0 && (
                              <tr>
                                <td className="p-4 text-gray-400" colSpan={8}>No tools in progress.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.section>
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
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span>Press Ctrl+K to search</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Ctrl+R to refresh</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Ctrl+1/2 to switch view</span>
            </div>
            {/* Hydration-safe last updated time */}
              <LastUpdatedFooter lastRefresh={lastRefresh} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />
          </motion.div>



        </div>
        {/* Chatbot AI Agent floating widget */}
        <ChatbotWidget />
      </div>
    </TooltipProvider>
  );
}

