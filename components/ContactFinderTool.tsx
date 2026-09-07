'use client';

// ============================================================================
// CONTACT FINDER TOOL — MAIN UI COMPONENT
// Two independent lookup modes backed by the Hunter.io API:
//   1. Search by Name      → POST /api/contact-finder/email-finder
//   2. Search by Job Title  → POST /api/contact-finder/domain-search
// ============================================================================

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, UserSearch, Building2, ExternalLink } from 'lucide-react';
import {
  EmailFinderResponse,
  DomainSearchResponse,
  DomainContact,
  HunterVerification,
} from '@/types/contact-finder';

const COMPANY_PLACEHOLDER = 'e.g. Acme Inc or acme.com';

function pct(value: number | null | undefined): string {
  return value == null ? '-' : `${value}%`;
}

function VerificationBadge({ verification }: { verification: HunterVerification | null }) {
  if (!verification || !verification.status) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const status = verification.status;
  const variant =
    status === 'valid'
      ? 'default'
      : status === 'invalid' || status === 'disposable'
        ? 'destructive'
        : 'secondary';
  return (
    <Badge variant={variant} className="capitalize">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { success?: boolean; message?: string };
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status}).`);
  }
  return data;
}

// ---------------------------------------------------------------------------

export default function ContactFinderTool() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Contact Finder
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Find someone&apos;s email by name + company, or list a company&apos;s contacts by
          job title. Powered by the Hunter.io API.
        </p>
      </div>

      <Tabs defaultValue="name">
        <TabsList className="mb-6">
          <TabsTrigger value="name">
            <UserSearch className="mr-1.5 h-4 w-4" />
            Search by Name
          </TabsTrigger>
          <TabsTrigger value="title">
            <Building2 className="mr-1.5 h-4 w-4" />
            Search by Job Title
          </TabsTrigger>
        </TabsList>

        <TabsContent value="name">
          <SearchByName />
        </TabsContent>
        <TabsContent value="title">
          <SearchByJobTitle />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Mode 1: Search by Name -----------------------------------------------

function SearchByName() {
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailFinderResponse | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !company.trim()) {
      toast.warning('Full name and company are required.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await postJson<EmailFinderResponse>('/api/contact-finder/email-finder', {
        fullName: fullName.trim(),
        company: company.trim(),
      });
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search by Name + Company</CardTitle>
        <CardDescription>Returns the single most likely email for that person.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cf-fullname">Full name</label>
            <Input
              id="cf-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cf-company-name">Company</label>
            <Input
              id="cf-company-name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={COMPANY_PLACEHOLDER}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Find Email
          </Button>
        </form>

        {result && (
          <div className="mt-6">
            {!result.email ? (
              <p className="text-muted-foreground text-sm">
                {result.message || 'No email found for that name and company.'}
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">
                  Email found: <span className="font-semibold">{result.email}</span>
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{result.email}</dd>
                  <dt className="text-muted-foreground">Confidence score</dt>
                  <dd>{pct(result.score)}</dd>
                  <dt className="text-muted-foreground">Position</dt>
                  <dd>{result.position || '-'}</dd>
                  <dt className="text-muted-foreground">Company</dt>
                  <dd>{result.company || '-'}</dd>
                  <dt className="text-muted-foreground">Domain</dt>
                  <dd>{result.domain || '-'}</dd>
                  <dt className="text-muted-foreground">Verification</dt>
                  <dd><VerificationBadge verification={result.verification ?? null} /></dd>
                </dl>

                {result.sources && result.sources.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Sources ({result.sources.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {result.sources.map((s, i) => (
                        <li key={i}>
                          <a
                            href={s.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {s.uri || s.domain}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Mode 2: Search by Job Title -----------------------------------------

function SearchByJobTitle() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainSearchResponse | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !company.trim()) {
      toast.warning('Job title and company are required.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await postJson<DomainSearchResponse>('/api/contact-finder/domain-search', {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        showAll,
      });
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search by Job Title + Company</CardTitle>
        <CardDescription>
          Pulls every contact Hunter.io has for the company, then filters by job title.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cf-jobtitle">Job title</label>
            <Input
              id="cf-jobtitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Marketing Manager"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="cf-company-title">Company</label>
            <Input
              id="cf-company-title"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={COMPANY_PLACEHOLDER}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showAll}
              onCheckedChange={(v) => setShowAll(v === true)}
            />
            Show all contacts even if the job title doesn&apos;t match exactly
          </label>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Find Contacts
          </Button>
        </form>

        {result && <JobTitleResults result={result} jobTitle={jobTitle.trim()} />}
      </CardContent>
    </Card>
  );
}

function JobTitleResults({ result, jobTitle }: { result: DomainSearchResponse; jobTitle: string }) {
  const contacts = result.contacts ?? [];
  const noRows = contacts.length === 0;

  let message: { tone: 'info' | 'success'; text: string } | null = null;
  if (result.totalCount === 0) {
    message = { tone: 'info', text: 'No contacts were found for that company.' };
  } else if (result.matchedCount === 0 && !result.showingAll) {
    message = {
      tone: 'info',
      text: `No contacts found with a job title containing "${jobTitle}". Check "Show all contacts" to see the full list.`,
    };
  } else if (result.showingAll) {
    message = {
      tone: 'info',
      text: `No job titles matched "${jobTitle}", showing all available contacts instead.`,
    };
  } else {
    message = {
      tone: 'success',
      text: `Found ${result.matchedCount} contact(s) with a matching job title.`,
    };
  }

  return (
    <div className="mt-6 space-y-4">
      {message && (
        <p className={message.tone === 'success' ? 'text-sm font-medium' : 'text-muted-foreground text-sm'}>
          {message.text}
        </p>
      )}

      {!noRows && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left [&>th]:py-2 [&>th]:pr-4 [&>th]:font-semibold">
                <th>Name</th>
                <th>Job Title</th>
                <th>Email</th>
                <th>Confidence</th>
                <th>Department</th>
                <th>Seniority</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c: DomainContact, i) => (
                <tr key={i} className="border-b [&>td]:py-2 [&>td]:pr-4 align-top">
                  <td>{c.name || '-'}</td>
                  <td>{c.position || '-'}</td>
                  <td className="break-all">{c.email || '-'}</td>
                  <td>{pct(c.confidence)}</td>
                  <td>{c.department || '-'}</td>
                  <td>{c.seniority || '-'}</td>
                  <td><VerificationBadge verification={c.verification} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
