"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Database,
  FileSpreadsheet,
  TestTube,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CRMSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Notion settings
  const [notionApiKey, setNotionApiKey] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [notionConnected, setNotionConnected] = useState(false);

  // Google Sheets settings
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState('');
  const [googleSheetName, setGoogleSheetName] = useState('');
  const [googleCredentials, setGoogleCredentials] = useState('');
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    loadSettings();
    return () => {
      setGoogleCredentials('');
      setNotionApiKey('');
    };
  }, [session, status, router]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Load saved settings from API
      const response = await fetch('/api/cold-outreach/settings/crm');
      if (response.ok) {
        const data = await response.json();
        setNotionApiKey(data.notion?.apiKey || '');
        setNotionDatabaseId(data.notion?.databaseId || '');
        setNotionConnected(data.notion?.connected || false);
        setGoogleSpreadsheetId(data.google?.spreadsheetId || '');
        setGoogleSheetName(data.google?.sheetName || '');
        setGoogleCredentials(data.google?.credentials || '');
        setGoogleConnected(data.google?.connected || false);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (provider: 'notion' | 'google_sheets') => {
    try {
      const config = provider === 'notion'
        ? (() => {
            const c: any = { databaseId: notionDatabaseId };
            if (notionApiKey?.trim()) c.apiKey = notionApiKey.trim();
            return c;
          })()
        : (() => {
            const c: any = { spreadsheetId: googleSpreadsheetId, sheetName: googleSheetName };
            if (googleCredentials?.trim()) c.credentials = googleCredentials.trim();
            return c;
          })();

      const response = await fetch('/api/cold-outreach/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          provider,
          config
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
        });
        if (provider === 'notion') setNotionConnected(true);
        else setGoogleConnected(true);
      } else {
        toast({
          title: "Connection Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    }
  };

  const syncContacts = async (provider: 'notion' | 'google_sheets') => {
    try {
      setSyncing(true);

      const config = provider === 'notion'
        ? (() => {
            const c: any = { databaseId: notionDatabaseId };
            if (notionApiKey?.trim()) c.apiKey = notionApiKey.trim();
            return c;
          })()
        : (() => {
            const c: any = { spreadsheetId: googleSpreadsheetId, sheetName: googleSheetName };
            if (googleCredentials?.trim()) c.credentials = googleCredentials.trim();
            return c;
          })();

      const response = await fetch('/api/cold-outreach/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_contacts',
          provider,
          config
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Sync Completed",
          description: result.message,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "An error occurred during sync.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const exportContacts = async (provider: 'notion' | 'google_sheets') => {
    try {
      const config = provider === 'notion'
        ? (() => {
            const c: any = { databaseId: notionDatabaseId };
            if (notionApiKey?.trim()) c.apiKey = notionApiKey.trim();
            return c;
          })()
        : (() => {
            const c: any = { spreadsheetId: googleSpreadsheetId, sheetName: googleSheetName };
            if (googleCredentials?.trim()) c.credentials = googleCredentials.trim();
            return c;
          })();

      const response = await fetch('/api/cold-outreach/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_contacts',
          provider,
          config
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Export Completed",
          description: result.message,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred during export.",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/cold-outreach/settings/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notion: {
            databaseId: notionDatabaseId,
            connected: notionConnected
          },
          google: {
            spreadsheetId: googleSpreadsheetId,
            sheetName: googleSheetName,
            connected: googleConnected
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your CRM integration settings have been saved.",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
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
          <h1 className="text-3xl font-bold">CRM Integrations</h1>
          <p className="text-muted-foreground">
            Connect your CRM tools to sync contacts and manage campaigns
          </p>
        </div>
        <Button onClick={saveSettings}>
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="notion" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notion" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Notion
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Google Sheets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Notion Integration
                {notionConnected && <Badge variant="secondary">Connected</Badge>}
              </CardTitle>
              <CardDescription>
                Sync contacts from your Notion database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notion-api-key">API Key</Label>
                  <Input
                    id="notion-api-key"
                    type="password"
                    value={notionApiKey}
                    onChange={(e) => setNotionApiKey(e.target.value)}
                    placeholder="secret_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notion-database-id">Database ID</Label>
                  <Input
                    id="notion-database-id"
                    value={notionDatabaseId}
                    onChange={(e) => setNotionDatabaseId(e.target.value)}
                    placeholder="12345678-1234-1234-1234-123456789012"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection('notion')}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Test Connection
                </Button>
                <Button
                  onClick={() => syncContacts('notion')}
                  disabled={!notionConnected || syncing}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {syncing ? 'Syncing...' : 'Sync Contacts'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportContacts('notion')}
                  disabled={!notionConnected}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Export Contacts
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure your Notion database has columns for: Name, Email, Role, Company, LinkedIn URL, Website, Location, Notes
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Google Sheets Integration
                {googleConnected && <Badge variant="secondary">Connected</Badge>}
              </CardTitle>
              <CardDescription>
                Sync contacts from your Google Sheets spreadsheet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="google-spreadsheet-id">Spreadsheet ID</Label>
                  <Input
                    id="google-spreadsheet-id"
                    value={googleSpreadsheetId}
                    onChange={(e) => setGoogleSpreadsheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-sheet-name">Sheet Name</Label>
                  <Input
                    id="google-sheet-name"
                    value={googleSheetName}
                    onChange={(e) => setGoogleSheetName(e.target.value)}
                    placeholder="Contacts"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-credentials">Service Account Credentials (JSON)</Label>
                <textarea
                  id="google-credentials"
                  className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                  value={googleCredentials}
                  onChange={(e) => setGoogleCredentials(e.target.value)}
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection('google_sheets')}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Test Connection
                </Button>
                <Button
                  onClick={() => syncContacts('google_sheets')}
                  disabled={!googleConnected || syncing}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {syncing ? 'Syncing...' : 'Sync Contacts'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportContacts('google_sheets')}
                  disabled={!googleConnected}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Export Contacts
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Google Sheet should have headers: Name, Email, Role, Company, LinkedIn URL, Website, Location, Notes
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
