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
  HelpCircle,
  Sparkles,
  TrendingUp,
  Shield,
  Menu,
  X,
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


// Icon mapping for dynamic tools
const iconMap: Record<string, any> = {
  LayoutDashboard,
  Shield,
  FileText,
  UserCog2,
  Newspaper,
  Target,
  Sparkles,
  GraduationCap,
  TrendingUp,
  BrainCircuit,
  Mail,
  Briefcase,
  HelpCircle,
};

interface AppSidebarProps {
  onCollapseAction?: (collapsed: boolean) => void;
}

interface NavItem {
  title: string;
  icon: any;
  href: string;
}

export default function AppSidebar({ onCollapseAction }: AppSidebarProps) {
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useReactState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch accessible tools dynamically from API
  useEffect(() => {
    const fetchAccessibleTools = async () => {
      if (status === "authenticated" && session?.user) {
        try {
          // Determine if we're in admin context based on current path
          const isAdminRoute = pathname?.startsWith('/admin');
          const context = isAdminRoute ? 'admin' : 'normal';
          
          const response = await fetch(`/api/user/accessible-tools?context=${context}`);
          if (response.ok) {
            const data = await response.json();
            const tools = data.tools.map((tool: any) => ({
              title: tool.title,
              icon: iconMap[tool.icon] || LayoutDashboard,
              href: tool.href,
            }));
            setNavItems(tools);
          }
        } catch (error) {
          console.error('Error fetching accessible tools:', error);
        } finally {
          setLoading(false);
        }
      } else if (status === "unauthenticated") {
        setLoading(false);
      }
    };

    fetchAccessibleTools();
  }, [session, status, pathname]);

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
    <>
      {/* Mobile Hamburger Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-gray-900/95 backdrop-blur-md p-2 rounded-lg text-white shadow-2xl border border-gray-700/50"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-gray-900/95 backdrop-blur-md border-r border-gray-700/50 text-white transition-all duration-300 flex flex-col shadow-2xl z-50
          md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "md:w-[5rem]" : "md:w-[15rem]"} w-[75%] max-w-xs md:max-w-none`}
        style={{ width: collapsed ? "5rem" : "15rem" }}
      >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4 gap-3 border-b border-gray-700 md:border-0">
        <div className="flex items-center gap-2">
          <Link href="/home" onClick={() => setMobileOpen(false)}>
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
        {/* Close button for mobile */}
        <button onClick={() => setMobileOpen(false)} className="md:hidden">
          <X size={24} />
        </button>
        {/* Collapse button for desktop */}
        {!collapsed && (
          <Image
            onClick={handleCollapse}
            src={"/collapse.svg"}
            alt="Collapse"
            width={30}
            height={30}
            className="hidden md:block p-1 cursor-pointer mr-3 hover:bg-gray-800/50 rounded-full transition-all duration-500"
          />
        )}
      </div>
      {/* Navigation Menu */}
      <nav className="mt-4 flex-1 overflow-y-auto" aria-label="Primary">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          navItems.map((item, index) => (
          <Link 
            href={item.href} 
            key={index} 
            aria-current={pathname === item.href ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center gap-4 w-full px-4 py-3 rounded-full transition-all duration-200 cursor-pointer justify-center ${pathname === item.href ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-gray-300 hover:bg-gray-700/60 hover:text-white hover:backdrop-blur-sm"}`}
                      role="link"
                      tabIndex={0}
                    >
                      <item.icon size={22} aria-hidden="true" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800/95 backdrop-blur-sm border-gray-600/50 text-white">
                    <span className="px-2 py-1 bg-gray-700/80 rounded-full text-sm font-medium">
                      {item.title}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div
                className={`flex items-center gap-4 w-full px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group ${pathname === item.href ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-gray-300 hover:bg-gray-700/60 hover:text-white hover:backdrop-blur-sm"}`}
                role="link"
                tabIndex={0}
              >
                <item.icon size={22} aria-hidden="true" />
                <span className={`ml-2 text-[15px] leading-[22px] px-2 py-1 rounded-full transition-all duration-200 ${pathname === item.href ? "" : "group-hover:bg-gray-600/50 group-hover:backdrop-blur-sm"}`}>
                  {item.title}
                </span>
              </div>
            )}
          </Link>
        ))
        )}
      </nav>

  {/* Footer */}
  <div className="mt-auto px-4 py-4 w-full border-t border-gray-700/50">
        {!collapsed ? (
          session ? (
            <div className="flex items-center justify-between gap-2">
              {!collapsed && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {(() => {
                      const userRole = (session.user as any)?.role;
                      const userUnit = (session.user as any)?.unit;
                      const getRoleBadgeColor = (role: string) => {
                        switch (role) {
                          case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
                          case 'leader': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                          case 'co-leader': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                          case 'member': return 'bg-green-500/20 text-green-400 border-green-500/30';
                          default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                        }
                      };
                      return (
                        <>
                          {userRole && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${getRoleBadgeColor(userRole)}`}>
                              {userRole}
                            </span>
                          )}
                          {userUnit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-500/20 text-gray-400 border-gray-500/30 truncate max-w-[80px]" title={userUnit}>
                              {userUnit}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              <div className="flex-shrink-0">
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
                      className={`text-red-400 hover:text-white hover:bg-red-600/30 bg-red-600/10 border border-red-500/40 hover:border-red-400/60 rounded-full p-2.5 transition-all duration-200 cursor-pointer inline-flex items-center justify-center w-11 h-11 shadow-lg hover:shadow-red-500/20`}
                      aria-label="Sign out"
                    >
                      {signingOut ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      ) : (
                        <LogOut size={20} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign Out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              </div>
            </div>
          ) : (
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all duration-300">
              <Link
                href="/signin"
                className={`flex items-center text-white rounded-lg p-2 transition-colors ${
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
                      className="p-2 rotate-180 bg-gray-800/50 rounded-full hover:bg-gray-700/50 transition-all duration-500 hover:scale-90"
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
                      className="text-red-400 hover:text-white hover:bg-red-600/30 bg-red-600/10 border border-red-500/40 hover:border-red-400/60 rounded-full p-2.5 transition-all duration-200 cursor-pointer inline-flex items-center justify-center w-11 h-11 shadow-lg hover:shadow-red-500/20"
                      aria-label="Sign out"
                    >
                      {signingOut ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      ) : (
                        <LogOut size={20} />
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
                    <button className="w-full py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 cursor-pointer">
                      <Link
                        href="/signin"
                        className={`flex items-center text-white rounded-lg p-2 transition-colors ${
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
    </>
  );
}
