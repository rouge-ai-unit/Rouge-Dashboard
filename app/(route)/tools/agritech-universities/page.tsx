"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  Info
} from "lucide-react";
import { toast } from "sonner";

interface UniversityData {
  University: string;
  Country: string;
  Region: string;
  Website: string;
  "Has TTO?": string;
  "TTO Page URL": string;
  "Incubation Record": string;
  "Apollo/LinkedIn Search URL": string;
}

interface JobStatus {
  jobId: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: string;
  failedReason?: string;
  createdAt: number;
  processedAt?: number;
  finishedAt?: number;
}

export default function AgritechUniversitiesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [universityLimit, setUniversityLimit] = useState(10);
  const [results, setResults] = useState<UniversityData[]>([]);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    retryAfter?: number;
  } | null>(null);

  // Job management
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Stop polling helper (declare before startJobPolling to avoid TDZ errors)
  const stopJobPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // UI state
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Animated displayed progress for smooth UI updates
  const [displayedProgress, setDisplayedProgress] = useState<number>(0);
  const animRef = React.useRef<number | null>(null);
  // Persist last successful job summary
  const [lastJobSummary, setLastJobSummary] = useState<{ processedCount: number; finishedAt: string; summary?: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/signin");
    } else if (sessionStatus === "authenticated") {
      setIsInitializing(false);
    }
  }, [sessionStatus, router]);

  // Load existing results on mount
  useEffect(() => {
    if (session?.user) {
      loadExistingResults();
    }
  }, [session]);

  

  const handleExtract = useCallback(async () => {
    if (!session?.user) {
      toast.error("Authentication required");
      return;
    }

    if (isLoading) return; // Prevent multiple submissions

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setResults([]);
    setCurrentJobId(null);
    setJobStatus(null);

    try {
      toast.loading("Enqueueing extraction job...", { id: "extract-job" });

      const response = await fetch("/api/tools/agritech-universities/enqueue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: universityLimit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setCurrentJobId(data.jobId);
      toast.success(data.message, { id: "extract-job" });

      // Start polling for job status
      startJobPolling(data.jobId);

    } catch (err) {
      const error = err as Error;
      console.error("Extraction error:", error);

      const errorInfo = {
        message: error.message || "Failed to start extraction",
        code: "EXTRACTION_FAILED"
      };

      setError(errorInfo);
      toast.error(errorInfo.message, { id: "extract-job" });
      setIsLoading(false);
    }
  }, [session, universityLimit, isLoading]);

  const startJobPolling = useCallback((jobId: string) => {
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes max (120 * 5 seconds)

    const pollStatus = async () => {
      try {
        pollCount++;

        if (!jobId) {
          console.error("No jobId provided to pollStatus");
          throw new Error("No job ID available");
        }

        console.log(`Polling job status for jobId: ${jobId}`);

        const response = await fetch("/api/tools/agritech-universities/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Job not found");
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const status: JobStatus = await response.json();
        setJobStatus(status);
        setProgress(status.progress || 0);

        switch (status.state) {
          case "completed":
            if (status.result) {
              try {
                // Handle both string and object results
                let result;
                if (typeof status.result === 'string') {
                  result = JSON.parse(status.result);
                } else {
                  result = status.result;
                }
                setResults(result.results || []);
                  setLastUpdated(new Date());
                  // persist a small summary for the last successful job
                  setLastJobSummary({
                    processedCount: result.processedCount || (result.results || []).length || 0,
                    finishedAt: new Date().toISOString(),
                    summary: result.summary || ''
                  });
                setIsLoading(false);
                setProgress(100);
                toast.success(`Successfully extracted ${result.processedCount || 0} universities`, {
                  id: "job-status"
                });
                stopJobPolling();
              } catch (parseError) {
                console.error("Failed to parse job result:", parseError);
                console.error("Raw result:", status.result);
                setError({ message: "Failed to parse results", code: "PARSE_ERROR" });
                setIsLoading(false);
                toast.error("Failed to parse extraction results", { id: "job-status" });
                stopJobPolling();
              }
            } else {
              setError({ message: "Job completed but no results found", code: "NO_RESULTS" });
              setIsLoading(false);
              toast.error("No results found", { id: "job-status" });
              stopJobPolling();
            }
            break;

          case "failed":
            const errorMessage = status.failedReason || "Job failed";
            setError({ message: errorMessage, code: "JOB_FAILED" });
            setIsLoading(false);
            toast.error(`Extraction failed: ${errorMessage}`, { id: "job-status" });
            stopJobPolling();
            break;

          case "active":
            // Job is running, continue polling
            if (pollCount % 12 === 0) { // Every minute
              toast.loading(`Processing... ${status.progress || 0}% complete`, { id: "job-status" });
            }
            break;

          case "waiting":
            // Job is queued
            if (pollCount === 1) {
              toast.loading("Job queued, waiting for processing...", { id: "job-status" });
            }
            break;

          default:
            // Unknown state, continue polling
            break;
        }

        // Stop polling after max time
        if (pollCount >= maxPolls) {
          setError({ message: "Job timed out", code: "TIMEOUT" });
          setIsLoading(false);
          toast.error("Job timed out", { id: "job-status" });
          stopJobPolling();
        }

      } catch (err) {
        const error = err as Error;
        console.error("Error polling job status:", error);

        if (error.message === "Job not found") {
          setError({ message: "Job not found", code: "JOB_NOT_FOUND" });
          setIsLoading(false);
          toast.error("Job not found", { id: "job-status" });
          stopJobPolling();
        } else {
          // Retry on network errors
          console.warn(`Poll attempt ${pollCount} failed, retrying...`);
        }
      }
    };

    // Poll immediately, then every 5 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    setPollingInterval(interval);
  }, []);

  // Abort / cancel an active job
  const handleAbort = useCallback(async () => {
    if (!currentJobId) return;
    // stop local polling immediately
    stopJobPolling();
    try {
      // best-effort cancel request - backend may or may not support this
      await fetch('/api/tools/agritech-universities/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: currentJobId })
      });
    } catch (err) {
      // ignore network errors from cancel attempt
      console.warn('Cancel request failed', err);
    }
    // update UI state
    setIsLoading(false);
    setJobStatus(prev => prev ? { ...prev, state: 'failed' } : null);
    setCurrentJobId(null);
    setError({ message: 'Job aborted by user', code: 'ABORTED' });
    toast.error('Extraction aborted', { id: 'extract-job' });
  }, [currentJobId, stopJobPolling]);

  // Requeue a previously cancelled job (best-effort: reads original job data on server and re-adds)
  const handleRequeue = useCallback(async (jobId: string | null) => {
    if (!jobId) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/tools/agritech-universities/requeue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to requeue job');
      }

      toast.success(data.message || 'Job requeued');
      // Start polling the new job
      setCurrentJobId(data.jobId);
      startJobPolling(data.jobId);
    } catch (err) {
      console.error('Requeue failed', err);
      setError({ message: (err as Error).message || 'Requeue failed', code: 'REQUEUE_FAILED' });
      toast.error('Failed to requeue job');
      setIsLoading(false);
    }
  }, [startJobPolling]);

  // Smoothly animate displayedProgress toward progress
  useEffect(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const step = () => {
      setDisplayedProgress((prev) => {
        const target = Math.max(0, Math.min(100, progress));
        if (Math.abs(target - prev) < 0.5) {
          return target;
        }
        // ease the value toward target
        return prev + (target - prev) * 0.15;
      });
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
  }, [progress]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopJobPolling();
    };
  }, []);

  // Load existing results on mount
  useEffect(() => {
    if (session?.user) {
      loadExistingResults();
    }
  }, [session]);

  const loadExistingResults = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/tools/agritech-universities/results?page=1&limit=100");

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, redirect will handle this
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Convert database format to UI format
        const uiResults: UniversityData[] = data.results.map((row: any) => ({
          University: row.university || "Unknown",
          Country: row.country || "Unknown",
          Region: row.region || "Unknown",
          Website: row.website || "N/A",
          "Has TTO?": row.hasTto ? "Yes" : "No",
          "TTO Page URL": row.ttoPageUrl || "N/A",
          "Incubation Record": row.incubationRecord || "Not Found",
          "Apollo/LinkedIn Search URL": row.linkedinSearchUrl || "N/A",
        }));

        setResults(uiResults);
        setLastUpdated(new Date());

        if (data.results.length >= 100) {
          toast.info("Showing last 100 results. Use pagination for more.");
        }
      } else {
        // No existing results, show empty state
        setResults([]);
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error loading existing results:", error);

      // Don't show error for loading existing results, just log it
      // Users can still start new extractions
      toast.error("Failed to load previous results", { duration: 3000 });
    }
  }, [session]);

  const handleDownloadCSV = useCallback(() => {
    if (results.length === 0) {
      toast.error("No data to download");
      return;
    }

    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const headers = Object.keys(results[0]);
      const csvContent = [
        headers.join(","),
        ...results.map(row =>
          headers.map(header => {
            const value = row[header as keyof UniversityData] || "";
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const escaped = value.toString().replace(/"/g, '""');
            return /[,\"\n]/.test(escaped) ? `"${escaped}"` : escaped;
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `agritech-universities-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.success(`Downloaded ${results.length} universities`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download CSV");
    } finally {
      setIsDownloading(false);
    }
  }, [results, isDownloading]);

  // Show loading state during initialization
  if (isInitializing || sessionStatus === "loading") {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect handled by useEffect
  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <University className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agritech Universities Extractor</h1>
            <p className="text-muted-foreground">
              Extract and analyze universities with agriculture departments in Thailand
            </p>
          </div>
        </div>

        {lastUpdated && (
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </div>

      <Separator />

      {/* Extraction Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Extraction Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure the extraction parameters and start the analysis process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="limit" className="text-sm font-medium">
                Maximum Universities to Process
              </Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="100"
                value={universityLimit}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 100) {
                    setUniversityLimit(value);
                  }
                }}
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Process 1-100 universities (higher numbers take longer)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Estimated Processing Time</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  ~{Math.ceil(universityLimit * 0.5)} - {Math.ceil(universityLimit * 1.5)} minutes
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on current load and processing speed
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                This will analyze university websites for agriculture departments, TTOs, and incubation programs
              </span>
            </div>

            <Button
              onClick={handleExtract}
              disabled={isLoading || universityLimit < 1 || universityLimit > 100}
              size="lg"
              aria-busy={isLoading}
              className={`min-w-[160px] rounded-full px-5 py-2 flex items-center justify-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm ${isLoading || universityLimit < 1 || universityLimit > 100 ? 'opacity-60 cursor-not-allowed bg-muted/10 text-muted-foreground' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {isLoading ? (
                <>
                  <span className="inline-flex items-center justify-center p-2 rounded-full bg-white/10">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center p-2 rounded-full bg-white/10">
                    <Search className="h-4 w-4 text-white" />
                  </span>
                  <span className="font-medium">Start Extraction</span>
                </>
              )}
            </Button>
          </div>

          {/* Progress Section */}
          {isLoading && currentJobId && (
            <div className="p-4 bg-muted/60 rounded-lg border border-muted/30 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-md bg-muted/10 flex items-center justify-center">
                    {jobStatus?.state === 'waiting' && <Clock className="h-5 w-5 text-yellow-400" />}
                    {jobStatus?.state === 'active' && <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />}
                    {jobStatus?.state === 'completed' && <CheckCircle className="h-5 w-5 text-green-400" />}
                  </div>

                  <div>
                    <div className="text-sm font-semibold">
                      {jobStatus?.state === 'waiting' ? 'Queued for processing' : jobStatus?.state === 'active' ? 'Processing universities' : jobStatus?.state === 'completed' ? 'Extraction completed' : jobStatus?.state === 'failed' ? 'Extraction failed' : 'Job status'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Job ID: <span className="font-mono">{currentJobId.slice(0, 8)}...</span></div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/10 text-sm">
                    <RefreshCw className={`h-4 w-4 ${jobStatus?.state === 'active' ? 'animate-spin text-blue-400' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{jobStatus?.state === 'active' ? 'Processing...' : jobStatus?.state === 'waiting' ? 'Queued' : jobStatus?.state === 'completed' ? 'Completed' : 'Status'}</span>
                  </div>
                  <div className="mt-2 text-lg font-semibold">{Math.round(Math.max(0, Math.min(100, displayedProgress))) }%</div>
                  <div className="mt-3 flex items-center gap-2">
                    {jobStatus?.state === 'active' && (
                      <Button size="sm" variant="destructive" onClick={handleAbort}>
                        Abort
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Progress value={Math.max(0, Math.min(100, displayedProgress))} className="w-full h-3 rounded-full" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span aria-live="polite">{Math.round(Math.max(0, Math.min(100, displayedProgress)))}% complete</span>
                  <span>
                    {jobStatus?.state === 'waiting' && 'Waiting in queue...'}
                    {jobStatus?.state === 'active' && 'Analyzing university data...'}
                    {jobStatus?.state === 'completed' && 'Results ready for download'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Last Job Summary */}
          {lastJobSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last Extraction Summary</CardTitle>
                <CardDescription>
                  Processed {lastJobSummary.processedCount} items on {new Date(lastJobSummary.finishedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lastJobSummary.summary ? <p className="text-sm text-muted-foreground">{lastJobSummary.summary}</p> : <p className="text-sm text-muted-foreground">No summary available.</p>}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.code && (
              <div className="mt-2 text-xs text-muted-foreground">
                Error code: {error.code}
                {error.retryAfter && (
                  <div>Retry after: {Math.ceil(error.retryAfter / 60)} minutes</div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      {results.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Extraction Results</CardTitle>
                  <CardDescription>
                    Found {results.length} universities with agriculture departments
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => loadExistingResults()}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={handleDownloadCSV}
                  disabled={isDownloading}
                  size="sm"
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">University</TableHead>
                      <TableHead className="font-semibold">Country</TableHead>
                      <TableHead className="font-semibold">Region</TableHead>
                      <TableHead className="font-semibold">Website</TableHead>
                      <TableHead className="font-semibold">TTO</TableHead>
                      <TableHead className="font-semibold">TTO URL</TableHead>
                      <TableHead className="font-semibold">Incubation</TableHead>
                      <TableHead className="font-semibold">LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((uni, index) => (
                      <TableRow key={`${uni.University}-${index}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium max-w-xs">
                          <div className="flex items-center space-x-2">
                            <University className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate" title={uni.University}>
                              {uni.University}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{uni.Country}</TableCell>
                        <TableCell className="text-muted-foreground">{uni.Region}</TableCell>
                        <TableCell>
                          {uni.Website !== "N/A" ? (
                            <a
                              href={uni.Website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              <Globe className="h-4 w-4" />
                              <span className="underline">Visit</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={uni["Has TTO?"] === "Yes" ? "default" : "secondary"}
                            className={uni["Has TTO?"] === "Yes" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}
                          >
                            {uni["Has TTO?"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {uni["TTO Page URL"] !== "N/A" ? (
                            <a
                              href={uni["TTO Page URL"]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                            >
                              Link
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span
                            className="text-sm truncate block"
                            title={uni["Incubation Record"]}
                          >
                            {uni["Incubation Record"]}
                          </span>
                        </TableCell>
                        <TableCell>
                          {uni["Apollo/LinkedIn Search URL"] !== "N/A" ? (
                            <a
                              href={uni["Apollo/LinkedIn Search URL"]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              <Linkedin className="h-4 w-4" />
                              <span className="underline">LinkedIn</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !isLoading && !error ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Start an extraction to analyze universities with agriculture departments in Thailand.
              The process will scan university websites for relevant information.
            </p>
            <Button onClick={handleExtract} disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              Start Your First Extraction
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
