"use client";

import React, { useState, useEffect } from "react";
import { Video, Search, RefreshCcw, Play, Download, Calendar, Clock, Camera, X, Image, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface Recording {
    id: number;
    cam_id: number;
    alert_id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    duration_secs: number;
    count: number;
    direction: string;
    timestamp: string;
    snapshot_path: string | null;
    cameras: { name: string; location: string };
}

interface RecordingGroup {
    key: string;
    cam_id: number;
    cameras: { name: string; location: string };
    startTimestamp: string;
    maxCount: number;
    recordings: Recording[];
}

const FILTERS = [
    { id: "today", label: "Today" },
    { id: "week",  label: "Week" },
    { id: "month", label: "Month" },
    { id: "all",   label: "All" },
] as const;

type FilterId = typeof FILTERS[number]["id"];

function mediaUrl(path: string | null | undefined) {
    if (!path) return null;
    return path.startsWith("/") ? path : `/${path}`;
}

const IST = { timeZone: "Asia/Kolkata" } as const;

const fmtDate = (ds: string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, ...IST }).format(new Date(ds));

const fmtTime = (ds: string) =>
    new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, ...IST }).format(new Date(ds));

// Group recordings by alert_id — each detection event is one group
function groupRecordings(recordings: Recording[]): RecordingGroup[] {
    const map = new Map<string, RecordingGroup>();

    for (const rec of recordings) {
        const key = rec.alert_id != null ? `alert-${rec.alert_id}` : `rec-${rec.id}`;
        if (map.has(key)) {
            const g = map.get(key)!;
            g.recordings.push(rec);
            g.maxCount = Math.max(g.maxCount, rec.count);
        } else {
            map.set(key, {
                key,
                cam_id: rec.cam_id,
                cameras: rec.cameras,
                startTimestamp: rec.timestamp,
                maxCount: rec.count,
                recordings: [rec],
            });
        }
    }

    // Sort groups newest first (recordings already come newest-first from API)
    return Array.from(map.values());
}

export default function RecordingsPage() {
    const [recordings, setRecordings]     = useState<Recording[]>([]);
    const [loading, setLoading]           = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery]   = useState("");
    const [dateFilter, setDateFilter]     = useState<FilterId>("all");
    const [activeVideo, setActiveVideo]   = useState<Recording | null>(null);
    const [activeSnap, setActiveSnap]     = useState<Recording | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const fetchRecordings = async () => {
        setLoading(true);
        try { setRecordings(await apiService.getRecordings()); }
        catch { console.error("Failed to fetch recordings"); }
        finally { setLoading(false); setIsRefreshing(false); }
    };

    useEffect(() => { fetchRecordings(); }, []);

    const isWithinRange = (ds: string) => {
        const d = new Date(ds), now = new Date();
        if (dateFilter === "today") return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateFilter === "week")  return d >= new Date(now.getTime() - 7 * 86400000);
        if (dateFilter === "month") return d >= new Date(now.getTime() - 30 * 86400000);
        return true;
    };

    const filtered = recordings.filter(r =>
        (r.cameras?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (r.cameras?.location && r.cameras.location.toLowerCase().includes(searchQuery.toLowerCase()))) &&
        isWithinRange(r.timestamp)
    );

    const groups = groupRecordings(filtered);

    const fmt = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <>
            <Header title="Recordings" />

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">
                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search recordings..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-gray-800 bg-white focus:outline-none focus:border-green-600 placeholder:text-gray-400 transition-colors" />
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                            {FILTERS.map((f) => (
                                <button key={f.id} onClick={() => setDateFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                        dateFilter === f.id ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setIsRefreshing(true); fetchRecordings(); }}
                            className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-green-700" : ""}`} />
                        </button>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{groups.length} session{groups.length !== 1 ? "s" : ""} · {filtered.length} recording{filtered.length !== 1 ? "s" : ""}</span>
                        </div>
                    </div>
                </div>

                {/* Video Lightbox */}
                <AnimatePresence>
                    {activeVideo && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                            onClick={() => setActiveVideo(null)}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl">
                                <video
                                    src={mediaUrl(activeVideo.file_path) ?? undefined}
                                    controls autoPlay
                                    className="w-full aspect-video object-contain"
                                />
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <a href={mediaUrl(activeVideo.file_path) ?? "#"} download
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <button onClick={() => setActiveVideo(null)}
                                        className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="px-4 py-3 bg-gray-900">
                                    <p className="text-sm font-semibold text-white">{activeVideo.cameras?.name} — Recording #{activeVideo.id}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(activeVideo.timestamp)} · {activeVideo.count} elephant{activeVideo.count !== 1 ? "s" : ""} · {activeVideo.direction}</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Snapshot Lightbox */}
                <AnimatePresence>
                    {activeSnap && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                            onClick={() => setActiveSnap(null)}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative max-w-3xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl">
                                <img
                                    src={mediaUrl(activeSnap.snapshot_path) ?? undefined}
                                    alt="Detection snapshot"
                                    className="w-full object-contain"
                                />
                                <button onClick={() => setActiveSnap(null)}
                                    className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="p-4 bg-gray-900 text-sm text-gray-300">
                                    <p className="font-semibold text-white">{activeSnap.cameras?.name} — Detection Snapshot</p>
                                    <p className="text-xs text-gray-400 mt-1">{fmtDate(activeSnap.timestamp)} · {activeSnap.count} elephant{activeSnap.count !== 1 ? "s" : ""}</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grouped Sessions */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="aspect-video bg-gray-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <div className="py-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center bg-white">
                        <Video className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No recordings found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groups.map((group) => {
                            const isExpanded = expandedGroups.has(group.key);
                            const thumbnail = group.recordings.find(r => r.snapshot_path);

                            return (
                                <motion.div key={group.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-green-200 transition-colors shadow-sm">

                                    {/* Group header */}
                                    <div className="flex items-center gap-4 p-4">
                                        {/* Thumbnail preview */}
                                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-900 shrink-0 relative cursor-pointer"
                                            onClick={() => setActiveVideo(group.recordings[0])}>
                                            {thumbnail?.snapshot_path && (
                                                <img
                                                    src={mediaUrl(thumbnail.snapshot_path) ?? undefined}
                                                    alt="thumbnail"
                                                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow">
                                                    <Play className="w-3.5 h-3.5 text-gray-800 fill-current ml-0.5" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{group.cameras?.name}</p>
                                                <span className="px-2 py-0.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-full">
                                                    {group.maxCount} elephant{group.maxCount !== 1 ? "s" : ""}
                                                </span>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                                    {group.recordings.length} clip{group.recordings.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Camera className="w-3 h-3" /> {group.cameras?.location || "—"}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" /> {fmtDate(group.startTimestamp)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expand toggle */}
                                        <button onClick={() => toggleGroup(group.key)}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Expanded clips */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden border-t border-gray-100">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                                                    {group.recordings.map((rec) => (
                                                        <div key={rec.id}
                                                            className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:border-green-300 transition-colors">

                                                            {/* Mini thumbnail */}
                                                            <div className="aspect-video bg-gray-900 relative cursor-pointer"
                                                                onClick={() => setActiveVideo(rec)}>
                                                                {rec.snapshot_path && (
                                                                    <img
                                                                        src={mediaUrl(rec.snapshot_path) ?? undefined}
                                                                        alt="snapshot"
                                                                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                                                                    />
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                                    <div className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow">
                                                                        <Play className="w-4 h-4 text-gray-800 fill-current ml-0.5" />
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-2 right-2">
                                                                    <span className="px-1.5 py-0.5 bg-black/60 rounded text-xs text-gray-300 font-mono">{fmt(rec.duration_secs)}</span>
                                                                </div>
                                                                <div className="absolute top-2 left-2">
                                                                    <span className="px-1.5 py-0.5 bg-green-700/80 rounded text-xs text-white font-semibold">{rec.count} 🐘</span>
                                                                </div>
                                                            </div>

                                                            {/* Clip footer */}
                                                            <div className="px-3 py-2 flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-700">Clip #{rec.id}</p>
                                                                    <p className="text-xs text-gray-400">{fmtTime(rec.timestamp)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {rec.snapshot_path && (
                                                                        <button onClick={() => setActiveSnap(rec)} title="View snapshot"
                                                                            className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-green-700 transition-colors">
                                                                            <Image className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                    <a href={mediaUrl(rec.file_path) ?? "#"} download
                                                                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors">
                                                                        <Download className="w-3.5 h-3.5" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
