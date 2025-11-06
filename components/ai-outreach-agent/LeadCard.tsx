import React, { useState } from 'react';
import type { Lead } from '@/types/ai-outreach-agent';
import { LEAD_TYPE_LABELS } from '@/types/ai-outreach-agent';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, Mail, Building, Users, DollarSign, Handshake, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface LeadCardProps {
  lead: Lead;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'VC':
      return <DollarSign className="h-4 w-4" />;
    case 'Corporate Client':
      return <Building className="h-4 w-4" />;
    case 'Farmer Cooperative':
      return <Users className="h-4 w-4" />;
    case 'Angel Investor':
      return <DollarSign className="h-4 w-4" />;
    case 'Strategic Partner':
      return <Handshake className="h-4 w-4" />;
    default:
      return <Building className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'VC':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'Corporate Client':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'Farmer Cooperative':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'Angel Investor':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'Strategic Partner':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'active' | 'contacted' | 'responded' | 'archived'>('active');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [editForm, setEditForm] = useState({
    notes: '',
    contactInfo: {
      email: '',
      linkedin: '',
      website: '',
      phone: '',
    }
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateEmailLink = (lead: Lead) => {
    const subject = encodeURIComponent(`Partnership Opportunity with ${lead.name}`);
    const body = encodeURIComponent(lead.outreach_suggestion);
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSave = async () => {
    try {
      const updateData: any = {};

      // Only include fields that have changed
      if (status !== 'active') updateData.status = status;
      if (priority !== 3) updateData.priority = priority;
      if (editForm.notes.trim()) updateData.notes = editForm.notes.trim();
      if (editForm.contactInfo.email || editForm.contactInfo.linkedin || editForm.contactInfo.website || editForm.contactInfo.phone) {
        updateData.contactInfo = {};
        if (editForm.contactInfo.email) updateData.contactInfo.email = editForm.contactInfo.email;
        if (editForm.contactInfo.linkedin) updateData.contactInfo.linkedin = editForm.contactInfo.linkedin;
        if (editForm.contactInfo.website) updateData.contactInfo.website = editForm.contactInfo.website;
        if (editForm.contactInfo.phone) updateData.contactInfo.phone = editForm.contactInfo.phone;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        setIsEditing(false);
        return;
      }

      const response = await fetch(`/api/ai-outreach-agent/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lead');
      }

      const result = await response.json();
      toast.success('Lead updated successfully');
      setIsEditing(false);

      // Reset form
      setEditForm({
        notes: '',
        contactInfo: {
          email: '',
          linkedin: '',
          website: '',
          phone: '',
        }
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update lead');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form
    setEditForm({
      notes: '',
      contactInfo: {
        email: '',
        linkedin: '',
        website: '',
        phone: '',
      }
    });
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              {getTypeIcon(lead.type)}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-2">
                {lead.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={`text-xs ${getTypeColor(lead.type)}`}
                >
                  {LEAD_TYPE_LABELS[lead.type]}
                </Badge>
                <Badge
                  variant={status === 'active' ? 'default' : status === 'contacted' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {status}
                </Badge>
                <Badge
                  variant={priority >= 4 ? 'default' : priority >= 3 ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  P{priority}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(lead.name, 'Lead name')}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0"
            >
              <a
                href={generateEmailLink(lead)}
                target="_blank"
                rel="noopener noreferrer"
                title="Compose email"
              >
                <Mail className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            Strategic Fit
          </h4>
          <p className={`text-sm text-foreground leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {lead.relevance}
          </p>
          {lead.relevance.length > 150 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 h-auto text-xs mt-1"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </Button>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Mail className="h-3 w-3" />
            Suggested Outreach Message
          </h4>
          <div className="relative">
            <Textarea
              value={lead.outreach_suggestion}
              readOnly
              className="min-h-[80px] text-sm resize-none bg-muted/50"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(lead.outreach_suggestion, 'Outreach message')}
              className="absolute top-2 right-2 h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>

      {isEditing && (
        <CardContent className="border-t bg-muted/50">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Edit Lead Details</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Status</label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium">Priority (1-5)</label>
                <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value) as 1 | 2 | 3 | 4 | 5)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 - High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Contact Information</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input
                  placeholder="Email"
                  value={editForm.contactInfo.email}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="LinkedIn URL"
                  value={editForm.contactInfo.linkedin}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, linkedin: e.target.value }
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Website"
                  value={editForm.contactInfo.website}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, website: e.target.value }
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Phone"
                  value={editForm.contactInfo.phone}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                  }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Notes</label>
              <Textarea
                placeholder="Add notes about this lead..."
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[60px] text-xs mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="flex items-center gap-1">
                <Save className="h-3 w-3" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};