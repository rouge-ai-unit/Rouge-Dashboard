"use client";

import React, { Suspense, useEffect, useState } from "react";
import AppSidebar from "../../components/AppSidebar";
import Topbar from "@/components/Topbar";
import { usePathname } from "next/navigation";

export default function RouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const getTitle = (path: string) => {
    if (path === "/home") return "Home";
    if (path === "/tools/ai-list") return "AI List";
    if (path === "/tools/ai-news-daily") return "AI News Daily";
    const title = path.split("/").pop()?.replace(/-/g, " ") ?? "";
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  // Log tool page views so tool_usage_logs reflects real usage (not only Home clicks)
  useEffect(() => {
    if (!pathname?.startsWith("/tools/") || pathname.startsWith("/tools/analytics")) return;
    const toolPath = pathname.split("/").slice(0, 3).join("/");
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName: toolPath, action: "view" }),
    }).catch(() => {});
  }, [pathname]);

  return (
    <>
      <Suspense fallback={<div className="h-12 w-full" />}>
        <Topbar title={getTitle(pathname)} />
      </Suspense>
      <div className="flex flex-col md:flex-row min-h-screen w-full">
        {/* Unified Sidebar for both mobile and desktop */}
        <AppSidebar onCollapseAction={setIsSidebarCollapsed} />

        <main
          className={`flex-1 w-full transition-all duration-300 ${
            isSidebarCollapsed ? "md:ml-[5rem]" : "md:ml-[15rem]"
          } md:mt-4 md:mb-4 md:mr-4 min-h-[calc(90vh)] bg-gray-900/50 backdrop-blur-sm md:rounded-2xl border border-gray-700/50 shadow-sm overflow-x-auto p-[5vw] md:p-6 text-white`}
          style={{ minHeight: 'calc(100vh - 3rem)' }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
