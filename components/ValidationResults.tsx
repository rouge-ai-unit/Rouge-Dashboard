"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Globe,
  Target,
  Lightbulb,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ValidationResultsProps {
  results: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ValidationResults({
  results,
  onRefresh,
  isRefreshing = false
}: ValidationResultsProps) {
  if (!results) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No validation results available</p>
        </CardContent>
      </Card>
    );
  }

  const { startup, marketData, aiAnalysis, validationMetrics, recommendations } = results;

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get score background
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Reality Check Results
              </CardTitle>
              <CardDescription>
                Validation analysis for: {startup.name}
              </CardDescription>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{startup.description}</p>
          {startup.website && (
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href={startup.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Visit Website
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Overall Validation Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Validation Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-3xl font-bold ${getScoreColor(validationMetrics.validationScore)}`}>
              {validationMetrics.validationScore}/100
            </div>
            <div className="flex-1">
              <Progress
                value={validationMetrics.validationScore}
                className="h-3"
              />
            </div>
            <Badge
              variant={validationMetrics.validationScore >= 70 ? 'default' : 'secondary'}
              className={getScoreBg(validationMetrics.validationScore)}
            >
              {validationMetrics.validationScore >= 80 ? 'Excellent' :
               validationMetrics.validationScore >= 60 ? 'Good' :
               validationMetrics.validationScore >= 40 ? 'Fair' : 'Needs Work'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(validationMetrics.uniquenessScore)}`}>
                {validationMetrics.uniquenessScore}%
              </div>
              <div className="text-xs text-gray-600">Uniqueness</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(validationMetrics.innovationLevel)}`}>
                {validationMetrics.innovationLevel}%
              </div>
              <div className="text-xs text-gray-600">Innovation</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(100 - validationMetrics.marketSaturation)}`}>
                {100 - validationMetrics.marketSaturation}%
              </div>
              <div className="text-xs text-gray-600">Market Opportunity</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${getScoreColor(validationMetrics.similarStartupsCount === 0 ? 100 : 50)}`}>
                {validationMetrics.similarStartupsCount}
              </div>
              <div className="text-xs text-gray-600">Similar Startups</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Market Saturation</h4>
              <div className="flex items-center gap-2">
                <Progress value={validationMetrics.marketSaturation} className="flex-1" />
                <span className="text-sm font-medium">{validationMetrics.marketSaturation}%</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Competitive Landscape</h4>
              <Badge
                variant={validationMetrics.competitiveLandscape === 'clear' ? 'default' :
                        validationMetrics.competitiveLandscape === 'moderate' ? 'secondary' : 'destructive'}
              >
                {validationMetrics.competitiveLandscape === 'clear' ? 'Clear' :
                 validationMetrics.competitiveLandscape === 'moderate' ? 'Moderate' : 'Crowded'}
              </Badge>
            </div>
          </div>

          {marketData.similarStartups.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Similar Startups Found</h4>
              <div className="space-y-2">
                {marketData.similarStartups.slice(0, 3).map((similar: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    <Users className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{similar.name}</div>
                      <div className="text-xs text-gray-600 line-clamp-2">{similar.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {similar.sourceName}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Score: {similar.validationScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Insights */}
      {aiAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Analysis Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Competitive Advantage</h4>
                <p className="text-sm text-gray-600">
                  {aiAnalysis.competitiveAdvantage || 'Analysis in progress...'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Market Timing</h4>
                <p className="text-sm text-gray-600">
                  {aiAnalysis.marketTiming || 'Analysis in progress...'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Scalability Potential</h4>
                <p className="text-sm text-gray-600">
                  {aiAnalysis.scalability || 'Analysis in progress...'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Risk Assessment</h4>
                <p className="text-sm text-gray-600">
                  {aiAnalysis.riskLevel || 'Analysis in progress...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Actionable Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Market Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {marketData.marketStats.totalStartups}
              </div>
              <div className="text-xs text-gray-600">Total Startups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {marketData.marketStats.averageQualityScore}%
              </div>
              <div className="text-xs text-gray-600">Avg Quality Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {marketData.marketStats.topIndustries.length}
              </div>
              <div className="text-xs text-gray-600">Industries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {marketData.marketStats.countries.length}
              </div>
              <div className="text-xs text-gray-600">Countries</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Timestamp */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Analysis completed on {new Date(results.analyzedAt).toLocaleString()}.
          Results are based on current market data and may change over time.
        </AlertDescription>
      </Alert>
    </div>
  );
}
