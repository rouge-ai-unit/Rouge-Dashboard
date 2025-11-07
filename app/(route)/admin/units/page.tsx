"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, ArrowLeft, Loader2, Plus, Edit, Trash2, Shield, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Unit {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  leaderId: string | null;
  coLeaderId: string | null;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  memberCount: number;
  leaderName: string | null;
  leaderEmail: string | null;
  createdAt: string;
}

export default function UnitsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    color: '#3B82F6',
    icon: 'Users',
  });

  // Protect admin route
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchUnits();
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/units");
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units || []);
      } else {
        toast.error("Failed to load units");
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      toast.error("Error loading units");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Unit name is required");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Unit created successfully");
        setShowCreateDialog(false);
        setFormData({ name: '', description: '', code: '', color: '#3B82F6', icon: 'Users' });
        fetchUnits();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create unit");
      }
    } catch (error) {
      console.error("Error creating unit:", error);
      toast.error("Error creating unit");
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      name: unit.name,
      description: unit.description || '',
      code: unit.code || '',
      color: unit.color || '#3B82F6',
      icon: unit.icon || 'Users',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedUnit) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/units/${selectedUnit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Unit updated successfully");
        setShowEditDialog(false);
        fetchUnits();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update unit");
      }
    } catch (error) {
      console.error("Error updating unit:", error);
      toast.error("Error updating unit");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUnit) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/units/${selectedUnit.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Unit deleted successfully");
        setShowDeleteDialog(false);
        fetchUnits();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete unit");
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast.error("Error deleting unit");
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
              <Building2 className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold">Units & Departments</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage organizational units and departments
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchUnits} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Unit
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {units.filter(u => u.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {units.reduce((sum, u) => sum + u.memberCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Units Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Units</CardTitle>
          <CardDescription>View and manage all organizational units</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No units found. Create your first unit to get started.
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: unit.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-medium">{unit.name}</div>
                          {unit.description && (
                            <div className="text-sm text-gray-500">{unit.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {unit.code ? (
                        <Badge variant="outline">{unit.code}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.leaderName ? (
                        <div>
                          <div className="font-medium">{unit.leaderName}</div>
                          <div className="text-sm text-gray-500">{unit.leaderEmail}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No leader assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{unit.memberCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {unit.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(unit)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(unit)}
                          disabled={unit.memberCount > 0}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Unit</DialogTitle>
            <DialogDescription>Add a new organizational unit or department</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Unit Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AI Unit, VC Management"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., AI, VC, SM"
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the unit"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update unit information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Unit Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              Update Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUnit?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} disabled={processing} variant="destructive">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
