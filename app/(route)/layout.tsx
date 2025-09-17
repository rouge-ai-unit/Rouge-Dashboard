"use client";

import React, { Suspense, useState } from "react";
import AppSidebar from "../../components/AppSidebar";
import MobileSidebar from "../../components/MobileSidebar";
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
  if (path === "/tools/ai-tools-request-form") return "AI Tools Request Form";
    const title = path.split("/").pop()?.replace(/-/g, " ") ?? "";
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
    <>
      <Suspense fallback={<div className="h-12 w-full" />}> 
        <Topbar title={getTitle(pathname)} />
      </Suspense>
      <div className="flex flex-col md:flex-row bg-[#202222] min-h-screen w-full">
        {/* Mobile Sidebar */}
        <div className="block md:hidden">
          <MobileSidebar />
        </div>
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar onCollapseAction={setIsSidebarCollapsed} />
        </div>

        <main
          className={`flex-1 w-full transition-all duration-300 ${
            isSidebarCollapsed ? "md:ml-[5rem]" : "md:ml-[15rem]"
          } md:mt-4 md:mb-4 md:mr-4 min-h-[calc(90vh)] bg-[#191A1A] md:rounded-lg border-[0.1px] border-slate-600 overflow-x-auto p-[5vw] md:p-4 text-white text-justify`}
          style={{ minHeight: 'calc(100vh - 3rem)' }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
