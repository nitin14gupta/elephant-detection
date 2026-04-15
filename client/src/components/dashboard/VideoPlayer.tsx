"use client";

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Camera, Maximize2, Activity } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  name: string;
  id: number;
}

export default function VideoPlayer({ url, name, id }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls | null = null;

    if (videoRef.current) {
      const video = videoRef.current;

      if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("Auto-play prevented", e));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log("Auto-play prevented", e));
        });
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  const toggleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };

  return (
    <div className="relative group bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500 h-full">
      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-400 font-mono">ID: {id}</span>
        </div>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        muted
        playsInline
      />

      {/* Footer / Status */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullScreen}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-colors"
            title="Maximize"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
        </div>
        <div className="text-[9px] text-zinc-500 font-medium">
          LIVE • SECURE
        </div>
      </div>

      {/* Corner Scanning Effect (Pseudo) */}
      <div className="absolute inset-0 pointer-events-none border border-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
