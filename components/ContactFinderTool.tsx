'use client';

// ============================================================================
// CONTACT FINDER TOOL — MAIN UI COMPONENT
// Professional contact finder with Perplexity AI integration
// Matches the existing dashboard design language (SentimentAnalyzerTool pattern)
// ============================================================================

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Search, Users, ExternalLink,
  History, Download, Trash2, ChevronDown, ChevronUp,
  Globe, Mail, Phone, Linkedin, Instagram, Facebook, Twitter,
  UserSearch, Building2, MapPin, ShieldCheck, ShieldAlert, ShieldQuestion,
  Eye, CalendarDays, XCircle, Copy, Check
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ContactFinderResult,
  ContactFinderSearch,
  SearchContactResponse,
  GetHistoryResponse,
  CONFIDENCE_COLORS,
} from '@/types/contact-finder';

// ============================================================================
// CONSTANTS
// ============================================================================

const POPULAR_COUNTRIES = [
  'Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam',
  'Philippines', 'Hong Kong', 'India', 'Australia', 'Japan',
  'United States', 'United Kingdom', 'Germany', 'Netherlands',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContactFinderTool() {
  const { data: session } = useSession();

  // Search form state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState(0); // 0-4 for progress animation

  // Results state
  const [contacts, setContacts] = useState<ContactFinderResult[]>([]);
  const [searchMeta, setSearchMeta] = useState<{
    searchId: string;
    company: string;
    role: string;
    country: string;
    rawResponse: string;
    citations: string[];
    createdAt: string;
  } | null>(null);

  // History state
  const [activeTab, setActiveTab] = useState('search');
  const [searchHistory, setSearchHistory] = useState<ContactFinderSearch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [expandedContacts, setExpandedContacts] = useState<ContactFinderResult[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ============================================================================
  // FETCH HISTORY
  // ============================================================================

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/contact-finder/history?limit=50');
      const data: GetHistoryResponse = await response.json();
      if (data.success && data.searches) {
        setSearchHistory(data.searches);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // ============================================================================
  // SEARCH HANDLER
  // ============================================================================

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    if (!role.trim()) {
      toast.error('Please enter a target role/title');
      return;
    }

    setLoading(true);
    setContacts([]);
    setSearchMeta(null);
    setSearchStep(1);

    // Simulate step progression for UX
    const stepInterval = setInterval(() => {
      setSearchStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 3000);

    try {
      const response = await fetch('/api/contact-finder/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), role: role.trim(), country: country.trim() }),
      });

      const data: SearchContactResponse = await response.json();

      if (data.success && data.contacts) {
        setContacts(data.contacts);
        setSearchMeta({
          searchId: data.searchId!,
          company: data.company!,
          role: data.role!,
          country: data.country!,
          rawResponse: data.rawResponse || '',
          citations: data.citations || [],
          createdAt: data.createdAt as string,
        });
        toast.success(`Found ${data.contacts.length} contact(s)!`);
      } else {
        toast.error(data.message || 'Search failed. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      clearInterval(stepInterval);
      setSearchStep(0);
      setLoading(false);
    }
  };

  // ============================================================================
  // HISTORY HANDLERS
  // ============================================================================

  const handleExpandSearch = async (searchId: string) => {
    if (expandedSearchId === searchId) {
      setExpandedSearchId(null);
      setExpandedContacts([]);
      return;
    }

    setExpandedSearchId(searchId);
    setExpandLoading(true);

    try {
      const response = await fetch(`/api/contact-finder/history/${searchId}`);
      const data = await response.json();
      if (data.success && data.search?.contacts) {
        setExpandedContacts(data.search.contacts);
      }
    } catch (error) {
      console.error('Error fetching search details:', error);
      toast.error('Failed to load search details');
    } finally {
      setExpandLoading(false);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    try {
      const response = await fetch(`/api/contact-finder/history/${searchId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setSearchHistory(prev => prev.filter(s => s.id !== searchId));
        if (expandedSearchId === searchId) {
          setExpandedSearchId(null);
          setExpandedContacts([]);
        }
        toast.success('Search deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error('Failed to delete search');
    }
  };

  const handleClearHistory = async () => {
    try {
      const response = await fetch('/api/contact-finder/history', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setSearchHistory([]);
        setExpandedSearchId(null);
        setExpandedContacts([]);
        toast.success('All history cleared');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    }
  };

  // ============================================================================
  // EXPORT TO CSV
  // ============================================================================

  const exportToCSV = (contactsToExport: ContactFinderResult[], prefix = 'contacts') => {
    if (contactsToExport.length === 0) {
      toast.error('No contacts to export');
      return;
    }

    const headers = ['Name', 'Title', 'Email', 'Phone', 'LinkedIn', 'Instagram', 'Facebook', 'Twitter/X', 'Source', 'Confidence'];
    const rows = contactsToExport.map(c => [
      c.name || '',
      c.title || '',
      c.email || '',
      c.phone || '',
      c.linkedin || '',
      c.instagram || '',
      c.facebook || '',
      c.twitter || '',
      c.source || '',
      c.confidence || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}-${company || 'search'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  // ============================================================================
  // COPY TO CLIPBOARD
  // ============================================================================

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ============================================================================
  // CONFIDENCE ICON
  // ============================================================================

  const ConfidenceIcon = ({ level }: { level: string }) => {
    switch (level) {
      case 'high':
        return <ShieldCheck className="h-3.5 w-3.5" />;
      case 'medium':
        return <ShieldAlert className="h-3.5 w-3.5" />;
      default:
        return <ShieldQuestion className="h-3.5 w-3.5" />;
    }
  };

  // ============================================================================
  // SEARCH STEP LABELS
  // ============================================================================

  const STEP_LABELS = [
    '',
    'Generating search prompt...',
    'Searching with Perplexity AI...',
    'Extracting contacts with NLP...',
    'Saving results...',
  ];

  // ============================================================================
  // RENDER: CONTACT TABLE
  // ============================================================================

  const renderContactTable = (contactList: ContactFinderResult[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" id="contact-finder-results-table">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="text-left py-3 px-4 font-semibold text-gray-300">#</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Name & Title</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Contact</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Social</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Source</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-300">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {contactList.map((contact, index) => (
            <tr
              key={contact.id}
              className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors"
            >
              {/* # */}
              <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                {index + 1}
              </td>

              {/* Name & Title */}
              <td className="py-3 px-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-white">{contact.name || 'Unknown'}</span>
                  <span className="text-xs text-gray-400">{contact.title || 'Unknown'}</span>
                </div>
              </td>

              {/* Contact (Email & Phone) */}
              <td className="py-3 px-4">
                <div className="flex flex-col gap-1.5">
                  {contact.email && (
                    <button
                      onClick={() => copyToClipboard(contact.email!, `email-${contact.id}`)}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors group"
                    >
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{contact.email}</span>
                      {copiedField === `email-${contact.id}` ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  )}
                  {contact.phone && (
                    <button
                      onClick={() => copyToClipboard(contact.phone!, `phone-${contact.id}`)}
                      className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors group"
                    >
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{contact.phone}</span>
                      {copiedField === `phone-${contact.id}` ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  )}
                  {!contact.email && !contact.phone && (
                    <span className="text-xs text-gray-500 italic">No contact info</span>
                  )}
                </div>
              </td>

              {/* Social Media */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {contact.linkedin && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-colors"
                          >
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent><p>LinkedIn</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {contact.instagram && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={contact.instagram.startsWith('http') ? contact.instagram : `https://${contact.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md bg-pink-600/20 text-pink-400 hover:bg-pink-600/30 hover:text-pink-300 transition-colors"
                          >
                            <Instagram className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent><p>Instagram</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {contact.facebook && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={contact.facebook.startsWith('http') ? contact.facebook : `https://${contact.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-colors"
                          >
                            <Facebook className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent><p>Facebook</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {contact.twitter && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={contact.twitter.startsWith('http') ? contact.twitter : `https://${contact.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 hover:text-gray-200 transition-colors"
                          >
                            <Twitter className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent><p>Twitter/X</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {!contact.linkedin && !contact.instagram && !contact.facebook && !contact.twitter && (
                    <span className="text-xs text-gray-500 italic">None</span>
                  )}
                </div>
              </td>

              {/* Source */}
              <td className="py-3 px-4">
                {contact.source && contact.source !== 'No source available' ? (
                  <a
                    href={contact.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">
                      {new URL(contact.source).hostname.replace('www.', '')}
                    </span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </td>

              {/* Confidence */}
              <td className="py-3 px-4">
                <Badge
                  className={`${CONFIDENCE_COLORS[contact.confidence as keyof typeof CONFIDENCE_COLORS] || CONFIDENCE_COLORS.low} text-xs font-medium border`}
                >
                  <ConfidenceIcon level={contact.confidence} />
                  <span className="ml-1 capitalize">{contact.confidence}</span>
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl" id="contact-finder-tool">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
              <UserSearch className="h-8 w-8 text-white" />
            </div>
            Contact Finder
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered professional contact search across public sources
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="search" className="flex items-center gap-2" id="tab-search">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" id="tab-history">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* SEARCH TAB */}
        {/* ================================================================ */}
        <TabsContent value="search" className="space-y-6 mt-6">
          {/* Search Form */}
          <Card className="border-2 border-cyan-500/20" id="search-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-cyan-400" />
                Find Professional Contacts
              </CardTitle>
              <CardDescription>
                Enter a company, role, and country to search across LinkedIn, company websites, social media, and government registries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Row 1: Company Name */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="e.g., Tokopedia, Grab, Gojek"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={loading}
                      className="h-12 text-base pl-10"
                      id="input-company"
                    />
                  </div>
                </div>

                {/* Row 2: Role + Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1.5 block">Target Role / Title</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="e.g., CTO, Head of Investment, CEO"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={loading}
                        className="h-12 pl-10"
                        id="input-role"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1.5 block">Country (Optional)</label>
                    <Select value={country} onValueChange={setCountry} disabled={loading}>
                      <SelectTrigger className="h-12" id="select-country">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select a country (optional)" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Global">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            Global (Worldwide)
                          </div>
                        </SelectItem>
                        {POPULAR_COUNTRIES.map(c => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              {c}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
                  size="lg"
                  id="btn-search"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {STEP_LABELS[searchStep] || 'Searching...'}
                    </>
                  ) : (
                    <>
                      <UserSearch className="mr-2 h-5 w-5" />
                      Find Contacts
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Loading Progress */}
          {loading && (
            <Card className="border-cyan-500/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                    <span className="text-sm font-medium">{STEP_LABELS[searchStep] || 'Processing...'}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(step => (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                          step <= searchStep
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-gray-500">
                    <span>Prompt</span>
                    <span>AI Search</span>
                    <span>NLP Extract</span>
                    <span>Save</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {contacts.length > 0 && searchMeta && (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Found {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {searchMeta.role} at {searchMeta.company} ({searchMeta.country})
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(contacts, 'contacts')}
                    id="btn-export"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-green-500/5 border-green-500/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        {contacts.filter(c => c.confidence === 'high').length}
                      </div>
                      <div className="text-xs text-gray-400">High Confidence</div>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-green-500/40" />
                  </CardContent>
                </Card>
                <Card className="bg-yellow-500/5 border-yellow-500/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {contacts.filter(c => c.confidence === 'medium').length}
                      </div>
                      <div className="text-xs text-gray-400">Medium Confidence</div>
                    </div>
                    <ShieldAlert className="h-8 w-8 text-yellow-500/40" />
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-400">
                        {contacts.filter(c => c.confidence === 'low').length}
                      </div>
                      <div className="text-xs text-gray-400">Low Confidence</div>
                    </div>
                    <ShieldQuestion className="h-8 w-8 text-red-500/40" />
                  </CardContent>
                </Card>
              </div>

              {/* Results Table */}
              <Card>
                <CardContent className="p-0">
                  {renderContactTable(contacts)}
                </CardContent>
              </Card>

              {/* Citations */}
              {searchMeta.citations && searchMeta.citations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-400">
                      <ExternalLink className="h-4 w-4" />
                      Sources & Citations ({searchMeta.citations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {searchMeta.citations.map((url, i) => {
                        let hostname = url;
                        try { hostname = new URL(url).hostname.replace('www.', ''); } catch {}
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700/50"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {hostname}
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && contacts.length === 0 && (
            <Card className="border-dashed border-gray-700" id="empty-state">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full p-6 mb-4">
                  <UserSearch className="h-12 w-12 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Find Professional Contacts</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  Enter a company name, target role, and country above to search for professional contacts
                  across LinkedIn, company websites, social media, and government registries.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCompany('Tokopedia'); setRole('CTO'); setCountry('Indonesia'); }}
                  >
                    Try: CTO at Tokopedia
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCompany('Grab'); setRole('Head of Investment'); setCountry('Singapore'); }}
                  >
                    Try: Head of Investment at Grab
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* HISTORY TAB */}
        {/* ================================================================ */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {/* History Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-gray-400" />
              Search History
            </h2>
            {searchHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                id="btn-clear-history"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* History Loading */}
          {historyLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          )}

          {/* History Empty */}
          {!historyLoading && searchHistory.length === 0 && (
            <Card className="border-dashed border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-gray-600 mb-3" />
                <h3 className="text-lg font-semibold mb-1">No Search History</h3>
                <p className="text-sm text-gray-500">
                  Your searches will appear here after you make your first search.
                </p>
              </CardContent>
            </Card>
          )}

          {/* History List */}
          {!historyLoading && searchHistory.length > 0 && (
            <div className="space-y-3">
              {searchHistory.map(search => (
                <Card
                  key={search.id}
                  className={`transition-all duration-300 ${
                    expandedSearchId === search.id ? 'border-cyan-500/30' : 'border-gray-700/50'
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Search Summary Row */}
                    <div className="flex items-center justify-between p-4">
                      <button
                        onClick={() => handleExpandSearch(search.id)}
                        className="flex-1 flex items-center gap-4 text-left group"
                      >
                        <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                          <Building2 className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {search.company}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {search.role}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {search.country}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {search.createdAt
                                ? new Date(search.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </div>
                        {expandedSearchId === search.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                        className="ml-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Expanded Results */}
                    {expandedSearchId === search.id && (
                      <div className="border-t border-gray-700/50 px-4 pb-4">
                        {expandLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                          </div>
                        ) : expandedContacts.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                {expandedContacts.length} contact{expandedContacts.length !== 1 ? 's' : ''} found
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToCSV(expandedContacts, `history-${search.company}`)}
                                className="h-7 text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                            </div>
                            {renderContactTable(expandedContacts)}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-gray-500 text-sm">
                            No contacts found in this search.
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
