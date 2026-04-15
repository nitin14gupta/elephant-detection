"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    Activity,
    Camera,
    BarChart3,
    Video,
    History,
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { icon: Activity,  label: "Live Feed",      href: "/dashboard" },
        { icon: Camera,    label: "Camera Fleet",   href: "/dashboard/livecam" },
        { icon: BarChart3, label: "Analytics",      href: "/dashboard/analytics" },
        { icon: Video,     label: "Recordings",     href: "/dashboard/recordings" },
        { icon: History,   label: "Detection Logs", href: "/dashboard/logs" },
    ];

    return (
        <aside className="w-16 lg:w-60 border-r border-gray-200 flex flex-col bg-white shrink-0">
            {/* Brand */}
            <div className="h-16 border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    <Image
                        src="/logo.jpeg"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="object-contain"
                    />
                </div>
                <span className="hidden lg:block text-sm font-bold text-gray-800 leading-tight">
                    Elephant Intelligence
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-green-50 text-green-700"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                            <item.icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-green-700" : "text-gray-400"}`} style={{ width: 18, height: 18 }} />
                            <span className="hidden lg:block">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 hidden lg:block">
                <p className="text-[10px] text-gray-400 leading-relaxed px-2">
                    Jhargram Forest Department<br />
                    Developed by Aeronics Technologies
                </p>
            </div>
        </aside>
    );
}
