"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("member");
  const [unit, setUnit] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!email || !firstName || !lastName || !unit) {
      toast.error("Please fill in all required fields");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          role,
          unit,
        }),
      });

      if (response.ok) {
        toast.success("User created successfully");
        onOpenChange(false);
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("member");
        setUnit("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Error creating user");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign a role
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={processing}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">First Name</label>
              <Input
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={processing}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Last Name</label>
              <Input
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={processing}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Role</label>
            <Select value={role} onValueChange={setRole} disabled={processing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="co-leader">Co-Leader</SelectItem>
                <SelectItem value="leader">Leader</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Unit</label>
            <Input
              placeholder="Enter unit name"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={processing}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={processing}>
            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Add User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}