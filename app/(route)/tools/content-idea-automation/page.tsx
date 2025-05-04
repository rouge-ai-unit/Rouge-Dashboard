"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateContent } from "@/lib/aiGenerate";
import { db } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { ContentTable } from "@/components/ContentTable";

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

export default function Home() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  useEffect(() => {
    fetchCompanyList();
    const storedTab = localStorage.getItem("defaultTab") || "content";
    setActiveTab(storedTab);
  }, []);



  const fetchCompanyList = async () => {
    const con_response = await fetch(`/api/contents`);
    const contents: ContentItem[] = await con_response.json();
    setContent(contents);
  };

  const refreshData = () => {
    fetchCompanyList();
  };

  const handleGenerateData = async () => {
    const to = content[content.length - 1]?.date;

    const topics = content.map((item) => item.generalTheme);
    const contentTitles = topics.join(", ");

    const formatDateToHongKong = (date: Date): string => {
      const utc = date.getTime() + date.getTimezoneOffset() * 60000;
      const hongKongTime = new Date(utc + 8 * 60 * 60 * 1000);

      const year = hongKongTime.getFullYear();
      const month = String(hongKongTime.getMonth() + 1).padStart(2, "0");
      const day = String(hongKongTime.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const toDateInput =
      typeof to !== "undefined" ? to : formatDateToHongKong(new Date());

    const newFrom = new Date(toDateInput);
    newFrom.setDate(newFrom.getDate() + (to ? 1 : 0));

    const newTo = new Date(newFrom);
    newTo.setDate(newTo.getDate() + 5);

    const fromDate = formatDateToHongKong(newFrom);
    const toDate = formatDateToHongKong(newTo);

    toast.info("Generating data... Please wait!");
    setLoading(true);

    const data = await generateContent(fromDate, toDate, contentTitles);
    console.log("Generated Data:", data);

    for (const item of data) {
      await db
        .insert(LinkedinContent)
        .values({
          dayOfMonth: item.dayOfMonth,
          weekOfMonth: item.weekOfMonth,
          date: item.date,
          specialOccasion: item.specialOccasion,
          generalTheme: item.generalTheme,
          postIdeas: item.postIdeas,
          caption: item.caption,
          hashtags: item.hashtags,
        })
        .returning();
    }

    refreshData();
    setLoading(false);
    toast.success("Data generated successfully!");
  };


  return (
    <div className="p-8">
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          localStorage.setItem("defaultTab", val);
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="content" className="cursor-pointer">
            Content Idea Generator
          </TabsTrigger>
          <TabsTrigger value="summary" className="cursor-pointer">
            Article Summariser
          </TabsTrigger>
        </TabsList>

        {/* LinkedIn Idea Generator */}
        <TabsContent value="content" className="space-y-4">
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold">
              LinkedIn Content Ideas
            </h1>
          </div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">
              Content Ideas ({content.length})
            </h1>
            <Button
              onClick={handleGenerateData}
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
          </div>
          <Card className="bg-transparent">
            <CardContent className="mt-5">
              <ContentTable data={content} refreshData={refreshData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Article Summariser */}
        <TabsContent value="summary" className="space-y-4">
          <main className="p-0 m-0 h-screen">
            <iframe
              src="https://influencer-unit-automation-article-h99b.onrender.com/"
              className="w-full h-full border-none rounded-3xl"
              title="Article Summariser"
            />
          </main>
        </TabsContent>
      </Tabs>
    </div>
  );
}
