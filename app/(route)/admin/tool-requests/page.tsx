"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Loader2, CheckCircle, XCircle, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface ToolRequest {
  id: string;
  userId: string;
  toolName: string;
  toolPath: string;
  justification: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    unit: string;
  };
}

export default function ToolRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ToolRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Protect admin route
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchRequests();
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tool-requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        toast.error("Failed to fetch tool requests");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Error loading requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request: ToolRequest) => {
    setSelectedRequest(request);
    setReviewNotes("");
    setShowApproveDialog(true);
  };

  const handleReject = (request: ToolRequest) => {
    setSelectedRequest(request);
    setReviewNotes("");
    setShowRejectDialog(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/tool-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          reviewNotes,
        }),
      });

      if (response.ok) {
        toast.success(`Tool access granted to ${selectedRequest.user.displayName}`);
        setShowApproveDialog(false);
        fetchRequests();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Error approving request");
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/tool-requests/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          reviewNotes,
        }),
      });

      if (response.ok) {
        toast.success(`Tool access request rejected`);
        setShowRejectDialog(false);
        fetchRequests();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Error rejecting request");
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request =>
    request.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
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
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Tool Access Requests</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Review and approve tool access requests from users
        </p>
      </div>

      {/* Search and Stats */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by user or tool..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredRequests.length} Pending
          </Badge>
          <Button onClick={fetchRequests} variant="outline" size="sm">
            <Loader2 className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? "No requests match your search" : "No pending tool access requests"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="bg-white dark:bg-gray-800 hover:border-purple-500 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.toolName}</CardTitle>
                    <CardDescription className="mt-2">
                      Requested by <span className="font-semibold">{request.user.displayName}</span> ({request.user.email})
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">User Role:</span>
                    <Badge className="ml-2 capitalize">{request.user.role}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Unit:</span>
                    <Badge variant="outline" className="ml-2">{request.user.unit}</Badge>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">Justification:</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg">
                    {request.justification}
                  </p>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Requested {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(request)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(request)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Tool Access</DialogTitle>
            <DialogDescription>
              Grant {selectedRequest?.user.displayName} access to {selectedRequest?.toolName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Review Notes (Optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tool Access</DialogTitle>
            <DialogDescription>
              Reject {selectedRequest?.user.displayName}&apos;s request for {selectedRequest?.toolName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for Rejection *</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Provide a clear reason for rejection..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={confirmReject} disabled={processing || !reviewNotes.trim()} variant="destructive">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
