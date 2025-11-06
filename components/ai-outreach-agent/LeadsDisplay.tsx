import React, { useState, useMemo } from 'react';
import { Lead, LeadType, LEAD_TYPE_LABELS } from '@/types/ai-outreach-agent';
import { LeadCard } from './LeadCard';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, Download, X, Eye, Mail, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface OutreachList {
  id: string;
  title: string;
  companyDescription: string;
  targetAudiences: string[];
  status: string;
  leadCount: number;
  createdAt: string;
}

interface LeadsDisplayProps {
  leads: Lead[];
  isLoading?: boolean;
  lists?: OutreachList[];
  currentListId?: string;
  onListSelect?: (list: OutreachList) => void;
  isLoadingLists?: boolean;
}

export const LeadsDisplay: React.FC<LeadsDisplayProps> = ({
  leads,
  isLoading = false,
  lists = [],
  currentListId,
  onListSelect,
  isLoadingLists = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<LeadType[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'relevance'>('type');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      const matchesSearch = !searchQuery ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.relevance.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.outreach_suggestion.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(lead.type);

      return matchesSearch && matchesType;
    });

    // Sort leads
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'relevance':
          return b.relevance.length - a.relevance.length; // Longer relevance first
        default:
          return 0;
      }
    });

    return filtered;
  }, [leads, searchQuery, selectedTypes, sortBy]);

  const exportToCSV = () => {
    if (filteredAndSortedLeads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const headers = ['Name', 'Type', 'Relevance', 'Outreach Suggestion'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedLeads.map(lead => [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.type}"`,
        `"${lead.relevance.replace(/"/g, '""')}"`,
        `"${lead.outreach_suggestion.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outreach-leads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredAndSortedLeads.length} leads to CSV`);
  };

  const exportToJSON = () => {
    if (filteredAndSortedLeads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const jsonContent = JSON.stringify(filteredAndSortedLeads, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outreach-leads-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredAndSortedLeads.length} leads to JSON`);
  };

  const exportEmailList = () => {
    if (filteredAndSortedLeads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    // Create a formatted email list
    const emailContent = filteredAndSortedLeads.map((lead, index) => 
      `${index + 1}. ${lead.name} (${LEAD_TYPE_LABELS[lead.type]})\n   Subject: Partnership Opportunity\n   Message: ${lead.outreach_suggestion}\n`
    ).join('\n');

    const blob = new Blob([emailContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `email-campaign-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredAndSortedLeads.length} leads for email campaign`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSortBy('type');
  };

  const toggleTypeFilter = (type: LeadType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            Generating your personalized outreach list...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            No leads generated yet. Fill out the form above to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* List Selector */}
      {lists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Outreach Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => (
                <Badge
                  key={list.id}
                  variant={currentListId === list.id ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => onListSelect?.(list)}
                >
                  {list.title} ({list.leadCount} leads)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Outreach Leads ({filteredAndSortedLeads.length} of {leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, relevance, or outreach message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter by type:</span>
            {Object.values(LeadType).map(type => (
              <Badge
                key={type}
                variant={selectedTypes.includes(type) ? "default" : "outline"}
                className="cursor-pointer hover:bg-accent"
                onClick={() => toggleTypeFilter(type)}
              >
                {LEAD_TYPE_LABELS[type]}
                {selectedTypes.includes(type) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>

          {/* Sort and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="relevance">Relevance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
              <Button onClick={exportToCSV} size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Display */}
      <Card>
        <CardHeader>
          <CardTitle>Outreach Leads ({filteredAndSortedLeads.length} of {leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                Generating your personalized outreach list...
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads generated yet. Fill out the form above to get started.
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search leads by name, relevance, or outreach message..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="relevance">Relevance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filters */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Filter by type:</span>
                  {Object.values(LeadType).map(type => (
                    <Badge
                      key={type}
                      variant={selectedTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => toggleTypeFilter(type)}
                    >
                      {LEAD_TYPE_LABELS[type]}
                      {selectedTypes.includes(type) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearFilters} size="sm">
                      Clear Filters
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToCSV} size="sm" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                    <Button onClick={exportToJSON} size="sm" variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      JSON
                    </Button>
                    <Button onClick={exportEmailList} size="sm" variant="outline" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email List
                    </Button>
                  </div>
                </div>

                {filteredAndSortedLeads.length !== leads.length && (
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAndSortedLeads.length} of {leads.length} leads
                  </p>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block w-full overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/5">Lead</TableHead>
                      <TableHead className="w-1/6">Type</TableHead>
                      <TableHead className="w-2/5">Strategic Fit</TableHead>
                      <TableHead className="w-1/6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedLeads.map((lead, index) => (
                      <TableRow key={`${lead.name}-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium truncate" title={lead.name}>{lead.name}</div>
                            <div className="text-sm text-muted-foreground truncate" title={lead.relevance}>
                              {lead.relevance.substring(0, 80)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {LEAD_TYPE_LABELS[lead.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm line-clamp-2" title={lead.outreach_suggestion}>
                            {lead.outreach_suggestion.substring(0, 100)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLead(lead)}
                              className="h-8 w-8 p-0"
                              title="View lead details"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(lead.outreach_suggestion);
                                toast.success('Outreach message copied!');
                              }}
                              className="h-8 w-8 p-0"
                              title="Copy outreach message"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                              title="Compose email"
                            >
                              <a
                                href={`mailto:?subject=Partnership Opportunity&body=${encodeURIComponent(lead.outreach_suggestion)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Mail className="h-3 w-3" />
                              </a>
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
                {filteredAndSortedLeads.map((lead, index) => (
                  <LeadCard key={`${lead.name}-${index}`} lead={lead} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              {selectedLead?.name}
            </DialogTitle>
            <DialogDescription>
              Detailed lead information and outreach strategy
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Type Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {LEAD_TYPE_LABELS[selectedLead.type]}
                </Badge>
              </div>

              {/* Strategic Fit */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Strategic Fit</h4>
                <p className="text-sm leading-relaxed">{selectedLead.relevance}</p>
              </div>

              {/* Outreach Message */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Suggested Outreach Message</h4>
                <div className="relative">
                  <div className="p-4 border rounded-lg bg-muted/50 text-sm leading-relaxed">
                    {selectedLead.outreach_suggestion}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedLead.outreach_suggestion);
                      toast.success('Outreach message copied!');
                    }}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedLead.outreach_suggestion);
                    toast.success('Outreach message copied!');
                  }}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Message
                </Button>
                <Button
                  asChild
                  className="flex items-center gap-2"
                >
                  <a
                    href={`mailto:?subject=Partnership Opportunity with ${selectedLead.name}&body=${encodeURIComponent(selectedLead.outreach_suggestion)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Mail className="h-4 w-4" />
                    Compose Email
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};