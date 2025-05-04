"use client";

import { useState } from "react";
import { Brain, Home, History, Search, LogIn, LogOut, LayoutDashboard, ChartScatter, UserCog2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const navItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Analytics",
    icon: ChartScatter,
    href: "/stats",
  },
  {
    title: "Work Tracker",
    icon: UserCog2,
    href: "/work-tracker",
  },
];

export default function AppSidebar({ onCollapse }) {
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    onCollapse(newCollapsedState);
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#202222] text-white transition-all duration-300 ${
        collapsed ? "w-[5rem]" : "w-[15rem]"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-center px-4 py-4 gap-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Image
              src="/logo.jpg"
              alt="Company Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
          </Link>
          {!collapsed && <p className="text-xs">Rouge Dashboard</p>}
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
      <nav className="mt-4">
        {navItems.map((item, index) => (
          <Link href={item.href} key={index}>
            <button
              className={`flex items-center gap-4 w-full px-4 py-3 text-gray-300 hover:bg-[#2c2e2e] hover:text-white rounded-md transition-all duration-200 cursor-pointer ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <item.icon size={24} />
              {!collapsed && (
                <span className="ml-2 text-[16px] leading-[24px]">
                  {item.title}
                </span>
              )}
            </button>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-4 py-4 w-full absolute bottom-0 left-0 right-0">
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
                      onClick={() => signOut()}
                      className={`text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors cursor-pointer ${
                        !collapsed && "w-10 h-10 flex justify-center"
                      }`}
                      aria-label="Sign out"
                    >
                      <LogOut />
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
                      onClick={() => signOut()}
                      className={`text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors cursor-pointer ${
                        !collapsed && "w-10 h-10 flex justify-center"
                      }`}
                      aria-label="Sign out"
                    >
                      <LogOut />
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
