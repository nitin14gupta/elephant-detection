"use client";

import React, { useEffect, useState } from "react";
import { X, Bell, AlertCircle, Clock, MapPin, ChevronRight, Loader2 } from "lucide-react";
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
    cameras: { name: string; location: string };
}

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            apiService.getAlerts()
                .then((data) => setAlerts(data.slice(0, 10)))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const formatTime = (dateString: string) =>
        new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(dateString));

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-[100]"
                    />
                    <motion.div
                        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 220 }}
                        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white border-l border-gray-200 z-[101] flex flex-col shadow-xl"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Bell className="w-4.5 h-4.5 text-green-700" style={{ width: 18, height: 18 }} />
                                <h3 className="text-base font-semibold text-gray-900">Alerts</h3>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <p className="text-sm">Loading alerts...</p>
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">All clear</p>
                                    <p className="text-xs text-gray-400">No recent detection alerts.</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {alerts.map((alert) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={alert.id}
                                            className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50/30 transition-all"
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 border border-red-100 shrink-0">
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Critical</span>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                                                            <Clock className="w-3 h-3" />{formatTime(alert.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {alert.count && alert.count > 1 ? `${alert.count} Elephants Detected` : "Elephant Detected"}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <MapPin className="w-3 h-3 text-gray-400" />
                                                        {alert.cameras.location || "Unknown location"}
                                                    </div>
                                                    {alert.direction && alert.direction !== "unknown" && (
                                                        <p className="text-xs font-medium text-green-700">
                                                            Moving: {alert.direction}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200">
                            <Link
                                href="/dashboard/logs"
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors group"
                            >
                                View all logs <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
