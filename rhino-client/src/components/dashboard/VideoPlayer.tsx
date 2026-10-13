"use client";

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Camera, Maximize2, Activity } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  name: string;
  id: number;
}

// TTSPL cameras play reliably through their own embed page (the raw HLS stream shows black in the browser)
const TTSPL_EMBED = (url: string) => {
  const m = url.match(/ttspl\.live.*\/(cam\d+)\.m3u8/i);
  return m ? `https://ttspl.live/player.html?camera=${m[1]}&embed=1` : null;
};

export default function VideoPlayer({ url, name, id }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const embedUrl = TTSPL_EMBED(url);

  useEffect(() => {
    let hls: Hls | null = null;

    if (!embedUrl && videoRef.current) {
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
  }, [url, embedUrl]);

  const toggleFullScreen = () => {
    const el = (embedUrl ? boxRef.current : videoRef.current) as any;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  return (
    <div ref={boxRef} className="relative group bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500 h-full">
      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-400 font-mono">ID: {id}</span>
        </div>
      </div>

      {/* Video Element */}
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={name}
          className="w-full h-full border-0 block bg-black"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
          muted
          playsInline
        />
      )}

      {/* Footer / Status */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3 pointer-events-auto">
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
