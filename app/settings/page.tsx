"use client";
import { useEffect, useState } from "react";
import CenterPage from "@/components/CenterPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
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
  setEnableTickets(t == null ? true : t === "true");
  setEnableWork(w == null ? true : w === "true");
  const s = localStorage.getItem("prefs:notifs:enableSound");
  setEnableSound(s == null ? false : s === "true");
    } catch {}
  }, []);

  const save = () => {
    try {
      localStorage.setItem("prefs:notifs:pollMs", String(Math.max(10, pollSec) * 1000));
      localStorage.setItem("prefs:notifs:enableTickets", String(enableTickets));
  localStorage.setItem("prefs:notifs:enableWork", String(enableWork));
  localStorage.setItem("prefs:notifs:enableSound", String(enableSound));
      alert("Preferences saved.");
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
      o.type = "sine";
      o.frequency.value = 880;
      o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
      o.start(); o.stop(audioCtx.currentTime + 0.08);
    } catch {}
  };

  const resetUnread = () => {
    try { localStorage.removeItem("notifs:seenIds"); alert("Unread counters reset."); } catch {}
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
      const a = document.createElement("a");
      a.href = url; a.download = "notification-preferences.json"; a.click();
      URL.revokeObjectURL(url);
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
      alert("Preferences imported. Reload to apply.");
    } catch {}
  };

  return (
    <CenterPage title="Settings" description="Control how notifications surface and behave.">
        <Card>
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
              <Switch checked={enableTickets} onCheckedChange={setEnableTickets} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-700 p-3">
              <div>
                <div className="text-sm font-medium">Work tracker</div>
                <div className="text-xs text-gray-400">Assigned tasks and status changes.</div>
              </div>
              <Switch checked={enableWork} onCheckedChange={setEnableWork} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-700 p-3">
              <div>
                <div className="text-sm font-medium">Sound</div>
                <div className="text-xs text-gray-400">Play a short beep when new notifications arrive.</div>
              </div>
              <Switch checked={enableSound} onCheckedChange={setEnableSound} />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={testSound}>Test sound</Button>
              <Button variant="outline" onClick={resetUnread}>Reset unread</Button>
              <Button variant="outline" onClick={exportPrefs}>Export prefs</Button>
              <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input className="hidden" type="file" accept="application/json" onChange={(e) => importPrefs(e.target.files?.[0] ?? null)} />
                <span className="px-3 py-1.5 border border-gray-700 rounded-md">Import prefs</span>
              </label>
            </div>
          </CardContent>
        </Card>
    </CenterPage>
  );
}
