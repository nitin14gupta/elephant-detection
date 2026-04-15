"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Bell, User, LogOut, ChevronDown } from "lucide-react";
import NotificationDrawer from "./NotificationDrawer";
import { apiService } from "@/src/api/apiService";
import { useRouter } from "next/navigation";

interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
    const router = useRouter();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string>("");
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Read cached email set by layout after getMe()
        const cached = localStorage.getItem("user_email");
        if (cached) setUserEmail(cached);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        apiService.logout();
        router.push("/login");
    };

    const initials = userEmail
        ? userEmail.split("@")[0].slice(0, 2).toUpperCase()
        : "U";

    return (
        <>
            <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white z-40 sticky top-0">
                <h2 className="text-gray-800 text-base font-semibold">{title}</h2>

                <div className="flex items-center gap-3">
                    {/* Bell */}
                    <div className="relative">
                        <button
                            onClick={() => { setIsDrawerOpen(true); setHasUnread(false); }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800"
                        >
                            <Bell className="w-5 h-5" />
                        </button>
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </div>

                    {/* Profile dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold">
                                {initials}
                            </div>
                            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
                                {userEmail ? userEmail.split("@")[0] : "User"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                                    <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{userEmail || "—"}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        )}
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
