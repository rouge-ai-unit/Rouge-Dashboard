"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

interface RequestAccessButtonProps {
  toolName: string;
  toolPath: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export default function RequestAccessButton({
  toolName,
  toolPath,
  variant = "default",
  size = "default",
  className = "",
}: RequestAccessButtonProps) {
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!justification.trim() || justification.length < 20) {
      toast.error("Please provide at least 20 characters explaining why you need access");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/tool-access/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName,
          toolPath,
          justification: justification.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Access request submitted successfully! An admin will review your request.");
        setOpen(false);
        setJustification("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to submit access request");
      }
    } catch (error) {
      console.error("Error submitting access request:", error);
      toast.error("Error submitting request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Lock className="w-4 h-4 mr-2" />
        Request Access
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Access to {toolName}</DialogTitle>
            <DialogDescription>
              Explain why you need access to this tool. Your request will be reviewed by an administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justification">Justification *</Label>
              <Textarea
                id="justification"
                placeholder="I need access to this tool because..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={5}
                className="resize-none"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500">
                {justification.length}/1000 characters (minimum 20)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || justification.length < 20}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
