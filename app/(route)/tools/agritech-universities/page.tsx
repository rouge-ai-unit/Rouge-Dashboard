"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Download,
  Search,
  University,
  Globe,
  Linkedin,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Info,
  BarChart3,
  TrendingUp,
  Building,
  MapPin,
  Star,
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Settings,
  Play,
  School,
  BookOpen,
  Activity,
  History,
  Zap
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface EnhancedUniversityData {
  id: string;
  name: string;
  location?: {
    country: string;
    city: string;
    address?: string;
  };
  contactInfo?: {
    website?: string;
    email?: string;
    phone?: string;
  };
  academicInfo?: {
    primarySpecialization?: string;
    departments?: string[];
    researchAreas?: string[];
  };
  qualityScore?: number;
  university: string;
  country: string;
  region: string;
  website: string | null;
  hasAgriculture: boolean;
  hasTto: boolean;
  ttoPageUrl: string | null;
  incubationRecord: string | null;
  linkedinSearchUrl: string;
  lastVerified: string;
  analysisNotes?: string;
}

interface ProcessingMetadata {
  totalExtracted: number;
  successfulInserts: number;
  failedInserts: number;
  averageQualityScore: number;
  processingTime: number; // Keep this to match component usage
  processingTimeMs: number;
  requestedLimit: number;
  actualLimit: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successfulCount: number;
  successRate: number;
  qualityScore?: number;
  totalProcessed: number;
}

interface ExtractionResponse {
  success: boolean;
  data: EnhancedUniversityData[];
  metadata: ProcessingMetadata;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  timestamp: string;
  version: string;
}

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
  timestamp: string;
}

interface Statistics {
  totalUniversities: number;
  averageQualityScore: number;
  countryCounts: Record<string, number>;
  topCategories: Record<string, number>;
}

interface HistoricalResult {
  id: string;
  createdAt: string;
  metadata: ProcessingMetadata;
  dataCount: number;
}

export default function AgritechUniversitiesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // ============================================================================
  // STATE MANAGEMENT - Updated for enterprise scraping
  // ============================================================================
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Configuration state
  const [universityLimit, setUniversityLimit] = useState(50);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [scrapingMode, setScrapingMode] = useState<'traditional' | 'ai' | 'hybrid'>('hybrid');
  
  // Data state
  const [results, setResults] = useState<EnhancedUniversityData[]>([]);
  const [historicalResults, setHistoricalResults] = useState<HistoricalResult[]>([]);
  const [processingMetadata, setProcessingMetadata] = useState<ProcessingMetadata | null>(null);
  
  // UI state
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<EnhancedUniversityData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("configure");
  
  // Search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Loading states
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Statistics
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  // ============================================================================
  // AUTHENTICATION & INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    } else if (sessionStatus === "authenticated") {
      loadHistoricalResults();
    }
  }, [sessionStatus, router]);

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  const loadHistoricalResults = useCallback(async () => {
    if (!session?.user) return;

    try {
      setIsLoadingHistory(true);
      const response = await fetch("/api/tools/agritech-universities?page=1&limit=50");
      
      if (response.ok) {
        const data = await response.json();
        setHistoricalResults(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load historical results:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session]);

  // ============================================================================
  // PROCESSING FUNCTIONS
  // ============================================================================

  const handleExtraction = useCallback(async () => {
    if (!session?.user || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResults([]);
    setProcessingMetadata(null);

    try {
      const loadingModeEmoji = scrapingMode === 'ai' ? '🤖' : scrapingMode === 'hybrid' ? '⚡' : '🌐';
      const loadingModeName = scrapingMode === 'ai' ? 'AI-powered' : scrapingMode === 'hybrid' ? 'Hybrid' : 'Traditional';
      toast.loading(`${loadingModeEmoji} Starting ${loadingModeName} extraction...`, { id: "extract-process" });

      const response = await fetch("/api/tools/agritech-universities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: universityLimit,
          country: selectedCountry,
          includeAnalysis,
          mode: scrapingMode
        }),
      });

      const data: ExtractionResponse | ErrorResponse = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        setError(errorData);
        toast.error(errorData.error, { id: "extract-process" });
        return;
      }

      const successData = data as ExtractionResponse;
      setResults(successData.data);
      setProcessingMetadata(successData.metadata);
      calculateStats(successData.data);
      
      const successModeEmoji = scrapingMode === 'ai' ? '🤖' : scrapingMode === 'hybrid' ? '⚡' : '🌐';
      const successModeName = scrapingMode === 'ai' ? 'AI-powered' : scrapingMode === 'hybrid' ? 'Hybrid' : 'Traditional';
      toast.success(`${successModeEmoji} ${successModeName} extraction completed! Found ${successData.data.length} universities`, { 
        id: "extract-process" 
      });

      // Switch to results tab
      setActiveTab("results");
      
      // Reload historical results to include new data
      await loadHistoricalResults();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError({
        error: errorMessage,
        code: "NETWORK_ERROR",
        timestamp: new Date().toISOString()
      });
      toast.error(errorMessage, { id: "extract-process" });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [session, universityLimit, selectedCountry, includeAnalysis, scrapingMode, isProcessing, loadHistoricalResults]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const calculateStats = useCallback((universities: EnhancedUniversityData[]) => {
    const stats = {
      totalUniversities: universities.length,
      averageQualityScore: universities.reduce((sum, uni) => sum + (uni.qualityScore || 0), 0) / universities.length,
      countryCounts: universities.reduce((acc, uni) => {
        const country = uni.location?.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topCategories: universities.reduce((acc, uni) => {
        const specialization = uni.academicInfo?.primarySpecialization || 'General';
        acc[specialization] = (acc[specialization] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    setStatistics(stats);
  }, []);

  const exportToCSV = useCallback(() => {
    if (results.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = results.map(uni => ({
      name: uni.name,
      country: uni.location?.country || '',
      city: uni.location?.city || '',
      website: uni.contactInfo?.website || '',
      email: uni.contactInfo?.email || '',
      phone: uni.contactInfo?.phone || '',
      specialization: uni.academicInfo?.primarySpecialization || '',
      qualityScore: uni.qualityScore || 0
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agritech-universities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully!");
  }, [results]);

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (searchQuery) {
      filtered = filtered.filter(uni =>
        uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uni.location?.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uni.location?.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (countryFilter && countryFilter !== 'all') {
      filtered = filtered.filter(uni => uni.location?.country === countryFilter);
    }

    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'country':
            aVal = (a.location?.country || '').toLowerCase();
            bVal = (b.location?.country || '').toLowerCase();
            break;
          case 'qualityScore':
            aVal = a.qualityScore || 0;
            bVal = b.qualityScore || 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [results, searchQuery, countryFilter, sortBy, sortOrder]);
  // ============================================================================
  // COMPONENT LIFECYCLE EFFECTS
  // ============================================================================

  useEffect(() => {
    if (session?.user) {
      loadHistoricalResults();
    }
  }, [session, loadHistoricalResults]);

  // ============================================================================
  // DIALOG HANDLERS
  // ============================================================================

  const openUniversityDialog = useCallback((university: EnhancedUniversityData) => {
    setSelectedUniversity(university);
    setIsDialogOpen(true);
  }, []);

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to access this tool.</p>
          <Button onClick={() => signIn()}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          🌱 Agritech Universities Tool
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Extract comprehensive information about agricultural technology universities worldwide 
          using our enterprise-grade scraping service.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">🔧 Configure</TabsTrigger>
          <TabsTrigger value="results">📊 Results</TabsTrigger>
          <TabsTrigger value="history">📂 History</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Extraction Configuration
              </CardTitle>
              <CardDescription>
                Configure your university data extraction parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* University Limit */}
              <div className="space-y-2">
                <Label htmlFor="university-limit">Number of Universities</Label>
                <Input
                  id="university-limit"
                  type="number"
                  min="1"
                  max="1000"
                  value={universityLimit}
                  onChange={(e) => setUniversityLimit(parseInt(e.target.value) || 50)}
                  placeholder="Enter number of universities to extract"
                />
                <p className="text-sm text-gray-500">
                  Recommended: 50-200 universities for optimal performance
                </p>
              </div>

              {/* Country Selection */}
              <div className="space-y-2">
                <Label htmlFor="country-select">Target Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌍 All Countries</SelectItem>
                    <SelectItem value="us">🇺🇸 United States</SelectItem>
                    <SelectItem value="canada">🇨🇦 Canada</SelectItem>
                    <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="germany">🇩🇪 Germany</SelectItem>
                    <SelectItem value="france">🇫🇷 France</SelectItem>
                    <SelectItem value="australia">🇦🇺 Australia</SelectItem>
                    <SelectItem value="india">🇮🇳 India</SelectItem>
                    <SelectItem value="china">🇨🇳 China</SelectItem>
                    <SelectItem value="brazil">🇧🇷 Brazil</SelectItem>
                    <SelectItem value="netherlands">🇳🇱 Netherlands</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scraping Mode Selection */}
              <div className="space-y-3">
                <Label htmlFor="scraping-mode">Scraping Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      scrapingMode === 'traditional' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setScrapingMode('traditional')}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <p className="font-medium text-sm">Traditional</p>
                        </div>
                        <p className="text-xs text-gray-600">Fast & reliable</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      scrapingMode === 'ai' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setScrapingMode('ai')}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-purple-600" />
                          <p className="font-medium text-sm">AI Enhanced</p>
                        </div>
                        <p className="text-xs text-gray-600">Smart analysis</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      scrapingMode === 'hybrid' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setScrapingMode('hybrid')}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-green-600" />
                          <p className="font-medium text-sm">Hybrid ⭐</p>
                        </div>
                        <p className="text-xs text-gray-600">Best of both</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <p className="font-medium mb-1">
                    {scrapingMode === 'ai' && '🤖 AI Mode:'}
                    {scrapingMode === 'traditional' && '🌐 Traditional Mode:'}
                    {scrapingMode === 'hybrid' && '⚡ Hybrid Mode (Recommended):'}
                  </p>
                  <p>
                    {scrapingMode === 'ai' && 'Uses real-time web search with AI intelligence similar to ChatGPT/Claude. Provides verified, cross-validated university data with advanced quality assessment.'}
                    {scrapingMode === 'traditional' && 'Scrapes data directly from verified university websites and educational databases. Fast, reliable, and uses established academic sources.'}
                    {scrapingMode === 'hybrid' && 'Intelligently combines traditional scraping with AI enhancement. Starts fast with traditional methods, then enriches data with AI insights. Automatic fallback ensures maximum reliability.'}
                  </p>
                </div>
              </div>

              {/* Include Analysis */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-analysis"
                  checked={includeAnalysis}
                  onCheckedChange={(checked) => setIncludeAnalysis(checked === true)}
                />
                <Label htmlFor="include-analysis">
                  Include detailed academic analysis
                </Label>
              </div>

              {/* Start Extraction Button */}
              <Button
                onClick={handleExtraction}
                disabled={isProcessing}
                className={`w-full ${
                  scrapingMode === 'ai' ? 'bg-purple-600 hover:bg-purple-700' : 
                  scrapingMode === 'hybrid' ? 'bg-green-600 hover:bg-green-700' : 
                  'bg-blue-600 hover:bg-blue-700'
                }`}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {scrapingMode === 'ai' ? 'AI Processing...' : 
                     scrapingMode === 'hybrid' ? 'Hybrid Processing...' : 
                     'Extracting...'}
                  </>
                ) : (
                  <>
                    {scrapingMode === 'ai' ? (
                      <Activity className="mr-2 h-4 w-4" />
                    ) : scrapingMode === 'hybrid' ? (
                      <Zap className="mr-2 h-4 w-4" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Start {scrapingMode === 'ai' ? 'AI' : 
                           scrapingMode === 'hybrid' ? 'Hybrid' : 
                           'Traditional'} Extraction
                  </>
                )}
              </Button>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {scrapingMode === 'ai' ? '🤖 AI processing universities...' : '🌐 Extracting universities...'}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-gray-500 text-center">
                    Mode: {scrapingMode === 'ai' ? 'AI-Powered Search' : 'Traditional Web Scraping'}
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {error.error}
                    {error.code && (
                      <span className="text-xs block mt-1">Code: {error.code}</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <School className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Universities</p>
                      <p className="text-2xl font-bold">{statistics.totalUniversities}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Avg Quality Score</p>
                      <p className="text-2xl font-bold">{statistics.averageQualityScore?.toFixed(1) || '0.0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Globe className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Countries</p>
                      <p className="text-2xl font-bold">{Object.keys(statistics.countryCounts).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BookOpen className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Specializations</p>
                      <p className="text-2xl font-bold">{Object.keys(statistics.topCategories).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Processing Metadata */}
          {processingMetadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Processing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Processing Time</p>
                    <p className="font-semibold">{processingMetadata.processingTime}ms</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Success Rate</p>
                    <p className="font-semibold">{processingMetadata.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Processed</p>
                    <p className="font-semibold">{processingMetadata.totalProcessed}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Quality Score</p>
                    <p className="font-semibold">{processingMetadata.qualityScore?.toFixed(1) || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search universities, countries, cities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {statistics && Object.keys(statistics.countryCounts).map(country => (
                      <SelectItem key={country} value={country}>
                        {country} ({statistics.countryCounts[country]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="qualityScore">Quality Score</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
                <Button onClick={exportToCSV} disabled={results.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {filteredResults.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Universities ({filteredResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>University</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Quality Score</TableHead>
                        <TableHead>Website</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((university, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{university.name}</TableCell>
                          <TableCell>{university.location?.country || 'N/A'}</TableCell>
                          <TableCell>{university.location?.city || 'N/A'}</TableCell>
                          <TableCell>{university.academicInfo?.primarySpecialization || 'General'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              (university.qualityScore || 0) >= 8 ? 'default' :
                              (university.qualityScore || 0) >= 6 ? 'secondary' : 'outline'
                            }>
                              {university.qualityScore?.toFixed(1) || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {university.contactInfo?.website ? (
                              <a
                                href={university.contactInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Visit
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUniversityDialog(university)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Universities Found</h3>
                <p className="text-gray-600 mb-4">
                  {results.length === 0
                    ? "Start an extraction to see university data here."
                    : "No universities match your current filters."}
                </p>
                {results.length === 0 && (
                  <Button onClick={() => setActiveTab('configure')}>
                    Configure Extraction
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Extraction History
              </CardTitle>
              <CardDescription>
                View your previous extraction results and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading history...</p>
                </div>
              ) : historicalResults.length > 0 ? (
                <div className="space-y-4">
                  {historicalResults.map((result, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{result.metadata.successfulCount} Universities Extracted</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(result.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Processing time: {result.metadata.processingTime}ms | 
                            Success rate: {result.metadata.successRate}%
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No History Found</h3>
                  <p className="text-gray-600">Your extraction history will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* University Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              {selectedUniversity?.name}
            </DialogTitle>
            <DialogDescription>
              Detailed information about this university
            </DialogDescription>
          </DialogHeader>
          
          {selectedUniversity && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <p className="font-medium">{selectedUniversity.name}</p>
                    </div>
                    <div>
                      <Label>Quality Score</Label>
                      <Badge variant={
                        (selectedUniversity.qualityScore || 0) >= 8 ? 'default' :
                        (selectedUniversity.qualityScore || 0) >= 6 ? 'secondary' : 'outline'
                      }>
                        {selectedUniversity.qualityScore?.toFixed(1) || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Information */}
              {selectedUniversity.location && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Country</Label>
                        <p>{selectedUniversity.location.country || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>City</Label>
                        <p>{selectedUniversity.location.city || 'N/A'}</p>
                      </div>
                      {selectedUniversity.location.address && (
                        <div className="col-span-2">
                          <Label>Address</Label>
                          <p>{selectedUniversity.location.address}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              {selectedUniversity.contactInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedUniversity.contactInfo.website && (
                        <div>
                          <Label>Website</Label>
                          <a
                            href={selectedUniversity.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline block"
                          >
                            {selectedUniversity.contactInfo.website}
                          </a>
                        </div>
                      )}
                      {selectedUniversity.contactInfo.email && (
                        <div>
                          <Label>Email</Label>
                          <p>{selectedUniversity.contactInfo.email}</p>
                        </div>
                      )}
                      {selectedUniversity.contactInfo.phone && (
                        <div className="col-span-2">
                          <Label>Phone</Label>
                          <p>{selectedUniversity.contactInfo.phone}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Academic Information */}
              {selectedUniversity.academicInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Academic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedUniversity.academicInfo.primarySpecialization && (
                        <div>
                          <Label>Primary Specialization</Label>
                          <p>{selectedUniversity.academicInfo.primarySpecialization}</p>
                        </div>
                      )}
                      {selectedUniversity.academicInfo.departments && selectedUniversity.academicInfo.departments.length > 0 && (
                        <div>
                          <Label>Departments</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedUniversity.academicInfo.departments.map((dept, idx) => (
                              <Badge key={idx} variant="outline">{dept}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedUniversity.academicInfo.researchAreas && selectedUniversity.academicInfo.researchAreas.length > 0 && (
                        <div>
                          <Label>Research Areas</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedUniversity.academicInfo.researchAreas.map((area, idx) => (
                              <Badge key={idx} variant="secondary">{area}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

