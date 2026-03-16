"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Map,
  RefreshCcw,
  Loader2,
  Calendar,
  Zap,
  ShieldCheck,
  Filter
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { motion } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface AnalyticsData {
  rush_hour: { hour: string; count: number }[];
  hot_zones: { name: string; count: number }[];
  daily_trend: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("week");

  const fetchAnalytics = async (range = dateFilter) => {
    setLoading(true);
    try {
      const result = await apiService.getAnalytics(range);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const handleFilterChange = (range: any) => {
    setDateFilter(range);
    fetchAnalytics(range);
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Architecting Data Perspective...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Intelligence Analytics" />

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">System Intelligence</h2>
              <p className="text-zinc-500 text-xs font-medium italic">Advanced behavioral pattern analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Date Filters */}
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-white/10 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "all", label: "All" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative shrink-0 ${dateFilter === f.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  {dateFilter === f.id && (
                    <motion.div
                      layoutId="anaFilter"
                      className="absolute inset-0 bg-white/10 rounded-xl"
                    />
                  )}
                  <span className="relative z-10">{f.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="p-3.5 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-zinc-400"
              >
                <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
              <div className="bg-zinc-900/50 border border-white/10 px-6 py-3.5 rounded-2xl hidden md:flex items-center gap-3">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-zinc-300">
                  {dateFilter === 'all' ? 'Entire History' : `Last ${dateFilter === 'today' ? '24 Hours' : dateFilter === 'week' ? '7 Days' : '30 Days'}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Main Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-1 xl:col-span-2 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white tracking-tight">Activity Pulse</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Real-time Feed</span>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.daily_trend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#52525b"
                    fontSize={10}
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={10}
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Rush Hour Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Elephant Rush Hour</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.rush_hour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    stroke="#52525b"
                    fontSize={9}
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={10}
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1500}>
                    {data?.rush_hour.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.count > 5 ? '#f59e0b' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Hot Zones Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <Map className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">High Activity Zones</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data?.hot_zones}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#a1a1aa"
                    fontSize={10}
                    fontWeight="bold"
                    width={80}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1800}>
                    {data?.hot_zones.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#18181b'} stroke={index === 0 ? 'none' : '#27272a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Movement Patterns Chart */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-1 xl:col-span-2 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Movement Protocols</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['Left', 'Right', 'Top', 'Bottom'].map((dir) => (
                <div key={dir} className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl flex flex-col items-center justify-center space-y-2 group hover:border-blue-500/30 transition-all">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{dir} TO SECTOR</span>
                  <span className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">
                    {Math.floor(Math.random() * 20) + 5}% 
                  </span>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.floor(Math.random() * 60) + 20}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div> */}
        </div>
      </div>
    </>
  );
}
