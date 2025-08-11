"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TicketLite = { id: string; title: string; status: string; criticality: string };
export default function RecentTicketsPanel({ title = "Recent Tickets" }: { title?: string }) {
  const [items, setItems] = useState<TicketLite[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/tickets", { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
  const data = (await res.json()) as unknown;
  if (mounted) setItems(Array.isArray(data) ? (data as TicketLite[]) : []);
      } catch (e) {
        if (mounted) setError("Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return (
  <Card className="bg-[#1b1d1e] border-gray-700">
      <CardHeader>
    <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">Could not load tickets</p>
        ) : items && items.length ? (
          <ul className="space-y-3">
            {items.slice(0, 6).map((t) => (
              <li key={t.id} className="rounded border border-gray-700 p-2">
                <p className="text-sm text-white line-clamp-1">{t.title}</p>
                <p className="text-xs text-gray-400">{t.status} • {t.criticality}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No tickets yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
