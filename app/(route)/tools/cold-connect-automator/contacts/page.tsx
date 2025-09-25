"use client";

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCSVProcessor } from '@/hooks/useCSVProcessor';
import {
  ArrowLeft,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Upload,
  Download,
  Users,
  Building,
  Briefcase,
  Clock,
  AlertCircle,
  Mail,
  Linkedin,
  Globe,
  MapPin,
  BarChart3,
  TrendingUp,
  UserPlus,
  Filter,
  X,
  Eye,
  Phone,
  Calendar,
  Target,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Contact } from '@/lib/cold-outreach/contacts';
import { formatDistanceToNow } from 'date-fns';

type ContactWithStats = Contact & {
  tags?: string[];
  segments?: string[];
};

const parseDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseNullableDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  return parseDate(value) ?? null;
};

const normalizeContactRecord = (contact: any): ContactWithStats => {
  const tags = Array.isArray(contact.tags) ? contact.tags.map((tag: unknown) => String(tag)) : [];
  const segments = Array.isArray(contact.segments) ? contact.segments.map((segment: unknown) => String(segment)) : [];
  const engagementScore = typeof contact.engagementScore === 'number'
    ? contact.engagementScore
    : Number(contact.engagementScore ?? 0);
  const campaignCount = typeof contact.campaignCount === 'number'
    ? contact.campaignCount
    : Number(contact.campaignCount ?? 0);

  return {
    ...contact,
    createdAt: parseDate(contact.createdAt),
    updatedAt: parseDate(contact.updatedAt),
    lastContactedAt: parseNullableDate(contact.lastContactedAt),
    lastRepliedAt: parseNullableDate(contact.lastRepliedAt),
    lastOpenedAt: parseNullableDate(contact.lastOpenedAt),
    lastContacted: parseNullableDate(contact.lastContacted),
    engagementScore,
    status: contact.status ?? 'active',
    tags,
    segments,
    campaignCount,
  };
};

interface ContactMetrics {
  totalContacts: number;
  activeContacts: number;
  qualifiedContacts: number;
  avgEngagementScore: number;
  recentAdditions: number;
  topCompanies: Array<{ name: string; count: number }>;
}

interface FilterOptions {
  search: string;
  status: string;
  company: string;
  role: string;
  engagement: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const MetricCard = memo(({
  title,
  value,
  change,
  icon: Icon,
  color,
  loading = false
}: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  color: string;
  loading?: boolean;
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {change && (
                <span className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {change}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
    </CardContent>
  </Card>
));

MetricCard.displayName = 'MetricCard';

const ContactCard = memo(({
  contact,
  onEdit,
  onDelete,
  onViewDetails
}: {
  contact: ContactWithStats;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onViewDetails: (contact: ContactWithStats) => void;
}) => {
  const getEngagementColor = (score?: number) => {
    if (!score) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (score >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 60) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'qualified': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'inactive': return 'bg-gray-500';
      case 'disqualified': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{contact.firstName || ''} {contact.lastName || ''}</h3>
              <p className="text-sm text-muted-foreground">{contact.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contact.status && (
              <Badge variant="secondary" className={getStatusColor(contact.status)}>
                {contact.status}
              </Badge>
            )}
            {contact.engagementScore && (
              <Badge variant="outline" className={getEngagementColor(contact.engagementScore)}>
                {contact.engagementScore}% engaged
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {contact.company && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{contact.company}</span>
            </div>
          )}
          {contact.role && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{contact.role}</span>
            </div>
          )}
          {contact.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{contact.location}</span>
            </div>
          )}
          {contact.lastContacted && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Last contacted {formatDistanceToNow(new Date(contact.lastContacted), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {contact.linkedinUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${contact.firstName || ''}'s LinkedIn profile`}>
                  <Linkedin className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            )}
            {contact.website && (
              <Button size="sm" variant="outline" asChild>
                <a href={contact.website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${contact.firstName || ''}'s website`}>
                  <Globe className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>

          <div className="flex gap-2" role="group" aria-label={`Actions for ${contact.firstName || ''} ${contact.lastName || ''}`}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(contact)}
              aria-label={`View details for ${contact.firstName || ''} ${contact.lastName || ''}`}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(contact)}
              aria-label={`Edit contact ${contact.firstName || ''} ${contact.lastName || ''}`}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" aria-label={`Delete contact ${contact.firstName || ''} ${contact.lastName || ''}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {contact.firstName || ''} {contact.lastName || ''}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(contact.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ContactCard.displayName = 'ContactCard';

export default function ContactsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<ContactWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactDetails, setSelectedContactDetails] = useState<ContactWithStats | null>(null);
  const [metrics, setMetrics] = useState<ContactMetrics | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    company: 'all',
    role: 'all',
    engagement: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { toast } = useToast();
  const { processFile } = useCSVProcessor();

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    role: '',
    linkedinUrl: '',
    website: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    fetchContacts();
    fetchMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchContacts();
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [session, status, router]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cold-outreach/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');

      const data = await response.json();
      const normalizedContacts = Array.isArray(data.contacts)
        ? data.contacts.map(normalizeContactRecord)
        : [];
      setContacts(normalizedContacts);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/cold-outreach/contacts/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      // Don't show error toast for metrics as it's not critical
    }
  };

  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(contact =>
        (contact.firstName?.toLowerCase().includes(searchTerm) ?? false) ||
        (contact.lastName?.toLowerCase().includes(searchTerm) ?? false) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm) ||
        contact.role?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(contact => contact.status === filters.status);
    }

    // Company filter
    if (filters.company !== 'all') {
      filtered = filtered.filter(contact => contact.company === filters.company);
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(contact => contact.role === filters.role);
    }

    // Engagement filter
    if (filters.engagement !== 'all') {
      filtered = filtered.filter(contact => {
        const score = contact.engagementScore || 0;
        switch (filters.engagement) {
          case 'high': return score >= 80;
          case 'medium': return score >= 60 && score < 80;
          case 'low': return score >= 40 && score < 60;
          case 'very-low': return score < 40;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'engagement':
          aValue = a.engagementScore || 0;
          bValue = b.engagementScore || 0;
          break;
        case 'lastContacted':
          aValue = a.lastContacted ? new Date(a.lastContacted).getTime() : 0;
          bValue = b.lastContacted ? new Date(b.lastContacted).getTime() : 0;
          break;
        default:
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contacts, filters]);

  const resetForm = useCallback(() => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      role: '',
      linkedinUrl: '',
      website: '',
      location: '',
      notes: '',
    });
  }, []);

  const handleCreateContact = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name, last name, and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/cold-outreach/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create contact');

      const data = await response.json();
      if (data.contact) {
        const normalizedContact = normalizeContactRecord(data.contact);
        setContacts(prev => [normalizedContact, ...prev]);
      }
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Contact created successfully',
      });
      fetchMetrics(); // Refresh metrics
    } catch (err) {
      console.error('Error creating contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!selectedContact || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name, last name, and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/cold-outreach/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: selectedContact.id }),
      });

      if (!response.ok) throw new Error('Failed to update contact');

      const data = await response.json();
      if (data.contact) {
        const normalizedContact = normalizeContactRecord(data.contact);
        setContacts(prev => prev.map(c => c.id === selectedContact.id ? normalizedContact : c));
      }
      setShowEditDialog(false);
      setSelectedContact(null);
      resetForm();
      toast({
        title: 'Success',
        description: 'Contact updated successfully',
      });
    } catch (err) {
      console.error('Error updating contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to update contact',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const response = await fetch('/api/cold-outreach/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete contact');

      setContacts(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Success',
        description: 'Contact deleted successfully',
      });
      fetchMetrics(); // Refresh metrics
    } catch (err) {
      console.error('Error deleting contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email,
      company: contact.company || '',
      role: contact.role || '',
      linkedinUrl: contact.linkedinUrl || '',
      website: contact.website || '',
      location: contact.location || '',
      notes: contact.notes || '',
    });
    setShowEditDialog(true);
  };

  const handleViewDetails = (contact: ContactWithStats) => {
    setSelectedContactDetails(contact);
    setShowDetailsDialog(true);
  };

  const exportContacts = () => {
    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Company', 'Role', 'Location', 'Status', 'Engagement Score', 'Last Contacted'],
      ...filteredContacts.map(contact => [
        contact.firstName || '',
        contact.lastName || '',
        contact.email,
        contact.company || '',
        contact.role || '',
        contact.location || '',
        contact.status || '',
        contact.engagementScore?.toString() || '',
        contact.lastContacted || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Contacts exported successfully',
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      company: 'all',
      role: 'all',
      engagement: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" aria-hidden="true" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/tools/cold-connect-automator')}
        className="-ml-2 w-fit text-muted-foreground hover:text-primary"
        aria-label="Back to Cold Connect dashboard"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your cold outreach contacts and track engagement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportContacts} aria-label="Export contacts data">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" aria-label="Create a new contact">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your cold outreach database.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="CEO"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this contact..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} aria-label="Cancel creating contact">
                  Cancel
                </Button>
                <Button onClick={handleCreateContact} aria-label="Create the new contact">
                  Create Contact
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Contacts"
              value={metrics?.totalContacts.toString() || '0'}
              icon={Users}
              color="bg-blue-500/20 text-blue-400"
              loading={!metrics}
            />
            <MetricCard
              title="Active Contacts"
              value={metrics?.activeContacts.toString() || '0'}
              icon={UserPlus}
              color="bg-green-500/20 text-green-400"
              loading={!metrics}
            />
            <MetricCard
              title="Qualified Leads"
              value={metrics?.qualifiedContacts.toString() || '0'}
              icon={Target}
              color="bg-purple-500/20 text-purple-400"
              loading={!metrics}
            />
            <MetricCard
              title="Avg Engagement"
              value={`${metrics?.avgEngagementScore.toFixed(1) || '0'}%`}
              icon={TrendingUp}
              color="bg-orange-500/20 text-orange-400"
              loading={!metrics}
            />
          </div>

          {/* Recent Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Contacts</CardTitle>
              <CardDescription>Recently added contacts to your database</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Contacts Yet</h3>
                  <p className="text-muted-foreground mb-4">Start building your contact database by adding your first contact.</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContacts.slice(0, 5).map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.firstName || ''} {contact.lastName || ''}</p>
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.company && (
                          <Badge variant="outline">{contact.company}</Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(contact)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="contact-search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="contact-search"
                      placeholder="Search contacts..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                      aria-describedby="contact-search-help"
                    />
                  </div>
                  <p id="contact-search-help" className="sr-only">Search by name, email, company, or role</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger aria-label="Filter contacts by status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="disqualified">Disqualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Company</Label>
                  <Select
                    value={filters.company}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, company: value }))}
                  >
                    <SelectTrigger aria-label="Filter contacts by company">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {Array.from(new Set(contacts.map(c => c.company).filter(Boolean))).map(company => (
                        <SelectItem key={company} value={company!}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={filters.role}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger aria-label="Filter contacts by role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {Array.from(new Set(contacts.map(c => c.role).filter(Boolean))).map(role => (
                        <SelectItem key={role} value={role!}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Engagement</Label>
                  <Select
                    value={filters.engagement}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, engagement: value }))}
                  >
                    <SelectTrigger aria-label="Filter contacts by engagement level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High (80%+)</SelectItem>
                      <SelectItem value="medium">Medium (60-79%)</SelectItem>
                      <SelectItem value="low">Low (40-59%)</SelectItem>
                      <SelectItem value="very-low">Very Low ({'<'}40%)</SelectItem>                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort By</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger aria-label="Sort contacts">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date Added</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="lastContacted">Last Contacted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={clearFilters} aria-label="Clear all filters">
                  <X className="h-4 w-4 mr-2" aria-hidden="true" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Grid */}
          {error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Error Loading Contacts</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => fetchContacts()}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredContacts.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Contacts Found</h3>
                        <p className="text-muted-foreground mb-6">
                          {filters.search || filters.status !== 'all' || filters.company !== 'all' || filters.role !== 'all' || filters.engagement !== 'all'
                            ? 'No contacts match your current filters.'
                            : 'Start building your contact database by adding your first contact.'}
                        </p>
                        {(!filters.search && filters.status === 'all' && filters.company === 'all' && filters.role === 'all' && filters.engagement === 'all') && (
                          <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Contact
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={handleEdit}
                    onDelete={handleDeleteContact}
                    onViewDetails={handleViewDetails}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Analytics</CardTitle>
              <CardDescription>Detailed insights into your contact database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">Advanced contact analytics and insights will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Input
                  id="edit-role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-linkedinUrl">LinkedIn URL</Label>
              <Input
                id="edit-linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} aria-label="Cancel editing contact">
              Cancel
            </Button>
            <Button onClick={handleUpdateContact} aria-label="Update the contact">
              Update Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedContactDetails?.firstName} {selectedContactDetails?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedContactDetails && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedContactDetails.firstName} {selectedContactDetails.lastName}</h3>
                  <p className="text-muted-foreground">{selectedContactDetails.email}</p>
                  {selectedContactDetails.status && (
                    <Badge className="mt-1" variant={selectedContactDetails.status === 'qualified' ? 'default' : 'secondary'}>
                      {selectedContactDetails.status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Company</Label>
                    <p className="text-sm text-muted-foreground">{selectedContactDetails.company || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Role</Label>
                    <p className="text-sm text-muted-foreground">{selectedContactDetails.role || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Location</Label>
                    <p className="text-sm text-muted-foreground">{selectedContactDetails.location || 'Not specified'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Engagement Score</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedContactDetails.engagementScore ? `${selectedContactDetails.engagementScore}%` : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Contacted</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedContactDetails.lastContacted ? formatDistanceToNow(new Date(selectedContactDetails.lastContacted), { addSuffix: true }) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Campaigns</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedContactDetails.campaignCount || 0} active campaigns
                    </p>
                  </div>
                </div>
              </div>

              {selectedContactDetails.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedContactDetails.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedContactDetails.linkedinUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedContactDetails.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                {selectedContactDetails.website && (
                  <Button variant="outline" asChild>
                    <a href={selectedContactDetails.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleEdit(selectedContactDetails)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contact
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
