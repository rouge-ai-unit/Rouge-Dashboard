"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, CheckCircle, XCircle, Mail, Briefcase, FileText, ArrowLeft, Loader2, Search, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { useUnits } from "@/hooks/useUnits";
import { toast } from "sonner";
import Link from "next/link";

interface PendingApproval {
  id: string;
  userId: string;
  requestedRole: string;
  requestedUnit: string;
  justification: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    avatar?: string;
  };
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { units } = useUnits();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [assignedRole, setAssignedRole] = useState("");
  const [assignedUnit, setAssignedUnit] = useState("");
  const [processing, setProcessing] = useState(false);

  // Protect admin route
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchApprovals();
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/pending-approvals");
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.approvals || []);
      } else {
        toast.error("Failed to fetch pending approvals");
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
      toast.error("Error loading approvals");
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = approvals.filter(approval =>
    approval.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.requestedUnit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    data: filteredApprovals,
    initialPageSize: 5,
  });

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedApprovals.size === paginatedData.length) {
      setSelectedApprovals(new Set());
    } else {
      setSelectedApprovals(new Set(paginatedData.map(a => a.id)));
    }
  };

  const toggleSelectApproval = (approvalId: string) => {
    const newSelected = new Set(selectedApprovals);
    if (newSelected.has(approvalId)) {
      newSelected.delete(approvalId);
    } else {
      newSelected.add(approvalId);
    }
    setSelectedApprovals(newSelected);
  };

  const handleApprove = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setAssignedRole(approval.requestedRole);
    setAssignedUnit(approval.requestedUnit);
    setReviewNotes("");
    setShowApproveDialog(true);
  };

  const handleReject = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setReviewNotes("");
    setShowRejectDialog(true);
  };

  const handleBulkApprove = () => {
    if (selectedApprovals.size === 0) {
      toast.error("No approvals selected");
      return;
    }
    setShowBulkApproveDialog(true);
  };

  const handleBulkReject = () => {
    if (selectedApprovals.size === 0) {
      toast.error("No approvals selected");
      return;
    }
    setShowBulkRejectDialog(true);
  };

  const confirmApprove = async () => {
    if (!selectedApproval) return;
    
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          userId: selectedApproval.userId,
          assignedRole,
          assignedUnit,
          reviewNotes,
        }),
      });

      if (response.ok) {
        toast.success(`User ${selectedApproval.user.displayName} approved successfully`);
        setShowApproveDialog(false);
        fetchApprovals();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve user");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Error approving user");
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedApproval || !reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch("/api/admin/approvals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          userId: selectedApproval.userId,
          reviewNotes,
        }),
      });

      if (response.ok) {
        toast.success(`User ${selectedApproval.user.displayName} rejected`);
        setShowRejectDialog(false);
        fetchApprovals();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject user");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Error rejecting user");
    } finally {
      setProcessing(false);
    }
  };

  const confirmBulkApprove = async () => {
    setProcessing(true);
    try {
      const approvalsToProcess = approvals.filter(a => selectedApprovals.has(a.id));
      
      const response = await fetch("/api/admin/approvals/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvals: approvalsToProcess.map(a => ({
            approvalId: a.id,
            userId: a.userId,
            assignedRole: a.requestedRole,
            assignedUnit: a.requestedUnit,
          })),
          reviewNotes: reviewNotes || "Bulk approval",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowBulkApproveDialog(false);
        setSelectedApprovals(new Set());
        fetchApprovals();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to bulk approve");
      }
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast.error("Error bulk approving users");
    } finally {
      setProcessing(false);
    }
  };

  const confirmBulkReject = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const rejectionsToProcess = approvals.filter(a => selectedApprovals.has(a.id));
      
      const response = await fetch("/api/admin/approvals/bulk-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejections: rejectionsToProcess.map(a => ({
            approvalId: a.id,
            userId: a.userId,
          })),
          reviewNotes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowBulkRejectDialog(false);
        setSelectedApprovals(new Set());
        fetchApprovals();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to bulk reject");
      }
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Error bulk rejecting users");
    } finally {
      setProcessing(false);
    }
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
              <Clock className="w-8 h-8 text-yellow-600" />
              <h1 className="text-3xl font-bold">User Approval Queue</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Review and approve new user registrations
            </p>
          </div>
          {selectedApprovals.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedApprovals.size} selected
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkReject}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Selected
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredApprovals.length} Pending
        </Badge>
      </div>

      {/* Approvals List */}
      {paginatedData.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? "No approvals match your search" : "No pending user approvals at the moment"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 mb-6">
            {paginatedData.map((approval) => (
              <Card key={approval.id} className="bg-white dark:bg-gray-800 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleSelectApproval(approval.id)}
                        className="mt-1"
                      >
                        {selectedApprovals.has(approval.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {approval.user.firstName?.[0]}{approval.user.lastName?.[0]}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{approval.user.displayName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Mail className="w-4 h-4" />
                          {approval.user.email}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Requested Role:</span>
                      <Badge className="capitalize">{approval.requestedRole}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Requested Unit:</span>
                      <Badge variant="outline">{approval.requestedUnit}</Badge>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">Justification:</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg">
                      {approval.justification}
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Requested {new Date(approval.createdAt).toLocaleDateString()} at {new Date(approval.createdAt).toLocaleTimeString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(approval)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(approval)}
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

          {/* Pagination */}
          {filteredApprovals.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredApprovals.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 25]}
            />
          )}
        </>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Approve {selectedApproval?.user.displayName} and assign role and unit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Assigned Role</label>
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="member">Member</option>
                <option value="co-leader">Co-Leader</option>
                <option value="leader">Leader</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Assigned Unit</label>
              <select
                value={assignedUnit}
                onChange={(e) => setAssignedUnit(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
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
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>
              Reject {selectedApproval?.user.displayName}&apos;s registration request
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

      {/* Bulk Approve Dialog */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve Users</DialogTitle>
            <DialogDescription>
              Approve {selectedApprovals.size} users with their requested roles and units
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Review Notes (Optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this bulk approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkApproveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={confirmBulkApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve {selectedApprovals.size} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Users</DialogTitle>
            <DialogDescription>
              Reject {selectedApprovals.size} user registration requests
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
            <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={confirmBulkReject} disabled={processing || !reviewNotes.trim()} variant="destructive">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject {selectedApprovals.size} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
