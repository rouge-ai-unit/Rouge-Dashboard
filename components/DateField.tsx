"use client";

import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value?: string | null;
  onValueChangeAction: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  title?: string; // bottom sheet title
};

function toDateString(d: Date | null): string | null {
  if (!d) return null;
  // Format as YYYY-MM-DD
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export default function DateField({
  label,
  value,
  onValueChangeAction,
  placeholder = "Select date",
  disabled,
  required,
  id,
  className,
  minDate,
  maxDate,
  title,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDate(value);

  const handleSelect = (d?: Date) => {
    const next = d ? toDateString(d) : null;
  onValueChangeAction(next);
    if (d) setOpen(false);
  };

  return (
    <div className={cn("w-full relative", className)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-gray-300">
          {label} {required && (<><span className="text-red-400" aria-hidden>*</span><span className="sr-only">Required</span></>)}
        </label>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              // Match app input height/padding; leave left space for icon
              "w-full relative flex h-9 items-center rounded-lg bg-gray-800/50 backdrop-blur-sm text-white placeholder-gray-400 px-3 pl-9 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700/50 text-left transition-all",
              disabled && "opacity-60 cursor-not-allowed"
            )}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={label || placeholder}
          >
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 mt-[1px] w-4 h-4 text-gray-400" aria-hidden />
            <span className={cn("block w-full truncate", !value && "text-gray-400")}>{value || placeholder}</span>
          </button>
        </DialogTrigger>
  <DialogContent className="bg-gray-900/95 backdrop-blur-md border-gray-700/50 text-gray-100 p-0 sm:max-w-md w-[min(92vw,420px)] shadow-2xl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{title || label || "Select date"}</DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => handleSelect(d)}
              disabled={(date) => {
                // Normalize comparisons to local midnight to avoid TZ drift
                const toMid = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
                const cur = toMid(date);
                if (minDate && cur < toMid(minDate)) return true;
                if (maxDate && cur > toMid(maxDate)) return true;
                return false;
              }}
              className="rounded-lg border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm text-gray-100 mx-auto"
            />
            <div className="mt-4 flex items-center justify-between">
              <Button variant="light" onClick={() => onValueChangeAction(null)}>
                Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="light" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
