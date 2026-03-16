"use client";

import React, { useEffect, useState } from "react";
import {
    X,
    Bell,
    AlertCircle,
    Clock,
    MapPin,
    ChevronRight,
    Loader2,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Link from "next/link";

interface Alert {
    id: number;
    cam_id: number;
    type: string;
    severity: string;
    timestamp: string;
    count?: number;
    direction?: string;
    cameras: {
        name: string;
        location: string;
    };
}

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const data = await apiService.getAlerts();
            // Show only latest 10 in drawer
            setAlerts(data.slice(0, 10));
        } catch (err) {
            console.error("Failed to fetch alerts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
        }
    }, [isOpen]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-white/10 z-[101] flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <Bell className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Alerts</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                    <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Polling Secure Feeds...</p>
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-zinc-700" />
                                    </div>
                                    <p className="text-white font-bold">All sectors are clear</p>
                                    <p className="text-zinc-600 text-xs mt-1">No critical detection incidents found in recent archives.</p>
                                </div>
                            ) : (
                                alerts.map((alert) => (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        key={alert.id}
                                        className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-red-500/30 transition-all group"
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Critical</span>
                                                    <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                                                        <Clock className="w-3 h-3" /> {formatTime(alert.timestamp)}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                                                    {alert.count && alert.count > 1 ? `${alert.count} Elephants Detected` : "Elephant Detected"}
                                                </h4>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                        <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                                                        {alert.cameras.location || "Sector Unknown"}
                                                    </div>
                                                    {alert.direction && alert.direction !== 'unknown' && (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                                            Moving: {alert.direction}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                                                        NODE: {alert.cameras.name} | {alert.cam_id}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
                            <Link
                                href="/dashboard/logs"
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white transition-all group"
                            >
                                View Detailed History <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
