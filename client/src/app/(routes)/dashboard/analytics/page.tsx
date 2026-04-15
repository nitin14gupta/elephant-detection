"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Clock, Map, RefreshCcw, Loader2, Calendar } from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface AnalyticsData {
    rush_hour: { hour: string; count: number }[];
    hot_zones: { name: string; count: number }[];
    daily_trend: { date: string; count: number }[];
}

const FILTERS = [
    { id: "today", label: "Today" },
    { id: "week",  label: "Week" },
    { id: "month", label: "Month" },
    { id: "all",   label: "All" },
] as const;

type FilterId = typeof FILTERS[number]["id"];

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dateFilter, setDateFilter] = useState<FilterId>("week");

    const fetchAnalytics = async (range: FilterId = dateFilter) => {
        setLoading(true);
        try {
            setData(await apiService.getAnalytics(range));
        } catch { console.error("Failed to fetch analytics"); }
        finally { setLoading(false); setIsRefreshing(false); }
    };

    useEffect(() => { fetchAnalytics(); }, []);

    const handleFilter = (range: FilterId) => { setDateFilter(range); fetchAnalytics(range); };

    const tooltipStyle = {
        contentStyle: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: 12 },
        itemStyle: { color: "#166534", fontWeight: 600 },
    };

    if (loading && !data) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-green-700" />
                <p className="text-sm text-gray-500">Loading analytics...</p>
            </div>
        );
    }

    return (
        <>
            <Header title="Analytics" />

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Detection Trends</h2>
                        <p className="text-sm text-gray-500">Elephant activity patterns over time</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Filter pills */}
                        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                            {FILTERS.map((f) => (
                                <button key={f.id} onClick={() => handleFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                        dateFilter === f.id
                                            ? "bg-green-700 text-white"
                                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { setIsRefreshing(true); fetchAnalytics(); }}
                            className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-green-700" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Activity Trend */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        className="col-span-1 xl:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="w-4 h-4 text-green-700" />
                            <h3 className="text-sm font-semibold text-gray-800">Activity Trend</h3>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.daily_trend}>
                                    <defs>
                                        <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#15803d" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v.split("-").slice(1).join("/")} />
                                    <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                                    <Tooltip {...tooltipStyle} />
                                    <Area type="monotone" dataKey="count" stroke="#15803d" strokeWidth={2.5}
                                        fillOpacity={1} fill="url(#colorGreen)" animationDuration={1200} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Rush Hour */}
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-gray-800">Activity by Hour</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.rush_hour}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip {...tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1200}>
                                        {data?.rush_hour.map((entry, i) => (
                                            <Cell key={i} fill={entry.count > 5 ? "#f59e0b" : "#e2e8f0"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Hot Zones */}
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                        className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Map className="w-4 h-4 text-green-700" />
                            <h3 className="text-sm font-semibold text-gray-800">High Activity Zones</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={data?.hot_zones}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11}
                                        width={90} axisLine={false} tickLine={false} />
                                    <Tooltip {...tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18} animationDuration={1400}>
                                        {data?.hot_zones.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? "#15803d" : "#e2e8f0"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
