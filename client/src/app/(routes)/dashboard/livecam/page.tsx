"use client";

import React, { useState, useEffect } from "react";
import { Camera, MapPin, Search, CheckCircle2, RefreshCcw, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import Header from "@/src/components/dashboard/Header";

interface CameraNode {
    id: number;
    name: string;
    location: string;
    live_link: string;
    is_active: boolean;
    last_active_at: string | null;
}

export default function LiveCamPage() {
    const [cameras, setCameras] = useState<CameraNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCam, setNewCam] = useState({ name: "", location: "", live_link: "", lat: "", long: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCameras = async () => {
        setLoading(true);
        try {
            setCameras(await apiService.getCameras());
        } catch { console.error("Failed to fetch cameras"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCameras(); }, []);

    const handleToggle = async (id: number, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            await apiService.updateCamera(id, !currentStatus);
            setCameras(cameras.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        } catch { console.error("Failed to update camera"); }
        finally { setTogglingId(null); }
    };

    const handleAddCamera = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiService.addCamera({ ...newCam, lat: newCam.lat ? parseFloat(newCam.lat) : null, long: newCam.long ? parseFloat(newCam.long) : null });
            setIsModalOpen(false);
            setNewCam({ name: "", location: "", live_link: "", lat: "", long: "" });
            fetchCameras();
        } catch { console.error("Failed to add camera"); }
        finally { setIsSubmitting(false); }
    };

    const filtered = cameras.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const inputCls = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/20 placeholder:text-gray-400 transition-colors";

    return (
        <>
            <Header title="Camera Fleet" />

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search cameras..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${inputCls} pl-9`}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchCameras} className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors bg-white">
                            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-green-700" : ""}`} />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Camera
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Camera</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <AnimatePresence mode="popLayout">
                                    {loading ? (
                                        <tr><td colSpan={4} className="px-5 py-16 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-green-700 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">Loading cameras...</p>
                                        </td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={4} className="px-5 py-16 text-center text-sm text-gray-400">No cameras found.</td></tr>
                                    ) : filtered.map((cam) => (
                                        <motion.tr key={cam.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg border ${cam.is_active ? "bg-green-50 border-green-200" : "bg-gray-100 border-gray-200"}`}>
                                                        <Camera className={`w-4 h-4 ${cam.is_active ? "text-green-700" : "text-gray-400"}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{cam.name}</p>
                                                        <p className="text-xs text-gray-400">ID: {cam.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {cam.location || "—"}
                                                </div>
                                                <a href={cam.live_link} target="_blank" rel="noreferrer"
                                                    className="text-xs text-gray-400 hover:text-green-700 flex items-center gap-1 mt-0.5 transition-colors">
                                                    {cam.live_link.substring(0, 32)}... <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                        cam.is_active
                                                            ? "bg-green-50 text-green-700 border-green-200"
                                                            : "bg-gray-100 text-gray-500 border-gray-200"
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${cam.is_active ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                                                        {cam.is_active ? "Online" : "Offline"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => handleToggle(cam.id, cam.is_active)}
                                                        disabled={togglingId === cam.id}
                                                        className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none ${
                                                            cam.is_active ? "bg-green-600" : "bg-gray-200"
                                                        } disabled:opacity-60`}
                                                    >
                                                        <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-300 flex items-center justify-center ${
                                                            cam.is_active ? "translate-x-5" : ""
                                                        }`}>
                                                            {togglingId === cam.id && <Loader2 className="w-3 h-3 text-green-600 animate-spin" />}
                                                        </div>
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

            {/* Add Camera Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/40"
                        />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Add New Camera</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Register a new camera stream to the fleet</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddCamera} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-xs font-medium text-gray-600">Camera Name *</label>
                                        <input required value={newCam.name} onChange={(e) => setNewCam({ ...newCam, name: e.target.value })}
                                            placeholder="e.g. Sector A North" className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-xs font-medium text-gray-600">Location</label>
                                        <input value={newCam.location} onChange={(e) => setNewCam({ ...newCam, location: e.target.value })}
                                            placeholder="e.g. Perimeter Fence" className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-xs font-medium text-gray-600">Stream URL (HLS) *</label>
                                        <input required value={newCam.live_link} onChange={(e) => setNewCam({ ...newCam, live_link: e.target.value })}
                                            placeholder="https://.../stream.m3u8" className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-600">Latitude</label>
                                        <input type="number" step="any" value={newCam.lat} onChange={(e) => setNewCam({ ...newCam, lat: e.target.value })}
                                            placeholder="22.1234" className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-600">Longitude</label>
                                        <input type="number" step="any" value={newCam.long} onChange={(e) => setNewCam({ ...newCam, long: e.target.value })}
                                            placeholder="88.1234" className={inputCls} />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button disabled={isSubmitting}
                                        className="w-full bg-green-700 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Register Camera</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
