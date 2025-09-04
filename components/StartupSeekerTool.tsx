'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, Plus, Search, Users, ExternalLink, RefreshCw, Zap, Target, BarChart3, Trash2, Database } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
// HybridModeSelector removed - only Market Data Focus mode supported
import { ValidationResults } from './ValidationResults';

interface Startup {
  id: string;
  name: string;
  city?: string;
  website: string;
  description: string;
  locationScore: number;
  readinessScore: number;
  feasibilityScore: number;
  rougeScore: number;
  justification: string;
  isPriority?: boolean;
  contactInfo?: any;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  const [generationMode] = useState<'market-data'>('market-data');
  // Advanced options for Market Data Focus
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [realTimeValidation, setRealTimeValidation] = useState(true);
  const [competitorAnalysis, setCompetitorAnalysis] = useState(true);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [performingRealityCheck, setPerformingRealityCheck] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [deletingStartup, setDeletingStartup] = useState<string | null>(null);

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
        setStartups(data.startups);
      } else {
        setError(data.error || 'Failed to load startups');
      }
    } catch (err) {
      setError('Failed to load startups');
    } finally {
      setLoading(false);
    }
  };

  const generateStartups = async () => {
    if (!numStartups || numStartups < 1 || numStartups > 50) {
      setError('Please enter a number between 1 and 50');
      toast.error('Please enter a number between 1 and 50');
      return;
    }

    setGenerating(true);
    setError(null);
    toast.info('Starting startup generation...', {
      description: `Generating ${numStartups} startups using ${generationMode} mode`
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
          useHybridValidation: false,
          advancedOptions: { deepAnalysis, realTimeValidation, competitorAnalysis }
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
            description: `${data.count || numStartups} startups have been added to your portfolio.`
          });
          setGenerating(false);
          setCurrentJob(null);
          loadStartups();
        }
      } else {
        const errorMsg = data.error || 'Failed to start generation';
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
              description: `${numStartups} startups have been added to your portfolio.`
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
        // Start polling for job status
        checkJobStatus(data.jobId, 'research');
      } else {
        setError(data.error || 'Failed to start contact research');
      }
    } catch (err) {
      setError('Failed to start contact research');
    } finally {
      setContactResearching(null);
    }
  };

  const performRealityCheck = async (startup: Startup, deepAnalysis: boolean = false) => {
    setPerformingRealityCheck(true);
    setError(null);

    try {
      const response = await fetch('/api/tools/startup-seeker/reality-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startupName: startup.name,
          startupDescription: startup.description,
          startupWebsite: startup.website,
          deepAnalysis
        }),
      });

      const data = await response.json();

      if (data.success) {
        setValidationResults(data.data);
        setActiveTab('validate');
      } else {
        setError(data.error || 'Failed to perform reality check');
      }
    } catch (err) {
      setError('Failed to perform reality check');
    } finally {
      setPerformingRealityCheck(false);
    }
  };

  const refreshValidation = async () => {
    if (selectedStartup) {
      await performRealityCheck(selectedStartup, true);
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
        body: JSON.stringify({ startupId }),
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
          description: data.error || 'Unknown error occurred'
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
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
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
          <TabsTrigger
            value="validate"
            className={`flex items-center gap-2 ${activeTab === 'validate' ? 'bg-muted/30 rounded-md ring-1 ring-offset-1 ring-indigo-400' : ''}`}
          >
            <Target className="h-4 w-4" />
            Validate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Market Data Focus Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                Market Data Focus Mode
              </CardTitle>
              <CardDescription>
                Seek real, existing agritech startups using AI research and market data validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Deep Analysis</Label>
                    <p className="text-xs text-gray-600">Perform comprehensive market analysis</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeepAnalysis(!deepAnalysis)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${deepAnalysis ? 'bg-green-600 text-white' : 'bg-muted/10 text-muted-foreground'}`}
                  >
                    {deepAnalysis ? 'On' : 'Off'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Real-time Validation</Label>
                    <p className="text-xs text-gray-600">Validate against live market data</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRealTimeValidation(!realTimeValidation)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${realTimeValidation ? 'bg-green-600 text-white' : 'bg-muted/10 text-muted-foreground'}`}
                  >
                    {realTimeValidation ? 'On' : 'Off'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Competitor Analysis</Label>
                    <p className="text-xs text-gray-600">Include detailed competitor insights</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompetitorAnalysis(!competitorAnalysis)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${competitorAnalysis ? 'bg-green-600 text-white' : 'bg-muted/10 text-muted-foreground'}`}
                  >
                    {competitorAnalysis ? 'On' : 'Off'}
                  </button>
                </div>
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
          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Startup Portfolio</CardTitle>
              <CardDescription>
                {startups.length} startup{startups.length !== 1 ? 's' : ''} found
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
                <div className="w-full overflow-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contacts</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {startups.map((startup) => (
                        <TableRow key={startup.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium truncate max-w-[300px]">{startup.name}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {startup.description.substring(0, 100)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{startup.city || 'N/A'}</TableCell>
                          <TableCell>
                            {startup.contactInfo ? (
                              <Badge variant="secondary">Available</Badge>
                            ) : (
                              <Badge variant="outline">Not Available</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedStartup(startup)}
                                aria-label={`View details for ${startup.name}`}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => performRealityCheck(startup)}
                                disabled={performingRealityCheck}
                                aria-label={`Validate ${startup.name}`}
                              >
                                {performingRealityCheck ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Target className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(startup.website, '_blank')}
                                aria-label={`Open website for ${startup.name}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              {!startup.contactInfo && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => researchContacts(startup)}
                                  disabled={contactResearching === startup.id}
                                  aria-label={`Research contacts for ${startup.name}`}
                                >
                                  {contactResearching === startup.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Users className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteStartup(startup.id)}
                                disabled={deletingStartup === startup.id}
                                aria-label={`Delete ${startup.name}`}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingStartup === startup.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validate" className="space-y-6">
          {validationResults ? (
            <ValidationResults
              results={validationResults}
              onRefresh={refreshValidation}
              isRefreshing={performingRealityCheck}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Validation Results</h3>
                <p className="text-gray-600 mb-4">
                  Select a startup from your portfolio to perform a reality check validation.
                </p>
                <Button onClick={() => setActiveTab('portfolio')}>
                  Go to Portfolio
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Startup Details Dialog */}
      <Dialog open={!!selectedStartup} onOpenChange={() => setSelectedStartup(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#1a1b1e] text-white border border-gray-700 shadow-2xl">
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
                  </div>
                  <div className="text-center p-3 border border-gray-600 rounded bg-gray-800/50">
                    <div className={`text-2xl font-bold ${getScoreColor(selectedStartup.readinessScore)}`}>
                      {selectedStartup.readinessScore}
                    </div>
                    <div className="text-sm text-gray-400">Readiness</div>
                  </div>
                  <div className="text-center p-3 border border-gray-600 rounded bg-gray-800/50">
                    <div className={`text-2xl font-bold ${getScoreColor(selectedStartup.feasibilityScore)}`}>
                      {selectedStartup.feasibilityScore}
                    </div>
                    <div className="text-sm text-gray-400">Feasibility</div>
                  </div>
                </div>
              </div>

              {/* Justification */}
              <div>
                <Label>Evaluation Justification</Label>
                <p className="mt-1 text-sm">{selectedStartup.justification}</p>
              </div>

              {/* Reality Check Section */}
              <div>
                <Label>Reality Check Validation</Label>
                <div className="mt-2 p-4 border-2 border-dashed border-gray-600 rounded text-center bg-gray-800/30">
                  <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-2">
                    Perform comprehensive market validation and reality check
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performRealityCheck(selectedStartup)}
                    disabled={performingRealityCheck}
                  >
                    {performingRealityCheck ? (
                      <span>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </span>
                    ) : (
                      <span>
                        <Target className="h-4 w-4 mr-2" />
                        Reality Check
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Contact Information */}
              {selectedStartup.contactInfo ? (
                <div className="mt-2 p-4 bg-gray-800 rounded border border-gray-600">
                  <pre className="whitespace-pre-wrap text-sm text-gray-200">
                    {typeof selectedStartup.contactInfo === 'string'
                      ? selectedStartup.contactInfo
                      : JSON.stringify(selectedStartup.contactInfo, null, 2)
                    }
                  </pre>
                </div>
              ) : (
                <div className="mt-2 p-4 border-2 border-dashed border-gray-600 rounded text-center bg-gray-800/30">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">
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
                  <Button
                    variant="outline"
                    onClick={() => performRealityCheck(selectedStartup)}
                    disabled={performingRealityCheck}
                  >
                    {performingRealityCheck ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Reality Check
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
