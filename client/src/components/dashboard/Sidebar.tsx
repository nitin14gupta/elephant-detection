"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  Shield,
  Activity,
  History,
  Settings,
  BarChart3,
  Video,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { apiService } from "@/src/api/apiService";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    apiService.logout();
    router.push("/login");
  };

  const menuItems = [
    { id: "dashboard", icon: Activity, label: "Live Feed", href: "/dashboard" },
    { id: "livecam", icon: Camera, label: "LiveCam Fleet", href: "/dashboard/livecam" },
    { id: "analytics", icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
    { id: "recordings", icon: Video, label: "Recordings", href: "/dashboard/recordings" },
    { id: "logs", icon: History, label: "Logs", href: "/dashboard/logs" },
    { id: "settings", icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-20 lg:w-64 border-r border-white/10 flex flex-col bg-zinc-950/50 backdrop-blur-xl shrink-0"
    >
      <div className="p-6 mb-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden lg:block bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Elephant AI
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${pathname === item.href
                ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium hidden lg:block">{item.label}</span>
            {pathname === item.href && (
              <motion.div
                layoutId="activeTabIcon"
                className="ml-auto w-1 h-1 rounded-full bg-emerald-400 hidden lg:block"
              />
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 px-6 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="p-2 bg-zinc-900 rounded-lg">
            <UserIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-white truncate max-w-[120px]">{userEmail?.split('@')[0] || "User"}</p>
            <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">{userEmail || "loading..."}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold text-xs uppercase tracking-widest hidden lg:block">Logout</span>
        </button>
      </div>
    </motion.aside>
  );
}
