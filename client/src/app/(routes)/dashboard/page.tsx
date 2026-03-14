"use client";

import React, { useState, useEffect } from "react";
import {
    Shield,
    Activity,
    Wifi,
    Clock,
    LayoutGrid,
    Monitor
} from "lucide-react";
import { motion } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";
import VideoPlayer from "@/src/components/dashboard/VideoPlayer";

interface CameraNode {
    id: number;
    name: string;
    live_link: string;
    is_active: boolean;
}

export default function DashboardPage() {
    const [stats, setStats] = useState({
        detections: 0,
        activeCameras: 0,
        inactiveCameras: 0,
        lastSeen: "Loading...",
        status: "Active"
    });
    const [cameras, setCameras] = useState<CameraNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, camerasData] = await Promise.all([
                    apiService.getStats(),
                    apiService.getCameras()
                ]);

                setStats({
                    detections: statsData.total_detections,
                    activeCameras: statsData.active_cameras,
                    inactiveCameras: statsData.inactive_cameras,
                    lastSeen: statsData.last_seen ? new Date(statsData.last_seen).toLocaleTimeString() : "Never",
                    status: statsData.system_health
                });

                // Filter for active ones
                setCameras(camerasData.filter((c: CameraNode) => c.is_active));
            } catch (err) {
                console.error("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <>
            <Header title="Mission Control" />
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black">

                {/* Top Header Section with Quick Stats */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Live Fleet Surveillance</h2>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Monitor className="w-3.5 h-3.5 text-emerald-500" />
                                {stats.activeCameras} Online Nodes
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                                {stats.detections} Encounters Logged
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3x3 Grid of Live Feeds */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="aspect-video bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />
                        ))
                    ) : cameras.length === 0 ? (
                        <div className="col-span-full py-20 bg-zinc-900/20 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                            <Wifi className="w-12 h-12 text-zinc-700 mb-4" />
                            <p className="text-zinc-500 font-medium text-lg">No active cameras found.</p>
                            <p className="text-zinc-600 text-sm">Enable cameras in the Fleet Management section to see feeds.</p>
                        </div>
                    ) : (
                        cameras.map((cam, i) => (
                            <motion.div
                                key={cam.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <VideoPlayer
                                    url={cam.live_link}
                                    name={cam.name}
                                    id={cam.id}
                                />
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
