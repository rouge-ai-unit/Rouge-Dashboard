"use client";

import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Pencil, Trash, CheckSquare, Square, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContentItem {
  id: string; // uuid
  dayOfMonth: number;
  weekOfMonth: number;
  date: string;
  specialOccasion: string;
  generalTheme: string;
  postIdeas: string;
  caption: string;
  hashtags: string;
  status: "Draft" | "Approved" | "Scheduled";
}

interface ContentTableProps {
  data: ContentItem[];
  refreshDataAction: () => void;
}

export function ContentTable({ data, refreshDataAction: refreshData }: ContentTableProps) {
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<ContentItem>>({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allSelected = useMemo(() => data.length > 0 && data.every(d => selected[d.id]), [data, selected]);
  const anySelected = useMemo(() => data.some(d => selected[d.id]), [data, selected]);
  const [statusFilter, setStatusFilter] = useState<"All" | "Draft" | "Approved" | "Scheduled">("All");

  const handleEdit = (item: ContentItem) => {
    setSelectedContent(item);
    setEditData(item);
    setIsEditOpen(true);
  };

  const handleEditContent = async () => {
    if (!selectedContent) return;
    try {
      setSaving(true);
      // Always send all required fields
      const payload = {
        ...selectedContent,
        ...editData,
        status: editData.status || selectedContent.status || "Draft",
      };
      const res = await fetch(`/api/contents/${selectedContent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update content");
      }
      refreshData();
      toast.success("Content updated successfully.");
      setIsEditOpen(false);
      setSelectedContent(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedContent) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/contents/${selectedContent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      refreshData();
      toast.success("Content deleted successfully.");
      setIsDeleteOpen(false);
      setSelectedContent(null);
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = (item: ContentItem) => {
    setSelectedContent(item);
    setIsDeleteOpen(true);
  };

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    const target = !allSelected;
    for (const row of data) next[row.id] = target;
    setSelected(next);
  };

  const bulkDelete = async () => {
    try {
      const ids = data.filter(d => selected[d.id]).map(d => d.id);
      if (!ids.length) return;
      const res = await fetch(`/api/contents/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", ids }) });
      if (!res.ok) throw new Error("Bulk delete failed");
      toast.success("Deleted selected items");
      setSelected({});
      refreshData();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const regenerateSelected = async () => {
    try {
      const selDates = data.filter(d => selected[d.id]).map(d => d.date).sort();
      if (!selDates.length) return;
      const from = selDates[0];
      const to = selDates[selDates.length - 1];
      const res = await fetch(`/api/contents/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "regenerate", from, to }) });
      if (!res.ok) throw new Error("Regenerate failed");
      toast.success("Regenerated ideas for selected dates");
      setSelected({});
      refreshData();
    } catch {
      toast.error("Regenerate failed");
    }
  };

  const copyCaption = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Caption copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const openLinkedIn = (caption: string, hashtags: string) => {
    const url = new URL("https://www.linkedin.com/feed/?");
    // Cannot prefill LinkedIn post reliably; open feed and copy caption for user
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    copyCaption(`${caption}\n\n${hashtags}`.trim());
  };

  const exportToCsv = () => {
    if (!data.length) return;

    const headers = [
      "No.",
      "Day of Month",
      "Week of Month",
      "Date",
      "Special Occasion",
      "General Theme",
      "Post Ideas",
      "Caption",
      "Hashtags",
    ].join(",");

    const rows = data.map((item, index) =>
      [
        index + 1,
        item.dayOfMonth,
        item.weekOfMonth,
        item.date,
        item.specialOccasion || "N/A",
        item.generalTheme,
        item.postIdeas,
        item.caption,
        item.hashtags?.replace(/,/g, " ") || "N/A",
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "content.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddHashtag = () => {
    const clean = newTag.trim();
    if (!clean) return;
    const tag = clean.startsWith("#") ? clean : `#${clean}`;
    const current = editData.hashtags?.split(",").map((t) => t.trim()).filter(Boolean) || [];

    if (!current.includes(tag)) {
      setEditData({ ...editData, hashtags: [...current, tag].join(", ") });
    }

    setNewTag("");
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    const tags = (editData.hashtags || "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== tagToRemove);
    setEditData({ ...editData, hashtags: tags.join(", ") });
  };

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} className="border-gray-500">
            {allSelected ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={bulkDelete} disabled={!anySelected} className="border-red-500 text-red-400">
            <Trash className="mr-2 h-4 w-4" /> Delete Selected
          </Button>
          <Button variant="outline" size="sm" onClick={regenerateSelected} disabled={!anySelected} className="border-blue-500 text-blue-400">
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
        <Button
          onClick={exportToCsv}
          variant="outline"
          className="border-white"
        >
          <Download className="mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Status Filter for Mobile */}
      <div className="mb-4 md:hidden">
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm shadow-2xl overflow-hidden">
        <Table className="w-full text-xs">
          <TableHeader className="bg-gray-800/50 backdrop-blur-sm">
            <TableRow>
              <TableHead className="text-gray-300 w-8 px-2 py-2"> </TableHead>
              <TableHead className="text-gray-300 px-2 py-2">Actions</TableHead>
              <TableHead className="text-gray-300 px-2 py-2">Date</TableHead>
              <TableHead className="text-gray-300 px-2 py-2">Occasion</TableHead>
              <TableHead className="text-gray-300 px-2 py-2">Theme</TableHead>
              <TableHead className="text-gray-300 px-2 py-2 max-w-xs">Ideas</TableHead>
              <TableHead className="text-gray-300 px-2 py-2 max-w-xs">Caption</TableHead>
              <TableHead className="text-gray-300 px-2 py-2">Status
                <div className="mt-1">
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="h-7 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-gray-900/30 text-white text-xs">
            {data.length ? (
              data
                .filter(row => statusFilter === "All" ? true : (row.status ?? "Draft") === statusFilter)
                .map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-800/30 transition-colors">
                  <TableCell className="w-8 px-2 py-2">
                    <button onClick={() => setSelected(s => ({ ...s, [item.id]: !s[item.id] }))} aria-label="select row">
                      {selected[item.id] ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4 text-gray-400" />}
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} className="h-8 w-8">
                        <Pencil className="h-3 w-3 text-blue-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-8 w-8">
                        <Trash className="h-3 w-3 text-red-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => copyCaption(`${item.caption}\n\n${item.hashtags}`)} className="h-8 w-8">
                        <Copy className="h-3 w-3 text-emerald-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openLinkedIn(item.caption, item.hashtags)} className="h-8 w-8">
                        <ExternalLink className="h-3 w-3 text-purple-400" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2">{item.date}</TableCell>
                  <TableCell className="px-2 py-2">{item.specialOccasion || "N/A"}</TableCell>
                  <TableCell className="px-2 py-2">{item.generalTheme}</TableCell>
                  <TableCell className="px-2 py-2 max-w-xs">
                    <div className="truncate" title={item.postIdeas}>{item.postIdeas}</div>
                  </TableCell>
                  <TableCell className="px-2 py-2 max-w-xs">
                    <div className="truncate" title={item.caption}>{item.caption}</div>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <Select value={item.status ?? "Draft"} onValueChange={async (v: any) => {
                      try {
                        const res = await fetch(`/api/contents/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: v }) });
                        if (!res.ok) throw new Error("status");
                        refreshData();
                      } catch {
                        toast.error("Could not update status");
                      }
                    }}>
                      <SelectTrigger className="h-7 w-[100px] bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-gray-400 py-4 text-xs"
                >
                  No content found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.length ? (
          data
            .filter(row => statusFilter === "All" ? true : (row.status ?? "Draft") === statusFilter)
            .map((item) => (
              <div key={item.id} className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 shadow-2xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(s => ({ ...s, [item.id]: !s[item.id] }))} aria-label="select row">
                      {selected[item.id] ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4 text-gray-400" />}
                    </button>
                    <div className="text-sm font-medium text-white">{item.date}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} className="h-8 w-8">
                      <Pencil className="h-3 w-3 text-blue-400" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-8 w-8">
                      <Trash className="h-3 w-3 text-red-400" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => copyCaption(`${item.caption}\n\n${item.hashtags}`)} className="h-8 w-8">
                      <Copy className="h-3 w-3 text-emerald-400" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openLinkedIn(item.caption, item.hashtags)} className="h-8 w-8">
                      <ExternalLink className="h-3 w-3 text-purple-400" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {item.specialOccasion && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Occasion</div>
                      <div className="text-sm text-white">{item.specialOccasion}</div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Theme</div>
                    <div className="text-sm text-white">{item.generalTheme}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Ideas</div>
                    <div className="text-sm text-white line-clamp-3">{item.postIdeas}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Caption</div>
                    <div className="text-sm text-white line-clamp-3">{item.caption}</div>
                  </div>
                  
                  {item.hashtags && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Hashtags</div>
                      <div className="flex flex-wrap gap-1">
                        {item.hashtags.split(",").map((tag, i) => (
                          <Badge key={i} className="rounded-full text-white bg-blue-600 text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <div className="text-xs text-gray-400">Status</div>
                    <Select value={item.status ?? "Draft"} onValueChange={async (v: any) => {
                      try {
                        const res = await fetch(`/api/contents/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: v }) });
                        if (!res.ok) throw new Error("status");
                        refreshData();
                      } catch {
                        toast.error("Could not update status");
                      }
                    }}>
                      <SelectTrigger className="h-8 w-[120px] bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="text-center text-gray-400 py-8">
            No content found.
          </div>
        )}
      </div>

      {/* ✏️ Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-md text-white border border-gray-700/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Content</DialogTitle>
            <DialogDescription className="text-gray-400">
              Edit content for Day {selectedContent?.dayOfMonth} - Week{" "}
              {selectedContent?.weekOfMonth}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {(
              [
                { id: "dayOfMonth", label: "Day", type: "number" },
                { id: "weekOfMonth", label: "Week", type: "number" },
                { id: "date", label: "Date", type: "date" },
                { id: "specialOccasion", label: "Occasion", type: "text" },
                { id: "generalTheme", label: "Theme", type: "text" },
              ] as const
            ).map(({ id, label, type }) => (
              <div key={id}>
                <label
                  htmlFor={id}
                  className="text-xs font-semibold text-gray-300"
                >
                  {label}
                </label>
                <Input
                  type={type || "text"}
                  id={id}
                  value={
                    (editData[id as keyof ContentItem] ?? "") as string | number
                  }
                  onChange={(e) =>
                    setEditData({ ...editData, [id]: e.target.value })
                  }
                  className="bg-gray-800/50 backdrop-blur-sm text-white border border-gray-600/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            ))}

            <div>
              <label
                htmlFor="postIdeas"
                className="text-xs font-semibold text-gray-300"
              >
                Post Ideas
              </label>
              <Textarea
                id="postIdeas"
                value={editData.postIdeas || ""}
                onChange={(e) =>
                  setEditData({ ...editData, postIdeas: e.target.value })
                }
                className="bg-[#2c2e2e] text-white border border-gray-600 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="caption"
                className="text-xs font-semibold text-gray-300"
              >
                Caption
              </label>
              <Textarea
                id="caption"
                value={editData.caption || ""}
                onChange={(e) =>
                  setEditData({ ...editData, caption: e.target.value })
                }
                className="bg-[#2c2e2e] text-white border border-gray-600 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="hashtags"
                className="text-xs font-semibold text-gray-300"
              >
                Hashtags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editData.hashtags
                  ?.split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag, i) => (
                    <Badge
                      key={i}
                      className="bg-blue-600 text-white rounded-full flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveHashtag(tag)}
                        className="ml-1 text-white hover:text-gray-200"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddHashtag();
                    }
                  }}
                  placeholder="Add hashtag"
                  className="flex-1 bg-gray-800/50 backdrop-blur-sm text-white border border-gray-600/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <Button
                  type="button"
                  onClick={handleAddHashtag}
                  aria-label="Add hashtag"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={saving}
              className="border-white text-white hover:bg-white hover:text-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditContent}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🗑️ Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-md text-white border border-gray-700/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Delete</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete content for{" "}
              <span className="font-semibold text-red-400">
                Day {selectedContent?.dayOfMonth}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
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
