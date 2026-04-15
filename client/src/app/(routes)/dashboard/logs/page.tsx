"use client";

import React, { useState, useEffect } from "react";
import { Search, RefreshCcw, Loader2, AlertCircle, Clock, MapPin, Filter, X, CheckCircle, HelpCircle, Download, Calendar, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface Alert {
    id: number;
    cam_id: number;
    is_active: boolean;
    url: string | null;
    snapshot_path: string | null;
    gemini_verified: boolean | null;
    gemini_reason: string | null;
    timestamp: string;
    count?: number;
    direction?: string;
    cameras: { name: string; location: string };
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

interface Recording { id: number; alert_id: number | null; file_path: string; }

interface CsvFilters {
    fromDate: string;
    toDate: string;
    camera: string;
    gemini: "all" | "confirmed" | "unconfirmed" | "unavailable";
    direction: string;
}

function escCsv(v: string | number | null | undefined) {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function LogsPage() {
    const [alerts, setAlerts]             = useState<Alert[]>([]);
    const [loading, setLoading]           = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery]   = useState("");
    const [dateFilter, setDateFilter]     = useState<FilterId>("all");
    const [viewAlert, setViewAlert]       = useState<Alert | null>(null);
    const [csvOpen, setCsvOpen]           = useState(false);
    const [csvLoading, setCsvLoading]     = useState(false);
    const [csvFilters, setCsvFilters]     = useState<CsvFilters>({
        fromDate: "", toDate: "", camera: "all", gemini: "all", direction: "all",
    });

    const fetchAlerts = async () => {
        setLoading(true);
        try { setAlerts(await apiService.getAlerts()); }
        catch { console.error("Failed to fetch alerts"); }
        finally { setLoading(false); setIsRefreshing(false); }
    };

    useEffect(() => { fetchAlerts(); }, []);

    const uniqueCameras = Array.from(new Map(alerts.map(a => [a.cam_id, a.cameras?.name])).entries());

    const handleDownloadCsv = async () => {
        setCsvLoading(true);
        try {
            const recordings: Recording[] = await apiService.getRecordings();
            const recByAlert = new Map<number, Recording[]>();
            recordings.forEach(r => {
                if (r.alert_id != null) {
                    if (!recByAlert.has(r.alert_id)) recByAlert.set(r.alert_id, []);
                    recByAlert.get(r.alert_id)!.push(r);
                }
            });

            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const toFullUrl = (path: string | null | undefined) => {
                if (!path) return "";
                const rel = path.startsWith("/") ? path : `/${path}`;
                return `${origin}${rel}`;
            };

            // Normalize timestamp string to a Date — handles both "...Z" and "... " (no tz) formats
            const parseTs = (ts: string) => new Date(ts.includes("Z") || ts.includes("+") ? ts : ts.replace(" ", "T") + "Z");

            const rows = alerts.filter(a => {
                const t = parseTs(a.timestamp);
                if (csvFilters.fromDate && t < new Date(csvFilters.fromDate)) return false;
                if (csvFilters.toDate   && t > new Date(csvFilters.toDate + "T23:59:59Z")) return false;
                if (csvFilters.camera !== "all" && String(a.cam_id) !== csvFilters.camera) return false;
                if (csvFilters.direction !== "all" && (a.direction || "unknown") !== csvFilters.direction) return false;
                if (csvFilters.gemini === "confirmed"   && a.gemini_verified !== true) return false;
                if (csvFilters.gemini === "unconfirmed" && a.gemini_verified !== false) return false;
                if (csvFilters.gemini === "unavailable" && a.gemini_verified !== null) return false;
                return true;
            });

            const header = ["Alert ID","Camera","Location","Timestamp (IST)","Elephant Count","Direction","Gemini Status","Gemini Reason","Snapshot URL","Recording URL(s)"];
            const lines = rows.map(a => {
                const ts = new Intl.DateTimeFormat("en-IN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true, timeZone:"Asia/Kolkata" }).format(parseTs(a.timestamp));
                const geminiStatus = a.gemini_verified === true ? "Confirmed" : a.gemini_verified === false ? "Unconfirmed" : "Unavailable";
                const recs = (recByAlert.get(a.id) || []).map(r => toFullUrl(r.file_path)).join(" | ");
                return [a.id, a.cameras?.name, a.cameras?.location, ts, a.count || 1, a.direction || "unknown", geminiStatus, a.gemini_reason || "", toFullUrl(a.snapshot_path), recs].map(escCsv).join(",");
            });

            const csv = [header.join(","), ...lines].join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `detection-logs-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 200);
            setCsvOpen(false);
        } catch (e) { console.error("CSV export failed", e); }
        finally { setCsvLoading(false); }
    };

    const parseDate = (ds: string) => new Date(ds.includes("Z") || ds.includes("+") ? ds : ds.replace(" ", "T") + "Z");

    const isWithinRange = (ds: string) => {
        const d = parseDate(ds), now = new Date();
        if (dateFilter === "today") return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateFilter === "week")  return d >= new Date(now.getTime() - 7 * 86400000);
        if (dateFilter === "month") return d >= new Date(now.getTime() - 30 * 86400000);
        return true;
    };

    const filtered = alerts.filter(a =>
        (a.cameras?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (a.cameras?.location && a.cameras.location.toLowerCase().includes(searchQuery.toLowerCase()))) &&
        isWithinRange(a.timestamp)
    );

    const formatDate = (ds: string) =>
        new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(parseDate(ds));

    return (
        <>
            <Header title="Detection Logs" />

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">
                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search by camera or location..." value={searchQuery}
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
                        <button onClick={() => { setIsRefreshing(true); fetchAlerts(); }} disabled={isRefreshing}
                            className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50">
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-green-700" : ""}`} />
                        </button>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{filtered.length} records</span>
                        </div>
                        <button onClick={() => setCsvOpen(true)}
                            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* CSV Export Modal */}
                <AnimatePresence>
                    {csvOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                            onClick={() => setCsvOpen(false)}>
                            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Download className="w-5 h-5 text-green-700" />
                                        <h2 className="text-base font-semibold text-gray-800">Export Detection Logs</h2>
                                    </div>
                                    <button onClick={() => setCsvOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>

                                {/* Filters */}
                                <div className="px-6 py-5 space-y-4">
                                    {/* Date Range */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date Range</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                    <input type="date" value={csvFilters.fromDate}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvFilters(f => ({ ...f, fromDate: e.target.value }))}
                                                        className="w-full border border-gray-200 rounded-lg py-2 pl-8 pr-2 text-sm text-gray-700 focus:outline-none focus:border-green-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                    <input type="date" value={csvFilters.toDate}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvFilters(f => ({ ...f, toDate: e.target.value }))}
                                                        className="w-full border border-gray-200 rounded-lg py-2 pl-8 pr-2 text-sm text-gray-700 focus:outline-none focus:border-green-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Camera */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Camera</label>
                                        <div className="relative">
                                            <select value={csvFilters.camera}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCsvFilters(f => ({ ...f, camera: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:border-green-600 appearance-none bg-white">
                                                <option value="all">All Cameras</option>
                                                {uniqueCameras.map(([id, name]) => (
                                                    <option key={id} value={String(id)}>{name} (Cam {id})</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Direction */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Direction</label>
                                        <div className="relative">
                                            <select value={csvFilters.direction}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCsvFilters(f => ({ ...f, direction: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:border-green-600 appearance-none bg-white">
                                                <option value="all">All Directions</option>
                                                <option value="left">Left</option>
                                                <option value="right">Right</option>
                                                <option value="mixed">Mixed</option>
                                                <option value="unknown">Unknown</option>
                                            </select>
                                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Gemini Status */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gemini Status</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {(["all","confirmed","unconfirmed","unavailable"] as const).map(opt => (
                                                <button key={opt} onClick={() => setCsvFilters(f => ({ ...f, gemini: opt }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                                        csvFilters.gemini === opt
                                                            ? "bg-green-700 text-white border-green-700"
                                                            : "bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-700"
                                                    }`}>
                                                    {opt === "all" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                                    <p className="text-xs text-gray-400">
                                        CSV includes: Alert ID, Camera, Timestamp (IST), Count, Direction, Gemini Status, Snapshot URL, Recording URL(s)
                                    </p>
                                    <button onClick={handleDownloadCsv} disabled={csvLoading}
                                        className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
                                        {csvLoading
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
                                            : <><Download className="w-4 h-4" /> Download CSV</>
                                        }
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Snapshot Modal */}
                <AnimatePresence>
                    {viewAlert && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                            onClick={() => setViewAlert(null)}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl">

                                {/* Snapshot image */}
                                {viewAlert.snapshot_path ? (
                                    <img
                                        src={mediaUrl(viewAlert.snapshot_path) ?? undefined}
                                        alt="Detection snapshot"
                                        className="w-full object-contain bg-black"
                                    />
                                ) : (
                                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                        <p className="text-sm text-gray-400">No snapshot available for this alert</p>
                                    </div>
                                )}

                                {/* Close */}
                                <button onClick={() => setViewAlert(null)}
                                    className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Details */}
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-800">{viewAlert.cameras?.name} — Elephant Detected</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{viewAlert.cameras?.location} · {formatDate(viewAlert.timestamp)}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                                            {viewAlert.count || 1} elephant{(viewAlert.count || 1) !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {/* Gemini status */}
                                    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm ${
                                        viewAlert.gemini_verified === true
                                            ? "bg-green-50 border border-green-200 text-green-800"
                                            : viewAlert.gemini_verified === false
                                                ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
                                                : "bg-gray-50 border border-gray-200 text-gray-600"
                                    }`}>
                                        {viewAlert.gemini_verified === true
                                            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            : <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        }
                                        <div>
                                            <p className="font-semibold">
                                                Gemini: {viewAlert.gemini_verified === true ? "Confirmed" : viewAlert.gemini_verified === false ? "Unconfirmed" : "Unavailable"}
                                            </p>
                                            {viewAlert.gemini_reason && (
                                                <p className="text-xs mt-0.5 opacity-80">{viewAlert.gemini_reason}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Incident</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Count</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Direction</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Gemini</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <AnimatePresence mode="popLayout">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-5 py-16 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-green-700 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">Loading logs...</p>
                                        </td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-400">
                                            {searchQuery ? "No matching records found." : "No detection records yet."}
                                        </td></tr>
                                    ) : filtered.map((alert) => (
                                        <motion.tr key={alert.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">Elephant Detected</p>
                                                        <p className="text-xs text-gray-400">{alert.cameras?.name} · Cam {alert.cam_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-semibold text-xs">
                                                    {alert.count || 1}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                    alert.direction && alert.direction !== "unknown"
                                                        ? "bg-green-50 text-green-700 border border-green-200"
                                                        : "bg-gray-100 text-gray-400"
                                                }`}>
                                                    {alert.direction || "Unknown"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {alert.gemini_verified === true ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                                                        <CheckCircle className="w-3 h-3" /> Confirmed
                                                    </span>
                                                ) : alert.gemini_verified === false ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
                                                        <HelpCircle className="w-3 h-3" /> Unconfirmed
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {alert.cameras?.location || "—"}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {formatDate(alert.timestamp)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => setViewAlert(alert)}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-green-700 bg-gray-100 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
                                                        View Snapshot
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
