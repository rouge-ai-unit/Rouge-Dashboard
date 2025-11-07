"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  status: string;
  criticality?: string;
  createdAt?: string;
  requestedBy?: string;
}

export default function RecentTicketsPanel({ title = "Your Recent Tickets" }: { title?: string }) {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tickets", { 
          signal: controller.signal, 
          cache: "no-store",
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch tickets: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Handle both response formats: { tickets: [...] } or [...]
        const ticketsArray = data.tickets || (Array.isArray(data) ? data : []);
        
        if (mounted) {
          setItems(ticketsArray);
        }
      } catch (e) {
        if (mounted && e instanceof Error && e.name !== 'AbortError') {
          console.error('Error loading tickets:', e);
          setError("Failed to load tickets");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    load();
    
    // Refresh every 30 seconds for real-time updates
    const intervalId = setInterval(load, 30000);
    
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "In Progress": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      Closed: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getCriticalityColor = (criticality?: string) => {
    const colors: Record<string, string> = {
      Low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      Medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      Urgent: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[criticality || "Medium"] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-700/50 shadow-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {!loading && !error && items.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {items.length} total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-gray-500 mt-1">Please try refreshing the page</p>
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((ticket) => (
              <div 
                key={ticket.id} 
                className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-white line-clamp-2 flex-1">
                    {ticket.title}
                  </p>
                  {ticket.criticality && (
                    <Badge className={`${getCriticalityColor(ticket.criticality)} text-xs shrink-0`}>
                      {ticket.criticality}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
                    {ticket.status}
                  </Badge>
                  {ticket.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {items.length > 5 && (
              <p className="text-xs text-center text-gray-500 pt-2">
                Showing 5 of {items.length} tickets
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 font-medium">No tickets yet</p>
            <p className="text-xs text-gray-500 mt-1">Your submitted tickets will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
