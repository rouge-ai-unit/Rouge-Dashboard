"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Search, Loader2, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import DateField from "@/components/DateField";
import { toast } from "sonner";

type WorkItem = {
  _id?: string;
  unit: string;
  task: string;
  assignedTo: string;
  status: string;
  lastUpdated: string;
  deadline: string;
  workStart: string;
  memberUpdate: string;
};

const units = ["AI", "INFLUENCER", "MANAGEMENT", "BR UNIT"];

const schema = z.object({
  unit: z.string().min(1, "Select a unit"),
  task: z.string().min(3, "Task is required").max(280),
  assignedTo: z.string().min(1, "Assignee required").max(120),
  status: z.enum(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"]).default("To Do"),
  workStart: z.string().optional(),
  deadline: z.string().optional(),
  memberUpdate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function WorkTracker() {
  const router = useRouter();
  // const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [data, setData] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [lastUpdatedTs, setLastUpdatedTs] = useState<Date | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>("__ALL_UNITS__");
  const [filterStatus, setFilterStatus] = useState<string>("__ALL_STATUS__");
  const [sortBy, setSortBy] = useState<"unit" | "task" | "assignedTo" | "status" | "deadline" | "workStart" | "memberUpdate" | "lastUpdated">("lastUpdated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<string>("");
  const [pollMs, setPollMs] = useState<number>(60000);
  const columns = [
    { key: "unit", label: "Unit", min: 100 },
    { key: "task", label: "Task", min: 160 },
    { key: "assignedTo", label: "Assigned To", min: 140 },
    { key: "status", label: "Status", min: 120 },
    { key: "workStart", label: "Start date", min: 120 },
    { key: "deadline", label: "Due date", min: 120 },
    { key: "memberUpdate", label: "Member Update", min: 160 },
    { key: "lastUpdated", label: "Last Updated", min: 160 },
  ] as const;
  type ColumnKey = (typeof columns)[number]["key"];
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ key: ColumnKey; startX: number; startW: number } | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { unit: "", task: "", assignedTo: "", status: "To Do", workStart: "", deadline: "", memberUpdate: "" },
    mode: "onChange",
  });
  const { register, handleSubmit, reset, setValue, formState: { errors, isValid } } = form;

  // Handle deep link ?new=1 from Topbar “+ New”
  const formRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new") === "1") {
        setTimeout(() => {
          try {
            document.getElementById("wt-task")?.focus();
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch {}
        }, 50);
        router.replace("/work-tracker", { scroll: false });
      }
    } catch {}
  }, [router]);

  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      setIsFetching(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (filterUnit !== "__ALL_UNITS__") params.set("unit", filterUnit);
      if (filterStatus !== "__ALL_STATUS__") params.set("status", filterStatus);
      params.set("sort", sortBy);
      params.set("dir", sortDir);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await axios.get(`/api/tracker?${params.toString()}`);
      const { items, total } = res.data || { items: [], total: 0 };
      // detect changes for background refresh toast
      const newSnap = (items || []).map((r: WorkItem) => `${r._id}:${r.lastUpdated}`).join("|");
      if (opts?.silent && snapshot && newSnap !== snapshot) {
        toast.success("Data updated");
      }
      setSnapshot(newSnap);
      setData(items);
      setTotal(total || 0);
      setLastUpdatedTs(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Debounced fetch on filters/sort/search/page changes
  useEffect(() => {
    const t = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, filterUnit, filterStatus, sortBy, sortDir, page, pageSize]);

  // Persist toolbar preferences (excluding search term)
  useEffect(() => {
    try {
      const prefs = { filterUnit, filterStatus, sortBy, sortDir, pageSize };
      localStorage.setItem("work-tracker:prefs", JSON.stringify(prefs));
    } catch {}
  }, [filterUnit, filterStatus, sortBy, sortDir, pageSize]);

  // Load toolbar preferences on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("work-tracker:prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.filterUnit) setFilterUnit(p.filterUnit);
        if (p.filterStatus) setFilterStatus(p.filterStatus);
        if (p.sortBy) setSortBy(p.sortBy);
        if (p.sortDir) setSortDir(p.sortDir);
        if (p.pageSize) setPageSize(p.pageSize);
      }
      const rawCols = localStorage.getItem("work-tracker:cols:hidden");
      if (rawCols) setHiddenCols(JSON.parse(rawCols));
      const rawW = localStorage.getItem("work-tracker:cols:widths");
      if (rawW) setColWidths(JSON.parse(rawW));
    } catch {}
    // initial fetch
    fetchData();
  }, []);

  // Background polling every 60s
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => {
      fetchData({ silent: true });
    }, pollMs);
    return () => clearInterval(id);
  }, [searchTerm, filterUnit, filterStatus, sortBy, sortDir, page, pageSize, pollMs]);

  // Persist column settings
  useEffect(() => {
    try { localStorage.setItem("work-tracker:cols:hidden", JSON.stringify(hiddenCols)); } catch {}
  }, [hiddenCols]);
  useEffect(() => {
    try { localStorage.setItem("work-tracker:cols:widths", JSON.stringify(colWidths)); } catch {}
  }, [colWidths]);

  // column resizing handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizing) return;
      const dx = e.clientX - resizing.startX;
      const next = Math.max(columns.find(c => c.key === resizing.key)?.min || 80, resizing.startW + dx);
      setColWidths((prev) => ({ ...prev, [resizing.key]: next }));
    }
    function onUp() { setResizing(null); }
    if (resizing) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const handleDateChange = (name: keyof FormValues, value: string | null) => {
    setValue(name, value || "");
  };
  const onSubmit = async (values: FormValues) => {
    try {
      // optimistic create (page 1 only)
      if (page === 1) {
  const temp: WorkItem = { _id: `temp-${Date.now()}`, ...values, lastUpdated: new Date().toISOString().split("T")[0], workStart: values.workStart || "", deadline: values.deadline || "", memberUpdate: values.memberUpdate || "" } as WorkItem;
        setData((prev) => [temp, ...prev]);
      }
      await axios.post("/api/tracker", values);
      toast.success("Task added");
      reset({ unit: "", task: "", assignedTo: "", status: "To Do", workStart: "", deadline: "", memberUpdate: "" });
      setPage(1);
      fetchData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(msg);
    }
  };

  async function handleEdit(item: WorkItem) {
    try {
      const { _id, ...rest } = item;
      await axios.put(`/api/tracker/${_id}`, rest);
      toast.success("Task updated");
      fetchData();
  } catch (e) {
      toast.error("Update failed");
    }
  }

  async function handleStatus(id: string, status: WorkItem["status"]) {
    try {
      // optimistic update
      setData((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
      await axios.patch(`/api/tracker/${id}`, { status });
      toast.success("Status updated");
      fetchData();
  } catch (e) {
      toast.error("Status update failed");
      fetchData();
    }
  }

  const [lastDeleted, setLastDeleted] = useState<WorkItem | null>(null);
  const handleDelete = async (id?: string) => {
    try {
      if (id) {
        const prev = data.find((d) => d._id === id) || null;
        setLastDeleted(prev);
        // optimistic removal
        setData((items) => items.filter((r) => r._id !== id));
        const tId = toast("Deleted", {
          action: {
            label: "Undo",
            onClick: async () => {
              if (lastDeleted) {
                const { _id, lastUpdated, ...body } = lastDeleted as WorkItem;
                await axios.post("/api/tracker", body);
                fetchData();
              }
            },
          },
        });
        await axios.delete(`/api/tracker/${id}`);
        // refresh after delete completes
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete data:", error);
    }
  };

  // Server-driven data; client array is already filtered/sorted/paged
  const filteredData = data;

  const isDeadlineOver = (deadline: string) => {
    return deadline && new Date(deadline) < new Date(new Date().toDateString());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-white text-center"
        >
          📋 Work Tracker
        </motion.h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
        <Input
          placeholder="Search by unit, task, assignee, status..."
          value={searchTerm}
          onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
          className="pl-9 w-full bg-[#1f1f1f] text-white border-gray-700"
          aria-label="Search work items"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-[#1a1a1a] p-4 sm:p-6 rounded-xl mb-8 sm:mb-10 shadow-lg border border-gray-700"
        ref={formRef}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="mb-1 block text-gray-300">Unit <span className="text-red-400" aria-hidden>*</span><span className="sr-only">Required</span></Label>
            <Select value={form.watch("unit") || ""} onValueChange={(v) => setValue("unit", v)}>
            <SelectTrigger className="bg-[#2b2b2b] text-gray-100 border-gray-700">
              <SelectValue placeholder="Select Unit" />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              {units.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-gray-300">Task <span className="text-red-400" aria-hidden>*</span><span className="sr-only">Required</span></Label>
            <Input id="wt-task" {...register("task")} placeholder="Task" className="bg-[#2b2b2b] text-white border-gray-700" />
          </div>
          <div>
            <Label className="mb-1 block text-gray-300">Assigned To <span className="text-red-400" aria-hidden>*</span><span className="sr-only">Required</span></Label>
            <Input {...register("assignedTo")} placeholder="Assigned To" className="bg-[#2b2b2b] text-white border-gray-700" />
          </div>
          <div>
            <Label className="mb-1 block text-gray-300">Update</Label>
            <Input {...register("memberUpdate")} placeholder="Update" className="bg-[#2b2b2b] text-white border-gray-700" />
          </div>
          <div className="min-w-0">
            <DateField
              label="Start date"
              value={form.watch("workStart") || null}
              onValueChangeAction={(v) => handleDateChange("workStart", v)}
              placeholder="Start date"
              title="Pick start date"
            />
          </div>
          <div className="min-w-0">
            <DateField
              label="Due date"
              value={form.watch("deadline") || null}
              onValueChangeAction={(v) => handleDateChange("deadline", v)}
              placeholder="Due date"
              title="Pick due date"
            />
          </div>
          <div>
            <Label className="mb-1 block text-gray-300">Status</Label>
            <Select value={form.watch("status") || "To Do"} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
            <SelectTrigger className="bg-[#2b2b2b] text-gray-100 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              {(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"] as const).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>
        </div>
        {Object.values(errors).length > 0 && (
          <div className="mt-3 text-sm text-red-400">
            {Object.values(errors).map((e, i) => (
              <div key={i}>{e?.message as string}</div>
            ))}
          </div>
        )}
        <Button onClick={handleSubmit(onSubmit)} disabled={!isValid} className="mt-4 flex items-center gap-2 w-full sm:w-auto">
          <Plus className="w-5 h-5" /> Add
        </Button>
  </motion.div>

      {/* Toolbar */}
  <div className="mb-3 flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
  <Select value={filterUnit} onValueChange={(v) => { setPage(1); setFilterUnit(v); }}>
            <SelectTrigger className="h-8 bg-[#191A1A] text-gray-100 border-gray-700">
              <SelectValue placeholder="Filter unit" />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
        <SelectItem value="__ALL_UNITS__">All units</SelectItem>
              {units.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
  <Select value={filterStatus} onValueChange={(v) => { setPage(1); setFilterStatus(v); }}>
            <SelectTrigger className="h-8 bg-[#191A1A] text-gray-100 border-gray-700">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
        <SelectItem value="__ALL_STATUS__">All statuses</SelectItem>
              {(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"] as const).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => { setPage(1); setSortBy(v as ColumnKey | typeof sortBy); }}>
            <SelectTrigger className="h-8 bg-[#191A1A] text-gray-100 border-gray-700">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              <SelectItem value="lastUpdated">Last updated</SelectItem>
              <SelectItem value="unit">Unit</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="assignedTo">Assignee</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="workStart">Start</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="light" className="h-8" onClick={() => { setPage(1); setSortDir((d) => (d === "desc" ? "asc" : "desc")); }}>{sortDir === "desc" ? "Desc" : "Asc"}</Button>
          <Button variant="light" className="h-8" onClick={() => exportCsv(filteredData)}>Export CSV</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="light" className="h-8">Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1b1d1e] border-gray-700 text-gray-100 p-2">
              {columns.map((c) => (
                <div key={c.key} className="flex items-center gap-2 px-1 py-1.5">
                  <Checkbox checked={!hiddenCols[c.key]} onCheckedChange={(v) => setHiddenCols((prev) => ({ ...prev, [c.key]: !v }))} id={`col-${c.key}`} />
                  <label htmlFor={`col-${c.key}`} className="text-sm cursor-pointer select-none">{c.label}</label>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={String(pollMs)} onValueChange={(v) => setPollMs(parseInt(v, 10))}>
            <SelectTrigger className="h-8 bg-[#191A1A] text-gray-100 border-gray-700">
              <SelectValue placeholder="Polling" />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              <SelectItem value="0">Polling: Off</SelectItem>
              <SelectItem value="30000">Polling: 30s</SelectItem>
              <SelectItem value="60000">Polling: 60s</SelectItem>
              <SelectItem value="120000">Polling: 2m</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="light" className="h-8" onClick={() => fetchData()} disabled={isFetching}>{isFetching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refreshing</> : "Refresh"}</Button>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-2">{isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {lastUpdatedTs ? `Updated ${lastUpdatedTs.toLocaleTimeString()} • ${total} items` : `${total} items`}</div>
      </div>

      {/* Desktop Table View */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3 }}
        className="hidden md:block overflow-x-auto rounded-xl border border-gray-700"
      >
        <table className="min-w-full text-sm text-left text-white">
          <thead className="bg-[#1f1f1f] text-gray-300 sticky top-0 z-10">
            <tr>
              {columns.filter(c => !hiddenCols[c.key]).map(({ key, label }) => (
                <th key={key} className="px-4 py-3 relative" style={{ width: colWidths[key] ? `${colWidths[key]}px` : undefined }}>
                  <button
                    className="inline-flex items-center gap-1 text-left hover:text-white text-gray-300"
                    onClick={() => {
                      if (sortBy === (key as ColumnKey)) {
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                      } else {
                        setSortBy(key as ColumnKey);
                        setSortDir("desc");
                      }
                      setPage(1);
                    }}
                  >
                    <span>{label}</span>
                    {sortBy === (key as ColumnKey) ? (
                      sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </button>
                  <span
                    onMouseDown={(e) => {
                      const th = (e.currentTarget.parentElement as HTMLTableCellElement);
                      const startW = th.getBoundingClientRect().width;
                      setResizing({ key: key as ColumnKey, startX: e.clientX, startW });
                    }}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none opacity-30 hover:opacity-80"
                  />
                </th>
              ))}
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
            {filteredData.map((item, idx) => (
              <motion.tr
                key={item._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className="border-t border-gray-800 hover:bg-[#232323]"
              >
                {!hiddenCols.unit && <td className="px-4 py-3">{item.unit}</td>}
                {!hiddenCols.task && <td className="px-4 py-3">{item.task}</td>}
                {!hiddenCols.assignedTo && <td className="px-4 py-3">{item.assignedTo}</td>}
                {!hiddenCols.status && <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === "Done"
                        ? "bg-green-600"
                        : item.status === "In Progress"
                        ? "bg-yellow-600"
                        : item.status === "Blocked"
                        ? "bg-red-600"
                        : item.status === "On Hold"
                        ? "bg-orange-600"
                        : item.status === "Canceled"
                        ? "bg-gray-700"
                        : "bg-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>}
                {!hiddenCols.workStart && <td className="px-4 py-3">{item.workStart}</td>}
                {!hiddenCols.deadline && <td className="px-4 py-3">
                  <span
                    className={
                      isDeadlineOver(item.deadline)
                        ? "text-red-500 font-semibold"
                        : ""
                    }
                  >
                    {item.deadline}
                  </span>
                </td>}
                {!hiddenCols.memberUpdate && <td className="px-4 py-3">{item.memberUpdate}</td>}
                {!hiddenCols.lastUpdated && <td className="px-4 py-3">
                  {new Date(item.lastUpdated).toLocaleString()}
                </td>}
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-800">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
                        <DropdownMenuItem onClick={() => setEditing(item)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item._id!, "In Progress")}>Mark In Progress</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item._id!, "Done")}>Mark Done</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item._id!, "Blocked")}>Mark Blocked</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item._id!, "On Hold")}>Put On Hold</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item._id!, "Canceled")}>Cancel</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(item._id)} className="text-red-400 focus:text-red-400">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </motion.tr>
            ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        <AnimatePresence initial={false}>
  {filteredData.map((item, idx) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, delay: idx * 0.03 }}
            className="bg-[#1f1f1f] p-4 rounded-lg shadow-md border border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{item.task}</h3>
                <p className="text-sm text-gray-400">Unit: {item.unit}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(item)}
                  className="text-yellow-400 hover:text-yellow-600"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <p>
                <span className="font-semibold">Assigned To:</span>{" "}
                {item.assignedTo}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    item.status === "Done"
                      ? "bg-green-600"
                      : item.status === "In Progress"
                      ? "bg-yellow-600"
                      : "bg-gray-600"
                  }`}
                >
                  {item.status}
                </span>
              </p>
              <p>
                <span className="font-semibold">Start:</span> {item.workStart}
              </p>
              <p>
                <span className="font-semibold">Deadline:</span>{" "}
                <span
                  className={
                    isDeadlineOver(item.deadline)
                      ? "text-red-500 font-semibold"
                      : ""
                  }
                >
                  {item.deadline}
                </span>
              </p>
              <p>
                <span className="font-semibold">Update:</span>{" "}
                {item.memberUpdate}
              </p>
              <p>
                <span className="font-semibold">Last Updated:</span>{" "}
                {new Date(item.lastUpdated).toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-gray-400">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button variant="light" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
          <Button variant="light" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(parseInt(v, 10)); }}>
            <SelectTrigger className="h-8 bg-[#191A1A] text-gray-100 border-gray-700">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              {[10,20,50,100].map(n => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditForm item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchData(); }} />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </main>
  );
}

function exportCsv(rows: WorkItem[]) {
  try {
    const headers = ["unit","task","assignedTo","status","workStart","deadline","memberUpdate","lastUpdated"];
    const lines = rows.map((r) => headers.map((h) => {
      const v = (r as unknown as Record<string, unknown>)[h] ?? "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-tracker-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
}

function EditForm({ item, onClose, onSaved }: { item: WorkItem; onClose: () => void; onSaved: () => void }) {
  const schema = z.object({
    unit: z.string().min(1, "Select a unit"),
    task: z.string().min(3, "Task is required").max(280),
    assignedTo: z.string().min(1, "Assignee required").max(120),
    status: z.enum(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"]).default("To Do"),
    workStart: z.string().optional(),
    deadline: z.string().optional(),
    memberUpdate: z.string().optional(),
  });
  type FormValues = z.infer<typeof schema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      unit: item.unit,
      task: item.task,
      assignedTo: item.assignedTo,
  status: item.status as FormValues["status"],
      workStart: item.workStart,
      deadline: item.deadline,
      memberUpdate: item.memberUpdate,
    },
    mode: "onChange",
  });
  const { register, setValue, handleSubmit, formState: { isValid, errors } } = form;
  const onSubmit = async (values: FormValues) => {
    try {
      await axios.put(`/api/tracker/${item._id}`, values);
      toast.success("Saved");
      onSaved();
    } catch {
      toast.error("Save failed");
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-gray-300">Unit</Label>
          <Select value={form.watch("unit") || ""} onValueChange={(v) => setValue("unit", v)}>
            <SelectTrigger className="bg-[#2b2b2b] text-gray-100 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              {units.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-gray-300">Status</Label>
          <Select value={form.watch("status") || "To Do"} onValueChange={(v) => setValue("status", v as FormValues["status"]) }>
            <SelectTrigger className="bg-[#2b2b2b] text-gray-100 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
              {(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"] as const).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1 block text-gray-300">Task</Label>
          <Input {...register("task")} className="bg-[#2b2b2b] text-white border-gray-700" />
        </div>
        <div>
          <Label className="mb-1 block text-gray-300">Assigned To</Label>
          <Input {...register("assignedTo")} className="bg-[#2b2b2b] text-white border-gray-700" />
        </div>
        <div>
          <Label className="mb-1 block text-gray-300">Update</Label>
          <Input {...register("memberUpdate")} className="bg-[#2b2b2b] text-white border-gray-700" />
        </div>
      </div>
      {Object.values(errors).length > 0 && (
        <div className="text-sm text-red-400">
          {Object.values(errors).map((e, i) => (
            <div key={i}>{(e as { message?: string })?.message}</div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!isValid}>Save</Button>
      </div>
    </form>
  );
}
