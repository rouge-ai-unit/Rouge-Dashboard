"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, UploadCloud, X, Mail, MessageSquare, Clock, Zap, Lightbulb, CheckCircle, Calendar, FileText, Camera } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RecentTicketsPanel from "@/components/RecentTicketsPanel";
import { motion } from "framer-motion";

const attachmentDataUrl = z
  .string()
  .refine((s) => s.startsWith("data:"), "Invalid attachment");

const schema = z.object({
  title: z
    .string()
    .min(3, "Title is required")
    .max(120, "Keep the title under 120 characters"),
  requestedBy: z.string().email("Valid email required"),
  description: z
    .string()
    .min(10, "Please describe your request")
    .max(2000, "Keep the description under 2000 characters"),
  criticality: z.enum(["Low", "Medium", "High", "Urgent"], {
    required_error: "Select a criticality",
  }),
  status: z.enum(["Open", "In Progress", "Closed"]).default("Open"),
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
  attachments: z
    .array(attachmentDataUrl)
    .max(5, "Attach up to 5 images")
    .optional(),
  summary: z.string().max(600, "Summary should be concise (<= 600 chars) ").optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const MAX_TITLE = 120;
  const MAX_DESC = 2000;
  const MAX_SUMMARY = 600;

  // Fetch admin email dynamically
  useEffect(() => {
    const fetchAdminEmail = async () => {
      try {
        const response = await fetch('/api/public/admin-emails');
        if (response.ok) {
          const data = await response.json();
          setAdminEmail(data.primaryEmail || '');
        }
      } catch (error) {
        console.error('Error fetching admin email:', error);
      }
    };
    fetchAdminEmail();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      requestedBy: session?.user?.email ?? "",
      description: "",
      criticality: "Medium",
      status: "Open",
      problemStatement: "",
      expectedOutcome: "",
      dataSources: "",
      constraints: "",
      manualSteps: "",
      agentBreakdown: "",
      dueDate: "",
      impact: "",
      attachments: [],
      summary: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to submit");
      }
      const created = await res.json();
      toast.success("Request submitted", { description: `Ticket #${created.id ?? "success"}` });
      form.reset({
        title: "",
        requestedBy: session?.user?.email ?? "",
        description: "",
        criticality: "Medium",
        status: "Open",
        problemStatement: "",
        expectedOutcome: "",
        dataSources: "",
        constraints: "",
        manualSteps: "",
        agentBreakdown: "",
        dueDate: "",
        impact: "",
        attachments: [],
        summary: "",
      });
    } catch (e: any) {
      toast.error("Could not submit", { description: e?.message ?? "Please try again" });
    } finally {
      setSubmitting(false);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isValid },
  } = form;

  // Handle deep link from Topbar "+ New" to start a fresh support request
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new") === "1") {
        setTimeout(() => {
          try { document.getElementById("contact-title")?.focus(); } catch {}
        }, 40);
        router.replace("/tools/contact", { scroll: true });
      }
    } catch {}
  }, [router]);

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

  // Load draft from localStorage (text fields only) and persist on change
  useEffect(() => {
    try {
      const raw = localStorage.getItem("contact-draft-v1");
      if (raw) {
        const data = JSON.parse(raw) as Partial<FormValues>;
        form.reset({
          ...form.getValues(),
          ...data,
          requestedBy: session?.user?.email ?? data.requestedBy ?? "",
        });
      }
    } catch {}
  }, [session?.user?.email]);

  useEffect(() => {
    const sub = form.watch((values) => {
      const { attachments, ...rest } = values as FormValues;
      try {
        localStorage.setItem("contact-draft-v1", JSON.stringify(rest));
      } catch {}
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Only require these fields to enable AI
  const requiredOk = useMemo(() => {
    const t = watch("title") || "";
    const e = watch("requestedBy") || "";
    const d = watch("description") || "";
    const c = watch("criticality") || "";
    const emailOk = /.+@.+\..+/.test(e);
    return t.trim().length >= 3 && emailOk && d.trim().length >= 10 && !!c;
  }, [watch]);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    const existing = form.getValues("attachments") || [];
    const arr: string[] = [...existing];
    const remaining = Math.max(0, 5 - arr.length);
    const max = Math.min(files.length, remaining);
    if (remaining <= 0) {
      toast.error("Maximum of 5 attachments reached");
      return;
    }
    for (let i = 0; i < max; i++) {
      const f = files.item(i)!;
      if (!/^image\//.test(f.type)) continue;
      if (f.size > 4 * 1024 * 1024) toast("Large image — consider compressing");
      arr.push(await toDataUrl(f));
    }
    setValue("attachments", arr, { shouldValidate: true });
  }

  const removeAttachment = (idx: number) => {
    const list = [...(form.getValues("attachments") || [])];
    list.splice(idx, 1);
    setValue("attachments", list, { shouldValidate: true });
  };

  async function generateSummary() {
    const ok = await trigger(["title", "requestedBy", "description", "criticality"]);
    if (!ok) {
      toast.error("Fill required fields to generate a summary");
      return;
    }
    try {
      const body = form.getValues();
      const text = [
        body.title,
        body.description,
        body.problemStatement,
        body.expectedOutcome,
        body.impact,
      ]
        .filter(Boolean)
        .join("\n\n");
      // Lightweight local heuristic if Gemini key not set
      if (!process.env.NEXT_PUBLIC_GEMINI) {
        const bullets: string[] = [];
        if (body.problemStatement) bullets.push(`• Problem: ${body.problemStatement}`);
        if (body.expectedOutcome) bullets.push(`• Outcome: ${body.expectedOutcome}`);
        if (body.dataSources) bullets.push(`• Data: ${body.dataSources}`);
        if (body.constraints) bullets.push(`• Constraints: ${body.constraints}`);
        if (body.impact) bullets.push(`• Impact: ${body.impact}`);
        if (bullets.length === 0) bullets.push(`• ${body.description.slice(0, 300)}${body.description.length > 300 ? "…" : ""}`);
        const simple = bullets.join("\n");
        setValue("summary", simple);
        return;
      }
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI as string);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Create a concise, actionable support ticket summary using bullets with clear sections. Include Problem, Expected outcome, Data sources, Constraints, and Impact when present. Keep to ~4-6 bullets.\n\nTitle: ${body.title}\nCriticality: ${body.criticality}\nDescription: ${body.description}\nProblem: ${body.problemStatement || ""}\nOutcome: ${body.expectedOutcome || ""}\nData: ${body.dataSources || ""}\nConstraints: ${body.constraints || ""}\nImpact: ${body.impact || ""}`;
      const res = await model.generateContent(prompt);
      const summary = res.response.text().trim();
      setValue("summary", summary);
      toast.success("Summary generated");
    } catch (e) {
      toast.error("Could not generate summary");
    }
  }

  return (
    <main className="p-0 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-4xl font-bold mb-8 text-center text-white"
        >
          Contact & Support
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          {/* Left: Submit Request Form (75%) */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-9 bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700/50 transition-all duration-300 hover:shadow-blue-500/10 hover:border-gray-600/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Mail className="h-6 w-6 text-blue-400" /> Submit a Request
              </h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="contact-title" className="block text-sm font-semibold mb-2 text-gray-300">Title <RequiredMark /></Label>
                <Input id="contact-title" placeholder="e.g. Access to analytics dashboard" required aria-invalid={!!errors.title} className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("title")} />
                <div className="mt-1 text-right text-[11px] text-gray-400">{(form.watch("title")?.length || 0)}/{MAX_TITLE}</div>
                {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="requestedBy" className="block text-sm font-semibold mb-2 text-gray-300">Your Email <RequiredMark /></Label>
                <Input id="requestedBy" placeholder="name@company.com" required aria-invalid={!!errors.requestedBy} className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" disabled={!!session?.user?.email} defaultValue={session?.user?.email ?? ""} {...register("requestedBy")} />
                {errors.requestedBy && <p className="mt-1 text-sm text-red-400">{errors.requestedBy.message}</p>}
              </div>

              <div>
                <Label className="block text-sm font-semibold mb-2 text-gray-300">Criticality <RequiredMark /></Label>
                <Controller
                  name="criticality"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                      <SelectTrigger className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <SelectValue placeholder="Select criticality" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900/95 backdrop-blur-md border-gray-700/50 text-white shadow-2xl">
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.criticality && <p className="mt-1 text-sm text-red-400">{errors.criticality.message}</p>}
              </div>
              <div>
                <Label className="block text-sm font-semibold mb-2 text-gray-300">Status <RequiredMark /></Label>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                      <SelectTrigger className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900/95 backdrop-blur-md border-gray-700/50 text-white shadow-2xl">
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description" className="block text-sm font-semibold mb-2 text-gray-300">Description <RequiredMark /></Label>
                <Textarea id="description" rows={4} placeholder="Describe your request or question" required aria-invalid={!!errors.description} className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("description")} />
                <div className="mt-1 text-right text-[11px] text-gray-400">
                  {(form.watch("description")?.length || 0)}/{MAX_DESC}
                </div>
                {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="attachments" className="block text-sm font-semibold mb-2 text-gray-300">Attachments (up to 5 screenshots)</Label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  className={`rounded border border-dashed ${dragOver ? "border-blue-500 bg-blue-950/20" : "border-gray-700"} p-3 text-center bg-gray-800/30`}
                >
                  <div className="flex items-center justify-center gap-2 text-gray-300">
                    <UploadCloud className="h-4 w-4" />
                    <span>Drag & drop images here or</span>
                    <label htmlFor="attachments-input" className="underline cursor-pointer">browse</label>
                    <Input id="attachments-input" type="file" className="hidden" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG. Max 5 images.</p>
                </div>
                {form.watch("attachments")?.length ? (
                  <ul className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {form.watch("attachments")!.map((src, idx) => (
                      <li key={idx} className="relative group">
                        <img src={src} alt={`attachment-${idx + 1}`} className="h-20 w-full object-cover rounded border border-gray-700" />
                        <button type="button" onClick={() => removeAttachment(idx)} className="absolute -top-2 -right-2 bg-gray-900/80 border border-gray-700 rounded-full p-1 opacity-90 group-hover:opacity-100">
                          <X className="h-3 w-3 text-gray-300" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="summary" className="block text-sm font-semibold mb-2 text-gray-300">Summary</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textarea id="summary" rows={3} placeholder="Auto-generated or write your own" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("summary")} />
                    <div className="mt-1 text-right text-[11px] text-gray-400">
                      {(form.watch("summary")?.length || 0)}/{MAX_SUMMARY}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button type="button" variant="light" onClick={generateSummary} disabled={!requiredOk} className="h-fit inline-flex items-center gap-1">
                            <Sparkles className="h-4 w-4" /> AI
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!requiredOk && <TooltipContent>Fill required fields to enable AI generate</TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div>
                <Label htmlFor="problemStatement" className="block text-sm font-semibold mb-2 text-gray-300">Problem Statement</Label>
                <Textarea id="problemStatement" rows={3} placeholder="What's the current pain?" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("problemStatement")} />
              </div>
              <div>
                <Label htmlFor="expectedOutcome" className="block text-sm font-semibold mb-2 text-gray-300">Expected Outcome</Label>
                <Textarea id="expectedOutcome" rows={3} placeholder="What success looks like?" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("expectedOutcome")} />
              </div>

              <div>
                <Label htmlFor="dataSources" className="block text-sm font-semibold mb-2 text-gray-300">Data Sources</Label>
                <Input id="dataSources" placeholder="Sheets, DBs, APIs" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("dataSources")} />
              </div>
              <div>
                <Label htmlFor="constraints" className="block text-sm font-semibold mb-2 text-gray-300">Constraints</Label>
                <Input id="constraints" placeholder="Access, compliance, limits" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("constraints")} />
              </div>

              <div>
                <Label htmlFor="manualSteps" className="block text-sm font-semibold mb-2 text-gray-300">Manual Steps Today</Label>
                <Textarea id="manualSteps" rows={3} placeholder="Outline the current workflow" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("manualSteps")} />
              </div>
              <div>
                <Label htmlFor="agentBreakdown" className="block text-sm font-semibold mb-2 text-gray-300">Agent Breakdown (if known)</Label>
                <Textarea id="agentBreakdown" rows={3} placeholder="How you'd split into agents" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("agentBreakdown")} />
              </div>

              <div>
                <Label htmlFor="dueDate" className="block text-sm font-semibold mb-2 text-gray-300">Due Date</Label>
                <Input id="dueDate" type="date" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("dueDate")} />
                {errors.dueDate && <p className="mt-1 text-sm text-red-400">{errors.dueDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="impact" className="block text-sm font-semibold mb-2 text-gray-300">Impact</Label>
                <Input id="impact" placeholder="Time saved, cost reduced, etc." className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" {...register("impact")} />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={submitting || !isValid} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-60">
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                {!session?.user?.email && (
                  <p className="text-xs text-gray-400">Tip: Sign in to auto-fill your email and track tickets.</p>
                )}
              </div>
            </form>
          </motion.section>

          {/* Right: Info Cards (25%) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-3 space-y-6"
          >
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Mail className="w-5 h-5" />
                  Other ways to reach us
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Email Support</p>
                    <p className="text-gray-400">{adminEmail || 'Loading...'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <MessageSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Slack Channel</p>
                    <p className="text-gray-400">#ai-unit-support</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Office Hours</p>
                    <p className="text-gray-400">Mon–Fri, 9:00–17:00 PST</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Response Time</p>
                    <p className="text-gray-400">Usually within 2-4 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Lightbulb className="w-5 h-5" />
                  Pro Tips for Better Support
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-3">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-300">Be Specific</p>
                      <p className="text-gray-400 text-xs">Include data sources, constraints, and expected outcomes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-300">Set Priorities</p>
                      <p className="text-gray-400 text-xs">Add due dates and impact to help us prioritize your request</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                    <FileText className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-300">Document Workflows</p>
                      <p className="text-gray-400 text-xs">Outline current manual steps and desired automation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
                    <Camera className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-300">Add Screenshots</p>
                      <p className="text-gray-400 text-xs">Visual examples help us understand your needs faster</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <RecentTicketsPanel />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
