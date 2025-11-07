"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wrench, ArrowLeft, Loader2, RefreshCw, Mail, CheckCircle2, Eye, Edit, Search, User, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AIToolRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  status: string;
  criticality?: string;
  team?: string;
  department?: string;
  aiToolCategory?: string;
  businessGoal?: string;
  businessSteps?: string;
  dueDate?: string;
  problemStatement?: string;
  expectedOutcome?: string;
  dataSources?: string;
  constraints?: string;
  manualSteps?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminAIToolsRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<AIToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<AIToolRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchRequests();
        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tickets");
      if (response.ok) {
        const data = await response.json();
        const allTickets = data.tickets || [];
        // Filter only AI Tools requests - identified by having aiToolCategory field
        const aiToolsRequests = allTickets.filter((ticket: AIToolRequest) => 
          ticket.aiToolCategory && ticket.aiToolCategory.trim() !== ""
        );
        setRequests(aiToolsRequests);
      } else {
        toast.error("Failed to load AI tools requests");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Error loading AI tools requests");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: AIToolRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleUpdateStatus = (request: AIToolRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setShowStatusDialog(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Request status updated to ${newStatus}`);
        setShowStatusDialog(false);
        fetchRequests();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating request status");
    } finally {
      setUpdating(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.aiToolCategory && request.aiToolCategory.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || request.aiToolCategory === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "In Progress": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      Closed: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getCriticalityBadge = (criticality?: string) => {
    const colors: Record<string, string> = {
      Low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      Medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      Urgent: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[criticality || "Medium"] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status === "Open").length,
    inProgress: requests.filter((r) => r.status === "In Progress").length,
    closed: requests.filter((r) => r.status === "Closed").length,
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
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
              <Wrench className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold">AI Tools Requests</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage AI tools development requests from ALL units - Real-time database updates
            </p>
          </div>
          <Button onClick={fetchRequests} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by title, email, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="chatbot">Chatbot / Conversational AI</SelectItem>
                <SelectItem value="data-analysis">Data Analysis & Insights</SelectItem>
                <SelectItem value="automation">Process Automation</SelectItem>
                <SelectItem value="content-generation">Content Generation</SelectItem>
                <SelectItem value="image-video">Image/Video Generation</SelectItem>
                <SelectItem value="prediction">Prediction & Forecasting</SelectItem>
                <SelectItem value="search-retrieval">Search & Information Retrieval</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 text-gray-600 dark:text-gray-400">
        Showing {filteredRequests.length} of {requests.length} requests
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All AI Tools Requests</CardTitle>
          <CardDescription>Real-time requests from all units - Auto-refreshes every 30 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Requested By (Unit)</TableHead>
                <TableHead>Business Goal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No AI tools requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {request.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.aiToolCategory}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{request.requestedBy}</span>
                        </div>
                        {request.team && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {request.team}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs truncate">{request.businessGoal}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(request.status)}>{request.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(request)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Update
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedRequest?.title}</DialogTitle>
            <DialogDescription>Complete AI tools request details</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Requested By</label>
                  <p className="text-sm font-medium mt-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedRequest.requestedBy}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusBadge(selectedRequest.status)}>
                      {selectedRequest.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">From Unit/Team</label>
                  <p className="text-sm font-medium mt-1">{selectedRequest.team || selectedRequest.department || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">AI Tool Category</label>
                  <p className="text-sm font-medium mt-1">{selectedRequest.aiToolCategory}</p>
                </div>
                {selectedRequest.dueDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Due Date</label>
                    <p className="text-sm font-medium mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {selectedRequest.dueDate}
                    </p>
                  </div>
                )}
                {selectedRequest.criticality && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Criticality</label>
                    <div className="mt-1">
                      <Badge className={getCriticalityBadge(selectedRequest.criticality)}>
                        {selectedRequest.criticality}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Business Goal
                </label>
                <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">{selectedRequest.businessGoal}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Business Steps</label>
                <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">{selectedRequest.businessSteps}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              {selectedRequest.problemStatement && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Problem Statement</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.problemStatement}
                  </p>
                </div>
              )}

              {selectedRequest.expectedOutcome && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expected Outcome</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.expectedOutcome}
                  </p>
                </div>
              )}

              {selectedRequest.dataSources && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data Sources</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.dataSources}
                  </p>
                </div>
              )}

              {selectedRequest.constraints && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Constraints</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.constraints}
                  </p>
                </div>
              )}

              {selectedRequest.manualSteps && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Manual Steps Today</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.manualSteps}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>
              Change the status of: {selectedRequest?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={confirmStatusUpdate} disabled={updating || !newStatus}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
