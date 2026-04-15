"use client";

import React, { useState, useEffect } from "react";
import { Activity, Monitor, Wifi } from "lucide-react";
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
    const [stats, setStats] = useState({ detections: 0, activeCameras: 0 });
    const [cameras, setCameras] = useState<CameraNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, camerasData] = await Promise.all([
                    apiService.getStats(),
                    apiService.getCameras(),
                ]);
                setStats({
                    detections: statsData.total_detections,
                    activeCameras: statsData.active_cameras,
                });
                setCameras(camerasData.filter((c: CameraNode) => c.is_active));
            } catch {
                console.error("Failed to fetch dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const cols = Math.ceil(Math.sqrt(Math.max(cameras.length, 1)));
    const rows = Math.ceil(cameras.length / cols);

    return (
        <>
            <Header title="Live Surveillance" />

            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3 bg-gray-50">
                {/* Summary bar */}
                <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Monitor className="w-4 h-4 text-green-700" />
                        <span><span className="font-semibold text-gray-800">{stats.activeCameras}</span> cameras online</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span><span className="font-semibold text-gray-800">{stats.detections}</span> detections logged</span>
                    </div>
                </div>

                {/* Camera grid — fills remaining height, all cameras visible without scrolling */}
                {loading ? (
                    <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)" }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-gray-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : cameras.length === 0 ? (
                    <div className="flex-1 min-h-0 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center bg-white">
                        <Wifi className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-gray-600 font-medium">No active cameras found</p>
                        <p className="text-gray-400 text-sm mt-1">Enable cameras in Camera Fleet to see live feeds.</p>
                    </div>
                ) : (
                    <div
                        className="flex-1 min-h-0 grid gap-2"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                        }}
                    >
                        {cameras.map((cam, i) => (
                            <motion.div
                                key={cam.id}
                                className="min-h-0 h-full"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.04 }}
                            >
                                <VideoPlayer url={cam.live_link} name={cam.name} id={cam.id} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
