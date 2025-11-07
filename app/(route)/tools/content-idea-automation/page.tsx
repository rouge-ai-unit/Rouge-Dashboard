"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Newspaper, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { generateContent } from "@/lib/aiGenerate";
import { ContentTable } from "@/components/ContentTable";

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

export default function ContentIdeaAutomation() {
  const { data: session } = useSession();
  const router = useRouter();
  const [content, setContent] = useState<ContentItem[]>([]);
  
  // Get user role for permission checks
  const userRole = (session?.user as any)?.role;
  const isReadOnly = userRole === 'member';
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    fetchContentList();
    const storedTab = localStorage.getItem("content-idea-tab-v1") || "content";
    setActiveTab(storedTab);
    const id = setInterval(fetchContentList, 15000);
    return () => clearInterval(id);
  }, []);

  // Handle deep link ?new=1 from Topbar: ensure correct tab and scroll
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new") === "1") {
        setActiveTab("content");
        setTimeout(() => headerRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
        router.replace("/tools/content-idea-automation", { scroll: false });
      }
    } catch {}
  }, [router]);

  const fetchContentList = async () => {
    try {
      const con_response = await fetch(`/api/contents`);
      if (!con_response.ok) {
        const err = await con_response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch content");
      }
      const contents: ContentItem[] = await con_response.json();
      setContent(contents);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not load content ideas.");
    }
  };

  const refreshData = () => {
    fetchContentList();
  };

  const handleGenerateData = async (opts?: { from?: string; to?: string }) => {
    setLoading(true);
    toast.info("Generating new content ideas... Please wait!");
    try {
      const lastDate = content[content.length - 1]?.date;
      const body = opts?.from || opts?.to
        ? { ...(opts.from ? { from: opts.from } : {}), ...(opts.to ? { to: opts.to } : {}) }
        : lastDate
          ? { from: new Date(new Date(lastDate).getTime() + 24*60*60*1000).toISOString().split("T")[0] }
          : {};
      const res = await fetch("/api/contents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to generate");
      }
      await res.json();
      refreshData();
      toast.success("New content ideas generated successfully!");
      if (rangeOpen) setRangeOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to generate data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={(val: string) => {
            setActiveTab(val);
            localStorage.setItem("content-idea-tab-v1", val);
          }}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="content" className="cursor-pointer">
              <BrainCircuit className="h-4 w-4 mr-2" />
              Content Idea Generator
            </TabsTrigger>
            <TabsTrigger value="summary" className="cursor-pointer">
              <Newspaper className="h-4 w-4 mr-2" />
              Article Summarizer
            </TabsTrigger>
          </TabsList>

          {/* LinkedIn Idea Generator */}
          <TabsContent value="content" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between mb-6"
              ref={headerRef}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                LinkedIn Content Ideas ({content.length})
              </h1>
              {!isReadOnly ? (
                <>
                  <Button
                    onClick={() => handleGenerateData()}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Generate Data
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => setRangeOpen(true)}
                    className="ml-2 border-gray-400 text-gray-200"
                  >
                    Custom Range
                  </Button>
                </>
              ) : (
                <div className="text-sm text-yellow-300 bg-yellow-900/20 px-4 py-2 rounded-lg border border-yellow-600/50">
                  View-only access - Contact admin for generation permissions
                </div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 shadow-2xl">
                <CardContent className="mt-5">
                  <ContentTable data={content} refreshDataAction={refreshData} />
                  {content.length === 0 && (
                    <div className="text-center text-gray-400 mt-4">
                      No content found. Click Generate Data to create your first batch.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Custom range dialog */}
          <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
            <DialogContent className="bg-gray-900/95 backdrop-blur-md border-gray-700/50 text-white shadow-2xl">
              <DialogHeader>
                <DialogTitle>Generate for date range</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300">From (YYYY-MM-DD)</label>
                  <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2025-08-11" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <div>
                  <label className="text-xs text-gray-300">To (optional)</label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2025-08-16" className="bg-gray-800/50 backdrop-blur-sm border-gray-600/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRangeOpen(false)} className="border-white">Cancel</Button>
                <Button onClick={() => handleGenerateData({ from, to: to || undefined })} disabled={loading || !from} className="bg-cyan-600 hover:bg-cyan-700">Generate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Article Summariser */}
          <TabsContent value="summary" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 text-white shadow-2xl">
                <CardHeader>
                  <CardTitle>Article Summarizer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg overflow-hidden border border-gray-600">
                    <iframe
                      src="https://influencer-unit-automation-article-h99b.onrender.com/"
                      className="w-full h-full border-none"
                      title="Article Summariser"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
