"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Search, Filter, Calendar, User, FileText, RefreshCw } from "lucide-react";

interface AuditEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  role: string;
  resource: string;
  action: string;
  changeType: string;
  oldValue: { allowed: boolean } | null;
  newValue: { allowed: boolean } | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function PermissionAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [changeTypeFilter, setChangeTypeFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/unauthorized");
      } else {
        fetchAuditTrail();
      }
    }
  }, [status, session, router]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/permissions/audit");
      
      if (!response.ok) {
        throw new Error("Failed to fetch audit trail");
      }
      
      const data = await response.json();
      setAuditTrail(data.auditTrail || []);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      toast.error("Failed to load permission audit trail");
    } finally {
      setLoading(false);
    }
  };

  const filteredAuditTrail = auditTrail.filter((entry) => {
    const matchesSearch = 
      entry.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || entry.role === roleFilter;
    const matchesChangeType = !changeTypeFilter || entry.changeType === changeTypeFilter;
    
    return matchesSearch && matchesRole && matchesChangeType;
  });

  const getChangeTypeBadge = (changeType: string) => {
    const colors = {
      created: "bg-green-500/20 text-green-400 border-green-500/30",
      updated: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      deleted: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[changeType as keyof typeof colors] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-red-500/20 text-red-400",
      leader: "bg-blue-500/20 text-blue-400",
      "co-leader": "bg-purple-500/20 text-purple-400",
      member: "bg-green-500/20 text-green-400",
    };
    return colors[role as keyof typeof colors] || "bg-gray-500/20 text-gray-400";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Permission Audit Trail</h1>
              <p className="text-gray-400">Track all permission changes</p>
            </div>
          </div>
          
          <button
            onClick={fetchAuditTrail}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by admin, resource, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="leader">Leader</option>
                <option value="co-leader">Co-Leader</option>
                <option value="member">Member</option>
              </select>
            </div>

            {/* Change Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={changeTypeFilter}
                onChange={(e) => setChangeTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="">All Changes</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-400">
          Showing {filteredAuditTrail.length} of {auditTrail.length} entries
        </div>

        {/* Audit Trail Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredAuditTrail.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No audit entries found
                    </td>
                  </tr>
                ) : (
                  filteredAuditTrail.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(entry.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-white">{entry.adminName}</div>
                            <div className="text-xs text-gray-400">{entry.adminEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(entry.role)}`}>
                          {entry.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {entry.resource}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getChangeTypeBadge(entry.changeType)}`}>
                          {entry.changeType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {entry.oldValue && entry.newValue && (
                            <div className="flex items-center gap-2">
                              <span className={entry.oldValue.allowed ? "text-green-400" : "text-red-400"}>
                                {entry.oldValue.allowed ? "Allowed" : "Denied"}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className={entry.newValue.allowed ? "text-green-400" : "text-red-400"}>
                                {entry.newValue.allowed ? "Allowed" : "Denied"}
                              </span>
                            </div>
                          )}
                          {!entry.oldValue && entry.newValue && (
                            <span className={entry.newValue.allowed ? "text-green-400" : "text-red-400"}>
                              {entry.newValue.allowed ? "Allowed" : "Denied"}
                            </span>
                          )}
                          {entry.reason && (
                            <div className="text-xs text-gray-400 mt-1">{entry.reason}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
