"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ChartScatter,
  UserCog2,
  LogOut,
  LogIn,
  Menu,
  X,
  Newspaper,
  Mail,
  BrainCircuit,
  University,
  Briefcase,
  ListChecks,
  GraduationCap,
  Target,
  Sparkles,
  Shield,
  TrendingUp,
  FileText,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

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

interface NavItem {
  title: string;
  icon: any;
  href: string;
}

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => setOpen((prev) => !prev);

  // Fetch accessible tools dynamically from API
  useEffect(() => {
    const fetchAccessibleTools = async () => {
      if (status === "authenticated" && session?.user) {
        try {
          // Determine if we're in admin context based on current path
          const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
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
  }, [session, status]);

  return (
    <>
      {/* Mobile Hamburger Toggle */}
      <div className="sm:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="bg-gray-900/95 backdrop-blur-md p-2 rounded-lg text-white shadow-2xl border border-gray-700/50"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-[75%] max-w-xs bg-gray-900/95 backdrop-blur-md border-r border-gray-700/50 text-white z-50 transform transition-transform duration-300 shadow-2xl ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Link href="/" onClick={toggleSidebar}>
            <Image
              src="/logo.jpg"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
          </Link>
          <button onClick={toggleSidebar}>
            <X size={24} />
          </button>
        </div>

        <nav className="mt-4 flex flex-col space-y-2 px-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            navItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-4 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition"
              onClick={toggleSidebar}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.title}</span>
            </Link>
          ))
          )}
        </nav>

        <div className="absolute bottom-0 w-full px-4 py-4 border-t border-gray-700">
          {session ? (
            <>
              <p className="text-sm font-semibold">{session.user?.name}</p>
              <p className="text-xs text-gray-400">
                {session.user?.email}
              </p>
              <div className="flex items-center gap-1 mt-2 mb-3">
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
                        <span className={`text-xs px-2 py-0.5 rounded border capitalize ${getRoleBadgeColor(userRole)}`}>
                          {userRole}
                        </span>
                      )}
                      {userUnit && (
                        <span className="text-xs px-2 py-0.5 rounded border bg-gray-500/20 text-gray-400 border-gray-500/30">
                          {userUnit}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <button
                onClick={async () => {
                  setSigningOut(true);
                  await signOut({ callbackUrl: '/signin', redirect: false });
                  window.location.href = '/signin';
                  toggleSidebar();
                }}
                disabled={signingOut}
                className="w-full bg-red-600 hover:bg-red-700 text-sm py-2 rounded-lg transition flex items-center justify-center"
              >
                {signingOut ? (
                  <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                ) : (
                  <LogOut className="inline mr-2" />
                )}
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/signin" onClick={toggleSidebar}>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-sm py-2 rounded-lg transition">
                <LogIn className="inline mr-2" />
                Sign In
              </button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
