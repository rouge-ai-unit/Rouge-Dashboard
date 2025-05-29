"use client";

import React, { useState } from "react";
import AppSidebar from "../../../components/AppSidebar";
import Dashboard from "../../../components/Dashboard";
import MobileSidebar from "@/components/MobileSidebar";

const Page = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  return (
    <div className="flex bg-[#202222]">
      <div className="hidden md:block">
        {/* On mobile it will not be shown  */}
        <AppSidebar onCollapse={setIsSidebarCollapsed} />
      </div>
      <div className="md:hidden flex">
        <MobileSidebar />
      </div>

      <div
        className={`${
          isSidebarCollapsed ? "md:ml-[5rem]" : "md:ml-[15rem]"
        } transition-all duration-300 mt-4 mb-4 mr-4 min-h-[calc(95vh)] w-full bg-[#191A1A] md:rounded-lg border-[0.1px] border-slate-600 overflow-hidden p-4 text-white text-justify`}
      >
        <Dashboard />
      </div>
    </div>
  );
};

export default Page;
