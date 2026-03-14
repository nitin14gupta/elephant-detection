"use client";

import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  RefreshCcw, 
  Loader2, 
  AlertCircle, 
  Clock, 
  MapPin, 
  Camera,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface Alert {
  id: number;
  cam_id: number;
  is_active: boolean;
  url: string | null;
  timestamp: string;
  cameras: {
    name: string;
    location: string;
  };
}

export default function LogsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAlerts();
  };

  const filteredAlerts = alerts.filter(alert => 
    alert.cameras.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (alert.cameras.location && alert.cameras.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <>
      <Header title="Detection Logs" />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Filter detection events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3.5 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-zinc-400 disabled:opacity-50"
            >
              <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/10 px-6 py-3.5 rounded-2xl font-bold text-zinc-400 cursor-default">
              <Filter className="w-5 h-5" /> Recent Activity
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Incident Details</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Zone / Sector</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Timestamp (IST)</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center">Protocol</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {loading && alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Synchronizing Archive Data...</p>
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-medium">
                        {searchQuery ? "No matching records found." : "No detection incidents archived."}
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={alert.id} 
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 group-hover:border-red-500/40 transition-colors">
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                              <p className="text-white font-bold tracking-tight">Elephant Detected</p>
                              <p className="text-zinc-600 text-[10px] font-mono tracking-tighter uppercase">CAM_NODE: {alert.cameras.name} | {alert.cam_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-emerald-500/50" />
                            {alert.cameras.location || "Remote Sector"}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono tracking-tighter">
                            <Clock className="w-4 h-4 text-zinc-600" />
                            {formatDate(alert.timestamp)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-zinc-800/50 text-zinc-400 border border-white/5 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Sentinel_V3
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex justify-end">
                                <button className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl group/btn">
                                    Analyze <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
