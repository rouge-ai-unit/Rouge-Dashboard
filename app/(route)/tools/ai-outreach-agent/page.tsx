'use client';

import React, { useState } from 'react';
import { InputForm } from '@/components/ai-outreach-agent/InputForm';
import { LeadCard } from '@/components/ai-outreach-agent/LeadCard';
import type { Lead, FormData } from '@/types/ai-outreach-agent';
import { generateOutreachList } from '@/lib/ai-outreach-agent';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export default function AIOutreachAgentPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateList = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setLeads([]);
    try {
      const result = await generateOutreachList(formData);
      setLeads(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const InitialState = () => (
    <div className="text-center p-8 bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
        <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
      </div>
      <h3 className="mt-5 text-lg font-medium text-slate-900 dark:text-slate-100">
        Your outreach list will appear here
      </h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Fill out your company profile above to get started.
      </p>
    </div>
  );

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="rounded-md bg-red-50 dark:bg-red-900/40 p-4 border border-red-200 dark:border-red-600/50">
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            Error Generating List
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-400">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      <InputForm onSubmit={handleGenerateList} isLoading={isLoading} />
      
      <div className="space-y-6">
        {error && <ErrorMessage message={error} />}
        {!error && leads.length === 0 && !isLoading && <InitialState />}
        {leads.map((lead, index) => (
          <LeadCard key={index} lead={lead} />
        ))}
      </div>
    </div>
  );
}