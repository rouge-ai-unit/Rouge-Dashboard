"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, ExternalLink, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { FaLinkedin } from "react-icons/fa";

interface Company {
  id: string; // uuid
  companyName: string;
  companyWebsite?: string;
  companyLinkedin?: string;
  region: string;
  industryFocus: string;
  offerings: string;
  marketingPosition: string;
  potentialPainPoints: string;
  contactName: string;
  contactPosition: string;
  linkedin?: string;
  contactEmail: string;
}

interface CompanyTableProps {
  data: Company[];
  refreshDataAction: () => void;
}

export function CompanyTable({ data, refreshDataAction: refreshData }: CompanyTableProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setEditData(company);
    setIsEditOpen(true);
  };

  const handleDelete = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCompany) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete company");
      refreshData();
      toast.success("Company deleted successfully.");
      setIsDeleteOpen(false);
      setSelectedCompany(null);
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditCompany = async () => {
    if (!selectedCompany) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error("Failed to update company");
      refreshData();
      toast.success("Company updated successfully.");
      setIsEditOpen(false);
      setSelectedCompany(null);
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const exportToCsv = () => {
    if (!data || data.length === 0) return;

    const headers = [
      "No.",
      "Company Name",
      "Company Website",
      "Company LinkedIn",
      "Region",
      "Industry Focus",
      "Offerings",
      "Marketing Position",
      "Potential Pain Points",
      "Contact Name",
      "Contact Position",
      "Contact LinkedIn",
      "Contact Email",
    ].join(",");

    const rows = data.map((company, index) =>
      [
        index + 1,
        company.companyName,
        company.companyWebsite || "N/A",
        company.companyLinkedin || "N/A",
        company.region,
        company.industryFocus,
        company.offerings,
        company.marketingPosition,
        company.potentialPainPoints,
        company.contactName,
        company.contactPosition,
        company.linkedin || "N/A",
        company.contactEmail,
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "companies.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="text-white">
      <div className="flex justify-end mb-2">
        <Button
          onClick={exportToCsv}
          variant="outline"
          className="border-white"
        >
          <Download className="mr-2" /> Export CSV
        </Button>
      </div>

      <div className="rounded-md border border-gray-600 overflow-x-auto bg-[#1a1a1a]">
        <Table>
          <TableCaption className="text-gray-400">
            A list of AgTech companies.
          </TableCaption>
          <TableHeader className="bg-[#2c2e2e]">
            <TableRow>
              <TableHead className="text-gray-300">Edit/Delete</TableHead>
              <TableHead className="text-gray-300">No.</TableHead>
              <TableHead className="text-gray-300">Company Name</TableHead>
              <TableHead className="text-gray-300">Company Website</TableHead>
              <TableHead className="text-gray-300">Company LinkedIn</TableHead>
              <TableHead className="text-gray-300">Region</TableHead>
              <TableHead className="text-gray-300">Industry Focus</TableHead>
              <TableHead className="text-gray-300">Offerings</TableHead>
              <TableHead className="text-gray-300">
                Marketing Position
              </TableHead>
              <TableHead className="text-gray-300">
                Potential Pain Points
              </TableHead>
              <TableHead className="text-gray-300">Contact Name</TableHead>
              <TableHead className="text-gray-300">Contact Position</TableHead>
              <TableHead className="text-gray-300">Contact LinkedIn</TableHead>
              <TableHead className="text-gray-300">Contact Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-[#1a1a1a] text-white">
            {data.length > 0 ? (
              data.map((company, index) => (
                <TableRow key={index} className="hover:bg-[#2a2a2a]">
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(company)}
                      >
                        <Pencil className="h-4 w-4 text-blue-400" />
                      </Button>
                      /
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(company)}
                      >
                        <Trash className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{company.companyName}</TableCell>
                  <TableCell>
                    {company.companyWebsite ? (
                      <Link
                        href={`${
                          company.companyWebsite.startsWith("https")
                            ? company.companyWebsite
                            : "https://" + company.companyWebsite
                        }`}
                        target="_blank"
                        className="text-cyan-400 hover:underline flex gap-1 items-center"
                      >
                        Visit <ExternalLink size={16} />
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {company.companyLinkedin ? (
                      <a
                        href={company.companyLinkedin}
                        target="_blank"
                        className="text-blue-400 hover:underline flex gap-1 items-center"
                      >
                        <FaLinkedin /> LinkedIn
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>{company.region}</TableCell>
                  <TableCell>{company.industryFocus}</TableCell>
                  <TableCell>{company.offerings}</TableCell>
                  <TableCell>{company.marketingPosition}</TableCell>
                  <TableCell>{company.potentialPainPoints}</TableCell>
                  <TableCell>{company.contactName}</TableCell>
                  <TableCell>{company.contactPosition}</TableCell>
                  <TableCell>
                    {company.linkedin ? (
                      <a
                        href={company.linkedin}
                        target="_blank"
                        className="text-blue-400 hover:underline flex gap-1 items-center"
                      >
                        <FaLinkedin /> LinkedIn
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>{company.contactEmail}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="text-center text-gray-400 py-4"
                >
                  No data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Include dark-themed dialogs as previously styled */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="fixed h-[90vh] overflow-y-auto bg-[#1a1a1a] text-white border border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Company</DialogTitle>
            <DialogDescription className="text-gray-400">
              Edit details for{" "}
              <span className="font-semibold">
                {selectedCompany?.companyName}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(
              [
                { label: "Company Name", key: "companyName" },
                { label: "Company Website", key: "companyWebsite" },
                { label: "Company Linkedin", key: "companyLinkedin" },
                { label: "Region", key: "region" },
                { label: "Industry Focus", key: "industryFocus" },
                { label: "Offerings", key: "offerings" },
                { label: "Marketing Position", key: "marketingPosition" },
                { label: "Potential Pain Points", key: "potentialPainPoints" },
                { label: "Contact Name", key: "contactName" },
                { label: "Contact Position", key: "contactPosition" },
                { label: "Contact Linkedin", key: "linkedin" },
                { label: "Contact Email", key: "contactEmail" },
              ] as const
            ).map(({ label, key }) => (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="text-xs font-semibold text-gray-300"
                >
                  {label}
                </label>
                <Input
                  id={key}
                  value={(editData)[key] || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={label}
                  className="bg-[#2c2e2e] text-white border border-gray-600 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="border-white text-white hover:bg-white hover:text-black"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCompany}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="fixed h-auto bg-[#1a1a1a] text-white border border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Delete</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete{" "}
              <span className="text-red-400 font-semibold">
                {selectedCompany?.companyName}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-white text-white hover:bg-white hover:text-black"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
