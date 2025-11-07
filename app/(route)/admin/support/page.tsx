"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowLeft, Loader2, RefreshCw, Mail, CheckCircle2, Eye, Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Ticket {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  status: string;
  criticality?: string;
  team?: string;
  department?: string;
  dueDate?: string;
  problemStatement?: string;
  expectedOutcome?: string;
  dataSources?: string;
  constraints?: string;
  manualSteps?: string;
  agentBreakdown?: string;
  impact?: string;
  businessGoal?: string;
  businessSteps?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
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
        fetchTickets();
        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchTickets, 30000);
        return () => clearInterval(interval);
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tickets");
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        toast.error("Failed to load support tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Error loading support tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowDetailDialog(true);
  };

  const handleUpdateStatus = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setShowStatusDialog(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedTicket || !newStatus) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Ticket status updated to ${newStatus}`);
        setShowStatusDialog(false);
        fetchTickets();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating ticket status");
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesCriticality = criticalityFilter === "all" || ticket.criticality === criticalityFilter;
    return matchesSearch && matchesStatus && matchesCriticality;
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
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    closed: tickets.filter((t) => t.status === "Closed").length,
    urgent: tickets.filter((t) => t.criticality === "Urgent").length,
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
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Support & Contact Requests</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all support tickets - Real-time database connection
            </p>
          </div>
          <Button onClick={fetchTickets} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by title, email, or description..."
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
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Criticality</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 text-gray-600 dark:text-gray-400">
        Showing {filteredTickets.length} of {tickets.length} requests
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Support Requests</CardTitle>
          <CardDescription>Real-time support tickets - Auto-refreshes every 30 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No support requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {ticket.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{ticket.requestedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(ticket.status)}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.criticality && (
                        <Badge className={getCriticalityBadge(ticket.criticality)}>
                          {ticket.criticality}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(ticket)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(ticket)}
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
            <DialogTitle className="text-2xl">{selectedTicket?.title}</DialogTitle>
            <DialogDescription>Complete ticket details</DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Requested By</label>
                  <p className="text-sm font-medium mt-1">{selectedTicket.requestedBy}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusBadge(selectedTicket.status)}>
                      {selectedTicket.status}
                    </Badge>
                  </div>
                </div>
                {selectedTicket.criticality && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Criticality</label>
                    <div className="mt-1">
                      <Badge className={getCriticalityBadge(selectedTicket.criticality)}>
                        {selectedTicket.criticality}
                      </Badge>
                    </div>
                  </div>
                )}
                {selectedTicket.dueDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Due Date</label>
                    <p className="text-sm font-medium mt-1">{selectedTicket.dueDate}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.problemStatement && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Problem Statement</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedTicket.problemStatement}
                  </p>
                </div>
              )}

              {selectedTicket.expectedOutcome && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expected Outcome</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedTicket.expectedOutcome}
                  </p>
                </div>
              )}

              {selectedTicket.impact && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Impact</label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedTicket.impact}
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
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              Change the status of: {selectedTicket?.title}
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
