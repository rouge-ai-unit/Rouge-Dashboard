"use client";

import { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  UserCog2,
  Newspaper,
  Mail,
  Briefcase,
  BrainCircuit,
  FileText,
  Target,
  GraduationCap,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Shield,
  Bot,
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ChevronsUpDown,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  Bot,
  Search,
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
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdminRoute = pathname?.startsWith('/admin');

  // Fetch accessible tools dynamically from API
  useEffect(() => {
    const fetchAccessibleTools = async () => {
      if (status === "authenticated" && session?.user) {
        try {
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
  }, [session, status, isAdminRoute]);

  // Persist collapsed state across reloads for better UX
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    const isCollapsed = saved ? saved === "true" : false;
    setCollapsed(isCollapsed);
    onCollapseAction?.(isCollapsed);
    try {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        isCollapsed ? "5rem" : "15rem"
      );
    } catch {}
  }, []);

  const handleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    onCollapseAction?.(newCollapsedState);
    try {
      localStorage.setItem("sidebar_collapsed", String(newCollapsedState));
      // Sync CSS var for topbar offset
      document.documentElement.style.setProperty(
        "--sidebar-width",
        newCollapsedState ? "5rem" : "15rem"
      );
    } catch {}
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    // Clear admin choice flags on logout
    sessionStorage.removeItem("from_admin_choice");
    sessionStorage.removeItem("admin_choice_shown");
    await signOut({ callbackUrl: '/signin', redirect: false });
    window.location.href = '/signin';
  };

  const userRole = (session?.user as any)?.role;
  const userUnit = (session?.user as any)?.unit;
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  // Wraps an element in a right-side tooltip, only when the sidebar is collapsed
  const withTooltip = (label: string, node: React.ReactNode) =>
    collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      node
    );

  const renderNavItem = (item: NavItem) => {
    const active = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(`${item.href}/`));
    return (
      <li key={item.href}>
        {withTooltip(
          item.title,
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
              collapsed ? "md:justify-center md:px-0" : ""
            } ${active ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            <item.icon size={18} aria-hidden="true" className="shrink-0" />
            <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{item.title}</span>
          </Link>
        )}
      </li>
    );
  };

  const homeItem = navItems.find((item) => item.href === '/home');
  const toolItems = navItems.filter((item) => item.href !== '/home');

  return (
    <TooltipProvider delayDuration={200}>
      {/* Mobile Hamburger Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-gray-700/50 bg-gray-900/95 p-2 text-white shadow-lg backdrop-blur-md"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-800 bg-gray-950/95 text-white backdrop-blur-md transition-all duration-300
          md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "md:w-[5rem]" : "md:w-[15rem]"} w-[75%] max-w-xs md:max-w-none`}
        style={{ width: collapsed ? "5rem" : "15rem" }}
      >
        {/* Header: brand + collapse toggle (kept away from sign out) */}
        <div className={`flex h-14 items-center gap-2 px-3 ${collapsed ? "md:justify-center" : "justify-between"}`}>
          <Link
            href="/home"
            onClick={() => setMobileOpen(false)}
            className={`flex min-w-0 items-center gap-2 ${collapsed ? "md:hidden" : ""}`}
          >
            <Image
              src="/logo.jpg"
              alt="Rouge logo"
              width={28}
              height={28}
              className="rounded-md select-none"
              quality={100}
              priority
            />
            <span className="truncate font-semibold tracking-tight">Rouge</span>
          </Link>
          {/* Close button for mobile */}
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white md:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
          {/* Collapse toggle for desktop */}
          {withTooltip(
            collapsed ? "Expand sidebar" : "Collapse sidebar",
            <button
              onClick={handleCollapse}
              className="hidden rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Primary">
          {loading ? (
            <div className="space-y-1.5 px-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-white/5" />
              ))}
            </div>
          ) : (
            <>
              {homeItem && <ul className="mb-3">{renderNavItem(homeItem)}</ul>}
              {toolItems.length > 0 && (
                <>
                  <p className={`mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-500 ${collapsed ? "md:hidden" : ""}`}>
                    {isAdminRoute ? "Admin" : "Tools"}
                  </p>
                  <ul className="space-y-0.5">{toolItems.map(renderNavItem)}</ul>
                </>
              )}
            </>
          )}
        </nav>

        {/* Footer: user menu (settings, contact, sign out) */}
        <div className="border-t border-gray-800 p-2">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-white/5 ${collapsed ? "md:justify-center" : ""}`}
                  aria-label="Account menu"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold" suppressHydrationWarning>
                    {initial}
                  </span>
                  <span className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
                    <span className="block truncate text-sm text-white">{session.user?.name}</span>
                    <span className="block truncate text-xs text-gray-500">{session.user?.email}</span>
                  </span>
                  <ChevronsUpDown size={14} className={`shrink-0 text-gray-500 ${collapsed ? "md:hidden" : ""}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 border-gray-700/50 bg-gray-900/95 text-gray-100 backdrop-blur-md">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm text-white">{session.user?.name}</p>
                  <p className="truncate text-xs text-gray-400">{session.user?.email}</p>
                  {(userRole || userUnit) && (
                    <p className="mt-1 truncate text-xs capitalize text-gray-500">
                      {[userRole, userUnit].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="data-[highlighted]:bg-gray-800/50 data-[highlighted]:text-gray-100"
                  onClick={() => { setMobileOpen(false); router.push(isAdminRoute ? '/admin/settings' : '/settings'); }}
                >
                  <Settings className="mr-2 size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="data-[highlighted]:bg-gray-800/50 data-[highlighted]:text-gray-100"
                  onClick={() => { setMobileOpen(false); router.push('/tools/contact'); }}
                >
                  <Mail className="mr-2 size-4" /> Contact admin
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  <LogOut className="mr-2 size-4" /> {signingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/signin"
              className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white ${collapsed ? "md:justify-center" : ""}`}
            >
              <LogIn size={18} />
              <span className={collapsed ? "md:hidden" : ""}>Sign in</span>
            </Link>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
