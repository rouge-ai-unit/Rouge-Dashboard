"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, AlertTriangle, Lock, Activity, TrendingUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";

interface FailedLogin {
  id: string;
  email: string;
  ipAddress: string;
  errorMessage: string;
  createdAt: string;
}

interface SecurityStats {
  totalFailedLogins: number;
  uniqueIPs: number;
  suspiciousActivity: number;
  lockedAccounts: number;
}

export default function SecurityDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState("7days");
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalFailedLogins: 0,
    uniqueIPs: 0,
    suspiciousActivity: 0,
    lockedAccounts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchSecurityData();
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router, period]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/security/failed-logins?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setFailedLogins(data.failedLogins || []);
        setStats(data.stats || stats);
      } else {
        toast.error("Failed to fetch security data");
      }
    } catch (error) {
      console.error("Error fetching security data:", error);
      toast.error("Error loading security data");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (count: number) => {
    if (count >= 5) return "text-red-600 bg-red-50 dark:bg-red-900/20";
    if (count >= 3) return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
    return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold">Security Dashboard</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor failed logins, suspicious activity, and security threats
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Failed Login Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{stats.totalFailedLogins}</div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Unique IP Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-orange-600">{stats.uniqueIPs}</div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Suspicious Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-600">{stats.suspiciousActivity}</div>
              <Eye className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Locked Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{stats.lockedAccounts}</div>
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Logins Table */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Recent Failed Login Attempts
          </CardTitle>
          <CardDescription>
            Monitor failed authentication attempts and potential security threats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedLogins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No failed login attempts found
                    </TableCell>
                  </TableRow>
                ) : (
                  failedLogins.map((login) => {
                    const attemptsFromIP = failedLogins.filter(l => l.ipAddress === login.ipAddress).length;
                    return (
                      <TableRow key={login.id}>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(login.createdAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{login.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{login.ipAddress}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {login.errorMessage}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(attemptsFromIP)}>
                            {attemptsFromIP >= 5 ? "High" : attemptsFromIP >= 3 ? "Medium" : "Low"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
