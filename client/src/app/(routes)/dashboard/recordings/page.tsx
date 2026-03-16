"use client";

import React, { useState, useEffect } from "react";
import { 
  Video, 
  Search, 
  RefreshCcw, 
  Loader2, 
  Play, 
  Download, 
  Calendar,
  Clock,
  Camera,
  Trash2,
  ExternalLink,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface Recording {
  id: number;
  cam_id: number;
  alert_id: number;
  file_name: string;
  file_path: string;
  duration_secs: number;
  count: number;
  direction: string;
  timestamp: string;
  cameras: {
    name: string;
    location: string;
  };
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("all");

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const data = await apiService.getRecordings();
      setRecordings(data);
    } catch (err) {
      console.error("Failed to fetch recordings:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRecordings();
  };

  const isWithinRange = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch(dateFilter) {
      case "today": return date >= today;
      case "week": return date >= weekAgo;
      case "month": return date >= monthAgo;
      default: return true;
    }
  };

  const filtered = recordings.filter(r => {
    const matchesSearch = r.cameras.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (r.cameras.location && r.cameras.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDate = isWithinRange(r.timestamp);
    return matchesSearch && matchesDate;
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(dateString));
  };

  const getVideoUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}/${path}`;
  };

  return (
    <>
      <Header title="Intelligence Archive" />
      
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
        {/* Top bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              />
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-white/10 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-hide">
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "all", label: "All Time" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative shrink-0 ${
                    dateFilter === f.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {dateFilter === f.id && (
                    <motion.div 
                      layoutId="recFilter"
                      className="absolute inset-0 bg-white/10 rounded-xl"
                    />
                  )}
                  <span className="relative z-10">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
            <button 
              onClick={handleRefresh}
              className="p-3.5 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-zinc-400"
            >
              <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <div className="bg-zinc-900/50 border border-white/10 px-6 py-3.5 rounded-2xl flex items-center gap-3">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-zinc-300">
                {dateFilter === 'all' ? 'Entire Archive' : `${dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}'s Feed`}
              </span>
            </div>
          </div>
        </div>

        {/* Video Player Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              >
                <video 
                   src={getVideoUrl(selectedVideo)} 
                   controls 
                   autoPlay 
                   className="w-full h-full object-contain"
                />
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <Trash2 className="w-6 h-6 rotate-45" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-video bg-zinc-900/50 rounded-3xl animate-pulse border border-white/5" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-32 bg-zinc-900/20 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
              <Video className="w-16 h-16 text-zinc-800 mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No recorded encounters found.</p>
            </div>
          ) : (
            filtered.map((rec) => (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-zinc-900/30 border border-white/5 rounded-[2rem] overflow-hidden hover:border-emerald-500/30 transition-all duration-500"
              >
                {/* Thumbnail Placeholder */}
                <div className="aspect-video bg-zinc-900 flex items-center justify-center relative group-hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => setSelectedVideo(rec.file_path)}>
                   <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60" />
                   <div 
                     className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-lg transform scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 z-10"
                   >
                     <Play className="w-6 h-6 fill-current" />
                   </div>
                   <div className="absolute top-4 left-4 flex gap-2">
                     <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-bold text-white border border-white/10">
                       {rec.cameras.name}
                     </span>
                     <span className="px-2 py-1 bg-emerald-500/20 backdrop-blur-md rounded-md text-[10px] font-black text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter">
                       {rec.count} Elephants
                     </span>
                   </div>
                   <div className="absolute bottom-4 right-4">
                     <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-mono text-zinc-400">
                       {formatDuration(rec.duration_secs)}
                     </span>
                   </div>
                </div>

                {/* Info Section */}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-white font-bold group-hover:text-emerald-400 transition-colors">
                       Encounter_{rec.id}
                    </h4>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                       <Camera className="w-3.5 h-3.5" /> {rec.cameras.location || "Remote Sector"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
                      <Clock className="w-3 h-3" />
                      {formatDate(rec.timestamp)}
                    </div>
                    <a 
                      href={getVideoUrl(rec.file_path)} 
                      download
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
