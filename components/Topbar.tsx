"use client";

import { useEffect, useState } from "react";
// no dynamic imports needed for dialogs in client component
import SettingsDialog from "./dialogs/SettingsDialog";
import HelpDialog from "./dialogs/HelpDialog";
import NotificationPanel from "./NotificationPanel";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import {
  Plus,
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Settings,
  Shield,
  LayoutDashboard,
} from "lucide-react";

// dialogs are client components; direct import is fine

type Props = { title?: string };

export default function Topbar({ title }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const isAdminRoute = pathname?.startsWith('/admin');

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="sticky top-0 z-30 md:ml-[var(--sidebar-width)] rounded-b-2xl shadow-2xl ring-1 ring-gray-700/50 supports-[backdrop-filter]:bg-gray-900/90 bg-gray-900/90 backdrop-blur-md transition-all"
    >
      <div className="flex w-full items-center gap-3 px-3 sm:px-4 py-2.5">
        {/* Title only (brand/logo removed) */}
        <h1 className="text-sm sm:text-base font-semibold text-white truncate mr-1">
          {title ?? "Home"}
        </h1>
        
  {/* Quick actions */}
  <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Admin/Dashboard Switch Button (only for admins) */}
          {mounted && (session?.user as any)?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-white hover:bg-gray-800 flex items-center gap-2"
              onClick={() => {
                if (isAdminRoute) {
                  router.push('/home');
                } else {
                  router.push('/admin/dashboard');
                }
              }}
              title={isAdminRoute ? 'Switch to Dashboard' : 'Switch to Admin Panel'}
            >
              {isAdminRoute ? (
                <>
                  <LayoutDashboard className="size-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </>
              ) : (
                <>
                  <Shield className="size-4" />
                  <span className="hidden md:inline">Admin Panel</span>
                </>
              )}
            </Button>
          )}

          {/* Notifications */}
          <NotificationPanel />

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-gray-700 text-white pl-2 pr-2">
                <Avatar className="size-6 mr-2">
                  <AvatarFallback className="text-xs" suppressHydrationWarning>
                    {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-gray-900/95 backdrop-blur-md text-gray-100 border-gray-700/50 shadow-2xl">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2 mb-2">
                  <User className="size-4" /> {session?.user?.name ?? "User"}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const userRole = (session?.user as any)?.role;
                    const userUnit = (session?.user as any)?.unit;
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
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${getRoleBadgeColor(userRole)}`}>
                            {userRole}
                          </span>
                        )}
                        {userUnit && (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-500/20 text-gray-400 border-gray-500/30">
                            {userUnit}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="data-[highlighted]:bg-gray-800/50 data-[highlighted]:text-gray-100" title="Open settings" onClick={() => setSettingsOpen(true)}>
                <Settings className="size-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="data-[highlighted]:bg-gray-800/50 data-[highlighted]:text-gray-100" title="View help & docs" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4 mr-2" /> Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="data-[highlighted]:bg-gray-800/50 data-[highlighted]:text-gray-100" title="Sign out of your account" onClick={async () => {
                setSigningOut(true);
                // Clear admin choice flags on logout
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem("from_admin_choice");
                  sessionStorage.removeItem("admin_choice_shown");
                }
                await signOut({ callbackUrl: '/signin', redirect: false });
                window.location.href = '/signin';
              }} disabled={signingOut}>
                {signingOut ? (
                  <svg className="animate-spin size-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                ) : (
                  <LogOut className="size-4 mr-2" />
                )} Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
  </div>
  <SettingsDialog open={settingsOpen} onOpenChangeAction={setSettingsOpen} />
  <HelpDialog open={helpOpen} onOpenChangeAction={setHelpOpen} />
      </div>
    </div>
  );
}
