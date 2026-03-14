"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Bell } from "lucide-react";
import NotificationDrawer from "./NotificationDrawer";
import { apiService } from "@/src/api/apiService";

interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(true);

    return (
        <>
            <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md z-40 sticky top-0 font-sans">
                <div>
                    <h2 className="text-zinc-400 text-sm font-medium tracking-wide uppercase">{title}</h2>
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setIsDrawerOpen(true);
                                setHasUnread(false);
                            }}
                            className="p-2.5 rounded-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 group"
                        >
                            <Bell className={`w-5 h-5 transition-colors ${hasUnread ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-white'}`} />
                        </button>
                        {hasUnread && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                        )}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 border-2 border-white/10 overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <Image src="/logo.png" alt="User" width={40} height={40} className="object-cover opacity-80" />
                    </div>
                </div>
            </header>

            <NotificationDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
            />
        </>
    );
}
