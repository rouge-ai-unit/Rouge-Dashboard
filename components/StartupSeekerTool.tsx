'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, Users, ExternalLink, RefreshCw, Zap, Target, BarChart3, Trash2, Database } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  name?: string;
  position?: string;
  company?: string;
  [key: string]: unknown;
}

interface Startup {
  id: string;
  name: string;
  city?: string;
  website: string;
  description: string;
  locationScore: number;
  readinessScore: number;
  feasibilityScore: number;
  rogueScore: number;
  justification: string;
  isPriority?: boolean;
  contactInfo?: ContactInfo | string | null;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  foundedYear?: string;
  employeeCount?: string;
  fundingStage?: string;
  industry?: string;
}

interface Job {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Helper function to safely extract error messages
const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && error.message) return error.message;
  return 'An error occurred';
};

export default function StartupSeekerTool() {
  const { data: session } = useSession();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numStartups, setNumStartups] = useState(10);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [contactResearching, setContactResearching] = useState<string | null>(null);

  // Only Market Data Focus mode supported
  const [generationMode, setGenerationMode] = useState<'traditional' | 'ai' | 'hybrid'>('hybrid');
  // API-required fields
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [country, setCountry] = useState<'all' | 'Thailand' | 'Singapore' | 'Indonesia' | 'Malaysia' | 'Philippines' | 'Vietnam' | 'Global'>('all');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [excludeExisting, setExcludeExisting] = useState(true);
  const [activeTab, setActiveTab] = useState('generate');
  const [deletingStartup, setDeletingStartup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Load user's startups on component mount
  useEffect(() => {
    loadStartups();
  }, []);

  // Poll for job status when there's an active job
  useEffect(() => {
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
      const interval = setInterval(() => {
        checkJobStatus(currentJob.id, 'generation');
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [currentJob]);

  const loadStartups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tools/startup-seeker/results');
      const data = await response.json();

      if (data.success) {
        const startups = data.startups ?? data.data?.startups ?? [];
        setStartups(startups);
      } else {
        setError(getErrorMessage(data.error) || 'Failed to load startups');
      }
    } catch (err) {
      setError('Failed to load startups');
    } finally {
      setLoading(false);
    }
  };

  // Filtered startups based on search and filters
  const filteredStartups = useMemo((): Startup[] => {
    let filtered = startups;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        startup.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (startup.city && startup.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Score filter
    if (scoreFilter !== 'all') {
      filtered = filtered.filter(startup => {
        const score = startup.rogueScore || 0;
        if (scoreFilter === 'high') return score >= 7;
        if (scoreFilter === 'medium') return score >= 4 && score < 7;
        if (scoreFilter === 'low') return score < 4;
        return true;
      });
    }

    return filtered;
  }, [startups, searchQuery, scoreFilter]);

  const generateStartups = async () => {
    if (!numStartups || numStartups < 1 || numStartups > 50) {
      setError('Please enter a number between 1 and 50');
      toast.error('Please enter a number between 1 and 50');
      return;
    }

    setGenerating(true);
    setError(null);
    toast.info('Starting startup generation...', {
      description: `Generating ${numStartups} startups from ${country === 'all' ? 'all countries' : country} using ${
        generationMode === 'ai' ? 'AI-powered' : 
        generationMode === 'hybrid' ? 'Hybrid' : 
        'Traditional'
      } mode`
    });

    try {
      const response = await fetch('/api/tools/startup-seeker/enhanced-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numStartups,
          mode: generationMode,
          priority,
          country,
          focusAreas,
          excludeExisting
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if this is a direct response (no jobId) or a job-based response
        if (data.jobId) {
          toast.success('Generation started successfully!', {
            description: 'Your startups are being generated. This may take 30-60 seconds.'
          });
          // Start polling for job status
          checkJobStatus(data.jobId, 'generation');
        } else {
          // Direct response - generation is already complete
          toast.success('Startups generated successfully!', {
            description: `${data.count || numStartups} startups have been added to your portfolio using ${
              generationMode === 'ai' ? 'AI-powered' : 
              generationMode === 'hybrid' ? 'Hybrid' : 
              'Traditional'
            } mode.`
          });
          setGenerating(false);
          setCurrentJob(null);
          
          // Automatically start contact research for new startups
          setTimeout(async () => {
            await loadStartups();
            
            // Get the updated startups list
            const response = await fetch('/api/tools/startup-seeker/results');
            const data = await response.json();
            if (data.success) {
              const currentStartups = data.startups ?? data.data?.startups ?? [];
              
              // Find newly generated startups (those without contact info)
              const startupsNeedingResearch = currentStartups.filter((s: Startup) => !s.contactInfo);
              const startupsNeedingValidation = currentStartups.filter((s: Startup) => !s.contactInfo);
              
              if (startupsNeedingResearch.length > 0) {
                toast.info('Starting automatic contact research...', {
                  description: `Researching contacts for ${Math.min(startupsNeedingResearch.length, 3)} startups`
                });
                // Start contact research for up to 3 startups without contacts
                startupsNeedingResearch.slice(0, 3).forEach((startup: Startup) => {
                  researchContacts(startup);
                });
              }
              
              if (startupsNeedingValidation.length > 0) {
                // Start contact research for up to 2 startups without contact info
                startupsNeedingValidation.slice(0, 2).forEach((startup: Startup) => {
                  researchContacts(startup);
                });
              }
            }
          }, 1000); // Small delay to ensure data is saved
        }
      } else {
        const errorMsg = getErrorMessage(data.error) || 'Failed to start generation';
        setError(errorMsg);
        toast.error('Generation failed', {
          description: errorMsg
        });
        setGenerating(false);
        setCurrentJob(null);
      }
    } catch (err) {
      const errorMsg = 'Failed to start generation';
      setError(errorMsg);
      toast.error('Generation failed', {
        description: errorMsg
      });
      setGenerating(false);
      setCurrentJob(null);
    }
  };

  const checkJobStatus = async (jobId: string, type: 'generation' | 'research') => {
    try {
      const response = await fetch(`/api/tools/startup-seeker/status?jobId=${jobId}&type=${type}`);
      const data = await response.json();

      if (data.success) {
        setCurrentJob(data.job);

        if (data.job.status === 'completed') {
          // Show success notification
          if (type === 'generation') {
            toast.success('Startups generated successfully!', {
              description: `${numStartups} startups have been added to your portfolio using ${
                generationMode === 'ai' ? 'AI-powered' : 
                generationMode === 'hybrid' ? 'Hybrid' : 
                'Traditional'
              } mode.`
            });
            setGenerating(false);
            loadStartups();
          }
          // Clear contact researching state if research completed
          if (type === 'research') {
            toast.success('Contact research completed!', {
              description: 'Contact information has been updated.'
            });
            setContactResearching(null);
            loadStartups(); // Reload to get updated contact info
          }
          setCurrentJob(null);
        } else if (data.job.status === 'failed') {
          const errorMsg = data.job.error || 'Job failed';
          setError(errorMsg);
          toast.error(`${type === 'generation' ? 'Generation' : 'Research'} failed`, {
            description: errorMsg
          });
          if (type === 'generation') {
            setGenerating(false);
          }
          if (type === 'research') {
            setContactResearching(null);
          }
          setCurrentJob(null);
        }
      }
    } catch (err) {
      console.error('Failed to check job status:', err);
      toast.error('Status check failed', {
        description: 'Unable to check job status. Please refresh the page.'
      });
    }
  };

  const researchContacts = async (startup: Startup) => {
    setContactResearching(startup.id);
    setError(null);

    try {
      const response = await fetch('/api/tools/startup-seeker/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startupId: startup.id }),
      });

      const data = await response.json();

      if (data.success) {
        // Some responses may not return jobId if contact info is cached
        if (data.jobId) {
          checkJobStatus(data.jobId, 'research');
        } else if (data.contactInfo) {
          toast.success('Contact info already up to date!', { description: 'Contact information has been updated.' });
          loadStartups();
        } else {
          setError('No jobId or contactInfo returned.');
        }
      } else {
        setError(getErrorMessage(data.error) || 'Failed to start contact research');
      }
    } catch (err) {
      setError('Failed to start contact research');
    } finally {
      setContactResearching(null);
    }
  };

  const deleteStartup = async (startupId: string) => {
    setDeletingStartup(startupId);
    
    try {
      const response = await fetch(`/api/tools/startup-seeker/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          startupId,
          confirmDelete: true,
          reason: 'User requested deletion'
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Startup deleted successfully');
        loadStartups(); // Reload the list
        // Close modal if the deleted startup was selected
        if (selectedStartup?.id === startupId) {
          setSelectedStartup(null);
        }
      } else {
        toast.error('Failed to delete startup', {
          description: getErrorMessage(data.error) || 'Unknown error occurred'
        });
      }
    } catch (err) {
      toast.error('Failed to delete startup', {
        description: 'Network error occurred'
      });
    } finally {
      setDeletingStartup(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            Agritech Startup Seeker
          </h1>
          <p className="text-muted-foreground">
            Discover and evaluate promising agritech startups with AI-powered analysis and real market validation
          </p>
        </div>
        <Button
          onClick={loadStartups}
          variant="outline"
          size="sm"
          disabled={loading}
          aria-label="Refresh startups"
          aria-busy={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
          <TabsTrigger
            value="generate"
            className={`flex items-center gap-2 ${activeTab === 'generate' ? 'bg-muted/30 rounded-md ring-1 ring-offset-1 ring-indigo-400' : ''}`}
          >
            <Plus className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger
            value="portfolio"
            className={`flex items-center gap-2 ${activeTab === 'portfolio' ? 'bg-muted/30 rounded-md ring-1 ring-offset-1 ring-indigo-400' : ''}`}
          >
            <BarChart3 className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Generation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Generation Settings
              </CardTitle>
              <CardDescription>
                Configure how startups are generated and filtered
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Target Country</Label>
                    <p className="text-xs text-gray-600">Focus on startups from specific countries</p>
                  </div>
                  <Select value={country} onValueChange={(value) => setCountry(value as typeof country)}>
                    <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <SelectItem value="all" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🌍 All Countries</SelectItem>
                      <SelectItem value="Thailand" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🇹🇭 Thailand</SelectItem>
                      <SelectItem value="Singapore" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🇸🇬 Singapore</SelectItem>
                      <SelectItem value="Indonesia" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🇮🇩 Indonesia</SelectItem>
                      <SelectItem value="Malaysia" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🇲🇾 Malaysia</SelectItem>
                      <SelectItem value="Philippines" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🇵🇭 Philippines</SelectItem>
                      <SelectItem value="Vietnam" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🇻🇳 Vietnam</SelectItem>
                      <SelectItem value="Global" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">🌐 Global</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Priority Level</Label>
                    <p className="text-xs text-gray-600">Set processing priority for generation</p>
                  </div>
                  <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Exclude Existing</Label>
                    <p className="text-xs text-gray-600">Skip startups already in your portfolio</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExcludeExisting(!excludeExisting)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      excludeExisting 
                        ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700 shadow-md' 
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                    }`}
                  >
                    {excludeExisting ? '✓ On' : '✗ Off'}
                  </button>
                </div>

                <div>
                  <Label className="text-sm font-medium">Focus Areas</Label>
                  <p className="text-xs text-gray-600 mb-2">Specify areas to focus on (max 5)</p>
                  <div className="flex flex-wrap gap-2">
                    {['precision-agriculture', 'vertical-farming', 'iot-sensors', 'ai-ml', 'sustainable-ag', 'food-supply-chain', 'robotics'].map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => {
                          if (focusAreas.includes(area)) {
                            setFocusAreas(focusAreas.filter(a => a !== area));
                          } else if (focusAreas.length < 5) {
                            setFocusAreas([...focusAreas, area]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          focusAreas.includes(area)
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'
                        }`}
                      >
                        {area.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                  {focusAreas.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {focusAreas.length}/5 focus areas
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scraping Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Scraping Mode
              </CardTitle>
              <CardDescription>
                Choose how to discover startups - traditional web scraping or AI-powered search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    generationMode === 'traditional' 
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setGenerationMode('traditional')}
                >
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-blue-600" />
                        <p className="font-medium text-sm">Traditional</p>
                      </div>
                      <p className="text-xs text-gray-600">Fast & reliable</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    generationMode === 'ai' 
                      ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-900/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setGenerationMode('ai')}
                >
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <p className="font-medium text-sm">AI Enhanced</p>
                      </div>
                      <p className="text-xs text-gray-600">Smart discovery</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    generationMode === 'hybrid' 
                      ? 'border-green-500 bg-green-50/70 dark:bg-green-900/18' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setGenerationMode('hybrid')}
                >
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-green-600" />
                        <p className="font-medium text-sm">Hybrid ⭐</p>
                      </div>
                      <p className="text-xs text-gray-600">Best of both</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="text-sm text-gray-300 bg-gray-800/30 p-3 rounded-md mt-4">
                <p className="font-medium mb-1">
                  {generationMode === 'ai' && '🤖 AI Mode:'}
                  {generationMode === 'traditional' && '🌐 Traditional Mode:'}
                  {generationMode === 'hybrid' && '⚡ Hybrid Mode (Recommended):'}
                </p>
                <p className="text-gray-400">
                  {generationMode === 'ai' && 'Uses advanced AI algorithms to discover startups from web search, news, and social media with intelligent pattern recognition.'}
                  {generationMode === 'traditional' && 'Scrapes real startup data from verified sources like Crunchbase, AngelList, TechCrunch, and AgFunder.'}
                  {generationMode === 'hybrid' && 'Intelligently combines traditional data sources with AI discovery. Starts with verified databases, then enriches with AI insights for maximum coverage and accuracy.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Seek Real Startups
              </CardTitle>
              <CardDescription>
                Seek real, existing agritech startups using AI research and market data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="numStartups">Number of Startups</Label>
                  <Input
                    id="numStartups"
                    type="number"
                    min="1"
                    max="50"
                    value={numStartups}
                    onChange={(e) => setNumStartups(parseInt(e.target.value) || 10)}
                    placeholder="10"
                  />
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <Button
                    onClick={generateStartups}
                    disabled={generating || (currentJob?.status === 'processing' || currentJob?.status === 'pending') || !session}
                    className="w-full sm:w-auto"
                    aria-label="Generate startups"
                  >
                    {generating || (currentJob?.status === 'processing' || currentJob?.status === 'pending') ? (
                      <span>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span>
                        <Search className="h-4 w-4 mr-2" />
                        Seek Startups
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {currentJob && (currentJob.status === 'processing' || currentJob.status === 'pending') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      Status: {currentJob.status === 'processing' ? 'Processing' : 'Pending'}
                      {currentJob.status === 'processing' && ' - Generating your startups...'}
                    </span>
                    <span>{currentJob.progress || 0}%</span>
                  </div>
                  <Progress value={currentJob.progress || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    This may take 30-60 seconds depending on the selected mode and number of startups.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          {/* Statistics Cards */}
          {startups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Startups</p>
                      <p className="text-2xl font-bold">{startups.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Avg Rouge Score</p>
                      <p className="text-2xl font-bold">
                        {filteredStartups.length > 0 
                          ? (filteredStartups.reduce((sum: number, s: Startup) => sum + (s.rogueScore || 0), 0) / filteredStartups.length).toFixed(1)
                          : '0.0'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">With Contacts</p>
                      <p className="text-2xl font-bold">
                        {filteredStartups.filter((s: Startup) => s.contactInfo).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Startup Portfolio</CardTitle>
              <CardDescription>
                {filteredStartups.length} startup{filteredStartups.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : startups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No startups found. Generate some startups to get started.
                </div>
              ) : (
                <>
                  {/* Search and Filters */}
                  <div className="mb-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Search startups, descriptions, locations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Select value={scoreFilter} onValueChange={(value: any) => setScoreFilter(value)}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Score Range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scores</SelectItem>
                          <SelectItem value="high">High (7+)</SelectItem>
                          <SelectItem value="medium">Medium (4-6)</SelectItem>
                          <SelectItem value="low">Low (&lt;4)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {filteredStartups.length !== startups.length && (
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredStartups.length} of {startups.length} startups
                      </p>
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block w-full overflow-hidden">
                    <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-2/5">Company</TableHead>
                        <TableHead className="w-1/6">Location</TableHead>
                        <TableHead className="w-1/6">Rouge Score</TableHead>
                        <TableHead className="w-1/6">Contacts</TableHead>
                        <TableHead className="w-1/6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStartups.map((startup: Startup) => (
                        <TableRow key={startup.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium truncate" title={startup.name}>{startup.name}</div>
                              <div className="text-sm text-muted-foreground truncate" title={startup.description}>
                                {startup.description.substring(0, 100)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{startup.city || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              startup.rogueScore >= 8 ? 'default' :
                              startup.rogueScore >= 6 ? 'secondary' : 'outline'
                            }>
                              {startup.rogueScore?.toFixed(1) || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {startup.contactInfo ? (
                              <Badge variant="secondary">Available</Badge>
                            ) : (
                              <Badge variant="outline">Not Available</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedStartup(startup)}
                                aria-label={`View details for ${startup.name}`}
                                className="h-8 w-8 p-0"
                              >
                                <Search className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(startup.website, '_blank')}
                                aria-label={`Open website for ${startup.name}`}
                                className="h-8 w-8 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              {!startup.contactInfo && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => researchContacts(startup)}
                                  disabled={contactResearching === startup.id}
                                  aria-label={`Research contacts for ${startup.name}`}
                                  className="h-8 w-8 p-0"
                                >
                                  {contactResearching === startup.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Users className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteStartup(startup.id)}
                                disabled={deletingStartup === startup.id}
                                aria-label={`Delete ${startup.name}`}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingStartup === startup.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredStartups.map((startup: Startup) => (
                      <div key={startup.id} className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 shadow-2xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate" title={startup.name}>
                              {startup.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1" title={startup.description}>
                              {startup.description}
                            </p>
                          </div>
                          <Badge variant={
                            startup.rogueScore >= 8 ? 'default' :
                            startup.rogueScore >= 6 ? 'secondary' : 'outline'
                          } className="ml-2 flex-shrink-0">
                            {startup.rogueScore?.toFixed(1) || 'N/A'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Location</div>
                            <div className="text-sm text-white">{startup.city || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Contacts</div>
                            {startup.contactInfo ? (
                              <Badge variant="secondary" className="text-xs">Available</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Not Available</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStartup(startup)}
                            className="flex-1"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(startup.website, '_blank')}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          {!startup.contactInfo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => researchContacts(startup)}
                              disabled={contactResearching === startup.id}
                              className="h-8 w-8 p-0"
                            >
                              {contactResearching === startup.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Users className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteStartup(startup.id)}
                            disabled={deletingStartup === startup.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deletingStartup === startup.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Startup Details Dialog */}
      <Dialog open={!!selectedStartup} onOpenChange={() => setSelectedStartup(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-md text-white border border-gray-700/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{selectedStartup?.name}</DialogTitle>
            <DialogDescription>
              Detailed evaluation and contact information
            </DialogDescription>
          </DialogHeader>

          {selectedStartup ? (
            <div className="space-y-6 text-gray-100">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Website</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={selectedStartup.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedStartup.website}
                    </a>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <p className="mt-1">{selectedStartup.city || 'Not specified'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm">{selectedStartup.description}</p>
              </div>

              {/* Scores */}
              <div>
                <Label>Evaluation Scores</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="text-center p-3 border border-gray-600 rounded bg-gray-800/50">
                    <div className={`text-2xl font-bold ${getScoreColor(selectedStartup.locationScore)}`}>
                      {selectedStartup.locationScore}
                    </div>
                    <div className="text-sm text-gray-400">Location</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedStartup.locationScore >= 80 ? 'Excellent location' :
                       selectedStartup.locationScore >= 60 ? 'Good location' :
                       selectedStartup.locationScore >= 40 ? 'Fair location' : 'Poor location'}
                    </div>
                  </div>
                  <div className="text-center p-3 border border-gray-600 rounded bg-gray-800/50">
                    <div className={`text-2xl font-bold ${getScoreColor(selectedStartup.readinessScore)}`}>
                      {selectedStartup.readinessScore}
                    </div>
                    <div className="text-sm text-gray-400">Readiness</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedStartup.readinessScore >= 80 ? 'Investment ready' :
                       selectedStartup.readinessScore >= 60 ? 'Early stage' :
                       selectedStartup.readinessScore >= 40 ? 'Concept stage' : 'Idea stage'}
                    </div>
                  </div>
                  <div className="text-center p-3 border border-gray-600 rounded bg-gray-800/50">
                    <div className={`text-2xl font-bold ${getScoreColor(selectedStartup.feasibilityScore)}`}>
                      {selectedStartup.feasibilityScore}
                    </div>
                    <div className="text-sm text-gray-400">Feasibility</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedStartup.feasibilityScore >= 80 ? 'Highly feasible' :
                       selectedStartup.feasibilityScore >= 60 ? 'Moderately feasible' :
                       selectedStartup.feasibilityScore >= 40 ? 'Challenging' : 'High risk'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 border border-gray-600 rounded bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Overall Rouge Score</span>
                    <div className="flex items-center gap-2">
                      <div className={`text-xl font-bold ${getScoreColor(selectedStartup.rogueScore)}`}>
                        {selectedStartup.rogueScore}
                      </div>
                      <Badge variant={selectedStartup.rogueScore >= 70 ? 'default' : 'secondary'}>
                        {selectedStartup.rogueScore >= 80 ? 'Excellent' :
                         selectedStartup.rogueScore >= 60 ? 'Good' :
                         selectedStartup.rogueScore >= 40 ? 'Fair' : 'Needs Work'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Justification */}
              {selectedStartup.justification && (
                <div>
                  <Label>Evaluation Justification</Label>
                  <div className="mt-2 p-3 border border-gray-600 rounded bg-gray-800/30">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {selectedStartup.justification}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedStartup.foundedYear && (
                  <div>
                    <Label>Founded Year</Label>
                    <p className="text-sm text-gray-300 mt-1">{selectedStartup.foundedYear}</p>
                  </div>
                )}
                {selectedStartup.employeeCount && (
                  <div>
                    <Label>Employee Count</Label>
                    <p className="text-sm text-gray-300 mt-1">{selectedStartup.employeeCount}</p>
                  </div>
                )}
                {selectedStartup.fundingStage && (
                  <div>
                    <Label>Funding Stage</Label>
                    <p className="text-sm text-gray-300 mt-1">{selectedStartup.fundingStage}</p>
                  </div>
                )}
                {selectedStartup.industry && (
                  <div>
                    <Label>Industry</Label>
                    <p className="text-sm text-gray-300 mt-1">{selectedStartup.industry}</p>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              {selectedStartup.contactInfo ? (
                <div className="mt-2 p-4 bg-gray-800 rounded border border-gray-600">
                  <h4 className="font-semibold text-sm mb-3 text-gray-200">Contact Information</h4>
                  <div className="space-y-3">
                    {(() => {
                      let contactInfo: any = null;
                      try {
                        contactInfo = typeof selectedStartup.contactInfo === 'string'
                          ? JSON.parse(selectedStartup.contactInfo)
                          : selectedStartup.contactInfo;
                      } catch (parseError) {
                        console.error('Failed to parse contactInfo:', parseError);
                        return (
                          <div className="text-red-400 text-sm">
                            Error parsing contact information
                          </div>
                        );
                      }

                      if (!contactInfo || typeof contactInfo !== 'object') {
                        return (
                          <div className="text-gray-400 text-sm">
                            Contact information format is invalid
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* LinkedIn */}
                          {(contactInfo.linkedinUrl || contactInfo.linkedin) && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">LinkedIn:</span>
                              <a
                                href={contactInfo.linkedinUrl || contactInfo.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-sm"
                              >
                                View Profile
                              </a>
                              {contactInfo.linkedinVerified && (
                                <span className="text-green-400 text-xs">✓ Verified</span>
                              )}
                            </div>
                          )}

                          {/* Generic Emails */}
                          {contactInfo.emails && Array.isArray(contactInfo.emails) && contactInfo.emails.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-400 w-16 mt-1">Emails:</span>
                              <div className="flex flex-wrap gap-1">
                                {contactInfo.emails.map((email: string, idx: number) => (
                                  <a
                                    key={`email-${idx}`}
                                    href={`mailto:${email}`}
                                    className="text-blue-400 hover:underline text-sm bg-gray-700 px-2 py-1 rounded"
                                  >
                                    {email}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Found Emails (from website scraping) */}
                          {contactInfo.foundEmails && Array.isArray(contactInfo.foundEmails) && contactInfo.foundEmails.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-400 w-16 mt-1">Found:</span>
                              <div className="flex flex-wrap gap-1">
                                {contactInfo.foundEmails.map((email: string, idx: number) => (
                                  <a
                                    key={`found-${idx}`}
                                    href={`mailto:${email}`}
                                    className="text-green-400 hover:underline text-sm bg-gray-700 px-2 py-1 rounded"
                                  >
                                    {email}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Phone Numbers */}
                          {(contactInfo.foundPhones || contactInfo.phone) && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-400 w-16 mt-1">Phones:</span>
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const phones = contactInfo.foundPhones || (contactInfo.phone ? [contactInfo.phone] : []);
                                  return phones.filter(Boolean).map((phone: string, idx: number) => (
                                    <a
                                      key={`phone-${idx}`}
                                      href={`tel:${phone}`}
                                      className="text-green-400 hover:underline text-sm bg-gray-700 px-2 py-1 rounded"
                                    >
                                      {phone}
                                    </a>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Total Contacts Count */}
                          {(contactInfo.totalContactsFound !== undefined || contactInfo.foundEmails?.length || contactInfo.emails?.length) && (
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-600">
                              <span className="text-xs text-gray-400">Total Contacts:</span>
                              <Badge variant="secondary" className="text-xs">
                                {contactInfo.totalContactsFound ||
                                 (contactInfo.foundEmails?.length || 0) +
                                 (contactInfo.emails?.length || 0)}
                              </Badge>
                            </div>
                          )}

                          {/* Last Updated */}
                          {contactInfo.lastUpdated && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Last Updated:</span>
                              <span className="text-xs text-gray-300">
                                {(() => {
                                  try {
                                    return new Date(contactInfo.lastUpdated).toLocaleDateString();
                                  } catch {
                                    return contactInfo.lastUpdated;
                                  }
                                })()}
                              </span>
                            </div>
                          )}

                          {/* Via/Method */}
                          {contactInfo.via && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Method:</span>
                              <span className="text-xs text-gray-300 capitalize">
                                {contactInfo.via.replace('-', ' ')}
                              </span>
                            </div>
                          )}

                          {/* Show message if no contacts found */}
                          {!contactInfo.linkedinUrl && !contactInfo.linkedin &&
                           (!contactInfo.emails || contactInfo.emails.length === 0) &&
                           (!contactInfo.foundEmails || contactInfo.foundEmails.length === 0) &&
                           (!contactInfo.foundPhones || contactInfo.foundPhones.length === 0) &&
                           !contactInfo.phone && (
                            <div className="text-gray-400 text-sm italic">
                              No specific contact details found, but research was completed.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-4 border-2 border-dashed border-gray-600 rounded text-center bg-gray-800/30">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-2">
                    No contact information available
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => researchContacts(selectedStartup)}
                    disabled={contactResearching === selectedStartup.id}
                  >
                    {contactResearching === selectedStartup.id ? (
                      <span>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Researching...
                      </span>
                    ) : (
                      <span>
                        <Users className="h-4 w-4 mr-2" />
                        Research Contacts
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedStartup.website, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => deleteStartup(selectedStartup.id)}
                  disabled={deletingStartup === selectedStartup.id}
                >
                  {deletingStartup === selectedStartup.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Startup
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
