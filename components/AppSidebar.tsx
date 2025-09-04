"use client";

import { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  ChartScatter,
  UserCog2,
  Newspaper,
  Mail,
  University,
  Briefcase,
  ListChecks,
  BrainCircuit,
  FileText,
  Target,
  GraduationCap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState as useReactState } from "react";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";


const publicNavItems = [
  {
  title: "Home",
    icon: LayoutDashboard,
  href: "/home",
  },
  {
    title: "Support Request Form",
    icon: FileText, // Changed to FileText icon for uniqueness
    href: "/Submit-Request-Form",
  },
  {
    title: "Work Tracker",
    icon: UserCog2,
    href: "/work-tracker",
  },
  {
    title: "Ai News Daily",
    icon: Newspaper,
    href: "/tools/ai-news-daily",
  },
  {
    title: "Agritech Startup Seeker",
    icon: Target,
    href: "/tools/startup-seeker",
  },
  {
    title: "Agritech Universities",
    icon: GraduationCap,
    href: "/tools/agritech-universities",
  },
  {
    title: "Content Idea Automation",
    icon: BrainCircuit,
    href: "/tools/content-idea-automation",
  },
  {
    title: "Contact Us",
    icon: Mail,
    href: "/tools/contact",
  },
];



interface AppSidebarProps {
  onCollapseAction?: (collapsed: boolean) => void;
}

export default function AppSidebar({ onCollapseAction }: AppSidebarProps) {

  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useReactState(false);
  // onCollapseAction is received via props

  // Persist collapsed state across reloads for better UX
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    const isCollapsed = saved ? saved === "true" : false;
    setCollapsed(isCollapsed);
    try {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--sidebar-width",
          isCollapsed ? "5rem" : "15rem"
        );
      }
    } catch {}
  }, []);

  const handleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    if (typeof onCollapseAction === 'function') {
      onCollapseAction(newCollapsedState);
    }
    try {
      localStorage.setItem("sidebar_collapsed", String(newCollapsedState));
      // Sync CSS var for topbar offset
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--sidebar-width",
          newCollapsedState ? "5rem" : "15rem"
        );
      }
    } catch {}
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#202222] text-white transition-all duration-300 ${
        collapsed ? "w-[5rem]" : "w-[15rem]"
      } flex flex-col`}
      style={{ width: collapsed ? "5rem" : "15rem" }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-center px-4 py-4 gap-3">
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Image
              src="/logo.jpg"
              alt="Company Logo"
              width={40}
              height={40}
              className="rounded-md select-none"
              quality={100}
              priority
            />
          </Link>
          {!collapsed && (
            <p className="font-bold text-lg subpixel-antialiased tracking-tight">Rouge</p>
          )}
        </div>
        {!collapsed && (
          <Image
            onClick={handleCollapse}
            src={"/collapse.svg"}
            alt="Collapse"
            width={30}
            height={30}
            className="p-1 cursor-pointer mr-3 hover:bg-[#2c2e2e] rounded-full transition-all duration-500"
          />
        )}
      </div>
      {/* Navigation Menu */}
      <nav className="mt-4 flex-1 overflow-y-auto" aria-label="Primary">
        {publicNavItems.map((item, index) => (
          <Link href={item.href} key={index} aria-current={pathname === item.href ? "page" : undefined}>
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 cursor-pointer justify-center ${pathname === item.href ? "bg-[#2c2e2e] text-white" : "text-gray-300 hover:bg-[#2c2e2e] hover:text-white"}`}
                      role="link"
                      tabIndex={0}
                    >
                      <item.icon size={22} aria-hidden="true" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div
                className={`flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 cursor-pointer ${pathname === item.href ? "bg-[#2c2e2e] text-white" : "text-gray-300 hover:bg-[#2c2e2e] hover:text-white"}`}
                role="link"
                tabIndex={0}
              >
                <item.icon size={22} aria-hidden="true" />
                <span className="ml-2 text-[15px] leading-[22px]">
                  {item.title}
                </span>
              </div>
            )}
          </Link>
        ))}
      </nav>

  {/* Footer */}
  <div className="mt-auto px-4 py-4 w-full border-t border-[#2c2e2e]">
        {!collapsed ? (
          session ? (
            <div className="flex items-center justify-between">
              {!collapsed && (
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-gray-400">{session.user?.email}</p>
                </div>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        setSigningOut(true);
                        await signOut({ callbackUrl: '/signin', redirect: false });
                        window.location.href = '/signin';
                      }}
                      disabled={signingOut}
                      className={`text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors cursor-pointer inline-flex items-center justify-center w-10 h-10`}
                      aria-label="Sign out"
                    >
                      {signingOut ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      ) : (
                        <LogOut />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign Out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <button className="w-full py-2 bg-cyan-500 hover:bg-cyan-700 rounded-md text-black transition-all duration-300">
              <Link
                href="/signin"
                className={`flex items-center text-white rounded-md p-2 transition-colors ${
                  !collapsed && "justify-center"
                }`}
              >
                <LogIn />
                {!collapsed && <span className="ml-2">Sign In</span>}
              </Link>
            </button>
          )
        ) : (
          <div className="flex-col items-center space-y-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCollapse}
                    className="text-gray-400 hover:text-white transition-transform duration-300 flex justify-center w-full cursor-pointer"
                    aria-label="Toggle Sidebar"
                  >
                    <Image
                      src={"/collapse.svg"}
                      alt="Expand"
                      width={60}
                      height={60}
                      className="p-2 rotate-180 bg-[#2c2e2e] rounded-full hover:bg-[#2c2e2e]/50 transition-all duration-500 hover:scale-90"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expand</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {session ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        setSigningOut(true);
                        await signOut({ callbackUrl: '/signin', redirect: false });
                        window.location.href = '/signin';
                      }}
                      disabled={signingOut}
                      className="text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors cursor-pointer inline-flex items-center justify-center w-10 h-10"
                      aria-label="Sign out"
                    >
                      {signingOut ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      ) : (
                        <LogOut />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign Out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="w-full py-1 rounded-full bg-cyan-500 hover:bg-cyan-700 text-black transition-all duration-300 cursor-pointer">
                      <Link
                        href="/signin"
                        className={`flex items-center text-white rounded-md p-2 transition-colors ${
                          !collapsed && "justify-center"
                        }`}
                      >
                        <LogIn />
                      </Link>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign In</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
