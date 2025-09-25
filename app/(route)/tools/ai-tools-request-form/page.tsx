"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, ClipboardList, Wrench, Rocket, ListChecks, MoreVertical, RefreshCcw, Play, CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import RecentTicketsPanel from "@/components/RecentTicketsPanel";

type Tool = {
  id: string;
  name: string;
  href: string;
  description: string;
  unit?: string | null;
  status: string; // e.g. "Available" | "In Progress" | "Testing" | "Coming Soon"
  progress?: number | null;
  criticality?: string | null;
  owner?: string | null;
  eta?: string | null; // ISO date or friendly string
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  status: string;
  businessSteps: string;
  businessGoal: string;
  dueDate?: string | null;
  aiToolCategory: string;
  // Additional fields (optional)
  problemStatement?: string | null;
  expectedOutcome?: string | null;
  dataSources?: string | null;
  constraints?: string | null;
  manualSteps?: string | null;
  // criticality removed from user-facing ticket
};

export default function AIToolsRequestFormPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [, setLoading] = useState({ tools: true, tickets: true });
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ticketsFilter, setTicketsFilter] = useState<"All" | "Open" | "In Progress" | "Closed">("All");
  const [ticketsSearch, setTicketsSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  

  // Form schema and setup (RHF + Zod)
  const MAX_TITLE = 120;
  const MAX_DESC = 2000;

  const schema = z.object({
    title: z.string().min(3, "Title is required").max(MAX_TITLE, `Keep under ${MAX_TITLE} characters`),
    requestedBy: z.string().email("Valid email required"),
    description: z.string().min(10, "Please describe your request").max(MAX_DESC, `Keep under ${MAX_DESC} characters`),
  businessSteps: z.string().min(10, "Please break down your request into clear business steps. For example: 'Collect sales data', 'Generate weekly report', 'Email report to manager'."),    businessGoal: z.string().min(5, "What is the main business goal for this request?"),
    dueDate: z
      .string()
      .optional()
      .refine(
        (v) => {
          if (!v) return true;
          const d = new Date(v);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return !isNaN(d.getTime()) && d >= today;
        },
        { message: "Due date must be today or later" }
      ),
    team: z.string().default("AI team"),
    department: z.string().default("AI"),
    aiToolCategory: z.string().min(1, "Please select an AI tool category"),
    // Additional fields (optional)
    problemStatement: z.string().optional(),
    expectedOutcome: z.string().optional(),
    dataSources: z.string().optional(),
    constraints: z.string().optional(),
    manualSteps: z.string().optional(),
    // criticality removed from user-facing form
  });
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      requestedBy: "",
      businessSteps: "",
      businessGoal: "",
      dueDate: "",
      team: "AI team",
      department: "AI",
      aiToolCategory: "",
      problemStatement: "",
      expectedOutcome: "",
      dataSources: "",
      constraints: "",
      manualSteps: "",
    },
    mode: "onChange",
  });
  // UI state for additional fields
  const [showAdditional, setShowAdditional] = useState(false);

  const { register, handleSubmit, control, setValue, trigger, watch, reset, formState: { errors, isValid } } = form;

  // Required asterisk with tooltip
  const RequiredMark = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-red-400" aria-hidden>*</span>
        </TooltipTrigger>
        <TooltipContent>Required</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Draft persistence (excluding nothing since only text fields)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dashboard-request-draft-v1");
      if (raw) {
        const data = JSON.parse(raw) as Partial<FormValues>;
        reset({
          ...form.getValues(),
          ...data,
        });
      }
    } catch {}
  }, []);
  useEffect(() => {
    const sub = form.watch((values) => {
      try {
        localStorage.setItem("dashboard-request-draft-v1", JSON.stringify(values));
      } catch {}
    });
    return () => sub.unsubscribe();
  }, [form]);

  const fetchTools = async () => {
    try {
      const res = await fetch("/api/tools", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load tools");
      const data: Tool[] = await res.json();
      setTools(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading((s) => ({ ...s, tools: false }));
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load tickets");
      const data: Ticket[] = await res.json();
      setTickets(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading((s) => ({ ...s, tickets: false }));
    }
  };

  useEffect(() => {
    fetchTools();
    fetchTickets();
    const poll = setInterval(() => {
      fetchTools();
      fetchTickets();
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  const refreshNow = async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 2000));
    await Promise.all([fetchTools(), fetchTickets()]);
    setRefreshing(false);
  };

  function exportTicketsCsv(rows: Ticket[]) {
    try {
      const headers = ["id","title","aiToolCategory","requestedBy","description","businessSteps","businessGoal","dueDate","status"] as const;
      const lines = rows.map(r => headers.map((h) => {
        const v = r[h] as unknown as string | number | null | undefined;
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(","));
      const csv = [headers.join(","), ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  }

  const progressTools = useMemo(
    () =>
      tools
        .filter((t) => ["Planning", "In Progress", "Testing"].includes(t.status))
        .map((t) => ({
          name: t.name,
          href: t.href,
          unit: t.unit ?? null,
          progress: Math.max(0, Math.min(100, Number(t.progress ?? 0))),
          criticality: t.criticality ?? "Medium",
          status: t.status,
          owner: t.owner ?? null,
          eta: t.eta ?? null,
        })),
    [tools]
  );

  const availableTools = useMemo(
    () => tools.filter((t) => t.status === "Available"),
    [tools]
  );

  const comingSoonTools = useMemo(
    () => tools.filter((t) => t.status === "Coming Soon"),
    [tools]
  );

  // Controls for Tools In Progress
  const [toolsSearch, setToolsSearch] = useState("");
  const [toolsFilter, setToolsFilter] = useState<"All" | "Planning" | "In Progress" | "Testing">("All");
  const [toolsSort, setToolsSort] = useState<"Criticality" | "Progress" | "Name" | "Status">("Criticality");
  const [toolsSortDir, setToolsSortDir] = useState<"desc" | "asc">("desc");

  // Persist Tools table preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tools-table-prefs-v1");
      if (raw) {
        const prefs = JSON.parse(raw) as {
          search?: string;
          filter?: "All" | "Planning" | "In Progress" | "Testing";
          sort?: "Criticality" | "Progress" | "Name" | "Status";
          dir?: "desc" | "asc";
        };
        if (prefs.search !== undefined) setToolsSearch(prefs.search);
        if (prefs.filter) setToolsFilter(prefs.filter);
        if (prefs.sort) setToolsSort(prefs.sort);
        if (prefs.dir) setToolsSortDir(prefs.dir);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const prefs = {
        search: toolsSearch,
        filter: toolsFilter,
        sort: toolsSort,
        dir: toolsSortDir,
      };
      localStorage.setItem("tools-table-prefs-v1", JSON.stringify(prefs));
    } catch {}
  }, [toolsSearch, toolsFilter, toolsSort, toolsSortDir]);

  const filteredSortedProgressTools = useMemo(() => {
    const rank = (c: string) => (c === "Critical" || c === "Urgent" ? 3 : c === "High" ? 2 : c === "Medium" ? 1 : 0);
    const list = progressTools
      .filter(t => toolsFilter === "All" ? true : t.status === toolsFilter)
      .filter(t => toolsSearch ? (t.name.toLowerCase().includes(toolsSearch.toLowerCase()) || (t.unit ?? "").toLowerCase().includes(toolsSearch.toLowerCase())) : true)
      .slice();
    list.sort((a, b) => {
      let delta = 0;
      switch (toolsSort) {
        case "Criticality":
          delta = rank(b.criticality) - rank(a.criticality);
          if (delta === 0) delta = (b.progress - a.progress);
          break;
        case "Progress":
          delta = b.progress - a.progress;
          break;
        case "Name":
          delta = a.name.localeCompare(b.name);
          break;
        case "Status":
          delta = a.status.localeCompare(b.status);
          break;
      }
      return toolsSortDir === "desc" ? delta : -delta;
    });
    return list;
  }, [progressTools, toolsFilter, toolsSearch, toolsSort, toolsSortDir]);

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const payload = { ...values, status: "Open" };
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit request");
      const created: Ticket = await res.json();
      setTickets((prev) => [created, ...prev]);
      toast.success("Request submitted");
      setLastCreatedId(created.id);
      reset({
        title: "",
        description: "",
        requestedBy: "",
        businessSteps: "",
        businessGoal: "",
        dueDate: "",
        team: "AI team",
        department: "AI",
        aiToolCategory: "",
        problemStatement: "",
        expectedOutcome: "",
        dataSources: "",
        constraints: "",
        manualSteps: "",
      });
      try { localStorage.removeItem("dashboard-request-draft-v1"); } catch {}
    } catch (e) {
      console.error(e);
      toast.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Ticket actions
  async function updateTicketStatus(id: string, status: "Open" | "In Progress" | "Closed") {
    try {
      // optimistic
      setTickets((prev) => prev.map(t => t.id === id ? { ...t, status } : t));
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Status: ${status}`);
    } catch {
      toast.error("Could not update");
      refreshNow();
    }
  }

  async function deleteTicket(id: string) {
    try {
      setTickets((cur) => cur.filter((t) => t.id !== id));      setTickets((cur) => cur.filter((t) => t.id !== id));
      const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Ticket deleted");
    } catch {
      toast.error("Delete failed");
      refreshNow();
    }
  }

  // AI generate helper for agent breakdown (optional)
  const requiredOk = useMemo(() => {
    const t = watch("title") || "";
    const e = watch("requestedBy") || "";
    const d = watch("description") || "";
    const emailOk = /.+@.+\..+/.test(e);
    return t.trim().length >= 3 && emailOk && d.trim().length >= 10;
  }, [watch]);

  return (
    <main className="p-0 min-h-screen">
      <div className="max-w-6xl mx-auto">        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-4xl font-bold mb-8 text-center text-white"
        >
          AI Tools Request Form
        </motion.h1>

        {/* Sidebar left, Form/Table right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          {/* Left: Submit AI Tools Request (75%) */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-9 bg-[#232526] rounded-xl p-8 shadow-lg border border-gray-700 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-blue-400" /> Submit AI Tools Request</h2>
              <button onClick={refreshNow} disabled={refreshing} className={`text-gray-300 hover:text-white inline-flex items-center gap-1 text-sm ${refreshing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {refreshing ? (
                  <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
              <div className="md:col-span-2 flex gap-4">
                <div className="flex-1">
                  <Label className="block text-sm font-semibold mb-2 text-gray-300">Team</Label>
                  <Input
                    required
                    className="bg-[#191A1A] border-gray-600 text-white"
                    {...register("team")}
                    value={watch("team")}
                    readOnly
                  />
                  <div className="mt-1 text-xs text-gray-400">This request will be routed to the AI team.</div>
                </div>
                <div className="flex-1">
                  <Label className="block text-sm font-semibold mb-2 text-gray-300">Department</Label>
                  <Input
                    required
                    className="bg-[#191A1A] border-gray-600 text-white"
                    {...register("department")}
                    value={watch("department")}
                    readOnly
                  />
                  <div className="mt-1 text-xs text-gray-400">Department for this request (AI).</div>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="block text-sm font-semibold mb-2 text-gray-300">AI Tool Category <RequiredMark /></Label>
                <Controller
                  name="aiToolCategory"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-[#191A1A] border-gray-600 text-white">
                        <SelectValue placeholder="Select the type of AI tool you need" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#232526] border-gray-700 text-white">
                        <SelectItem value="chatbot">Chatbot / Conversational AI</SelectItem>
                        <SelectItem value="data-analysis">Data Analysis & Insights</SelectItem>
                        <SelectItem value="automation">Process Automation</SelectItem>
                        <SelectItem value="content-generation">Content Generation</SelectItem>
                        <SelectItem value="image-video">Image/Video Generation</SelectItem>
                        <SelectItem value="prediction">Prediction & Forecasting</SelectItem>
                        <SelectItem value="search-retrieval">Search & Information Retrieval</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <div className="mt-1 text-xs text-gray-400">Choose the category that best describes the AI tool you need.</div>
                {errors.aiToolCategory && <p className="mt-1 text-sm text-red-400">{errors.aiToolCategory.message}</p>}
              </div>
              {/* ...existing form code... */}
              <div className="md:col-span-2 flex items-center gap-3 mb-2">
                <Label className="font-semibold text-gray-300">Show Additional Fields</Label>
                <input
                  type="checkbox"
                  checked={showAdditional}
                  onChange={e => setShowAdditional(e.target.checked)}
                  className="accent-blue-600 w-5 h-5 rounded focus:ring-2 focus:ring-blue-400"
                  aria-label="Show Additional Fields"
                />
                <span className="text-xs text-gray-400">(Add more details if needed)</span>
              </div>
              {showAdditional && (
                <>
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-semibold mb-2 text-gray-300">Problem Statement</Label>
                    <Textarea
                      placeholder="Describe the main problem or challenge. (Optional)"
                      className="bg-[#191A1A] border-gray-600 text-white min-h-[60px]"
                      {...register("problemStatement")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-semibold mb-2 text-gray-300">Expected Outcome</Label>
                    <Textarea
                      placeholder="What outcome or result do you expect? (Optional)"
                      className="bg-[#191A1A] border-gray-600 text-white min-h-[60px]"
                      {...register("expectedOutcome")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-semibold mb-2 text-gray-300">Data Sources</Label>
                    <Textarea
                      placeholder="List any data sources or systems involved. (Optional)"
                      className="bg-[#191A1A] border-gray-600 text-white min-h-[60px]"
                      {...register("dataSources")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-semibold mb-2 text-gray-300">Constraints</Label>
                    <Textarea
                      placeholder="Any business or process constraints? (Optional)"
                      className="bg-[#191A1A] border-gray-600 text-white min-h-[60px]"
                      {...register("constraints")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-semibold mb-2 text-gray-300">Manual Steps Today</Label>
                    <Textarea
                      placeholder="Describe any manual steps currently performed. (Optional)"
                      className="bg-[#191A1A] border-gray-600 text-white min-h-[60px]"
                      {...register("manualSteps")}
                    />
                  </div>
                </>
              )}
              <div>
                <Label className="block text-sm font-semibold mb-2 text-gray-300">Request Title <RequiredMark /></Label>
                  <Input
                    required
                    placeholder="E.g. &#39;Automated Sales Insights Generator&#39;, &#39;Customer Sentiment Chatbot&#39;"
                    className="bg-[#191A1A] border-gray-600 text-white"
                    aria-invalid={!!errors.title}
                    {...register("title")}
                  />
                  <div className="mt-1 text-xs text-gray-400">A clear, descriptive name for the AI tool you want built.</div>
                  <div className="mt-1 text-right text-[11px] text-gray-400">{(watch("title")?.length || 0)}/{MAX_TITLE}</div>
                  {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
              </div>
              <div>
                <Label className="block text-sm font-semibold mb-2 text-gray-300">Your Email <RequiredMark /></Label>
                  <Input
                    required
                    placeholder="name@company.com"
                    className="bg-[#191A1A] border-gray-600 text-white"
                    aria-invalid={!!errors.requestedBy}
                    {...register("requestedBy")}
                  />
                  <div className="mt-1 text-xs text-gray-400">We&#39;ll use this to contact you about your request.</div>
                  {errors.requestedBy && <p className="mt-1 text-sm text-red-400">{errors.requestedBy.message}</p>}
              </div>
              <div className="md:col-span-2">
                <Label className="block text-sm font-semibold mb-2 text-gray-300">AI Tool Description & Business Context <RequiredMark /></Label>
                  <Textarea
                    required
                    placeholder="Describe the AI tool you need and the business context. What should it do? How will it help your work?"
                    className="bg-[#191A1A] border-gray-600 text-white min-h-[80px]"
                    aria-invalid={!!errors.description}
                    {...register("description")}
                  />
                  <div className="mt-1 text-xs text-gray-400">Explain what the AI tool should do and how it fits into your business processes.</div>
                  <div className="mt-1 text-right text-[11px] text-gray-400">{(watch("description")?.length || 0)}/{MAX_DESC}</div>
                  {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>}
              </div>
              <div className="md:col-span-2">
                <Label className="block text-sm font-semibold mb-2 text-gray-300">How the AI Tool Should Work (Business Steps) <RequiredMark /></Label>
                  <Textarea
                    required
                    placeholder="Describe how the AI tool should work from a business perspective. E.g. 'Analyze sales data', 'Generate insights report', 'Send recommendations to manager'"
                    className="bg-[#191A1A] border-gray-600 text-white min-h-[80px]"
                    aria-invalid={!!errors.businessSteps}
                    {...register("businessSteps")}
                  />
                  <div className="mt-1 text-xs text-gray-400">List the key steps the AI tool should perform. Focus on what you want it to do, not how.</div>
                  {errors.businessSteps && <p className="mt-1 text-sm text-red-400">{errors.businessSteps.message}</p>}
              </div>
              <div className="md:col-span-2">
                <Label className="block text-sm font-semibold mb-2 text-gray-300">What the AI Tool Should Achieve (Business Goal) <RequiredMark /></Label>
                  <Input
                    required
                    placeholder="E.g. 'Reduce time spent on manual reporting by 50%', 'Improve forecast accuracy', 'Automate customer insights generation'"
                    className="bg-[#191A1A] border-gray-600 text-white"
                    aria-invalid={!!errors.businessGoal}
                    {...register("businessGoal")}
                  />
                  <div className="mt-1 text-xs text-gray-400">What measurable business outcome should this AI tool deliver?</div>
                  {errors.businessGoal && <p className="mt-1 text-sm text-red-400">{errors.businessGoal.message}</p>}
              </div>
              <div>
                <Label className="block text-sm font-semibold mb-2 text-gray-300">Due Date</Label>
                <Input
                  type="date"
                  className="bg-[#191A1A] border-gray-600 text-white"
                  aria-invalid={!!errors.dueDate}
                  {...register("dueDate")}
                />
                <div className="mt-1 text-xs text-gray-400">(Optional) When do you need this by?</div>
                {errors.dueDate && <p className="mt-1 text-sm text-red-400">{errors.dueDate.message}</p>}
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={submitting || !isValid}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
              {lastCreatedId && (
                <div className="md:col-span-2 text-xs text-gray-400 -mt-3">
                  Success — Ticket ID: <span className="text-gray-200 font-mono">{lastCreatedId}</span>
                </div>
              )}
            </form>
          {/* Submitted tickets table */}
          {tickets.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2"><ListChecks className="h-5 w-5 text-green-400" /> Submitted Requests</h3>
                <div className="flex items-center gap-2 text-sm flex-wrap justify-end">
                  <div className="relative">
                    <Input value={ticketsSearch} onChange={(e) => setTicketsSearch(e.target.value)} placeholder="Search…" className="h-8 bg-[#191A1A] text-gray-100 border-gray-700 pr-8" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">/</span>
                  </div>
                  <span className="text-gray-400 hidden sm:inline">Filter</span>
                  <Select value={ticketsFilter} onValueChange={(v) => setTicketsFilter(v as typeof ticketsFilter)}>
                    <SelectTrigger className="bg-[#232526] text-gray-100 border-2 border-blue-500 h-9 rounded-lg shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-400 transition-all duration-150">
                      <SelectValue placeholder="Filter by status" />
                      <span className="ml-2 text-blue-400"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    </SelectTrigger>
                    <SelectContent className="bg-[#232526] border-blue-500 text-gray-100 rounded-lg shadow-lg animate-fade-in">
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="light" className="h-8" onClick={() => exportTicketsCsv(tickets
                    .filter(t => ticketsFilter === "All" ? true : t.status === ticketsFilter)
                    .filter(t => ticketsSearch ? (t.title?.toLowerCase().includes(ticketsSearch.toLowerCase()) || t.requestedBy?.toLowerCase().includes(ticketsSearch.toLowerCase())) : true)
                  )}>Export CSV</Button>
                  <div className="text-xs text-gray-500 hidden md:block">
                    {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-[#191A1A] text-gray-300">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">AI Tool Category</th>
                      <th className="p-3">Requested By</th>
                      <th className="p-3">Business Goal</th>
                      <th className="p-3">Due</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {tickets
                        .filter(t => ticketsFilter === "All" ? true : t.status === ticketsFilter)
                        .filter(t => ticketsSearch ? (t.title?.toLowerCase().includes(ticketsSearch.toLowerCase()) || t.requestedBy?.toLowerCase().includes(ticketsSearch.toLowerCase())) : true)
                        .map(ticket => (
                          <motion.tr
                            key={ticket.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-gray-700"
                          >
                            <td className="p-3 text-white">{ticket.title}</td>
                            <td className="p-3 text-white">{ticket.aiToolCategory}</td>
                            <td className="p-3 text-white">{ticket.requestedBy}</td>
                            <td className="p-3 text-white">{ticket.businessGoal}</td>
                            <td className="p-3 text-white">{ticket.dueDate ?? "—"}</td>
                            <td className={`p-3 font-semibold ${ticket.status === "Open" ? "text-blue-300" : ticket.status === "In Progress" ? "text-yellow-400" : "text-green-400"}`}>{ticket.status}</td>
                            <td className="p-3">
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-800">
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
                                    <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "In Progress")}> 
                                      <Play className="h-4 w-4" /> Mark In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "Closed")}>
                                      <CheckCircle className="h-4 w-4" /> Close
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "Open")}>
                                      <RotateCcw className="h-4 w-4" /> Reopen
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onClick={() => deleteTicket(ticket.id)}>
                                      <Trash2 className="h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </motion.section>
          {/* Right: Past Submissions Card (25%) */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-3 bg-[#232526] rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col max-h-[500px] min-h-[300px] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ListChecks className="h-6 w-6 text-green-400" /> Past Submissions</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="flex items-center justify-center text-gray-400 text-sm opacity-60 h-full" style={{ fontSize: '0.85rem' }}>
                  No submissions to show yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {tickets.map(ticket => (
                    <li key={ticket.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white text-lg">{ticket.title}</div>
                        <div className="text-gray-400 text-sm">{ticket.businessGoal}</div>
                        <div className="text-xs text-gray-500">Submitted by {ticket.requestedBy} • {ticket.dueDate ? `Due: ${ticket.dueDate}` : 'No due date'}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${ticket.status === 'Open' ? 'bg-blue-900 text-blue-300' : ticket.status === 'In Progress' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{ticket.status}</span>
                      </div>
                      <div className="flex-shrink-0 flex gap-2 md:gap-0 md:flex-col items-end md:items-center">
                        <Button size="sm" variant="secondary" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-1 rounded" onClick={() => setSelectedTicket(ticket)}>
                          View Details
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.section>
        </div>



        {/* ...existing code... */}
        {/* Modal for viewing ticket details */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg w-full bg-[#232526] border border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedTicket?.title}
              </DialogDescription>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-3 mt-2">
                <div>
                  <span className="font-semibold">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${selectedTicket.status === 'Open' ? 'bg-blue-900 text-blue-300' : selectedTicket.status === 'In Progress' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{selectedTicket.status}</span>
                </div>
                <div>
                  <span className="font-semibold">AI Tool Category:</span> <span className="ml-1">{selectedTicket.aiToolCategory}</span>
                </div>
                <div>
                  <span className="font-semibold">Requested By:</span> <span className="ml-1">{selectedTicket.requestedBy}</span>
                </div>
                <div>
                  <span className="font-semibold">Business Goal:</span> <span className="ml-1">{selectedTicket.businessGoal}</span>
                </div>
                <div>
                  <span className="font-semibold">Due Date:</span> <span className="ml-1">{selectedTicket.dueDate || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold">Business Steps:</span>
                  <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.businessSteps}</div>
                </div>
                <div>
                  <span className="font-semibold">Description:</span>
                  <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.description}</div>
                </div>
                {selectedTicket.problemStatement && (
                  <div>
                    <span className="font-semibold">Problem Statement:</span>
                    <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.problemStatement}</div>
                  </div>
                )}
                {selectedTicket.expectedOutcome && (
                  <div>
                    <span className="font-semibold">Expected Outcome:</span>
                    <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.expectedOutcome}</div>
                  </div>
                )}
                {selectedTicket.dataSources && (
                  <div>
                    <span className="font-semibold">Data Sources:</span>
                    <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.dataSources}</div>
                  </div>
                )}
                {selectedTicket.constraints && (
                  <div>
                    <span className="font-semibold">Constraints:</span>
                    <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.constraints}</div>
                  </div>
                )}
                {selectedTicket.manualSteps && (
                  <div>
                    <span className="font-semibold">Manual Steps Today:</span>
                    <div className="ml-2 text-gray-300 whitespace-pre-line">{selectedTicket.manualSteps}</div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setSelectedTicket(null)} className="mt-4 w-full bg-blue-700 hover:bg-blue-800 text-white">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Available tools cards removed as requested */}

        {/* To Be Launched Soon section removed as requested */}
      </div>
    </main>
  );
}

