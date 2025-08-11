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
  criticality: string;
  requestedBy: string;
  status: string;
  problemStatement?: string | null;
  expectedOutcome?: string | null;
  dataSources?: string | null;
  constraints?: string | null;
  manualSteps?: string | null;
  agentBreakdown?: string | null;
  dueDate?: string | null;
  impact?: string | null;
};

export default function Dashboard() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [, setLoading] = useState({ tools: true, tickets: true });
  const [submitting, setSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ticketsFilter, setTicketsFilter] = useState<"All" | "Open" | "In Progress" | "Closed">("All");
  const [ticketsSearch, setTicketsSearch] = useState("");

  // Form schema and setup (RHF + Zod)
  const MAX_TITLE = 120;
  const MAX_DESC = 2000;
  const schema = z.object({
    title: z.string().min(3, "Title is required").max(MAX_TITLE, `Keep under ${MAX_TITLE} characters`),
    requestedBy: z.string().email("Valid email required"),
    description: z.string().min(10, "Please describe your request").max(MAX_DESC, `Keep under ${MAX_DESC} characters`),
    criticality: z.enum(["Low", "Medium", "High", "Critical", "Urgent"], { required_error: "Select a criticality" }),
    problemStatement: z.string().optional(),
    expectedOutcome: z.string().optional(),
    dataSources: z.string().optional(),
    constraints: z.string().optional(),
    manualSteps: z.string().optional(),
    agentBreakdown: z.string().optional(),
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
    impact: z.string().optional(),
  });
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      criticality: "Medium",
      requestedBy: "",
      problemStatement: "",
      expectedOutcome: "",
      dataSources: "",
      constraints: "",
      manualSteps: "",
      agentBreakdown: "",
      dueDate: "",
      impact: "",
    },
    mode: "onChange",
  });

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

  const refreshNow = () => {
    fetchTools();
    fetchTickets();
  };

  function exportTicketsCsv(rows: Ticket[]) {
    try {
      const headers = ["id","title","requestedBy","criticality","impact","dueDate","status"] as const;
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
        criticality: "Medium",
        requestedBy: "",
        problemStatement: "",
        expectedOutcome: "",
        dataSources: "",
        constraints: "",
        manualSteps: "",
        agentBreakdown: "",
        dueDate: "",
        impact: "",
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
      const prev = tickets;
      setTickets((cur) => cur.filter((t) => t.id !== id));
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

  async function generateAgentBreakdown() {
    const ok = await trigger(["title", "requestedBy", "description", "criticality"]);
    if (!ok) {
      toast.error("Fill required fields to enable AI generate");
      return;
    }
    const body = form.getValues();
    try {
      if (!process.env.NEXT_PUBLIC_GEMINI) {
        const parts: string[] = [];
        if (body.manualSteps) parts.push(`Steps: ${body.manualSteps}`);
        if (body.dataSources) parts.push(`Data: ${body.dataSources}`);
        if (body.constraints) parts.push(`Constraints: ${body.constraints}`);
        const base = parts.join("\n");
        const suggestion = `• Intake: validate inputs and fetch required data\n• Process: transform and analyze\n• Output: generate results and notify stakeholders\n${base ? `• Notes: ${base}` : ""}`.trim();
        setValue("agentBreakdown", suggestion);
        return;
      }
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI as string);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Given the request below, propose a 3-5 bullet agent breakdown (modules or micro-services) with clear responsibilities.\nTitle: ${body.title}\nDescription: ${body.description}\nProblem: ${body.problemStatement || ""}\nExpected outcome: ${body.expectedOutcome || ""}\nData sources: ${body.dataSources || ""}\nConstraints: ${body.constraints || ""}\nManual steps today: ${body.manualSteps || ""}`;
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();
      setValue("agentBreakdown", text);
      toast.success("Agent breakdown generated");
    } catch {
      toast.error("Could not generate");
    }
  }

  return (
    <main className="p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-4xl font-bold mb-8 text-center text-white"
        >
          AI Tools Dashboard
        </motion.h1>

        {/* Sidebar left, Form/Table right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Left sidebar with dashboard-related content */}
          <div className="space-y-6">
            <Card className="bg-[#1b1d1e] border-gray-700">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-2">
                <ul className="space-y-2">
                  <li><Link href="/stats" className="hover:underline">Analytics</Link></li>
                  <li><Link href="/work-tracker" className="hover:underline">Work Tracker</Link></li>
                  <li><Link href="/tools/ai-news-daily" className="hover:underline">AI News Daily</Link></li>
                  <li><Link href="/tools/content-idea-automation" className="hover:underline">Content Idea Automation</Link></li>
                  <li><a href="https://rouge-university-list.streamlit.app/" target="_blank" rel="noreferrer" className="hover:underline">ASEAN University Data Extractor</a></li>
                  <li><Link href="/tools/contact" className="hover:underline">Contact Support</Link></li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-[#1b1d1e] border-gray-700">
              <CardHeader>
                <CardTitle>At a glance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded border border-gray-700 p-3">
                    <div className="text-gray-400">Total tools</div>
                    <div className="text-white text-lg font-semibold">{tools.length}</div>
                  </div>
                  <div className="rounded border border-gray-700 p-3">
                    <div className="text-gray-400">In progress</div>
                    <div className="text-white text-lg font-semibold">{progressTools.length}</div>
                  </div>
                  <div className="rounded border border-gray-700 p-3">
                    <div className="text-gray-400">Available</div>
                    <div className="text-white text-lg font-semibold">{availableTools.length}</div>
                  </div>
                  <div className="rounded border border-gray-700 p-3">
                    <div className="text-gray-400">Coming soon</div>
                    <div className="text-white text-lg font-semibold">{comingSoonTools.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <RecentTicketsPanel title="Recent Requests" />
          </div>
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-2 bg-[#232526] rounded-xl p-8 shadow-lg border border-gray-700 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-blue-400" /> Submit New AI Tool Request</h2>
              <button onClick={refreshNow} className="text-gray-300 hover:text-white inline-flex items-center gap-1 text-sm">
                <RefreshCcw className="h-4 w-4" /> Refresh
              </button>
            </div>
            <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label className="block text-sm font-semibold mb-2 text-gray-300">Tool Title <RequiredMark /></Label>
              <Input
                required
                placeholder="E.g. Automated Report Generator"
                className="bg-[#191A1A] border-gray-600 text-white"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              <div className="mt-1 text-right text-[11px] text-gray-400">{(watch("title")?.length || 0)}/{MAX_TITLE}</div>
              {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
            </div>
            <div>
              <Label className="block text-sm font-semibold mb-2 text-gray-300">Requested By (email) <RequiredMark /></Label>
              <Input
                required
                placeholder="name@company.com"
                className="bg-[#191A1A] border-gray-600 text-white"
                aria-invalid={!!errors.requestedBy}
                {...register("requestedBy")}
              />
              {errors.requestedBy && <p className="mt-1 text-sm text-red-400">{errors.requestedBy.message}</p>}
            </div>
            <div className="md:col-span-2">
              <Label className="block text-sm font-semibold mb-2 text-gray-300">Description & Criteria <RequiredMark /></Label>
              <Textarea
                required
                placeholder="Describe the tool, criteria, and why it's needed."
                className="bg-[#191A1A] border-gray-600 text-white min-h-[80px]"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              <div className="mt-1 text-right text-[11px] text-gray-400">{(watch("description")?.length || 0)}/{MAX_DESC}</div>
              {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>}
            </div>
            <div className="md:col-span-2 grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Problem Statement</label>
                <Textarea
                  placeholder="What's the current pain?"
                  className="bg-[#191A1A] border-gray-600 text-white min-h-[70px]"
                  {...register("problemStatement")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Expected Outcome</label>
                <Textarea
                  placeholder="What success looks like"
                  className="bg-[#191A1A] border-gray-600 text-white min-h-[70px]"
                  {...register("expectedOutcome")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Data Sources</label>
                <Input
                  placeholder="Sheets, DBs, APIs"
                  className="bg-[#191A1A] border-gray-600 text-white"
                  {...register("dataSources")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Constraints</label>
                <Input
                  placeholder="Access, compliance, limits"
                  className="bg-[#191A1A] border-gray-600 text-white"
                  {...register("constraints")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Manual Steps Today</label>
                <Textarea
                  placeholder="Outline the current workflow"
                  className="bg-[#191A1A] border-gray-600 text-white min-h-[70px]"
                  {...register("manualSteps")}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Agent Breakdown (optional)</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button type="button" variant="light" onClick={generateAgentBreakdown} disabled={!requiredOk} className="h-7 px-2 inline-flex items-center gap-1">
                          <Sparkles className="h-4 w-4" /> AI
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!requiredOk && <TooltipContent>Fill required fields to enable AI generate</TooltipContent>}
                  </Tooltip>
                </div>
                <Textarea
                  placeholder="How you'd split into agents"
                  className="bg-[#191A1A] border-gray-600 text-white min-h-[70px]"
                  {...register("agentBreakdown")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Due Date</label>
                <Input
                  type="date"
                  className="bg-[#191A1A] border-gray-600 text-white"
                  aria-invalid={!!errors.dueDate}
                  {...register("dueDate")}
                />
                {errors.dueDate && <p className="mt-1 text-sm text-red-400">{errors.dueDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Impact</label>
                <Input
                  placeholder="Time saved, cost reduced, etc."
                  className="bg-[#191A1A] border-gray-600 text-white"
                  {...register("impact")}
                />
              </div>
            </div>
            <div>
              <Label className="block text-sm font-semibold mb-2 text-gray-300">Criticality <RequiredMark /></Label>
              <Controller
                name="criticality"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger className="bg-[#191A1A] text-gray-100 border-gray-700">
                      <SelectValue placeholder="Select criticality" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.criticality && <p className="mt-1 text-sm text-red-400">{errors.criticality.message}</p>}
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
                    <SelectTrigger className="bg-[#191A1A] text-gray-100 border-gray-700 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
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
                      <th className="p-3">Requested By</th>
                      <th className="p-3">Criticality</th>
                      <th className="p-3">Impact</th>
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
                            <td className="p-3 text-white">{ticket.requestedBy}</td>
                            <td className={`p-3 font-bold ${ticket.criticality === "Critical" || ticket.criticality === "Urgent" ? "text-red-500" : ticket.criticality === "High" ? "text-yellow-400" : "text-blue-400"}`}>{ticket.criticality}</td>
                            <td className="p-3 text-white">{ticket.impact ?? "—"}</td>
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
        </div>

        {/* Tools In Progress Table */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35 }}
          className="mb-16 bg-[#232526] rounded-xl p-8 shadow-lg border border-gray-700 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wrench className="h-6 w-6 text-yellow-400" /> Tools In Progress
              <span className="ml-2 text-xs font-normal text-gray-400">{filteredSortedProgressTools.length} items</span>
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-green-400"><span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" /> live</span>
            </h2>
            <div className="flex items-center gap-2 text-sm flex-wrap justify-end">
              <div className="relative">
                <Input value={toolsSearch} onChange={(e) => setToolsSearch(e.target.value)} placeholder="Search tools…" className="h-8 bg-[#191A1A] text-gray-100 border-gray-700 pr-8" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">/</span>
              </div>
              <Select value={toolsFilter} onValueChange={(v) => setToolsFilter(v as typeof toolsFilter)}>
                <SelectTrigger className="bg-[#191A1A] text-gray-100 border-gray-700 h-8">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={toolsSort} onValueChange={(v) => setToolsSort(v as typeof toolsSort)}>
                <SelectTrigger className="bg-[#191A1A] text-gray-100 border-gray-700 h-8">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1d1e] border-gray-700 text-gray-100">
                  <SelectItem value="Criticality">Criticality</SelectItem>
                  <SelectItem value="Progress">Progress</SelectItem>
                  <SelectItem value="Name">Name</SelectItem>
                  <SelectItem value="Status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="light" className="h-8" onClick={() => setToolsSortDir(d => d === "desc" ? "asc" : "desc")}>{toolsSortDir === "desc" ? "Desc" : "Asc"}</Button>
              <Button variant="light" className="h-8" onClick={() => exportTicketsCsv(
                filteredSortedProgressTools.map(t => ({
                  id: "",
                  title: t.name,
                  requestedBy: t.unit ?? "",
                  criticality: t.criticality,
                  impact: "",
                  dueDate: "",
                  status: t.status,
                })) as unknown as Ticket[]
              )}>Export CSV</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
        <thead className="bg-[#191A1A] text-gray-300 sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left">Tool</th>
                  <th className="p-3 text-left">Unit</th>
          <th className="p-3 text-left">Owner</th>
          <th className="p-3 text-left">ETA</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3">Criticality</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSortedProgressTools
                  .map((tool, idx) => (
          <motion.tr key={`${tool.name}-${idx}`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.25, delay: idx * 0.03 }} className="border-b border-gray-700 hover:bg-[#1d2021]">
                    <td className="p-3 text-white font-semibold">{tool.name}</td>
                    <td className="p-3 text-gray-300">{tool.unit ?? "—"}</td>
          <td className="p-3 text-gray-300">{tool.owner ?? "—"}</td>
          <td className="p-3 text-gray-300">{tool.eta ?? "—"}</td>
                    <td className="p-3">
                      <div className="w-full bg-gray-800 rounded-full h-3 relative overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${tool.progress > 80 ? "bg-green-500" : tool.progress > 50 ? "bg-yellow-400" : "bg-blue-500"}`}
                          style={{ width: `${tool.progress}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-bold">{tool.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${(tool.criticality === "Critical" || tool.criticality === "Urgent") ? "text-red-400 border-red-400/40 bg-red-900/20" : tool.criticality === "High" ? "text-yellow-300 border-yellow-300/40 bg-yellow-900/10" : "text-blue-300 border-blue-300/40 bg-blue-900/10"}`}>{tool.criticality}</span>
                    </td>
                    <td className={`p-3 font-semibold ${tool.status === "In Progress" ? "text-yellow-400" : tool.status === "Testing" ? "text-green-400" : "text-blue-400"}`}>{tool.status}</td>
                    <td className="p-3">
                      <div className="flex justify-end">
                        {tool.href ? (
                          <Link href={tool.href} className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800">Open</Link>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
        {progressTools.length === 0 && (
                  <tr>
          <td className="p-4 text-gray-400" colSpan={8}>No tools in progress.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* ...existing code... */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {availableTools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              className="flex flex-col justify-between h-full bg-white p-6 rounded-xl border border-gray-200 shadow-md"
            >
              <div>
                <h2 className="text-xl font-semibold mb-2 text-black break-words">
                  {tool.name}
                </h2>
                <p className="text-gray-600 text-sm mb-2">{tool.description}</p>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href={tool.href}
                  className="bg-black text-white px-4 py-2 text-sm rounded-md hover:bg-gray-800"
                >
                  Open Tool
                </Link>
              </div>
            </motion.div>
          ))}
          {availableTools.length === 0 && (
            <div className="col-span-full text-center text-gray-400">
              No available tools. Try <Link href="/tools/content-idea-automation" className="underline">Content Idea Automation</Link> to get started.
            </div>
          )}
        </div>

        {/* To Be Launched Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-6 text-white text-center flex items-center justify-center gap-2">
            <Rocket className="h-6 w-6 text-yellow-400" /> To Be Launched Soon
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoonTools.map((tool, i) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="flex flex-col justify-between h-full bg-[#2b2f31] p-6 rounded-xl border border-gray-700 shadow-inner"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white break-words">
                    {tool.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-2">
                    {tool.description}
                  </p>
                  {tool.unit && (
                    <p className="text-gray-400 text-xs italic">{tool.unit}</p>
                  )}
                </div>
                <div className="mt-4 text-right">
                  <span className="text-yellow-400 text-xs font-medium tracking-wide">
                    COMING SOON
                  </span>
                </div>
              </motion.div>
            ))}
            {comingSoonTools.length === 0 && (
              <div className="col-span-full text-center text-gray-400">No upcoming tools.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
