"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type SettingsDialogProps = { open: boolean; onOpenChangeAction: (open: boolean) => void };

export default function SettingsDialog({ open, onOpenChangeAction }: SettingsDialogProps) {
  const [pollSec, setPollSec] = useState<number>(30);
  const [enableTickets, setEnableTickets] = useState(true);
  const [enableWork, setEnableWork] = useState(true);
  const [enableSound, setEnableSound] = useState(false);

  useEffect(() => {
    try {
      const p = Number(localStorage.getItem("prefs:notifs:pollMs") || "30000");
      setPollSec(Math.max(10, Math.round(p / 1000)));
      const t = localStorage.getItem("prefs:notifs:enableTickets");
      const w = localStorage.getItem("prefs:notifs:enableWork");
      const s = localStorage.getItem("prefs:notifs:enableSound");
      setEnableTickets(t == null ? true : t === "true");
      setEnableWork(w == null ? true : w === "true");
      setEnableSound(s == null ? false : s === "true");
    } catch {}
  }, [open]);

  // Defensive: ensure no lingering overlay blocks clicks after close
  useEffect(() => {
    if (!open) {
      const tidy = () => {
        try {
          document.querySelectorAll<HTMLElement>('[data-slot="dialog-overlay"], [data-slot="drawer-overlay"], [data-state="closed"][data-slot="dialog-content"], [data-state="closed"][data-slot="drawer-content"]').forEach((el) => {
            el.style.pointerEvents = "none";
          });
        } catch {}
      };
      // run immediately and after animations
      tidy();
      const t = window.setTimeout(tidy, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const save = () => {
    try {
      localStorage.setItem("prefs:notifs:pollMs", String(Math.max(10, pollSec) * 1000));
      localStorage.setItem("prefs:notifs:enableTickets", String(enableTickets));
      localStorage.setItem("prefs:notifs:enableWork", String(enableWork));
      localStorage.setItem("prefs:notifs:enableSound", String(enableSound));
      onOpenChangeAction(false);
    } catch {}
  };

  const testSound = () => {
    try {
      type WinWithWebkitAC = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const w = window as WinWithWebkitAC;
      const Ctx = w.AudioContext || w.webkitAudioContext;
      if (!Ctx) return;
      const audioCtx = new Ctx();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
      o.start(); o.stop(audioCtx.currentTime + 0.08);
    } catch {}
  };

  const resetUnread = () => {
    try { localStorage.removeItem("notifs:seenIds"); } catch {}
  };

  const exportPrefs = () => {
    try {
      const prefs = {
        pollMs: localStorage.getItem("prefs:notifs:pollMs"),
        enableTickets: localStorage.getItem("prefs:notifs:enableTickets"),
        enableWork: localStorage.getItem("prefs:notifs:enableWork"),
        enableSound: localStorage.getItem("prefs:notifs:enableSound"),
      };
      const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "notification-preferences.json"; a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  const importPrefs = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.pollMs) localStorage.setItem("prefs:notifs:pollMs", String(data.pollMs));
      if (typeof data.enableTickets !== "undefined") localStorage.setItem("prefs:notifs:enableTickets", String(data.enableTickets));
      if (typeof data.enableWork !== "undefined") localStorage.setItem("prefs:notifs:enableWork", String(data.enableWork));
      if (typeof data.enableSound !== "undefined") localStorage.setItem("prefs:notifs:enableSound", String(data.enableSound));
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="bg-[#1b1d1e] text-gray-100 border-gray-700 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>Control how notifications surface and behave.</DialogDescription>
        </DialogHeader>
        <div className="px-1 pb-2 max-h-[60vh] overflow-auto">
          <Card className="bg-[#191a1a] border-gray-700">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Control how and what gets surfaced in the top bar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="poll">Polling interval (seconds)</Label>
                <Input id="poll" type="number" min={10} value={pollSec} onChange={(e) => setPollSec(Number(e.target.value || 10))} className="w-40" />
                <p className="text-xs text-gray-400">Minimum 10s. Lower is more real-time but increases network usage.</p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-gray-700 p-3">
                <div>
                  <div className="text-sm font-medium">Ticket updates</div>
                  <div className="text-xs text-gray-400">New or changed support requests.</div>
                </div>
                <button type="button" tabIndex={0} aria-label="Toggle ticket updates" style={{ background: 'none', border: 'none', padding: 0 }}>
                  <Switch checked={enableTickets} onCheckedChange={setEnableTickets} />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-gray-700 p-3">
                <div>
                  <div className="text-sm font-medium">Work tracker</div>
                  <div className="text-xs text-gray-400">Assigned tasks and status changes.</div>
                </div>
                <button type="button" tabIndex={0} aria-label="Toggle work tracker" style={{ background: 'none', border: 'none', padding: 0 }}>
                  <Switch checked={enableWork} onCheckedChange={setEnableWork} />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-gray-700 p-3">
                <div>
                  <div className="text-sm font-medium">Sound</div>
                  <div className="text-xs text-gray-400">Play a short beep when new notifications arrive.</div>
                </div>
                <button type="button" tabIndex={0} aria-label="Toggle sound" style={{ background: 'none', border: 'none', padding: 0 }}>
                  <Switch checked={enableSound} onCheckedChange={setEnableSound} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <div className="flex flex-wrap gap-2">
            <button onClick={save} className="px-3 py-2 rounded-md bg-white text-black hover:bg-gray-200">Save</button>
            <button onClick={testSound} className="px-3 py-2 rounded-md border border-gray-700 bg-black text-white hover:bg-black/80">Test sound</button>
            <button onClick={resetUnread} className="px-3 py-2 rounded-md border border-gray-700 bg-black text-white hover:bg-black/80">Reset unread</button>
            <button onClick={exportPrefs} className="px-3 py-2 rounded-md border border-gray-700 bg-black text-white hover:bg-black/80">Export prefs</button>
            <label className="px-3 py-2 rounded-md border border-gray-700 bg-black text-white hover:bg-black/80 cursor-pointer">
              <input className="hidden" type="file" accept="application/json" onChange={(e) => importPrefs(e.target.files?.[0] ?? null)} />
              Import prefs
            </label>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
