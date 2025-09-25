"use client";

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Shield,
  Settings as SettingsIcon,
  Mail,
  Key,
  Database,
  Palette,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  TestTube,
  Zap,
  Link,
  Unlink,
  ExternalLink
} from 'lucide-react';
import { UserSettingsData } from '@/lib/settings';

type SettingsFormData = Omit<UserSettingsData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

const SettingCard = memo(({
  title,
  description,
  icon: Icon,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={className}>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
));

SettingCard.displayName = 'SettingCard';

const ApiKeyCard = memo(({
  apiKey,
  onDelete,
  onToggleVisibility
}: {
  apiKey: { id: string; name: string; key: string; createdAt: string; lastUsed?: string };
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}) => {
  const [showKey, setShowKey] = useState(false);

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-medium">{apiKey.name}</h4>
            <p className="text-sm text-muted-foreground">
              Created: {new Date(apiKey.createdAt).toLocaleDateString()}
              {apiKey.lastUsed && ` • Last used: ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {showKey ? apiKey.key : maskKey(apiKey.key)}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowKey(!showKey);
                  onToggleVisibility(apiKey.id);
                }}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(apiKey.key)}
                aria-label="Copy API key to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" aria-label={`Delete API key ${apiKey.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the API key &quot;{apiKey.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(apiKey.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
});

ApiKeyCard.displayName = 'ApiKeyCard';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<SettingsFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form data
  const [formData, setFormData] = useState<SettingsFormData>({
    profile: {
      firstName: '',
      lastName: '',
      company: '',
      role: '',
      timezone: 'UTC',
      avatar: '',
    },
    notifications: {
      email: true,
      push: true,
      sound: false,
      pollInterval: 30,
      ticketUpdates: true,
      workTracker: true,
      campaignUpdates: true,
      contactUpdates: true,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 60,
      apiKeys: [],
    },
    integrations: {
      sendgrid: {
        verified: false,
      },
      googleSheets: {
        connected: false,
      },
      notion: {
        connected: false,
      },
      linkedin: {
        connected: false,
      },
    },
    coldOutreach: {
      defaultCampaignSettings: {
        dailyLimit: 50,
        followUpDelay: 3,
        maxFollowUps: 5,
      },
      emailTemplates: {
        defaultSubject: 'Following up on our conversation',
        defaultSignature: 'Best regards,\n[Your Name]',
      },
      crmSync: {
        autoSync: false,
        syncInterval: 6,
      },
    },
    system: {
      theme: 'system',
      language: 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      dataRetention: 365,
      exportFormat: 'csv',
    },
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      const settingsData = data.settings as UserSettingsData;

      // Merge with defaults - ensure all required properties are present
      const mergedSettings: SettingsFormData = {
        profile: {
          firstName: settingsData.profile?.firstName || formData.profile!.firstName,
          lastName: settingsData.profile?.lastName || formData.profile!.lastName,
          company: settingsData.profile?.company || formData.profile!.company,
          role: settingsData.profile?.role || formData.profile!.role,
          timezone: settingsData.profile?.timezone || formData.profile!.timezone,
          avatar: settingsData.profile?.avatar || formData.profile!.avatar,
        },
        notifications: {
          email: settingsData.notifications?.email ?? formData.notifications!.email,
          push: settingsData.notifications?.push ?? formData.notifications!.push,
          sound: settingsData.notifications?.sound ?? formData.notifications!.sound,
          pollInterval: settingsData.notifications?.pollInterval ?? formData.notifications!.pollInterval,
          ticketUpdates: settingsData.notifications?.ticketUpdates ?? formData.notifications!.ticketUpdates,
          workTracker: settingsData.notifications?.workTracker ?? formData.notifications!.workTracker,
          campaignUpdates: settingsData.notifications?.campaignUpdates ?? formData.notifications!.campaignUpdates,
          contactUpdates: settingsData.notifications?.contactUpdates ?? formData.notifications!.contactUpdates,
        },
        security: {
          twoFactorEnabled: settingsData.security?.twoFactorEnabled ?? formData.security!.twoFactorEnabled,
          sessionTimeout: settingsData.security?.sessionTimeout ?? formData.security!.sessionTimeout,
          passwordLastChanged: settingsData.security?.passwordLastChanged,
          apiKeys: settingsData.security?.apiKeys || formData.security!.apiKeys,
        },
        integrations: {
          sendgrid: {
            apiKey: settingsData.integrations?.sendgrid?.apiKey,
            verified: settingsData.integrations?.sendgrid?.verified ?? formData.integrations!.sendgrid.verified,
            fromEmail: settingsData.integrations?.sendgrid?.fromEmail,
            fromName: settingsData.integrations?.sendgrid?.fromName,
          },
          googleSheets: {
            connected: settingsData.integrations?.googleSheets?.connected ?? formData.integrations!.googleSheets.connected,
            spreadsheetId: settingsData.integrations?.googleSheets?.spreadsheetId,
            sheetName: settingsData.integrations?.googleSheets?.sheetName,
          },
          notion: {
            connected: settingsData.integrations?.notion?.connected ?? formData.integrations!.notion.connected,
            databaseId: settingsData.integrations?.notion?.databaseId,
          },
          linkedin: {
            connected: settingsData.integrations?.linkedin?.connected ?? formData.integrations!.linkedin.connected,
            profileUrl: settingsData.integrations?.linkedin?.profileUrl,
          },
        },
        coldOutreach: {
          defaultCampaignSettings: {
            dailyLimit: settingsData.coldOutreach?.defaultCampaignSettings?.dailyLimit ?? formData.coldOutreach!.defaultCampaignSettings.dailyLimit,
            followUpDelay: settingsData.coldOutreach?.defaultCampaignSettings?.followUpDelay ?? formData.coldOutreach!.defaultCampaignSettings.followUpDelay,
            maxFollowUps: settingsData.coldOutreach?.defaultCampaignSettings?.maxFollowUps ?? formData.coldOutreach!.defaultCampaignSettings.maxFollowUps,
          },
          emailTemplates: {
            defaultSubject: settingsData.coldOutreach?.emailTemplates?.defaultSubject ?? formData.coldOutreach!.emailTemplates.defaultSubject,
            defaultSignature: settingsData.coldOutreach?.emailTemplates?.defaultSignature ?? formData.coldOutreach!.emailTemplates.defaultSignature,
          },
          crmSync: {
            autoSync: settingsData.coldOutreach?.crmSync?.autoSync ?? formData.coldOutreach!.crmSync.autoSync,
            syncInterval: settingsData.coldOutreach?.crmSync?.syncInterval ?? formData.coldOutreach!.crmSync.syncInterval,
          },
        },
        system: {
          theme: settingsData.system?.theme ?? formData.system!.theme,
          language: settingsData.system?.language ?? formData.system!.language,
          dateFormat: settingsData.system?.dateFormat ?? formData.system!.dateFormat,
          timeFormat: settingsData.system?.timeFormat ?? formData.system!.timeFormat,
          dataRetention: settingsData.system?.dataRetention ?? formData.system!.dataRetention,
          exportFormat: settingsData.system?.exportFormat ?? formData.system!.exportFormat,
        },
      };

      setSettings(mergedSettings);
      setFormData(mergedSettings);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      setSettings(data.settings);
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  const addApiKey = () => {
    if (!newApiKeyName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'API key name is required',
        variant: 'destructive',
      });
      return;
    }

    const newKey = {
      id: Date.now().toString(),
      name: newApiKeyName.trim(),
      key: generateApiKey(),
      createdAt: new Date().toISOString(),
    };

    setFormData(prev => ({
      ...prev,
      security: {
        ...prev.security!,
        apiKeys: [...(prev.security?.apiKeys || []), newKey],
      },
    }));

    setNewApiKeyName('');
    setShowApiKeyDialog(false);
    toast({
      title: 'Success',
      description: 'API key created successfully',
    });
  };

  const deleteApiKey = (id: string) => {
    setFormData(prev => ({
      ...prev,
      security: {
        ...prev.security!,
        apiKeys: prev.security?.apiKeys?.filter(key => key.id !== id) || [],
      },
    }));
    toast({
      title: 'Success',
      description: 'API key deleted successfully',
    });
  };

  const toggleApiKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const testNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.01);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.08);

      toast({
        title: 'Test Sound',
        description: 'Notification sound played successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to play test sound',
        variant: 'destructive',
      });
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'settings-backup.json';
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Settings exported successfully',
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        setFormData(prev => ({ ...prev, ...importedData }));
        toast({
          title: 'Success',
          description: 'Settings imported successfully. Remember to save changes.',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to import settings. Invalid file format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and system configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSettings} aria-label="Export settings">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json"
              onChange={importSettings}
              className="hidden"
              aria-label="Import settings"
            />
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          <Button onClick={saveSettings} disabled={saving} aria-label="Save all settings">
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error Loading Settings</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSettings} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="cold-outreach">Cold Outreach</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SettingCard
            title="Personal Information"
            description="Update your personal details and profile information"
            icon={User}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.profile?.firstName || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, firstName: e.target.value }
                  }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.profile?.lastName || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, lastName: e.target.value }
                  }))}
                  placeholder="Doe"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.profile?.company || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, company: e.target.value }
                  }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.profile?.role || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, role: e.target.value }
                  }))}
                  placeholder="CEO"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.profile?.timezone || 'UTC'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, timezone: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <SettingCard
            title="Notification Preferences"
            description="Configure how and when you receive notifications"
            icon={Bell}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="pollInterval">Polling Interval (seconds)</Label>
                  <Input
                    id="pollInterval"
                    type="number"
                    min={10}
                    max={300}
                    value={formData.notifications?.pollInterval || 30}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, pollInterval: Number(e.target.value) }
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How often to check for updates (10-300 seconds)
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound Notifications</Label>
                    <p className="text-sm text-muted-foreground">Play sound for new notifications</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.sound || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, sound: checked }
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.email || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, email: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.push || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, push: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ticket Updates</Label>
                    <p className="text-sm text-muted-foreground">New or changed support requests</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.ticketUpdates || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, ticketUpdates: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Work Tracker Updates</Label>
                    <p className="text-sm text-muted-foreground">Assigned tasks and status changes</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.workTracker || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, workTracker: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Campaign Updates</Label>
                    <p className="text-sm text-muted-foreground">Campaign progress and results</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.campaignUpdates || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, campaignUpdates: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contact Updates</Label>
                    <p className="text-sm text-muted-foreground">New contacts and engagement changes</p>
                  </div>
                  <Switch
                    checked={formData.notifications?.contactUpdates || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, contactUpdates: checked }
                    }))}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={testNotificationSound}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Sound
                </Button>
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SettingCard
            title="Security Settings"
            description="Manage your account security and API access"
            icon={Shield}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.security?.twoFactorEnabled ? (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                  <Switch
                    checked={formData.security?.twoFactorEnabled || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      security: { ...prev.security!, twoFactorEnabled: checked }
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min={5}
                  max={480}
                  value={formData.security?.sessionTimeout || 60}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    security: { ...prev.security!, sessionTimeout: Number(e.target.value) }
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically log out after this period of inactivity (5-480 minutes)
                </p>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="API Keys"
            description="Manage API keys for external integrations"
            icon={Key}
          >
            <div className="space-y-4">
              {formData.security?.apiKeys?.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                  onDelete={deleteApiKey}
                  onToggleVisibility={toggleApiKeyVisibility}
                />
              ))}

              {(!formData.security?.apiKeys || formData.security.apiKeys.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys created yet</p>
                </div>
              )}

              <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Create a new API key for external integrations. Keep this key secure.
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <Label htmlFor="apiKeyName">API Key Name</Label>
                    <Input
                      id="apiKeyName"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      placeholder="My Integration Key"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addApiKey}>Create Key</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </SettingCard>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <SettingCard
            title="SendGrid Integration"
            description="Configure email sending through SendGrid"
            icon={Mail}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="sendgridApiKey">API Key</Label>
                <Input
                  id="sendgridApiKey"
                  type="password"
                  value={formData.integrations?.sendgrid.apiKey || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    integrations: {
                      ...prev.integrations!,
                      sendgrid: { ...prev.integrations!.sendgrid, apiKey: e.target.value }
                    }
                  }))}
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sendgridFromEmail">From Email</Label>
                  <Input
                    id="sendgridFromEmail"
                    type="email"
                    value={formData.integrations?.sendgrid.fromEmail || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations!,
                        sendgrid: { ...prev.integrations!.sendgrid, fromEmail: e.target.value }
                      }
                    }))}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>
                <div>
                  <Label htmlFor="sendgridFromName">From Name</Label>
                  <Input
                    id="sendgridFromName"
                    value={formData.integrations?.sendgrid.fromName || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations!,
                        sendgrid: { ...prev.integrations!.sendgrid, fromName: e.target.value }
                      }
                    }))}
                    placeholder="Your Company"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {formData.integrations?.sendgrid.verified ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Verified</Badge>
                )}
                <Button variant="outline" size="sm">
                  Test Connection
                </Button>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="Google Sheets Integration"
            description="Sync contacts and data with Google Sheets"
            icon={Database}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Connection Status</Label>
                  <p className="text-sm text-muted-foreground">Connect your Google account to sync data</p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.integrations?.googleSheets.connected ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                  <Button variant="outline" size="sm">
                    {formData.integrations?.googleSheets.connected ? (
                      <>
                        <Unlink className="h-4 w-4 mr-2" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {formData.integrations?.googleSheets.connected && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                    <Input
                      id="spreadsheetId"
                      value={formData.integrations?.googleSheets.spreadsheetId || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations!,
                          googleSheets: { ...prev.integrations!.googleSheets, spreadsheetId: e.target.value }
                        }
                      }))}
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sheetName">Sheet Name</Label>
                    <Input
                      id="sheetName"
                      value={formData.integrations?.googleSheets.sheetName || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations!,
                          googleSheets: { ...prev.integrations!.googleSheets, sheetName: e.target.value }
                        }
                      }))}
                      placeholder="Contacts"
                    />
                  </div>
                </div>
              )}
            </div>
          </SettingCard>

          <SettingCard
            title="Notion Integration"
            description="Sync data with Notion databases"
            icon={Database}
          >
            <div className="flex items-center justify-between">
              <div>
                <Label>Connection Status</Label>
                <p className="text-sm text-muted-foreground">Connect your Notion workspace</p>
              </div>
              <div className="flex items-center gap-2">
                {formData.integrations?.notion.connected ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
                <Button variant="outline" size="sm">
                  {formData.integrations?.notion.connected ? (
                    <>
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="LinkedIn Integration"
            description="Connect your LinkedIn profile for enhanced outreach"
            icon={Globe}
          >
            <div className="flex items-center justify-between">
              <div>
                <Label>Connection Status</Label>
                <p className="text-sm text-muted-foreground">Link your LinkedIn profile</p>
              </div>
              <div className="flex items-center gap-2">
                {formData.integrations?.linkedin.connected ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
                <Button variant="outline" size="sm">
                  {formData.integrations?.linkedin.connected ? (
                    <>
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        <TabsContent value="cold-outreach" className="space-y-6">
          <SettingCard
            title="Default Campaign Settings"
            description="Configure default settings for new cold outreach campaigns"
            icon={Zap}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dailyLimit">Daily Email Limit</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.coldOutreach?.defaultCampaignSettings.dailyLimit || 50}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coldOutreach: {
                      ...prev.coldOutreach!,
                      defaultCampaignSettings: {
                        ...prev.coldOutreach!.defaultCampaignSettings,
                        dailyLimit: Number(e.target.value)
                      }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="followUpDelay">Follow-up Delay (days)</Label>
                <Input
                  id="followUpDelay"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.coldOutreach?.defaultCampaignSettings.followUpDelay || 3}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coldOutreach: {
                      ...prev.coldOutreach!,
                      defaultCampaignSettings: {
                        ...prev.coldOutreach!.defaultCampaignSettings,
                        followUpDelay: Number(e.target.value)
                      }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="maxFollowUps">Max Follow-ups</Label>
                <Input
                  id="maxFollowUps"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.coldOutreach?.defaultCampaignSettings.maxFollowUps || 5}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coldOutreach: {
                      ...prev.coldOutreach!,
                      defaultCampaignSettings: {
                        ...prev.coldOutreach!.defaultCampaignSettings,
                        maxFollowUps: Number(e.target.value)
                      }
                    }
                  }))}
                />
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="Email Templates"
            description="Set default email templates for campaigns"
            icon={Mail}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultSubject">Default Subject Line</Label>
                <Input
                  id="defaultSubject"
                  value={formData.coldOutreach?.emailTemplates.defaultSubject || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coldOutreach: {
                      ...prev.coldOutreach!,
                      emailTemplates: {
                        ...prev.coldOutreach!.emailTemplates,
                        defaultSubject: e.target.value
                      }
                    }
                  }))}
                  placeholder="Following up on our conversation"
                />
              </div>
              <div>
                <Label htmlFor="defaultSignature">Default Email Signature</Label>
                <Textarea
                  id="defaultSignature"
                  value={formData.coldOutreach?.emailTemplates.defaultSignature || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coldOutreach: {
                      ...prev.coldOutreach!,
                      emailTemplates: {
                        ...prev.coldOutreach!.emailTemplates,
                        defaultSignature: e.target.value
                      }
                    }
                  }))}
                  placeholder="Best regards,&#10;[Your Name]"
                  rows={4}
                />
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="CRM Sync Settings"
            description="Configure automatic synchronization with CRM systems"
            icon={RefreshCw}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">Automatically sync data with connected CRM systems</p>
                </div>
                <Switch
                  checked={formData.coldOutreach?.crmSync.autoSync || false}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    coldOutreach: {
                      ...prev.coldOutreach!,
                      crmSync: { ...prev.coldOutreach!.crmSync, autoSync: checked }
                    }
                  }))}
                />
              </div>

              {formData.coldOutreach?.crmSync.autoSync && (
                <div>
                  <Label htmlFor="syncInterval">Sync Interval (hours)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    min={1}
                    max={24}
                    value={formData.coldOutreach?.crmSync.syncInterval || 6}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      coldOutreach: {
                        ...prev.coldOutreach!,
                        crmSync: { ...prev.coldOutreach!.crmSync, syncInterval: Number(e.target.value) }
                      }
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How often to sync data (1-24 hours)
                  </p>
                </div>
              )}
            </div>
          </SettingCard>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <SettingCard
            title="Appearance"
            description="Customize the look and feel of the application"
            icon={Palette}
          >
            <div className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select
                  value={formData.system?.theme || 'system'}
                  onValueChange={(value: 'light' | 'dark' | 'system') => setFormData(prev => ({
                    ...prev,
                    system: { ...prev.system!, theme: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Language</Label>
                <Select
                  value={formData.system?.language || 'en'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    system: { ...prev.system!, language: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="Date & Time"
            description="Configure date and time display preferences"
            icon={Clock}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Format</Label>
                <Select
                  value={formData.system?.dateFormat || 'MM/dd/yyyy'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    system: { ...prev.system!, dateFormat: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Time Format</Label>
                <Select
                  value={formData.system?.timeFormat || '12h'}
                  onValueChange={(value: '12h' | '24h') => setFormData(prev => ({
                    ...prev,
                    system: { ...prev.system!, timeFormat: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="Data Management"
            description="Configure data retention and export preferences"
            icon={Database}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataRetention">Data Retention (days)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  min={30}
                  max={3650}
                  value={formData.system?.dataRetention || 365}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    system: { ...prev.system!, dataRetention: Number(e.target.value) }
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long to keep historical data (30-3650 days)
                </p>
              </div>

              <div>
                <Label>Export Format</Label>
                <Select
                  value={formData.system?.exportFormat || 'csv'}
                  onValueChange={(value: 'csv' | 'json' | 'xlsx') => setFormData(prev => ({
                    ...prev,
                    system: { ...prev.system!, exportFormat: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
