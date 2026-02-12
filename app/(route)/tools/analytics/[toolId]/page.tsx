"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Users, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";

type UsageTrend = {
    date: string;
    count: number;
};

type AnalyticsData = {
    activeUsers: number;
    usageTrends: UsageTrend[];
};

// Tool titles map for display
const toolTitles: Record<string, string> = {
    "work-tracker": "Work Tracker",
    "ai-news-daily": "AI News Daily",
    "startup-seeker": "Startup Seeker",
    "agritech-universities": "Agritech Universities",
    "content-idea-automation": "Content Idea Automation",
    "cold-connect-automator": "Cold Connect Automator",
    "ai-outreach-agent": "AI Outreach Agent",
    "agtech-events": "AgTech Events",
    "sentiment-analyzer": "Sentiment Analyzer",
    "ai-tools-request-form": "AI Tools Request Form",
    "agtech-company-automation": "AgTech Company Automation",
};

// Custom Tooltip component for Recharts to fix type compatibility
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-sm">
                <p className="text-gray-300 mb-1">{label}</p>
                <p className="text-blue-400 font-bold">
                    Usage: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

export default function ToolAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    // Ensure toolId is a string, handling generic param types
    const toolId = typeof params?.toolId === 'string' ? params.toolId : '';

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!toolId) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/analytics/tool/${toolId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch analytics data");
                }
                const result = await response.json();
                setData(result);
            } catch (err) {
                console.error("Error fetching analytics:", err);
                setError("Failed to load analytics data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [toolId]);

    const toolName = toolTitles[toolId] || toolId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {toolName} Analytics
                    </h1>
                </div>

                {error && (
                    <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* content */}
                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-40 rounded-xl bg-gray-800/50" />
                        <Skeleton className="h-40 rounded-xl bg-gray-800/50" />
                        <Skeleton className="h-96 col-span-full rounded-xl bg-gray-800/50" />
                    </div>
                ) : data ? (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="bg-gray-900/50 border-gray-700/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-400">
                                        Active Users (30 Days)
                                    </CardTitle>
                                    <Users className="w-4 h-4 text-blue-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">{data.activeUsers}</div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Unique users who accessed this tool
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Placeholder for future metric */}
                            <Card className="bg-gray-900/50 border-gray-700/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-400">
                                        Total Interactions
                                    </CardTitle>
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">
                                        {data.usageTrends.reduce((acc, curr) => acc + curr.count, 0)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Total tracked events in last 30 days
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Usage Chart */}
                        <Card className="bg-gray-900/50 border-gray-700/50">
                            <CardHeader>
                                <CardTitle className="text-white">Usage Trends (Last 30 Days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.usageTrends}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#9CA3AF"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="#9CA3AF"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={{ fill: '#374151', opacity: 0.4 }}
                                            />
                                            <Bar
                                                dataKey="count"
                                                fill="#60A5FA"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={50}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
