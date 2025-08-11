"use client";

import React, { Suspense, useState } from "react";
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
    if (path === "/dashboard") return "Dashboard";
    const title = path.split("/").pop()?.replace(/-/g, " ") ?? "";
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
    <>
      <Suspense fallback={<div className="h-12 w-full" />}> 
        <Topbar title={getTitle(pathname)} />
      </Suspense>
      <div className="flex bg-[#202222]">
        <div className="hidden md:block">
          <AppSidebar onCollapseAction={setIsSidebarCollapsed} />
        </div>

        <div
          className={`${
            isSidebarCollapsed ? "md:ml-[5rem]" : "md:ml-[15rem]"
          } transition-all duration-300 mt-4 mb-4 mr-4 min-h-[calc(90vh)] w-full bg-[#191A1A] md:rounded-lg border-[0.1px] border-slate-600 overflow-hidden p-4 text-white text-justify`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
