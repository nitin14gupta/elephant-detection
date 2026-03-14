"use client";

import React, { useState, useEffect } from "react";
import { 
  Camera, 
  MapPin, 
  Search,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ExternalLink,
  Loader2,
  Plus,
  X
} from "lucide-react";
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
  last_inactive_at: string | null;
}

export default function LiveCamPage() {
  const [cameras, setCameras] = useState<CameraNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCam, setNewCam] = useState({
    name: "",
    location: "",
    live_link: "",
    lat: "",
    long: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCameras();
      setCameras(data);
    } catch (err) {
      console.error("Failed to fetch cameras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleToggle = async (id: number, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await apiService.updateCamera(id, !currentStatus);
      setCameras(cameras.map(cam => 
        cam.id === id ? { ...cam, is_active: !currentStatus } : cam
      ));
    } catch (err) {
      console.error("Failed to update camera status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiService.addCamera({
        ...newCam,
        lat: newCam.lat ? parseFloat(newCam.lat) : null,
        long: newCam.long ? parseFloat(newCam.long) : null
      });
      setIsModalOpen(false);
      setNewCam({ name: "", location: "", live_link: "", lat: "", long: "" });
      fetchCameras();
    } catch (err) {
      console.error("Failed to add camera");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCameras = cameras.filter(cam => 
    cam.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (cam.location && cam.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <Header title="Fleet Management" />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Top bar with Search and Add Button */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Filter camera nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
                onClick={fetchCameras}
                className="p-3.5 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-zinc-400"
            >
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" /> Add New Camera
            </button>
          </div>
        </div>

        {/* Cameras Table */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Node Channel</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Zone Location</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center">Protocol Status</th>
                  <th className="px-8 py-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-right">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {loading && cameras.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Accessing Satellite Link...</p>
                      </td>
                    </tr>
                  ) : filteredCameras.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-zinc-500 font-medium">
                        No active nodes detected in this sector.
                      </td>
                    </tr>
                  ) : (
                    filteredCameras.map((cam) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={cam.id} 
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl bg-zinc-950 border ${cam.is_active ? 'border-emerald-500/30' : 'border-white/5'} transition-colors`}>
                              <Camera className={`w-5 h-5 ${cam.is_active ? 'text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-zinc-700'}`} />
                            </div>
                            <div>
                              <p className="text-white font-bold tracking-tight">{cam.name}</p>
                              <p className="text-zinc-600 text-[10px] font-mono tracking-tighter uppercase">AUTH_ID: {cam.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                              <MapPin className="w-4 h-4 text-emerald-500/50" />
                              {cam.location || "Remote Perimeter"}
                            </div>
                            <a href={cam.live_link} target="_blank" className="text-[10px] text-zinc-500 flex items-center gap-1.5 hover:text-emerald-400 transition-colors font-mono tracking-tighter">
                              {cam.live_link.substring(0, 30)}... <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                cam.is_active 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'bg-zinc-800/50 text-zinc-600 border-white/5'
                            }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${cam.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`} />
                                {cam.is_active ? "Online" : "Standby"}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleToggle(cam.id, cam.is_active)}
                                    disabled={togglingId === cam.id}
                                    className={`relative w-14 h-7 rounded-full transition-all duration-500 focus:outline-none ring-offset-black focus:ring-2 focus:ring-emerald-500/50 ${
                                    cam.is_active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'
                                    }`}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-lg transition-transform duration-500 flex items-center justify-center ${
                                    cam.is_active ? 'translate-x-7' : 'translate-x-0'
                                    }`}>
                                    {togglingId === cam.id && (
                                        <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                                    )}
                                    </div>
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

      {/* Add Camera Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Register New Node</h2>
                    <p className="text-zinc-500 text-xs mt-1 font-medium italic">Initialize new camera stream to active fleet</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500"
                >
                    <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddCamera} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Node Name</label>
                        <input 
                            required
                            value={newCam.name}
                            onChange={(e) => setNewCam({...newCam, name: e.target.value})}
                            placeholder="e.g. Sector-A North"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Zone Location</label>
                        <input 
                            value={newCam.location}
                            onChange={(e) => setNewCam({...newCam, location: e.target.value})}
                            placeholder="e.g. Perimeter Fence"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Live Stream URL (HLS)</label>
                        <input 
                            required
                            value={newCam.live_link}
                            onChange={(e) => setNewCam({...newCam, live_link: e.target.value})}
                            placeholder="https://.../stream.m3u8"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Latitude</label>
                        <input 
                            type="number"
                            step="any"
                            value={newCam.lat}
                            onChange={(e) => setNewCam({...newCam, lat: e.target.value})}
                            placeholder="22.1234"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Longitude</label>
                        <input 
                            type="number"
                            step="any"
                            value={newCam.long}
                            onChange={(e) => setNewCam({...newCam, long: e.target.value})}
                            placeholder="88.1234"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        disabled={isSubmitting}
                        className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>Confirm Node Registration <CheckCircle2 className="w-5 h-5" /></>
                        )}
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
