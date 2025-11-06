"use client";

import React, { useState, useEffect } from 'react';
import { InputForm } from '@/components/ai-outreach-agent/InputForm';
import { LeadsDisplay } from '@/components/ai-outreach-agent/LeadsDisplay';
import type { Lead, FormData } from '@/types/ai-outreach-agent';
import { AlertCircle, RefreshCw, Users, Target, TrendingUp, Zap } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

interface OutreachList {
  id: string;
  title: string;
  companyDescription: string;
  targetAudiences: string[];
  status: string;
  leadCount: number;
  createdAt: string;
  leads?: Lead[];
}

export default function AIOutreachAgentPage() {
  const [lists, setLists] = useState<OutreachList[]>([]);
  const [currentList, setCurrentList] = useState<OutreachList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFormData, setLastFormData] = useState<FormData | null>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  // Track session analytics
  useEffect(() => {
    const trackSession = async () => {
      try {
        await fetch('/api/ai-outreach-agent/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'page_view',
            metadata: { timestamp: new Date().toISOString() }
          })
        });
      } catch (err) {
        // Silently fail for analytics
      }
    };

    trackSession();
  }, []);

  const loadOutreachLists = async () => {
    try {
      setIsLoadingLists(true);
      const response = await fetch('/api/ai-outreach-agent');

      if (!response.ok) {
        throw new Error('Failed to load outreach lists');
      }

      const data = await response.json();
      setLists(data.data.lists);

      // Set the most recent list as current if available
      if (data.data.lists.length > 0) {
        const latestList = data.data.lists[0];
        await loadListDetails(latestList.id);
      }
    } catch (err) {
      console.error('Error loading lists:', err);
      toast.error('Failed to load outreach lists');
    } finally {
      setIsLoadingLists(false);
    }
  };

  const loadListDetails = async (listId: string) => {
    try {
      const response = await fetch(`/api/ai-outreach-agent/${listId}`);

      if (!response.ok) {
        throw new Error('Failed to load list details');
      }

      const data = await response.json();
      setCurrentList(data.data);
    } catch (err) {
      console.error('Error loading list details:', err);
      toast.error('Failed to load list details');
    }
  };

  const handleGenerateList = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setLastFormData(formData);

    try {
      const response = await fetch('/api/ai-outreach-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          title: `Outreach List - ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate outreach list');
      }

      const data = await response.json();

      // Add the new list to the lists array
      setLists(prev => [data.data.list, ...prev]);
      setCurrentList(data.data);

      toast.success(`Generated ${data.data.leads.length} outreach leads successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFormData) {
      handleGenerateList(lastFormData);
    }
  };

  const handleListSelect = (list: OutreachList) => {
    setCurrentList(list);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            AI Outreach Agent
          </h1>
          <p className="text-muted-foreground">
            Generate personalized outreach lists with strategic leads and tailored messaging for your business development
          </p>
        </div>
        <Button
          onClick={() => {
            loadOutreachLists();
            toast.info('Refreshing outreach lists...');
          }}
          variant="outline"
          size="sm"
          disabled={isLoadingLists}
          aria-label="Refresh outreach lists"
          aria-busy={isLoadingLists}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLists ? 'animate-spin' : ''}`} />
          {isLoadingLists ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
          <TabsTrigger
            value="generate"
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Generate Leads
          </TabsTrigger>
          <TabsTrigger
            value="portfolio"
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Outreach Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <InputForm onSubmit={handleGenerateList} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          {/* Statistics Cards */}
          {lists.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Lists</p>
                      <p className="text-2xl font-bold">{lists.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Leads</p>
                      <p className="text-2xl font-bold">{lists.reduce((sum, list) => sum + list.leadCount, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Avg Leads/List</p>
                      <p className="text-2xl font-bold">
                        {lists.length > 0 ? Math.round(lists.reduce((sum, list) => sum + list.leadCount, 0) / lists.length) : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Zap className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {lists.length > 0 ? Math.round((lists.filter(list => list.status === 'completed').length / lists.length) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <LeadsDisplay
            leads={currentList?.leads || []}
            isLoading={isLoading}
            lists={lists}
            currentListId={currentList?.id}
            onListSelect={handleListSelect}
            isLoadingLists={isLoadingLists}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}