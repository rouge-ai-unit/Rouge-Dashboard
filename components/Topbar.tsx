"use client";

import { useEffect, useState } from "react";
// no dynamic imports needed for dialogs in client component
import SettingsDialog from "./dialogs/SettingsDialog";
import HelpDialog from "./dialogs/HelpDialog";
import { useRouter } from "next/navigation";
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
  Bell,
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Settings,
} from "lucide-react";

// dialogs are client components; direct import is fine

type Props = { title?: string };

export default function Topbar({ title }: Props) {
  const router = useRouter();
  const { data: session } = useSession();

  // Notifications state and polling
  type Notif = { id: string; title: string; href: string; type: "ticket" | "work"; ts: number; meta?: string };
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const getPollMs = () => {
      try { return Math.max(10, Number(localStorage.getItem("prefs:notifs:pollMs") || "30")) * 1000; } catch { return 30000; }
    };
    const getEnabled = () => {
      try {
        const enableTickets = localStorage.getItem("prefs:notifs:enableTickets");
        const enableWork = localStorage.getItem("prefs:notifs:enableWork");
        return {
          tickets: enableTickets == null ? true : enableTickets === "true",
          work: enableWork == null ? true : enableWork === "true",
        } as const;
      } catch {
        return { tickets: true, work: true } as const;
      }
    };
    const getEnableSound = () => {
      try {
        const s = localStorage.getItem("prefs:notifs:enableSound");
        return s == null ? false : s === "true";
      } catch { return false; }
    }
    // simple beep
  const playBeep = () => {
      try {
    type WinWithWebkitAC = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const w = window as WinWithWebkitAC;
    const Ctx = w.AudioContext || w.webkitAudioContext;
        if (!Ctx) return;
        const audioCtx = new Ctx();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = 880; // A5
        o.connect(g);
        g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
        o.start();
        o.stop(audioCtx.currentTime + 0.08);
      } catch {}
    };
    let interval = 0;
    const computeUnread = (items: Notif[]) => {
      try {
        const seenRaw = localStorage.getItem("notifs:seenIds");
        const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
        const c = items.filter(n => !seen.has(n.id)).length;
        setUnread(c);
      } catch { setUnread(0); }
    };
  const lastKnownIds = new Set<string>();
  const load = async () => {
      try {
        const [ticketsRes, trackerRes] = await Promise.all([
          fetch("/api/tickets", { cache: "no-store" }),
          fetch("/api/tracker?page=1&pageSize=10", { cache: "no-store" }),
        ]);
        const ticketsJson = ticketsRes.ok ? await ticketsRes.json() : [] as unknown[];
  const trackerJson = trackerRes.ok ? await trackerRes.json() : { items: [] as unknown[] };
  type TrackerResp = { items?: unknown[] };
  const trackerObj: TrackerResp = (trackerJson ?? {}) as TrackerResp;

        type TicketRaw = { id?: string; title?: string; criticality?: string; updatedAt?: string };
        type WorkRaw = { _id?: string; task?: string; status?: string; assignedTo?: string; lastUpdated?: string };

        const tNotifs: Notif[] = (Array.isArray(ticketsJson) ? ticketsJson : [])
          .slice(0, 10)
          .map((raw: unknown) => {
            const t = raw as TicketRaw;
            if (!t.id || !t.title) return null;
            const ts = t.updatedAt ? Date.parse(t.updatedAt) : Date.now();
            return {
              id: `t:${t.id}`,
              title: `New ticket: ${t.title}`,
              href: "/dashboard",
              type: "ticket" as const,
              ts: isNaN(ts) ? Date.now() : ts,
              meta: t.criticality || "",
            } as Notif;
          })
          .filter(Boolean) as Notif[];

  const wItems = Array.isArray(trackerObj.items) ? trackerObj.items : [];
  const wNotifs: Notif[] = wItems
          .slice(0, 10)
          .map((raw: unknown) => {
            const w = raw as WorkRaw;
            if (!w._id || !w.task) return null;
            const ts = w.lastUpdated ? Date.parse(w.lastUpdated) : Date.now();
            return {
              id: `w:${w._id}`,
              title: `${w.task} → ${w.status || "Updated"}`,
              href: "/work-tracker",
              type: "work" as const,
              ts: isNaN(ts) ? Date.now() : ts,
              meta: w.assignedTo || "",
            } as Notif;
          })
          .filter(Boolean) as Notif[];
        const enabled = getEnabled();
        const filtered = [
          ...(enabled.work ? wNotifs : []),
          ...(enabled.tickets ? tNotifs : []),
        ];
        const all = filtered.sort((a, b) => b.ts - a.ts).slice(0, 12);
        if (!cancelled) {
          const enableSound = getEnableSound();
          // detect newly added items vs. lastKnownIds
          const newOnes = all.filter(n => !lastKnownIds.has(n.id));
          if (enableSound && newOnes.length > 0) {
            playBeep();
          }
          // update lastKnownIds snapshot
          lastKnownIds.clear();
          for (const n of all) lastKnownIds.add(n.id);
          setNotifs(all);
          computeUnread(all);
        }
      } catch {}
    };
    const start = () => {
      clearInterval(interval);
      load();
      interval = window.setInterval(load, getPollMs());
    };
    start();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, []);

  const markAllRead = () => {
    try { localStorage.setItem("notifs:seenIds", JSON.stringify(notifs.map(n => n.id))); } catch {}
    setUnread(0);
  };

  return (
    <div
      className="sticky top-0 z-30 md:ml-[var(--sidebar-width)] rounded-b-2xl shadow-lg ring-1 ring-gray-800 supports-[backdrop-filter]:bg-[#191A1A]/90 bg-[#191A1A] backdrop-blur-md transition-all"
    >
      <div className="flex w-full items-center gap-3 px-3 sm:px-4 py-2.5">
        {/* Title only (brand/logo removed) */}
        <h1 className="text-sm sm:text-base font-semibold text-white truncate mr-1">
          {title ?? "Dashboard"}
        </h1>
        
  {/* Quick actions */}
  <div className="ml-auto flex items-center gap-1 sm:gap-2">

      {/* New */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-primary text-white">
                <Plus className="size-4 mr-1.5" /> New <ChevronDown className="size-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-[#1b1d1e] text-gray-100 border-gray-700">
    <DropdownMenuItem title="Create a new work tracker entry" className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" onClick={() => router.push("/work-tracker?new=1")}>Work item</DropdownMenuItem>
    <DropdownMenuItem title="Start a new content idea" className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" onClick={() => router.push("/tools/content-idea-automation?new=1")}>Content idea</DropdownMenuItem>
    <DropdownMenuItem title="Draft an AI news post" className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" onClick={() => router.push("/tools/ai-news-daily?new=1")}>AI news post</DropdownMenuItem>
    <DropdownMenuItem title="Open a support request" className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" onClick={() => router.push("/tools/contact?new=1")}>Support request</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-gray-700 text-white relative" aria-label="Notifications">
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                    {unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#1b1d1e] text-gray-100 border-gray-700">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 px-2 border-gray-700" onClick={markAllRead}>Mark all read</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 border-gray-700" onClick={() => setSettingsOpen(true)}>Prefs</Button>
                </div>
              </div>
              <DropdownMenuSeparator />
              {notifs.length === 0 ? (
                <div className="px-2 py-3 text-sm text-gray-300">No notifications yet</div>
              ) : (
                <ul className="max-h-80 overflow-auto">
                  {notifs.map((n) => (
                    <li key={n.id}>
                      <button onClick={() => { 
                        try {
                          const seenRaw = localStorage.getItem("notifs:seenIds");
                          const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
                          seen.add(n.id);
                          localStorage.setItem("notifs:seenIds", JSON.stringify([...seen]));
                        } catch {}
                        router.push(n.href);
                      }} className="w-full text-left px-3 py-2 hover:bg-[#242728] transition flex items-start gap-2">
                        <span className={`mt-1 h-2 w-2 rounded-full ${n.type === "ticket" ? "bg-blue-500" : "bg-emerald-500"}`} />
                        <div className="flex-1">
                          <div className="text-sm text-gray-100 truncate">{n.title}</div>
                          <div className="text-xs text-gray-400">{n.meta}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-gray-700 text-white pl-2 pr-2">
                <Avatar className="size-6 mr-2">
                  <AvatarFallback className="text-xs">{session?.user?.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1b1d1e] text-gray-100 border-gray-700">
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="size-4" /> {session?.user?.name ?? "User"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" title="Open settings" onClick={() => setSettingsOpen(true)}>
                <Settings className="size-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" title="View help & docs" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4 mr-2" /> Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="data-[highlighted]:bg-[#242728] data-[highlighted]:text-gray-100" title="Sign out of your account" onClick={() => signOut()}>
                <LogOut className="size-4 mr-2" /> Sign out
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
