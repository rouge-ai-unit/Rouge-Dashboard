"use client";

import React, { useState } from "react";
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
import { Download, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { eq } from "drizzle-orm";
import { Badge } from "./ui/badge";
import { db } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";

interface ContentItem {
  id: number;
  dayOfMonth: number;
  weekOfMonth: number;
  date: string;
  specialOccasion: string;
  generalTheme: string;
  postIdeas: string;
  caption: string;
  hashtags: string;
}

interface ContentTableProps {
  data: ContentItem[];
  refreshData: () => void;
}

export function ContentTable({ data, refreshData }: ContentTableProps) {
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<ContentItem>>({});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleEdit = (item: ContentItem) => {
    setSelectedContent(item);
    setEditData(item);
    setIsEditOpen(true);
  };

  const handleEditContent = async () => {
    if (!selectedContent) return;

    await db
      .update(LinkedinContent)
      .set({
        dayOfMonth: editData.dayOfMonth!,
        weekOfMonth: editData.weekOfMonth!,
        date: editData.date!,
        specialOccasion: editData.specialOccasion!,
        generalTheme: editData.generalTheme!,
        postIdeas: editData.postIdeas!,
        caption: editData.caption!,
        hashtags: editData.hashtags!,
      })
      // @ts-expect-error to be fixed
      .where(eq(LinkedinContent.id, editData.id!))
      .returning();

    refreshData();
    toast.success("Content updated successfully.");
    setIsEditOpen(false);
    setSelectedContent(null);
  };

  const confirmDelete = async () => {
    if (!selectedContent) return;
    await db
      .delete(LinkedinContent)
      // @ts-expect-error to be fixed
      .where(eq(LinkedinContent.id, selectedContent.id));
    refreshData();
    toast.success("Content deleted successfully.");
    setIsDeleteOpen(false);
    setSelectedContent(null);
  };

  const handleDelete = (item: ContentItem) => {
    setSelectedContent(item);
    setIsDeleteOpen(true);
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
        item.hashtags.replace(",", " ") || "N/A",
      ]
      // @ts-expect-error to be fixed
        .map((val) => `"${val.replace(/"/g, '""')}"`)
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
    const current = editData.hashtags?.split(",").map((t) => t.trim()) || [];

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
    <div>
      <div className="flex justify-end mb-2">
        <Button onClick={exportToCsv}>
          <Download className="mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Edit/Delete</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Occasion</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Ideas</TableHead>
              <TableHead>Caption</TableHead>
              <TableHead>Hashtags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      /
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{item.dayOfMonth}</TableCell>
                  <TableCell>{item.weekOfMonth}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.specialOccasion || "N/A"}</TableCell>
                  <TableCell>{item.generalTheme}</TableCell>
                  <TableCell>{item.postIdeas}</TableCell>
                  <TableCell>{item.caption}</TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    {item.hashtags?.split(",").map((tag, i) => (
                      <Badge
                        key={i}
                        className="rounded-full text-white bg-blue-600"
                      >
                        {tag.trim()}
                      </Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-gray-500 py-4"
                >
                  No content found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ✏️ Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Edit content for Day {selectedContent?.dayOfMonth} - Week{" "}
              {selectedContent?.weekOfMonth}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {[
              { id: "dayOfMonth", label: "Day", type: "number" },
              { id: "weekOfMonth", label: "Week", type: "number" },
              { id: "date", label: "Date", type: "date" },
              { id: "specialOccasion", label: "Occasion" },
              { id: "generalTheme", label: "Theme" },
            ].map(({ id, label, type }) => (
              <div key={id}>
                <label htmlFor={id} className="text-xs font-semibold">
                  {label}
                </label>
                <Input
                  type={type || "text"}
                  id={id}
                  // value={(editData as any)[id] || ""}
                  value={
                    (editData[id as keyof ContentItem] ?? "") as string | number
                  }
                  onChange={(e) =>
                    setEditData({ ...editData, [id]: e.target.value })
                  }
                />
              </div>
            ))}

            <div>
              <label htmlFor="postIdeas" className="text-xs font-semibold">
                Post Ideas
              </label>
              <Textarea
                id="postIdeas"
                value={editData.postIdeas || ""}
                onChange={(e) =>
                  setEditData({ ...editData, postIdeas: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="caption" className="text-xs font-semibold">
                Caption
              </label>
              <Textarea
                id="caption"
                value={editData.caption || ""}
                onChange={(e) =>
                  setEditData({ ...editData, caption: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="hashtags" className="text-xs font-semibold">
                Hashtags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editData.hashtags?.split(",").map((tag, i) => (
                  <Badge
                    key={i}
                    className="bg-blue-600 text-white rounded-full flex items-center gap-1"
                  >
                    {tag.trim()}
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(tag.trim())}
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
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddHashtag}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditContent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🗑️ Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete content for{" "}
              <span className="font-semibold">
                Day {selectedContent?.dayOfMonth}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
