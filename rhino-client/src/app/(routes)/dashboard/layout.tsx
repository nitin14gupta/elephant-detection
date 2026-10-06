"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/src/components/dashboard/Sidebar";
import { apiService } from "@/src/api/apiService";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (!apiService.isAuthenticated()) {
                router.push("/login");
                return;
            }
            try {
                const userData = await apiService.getMe();
                // Cache email so Header can read it without an extra API call
                if (userData?.email) {
                    localStorage.setItem("user_email", userData.email);
                }
            } catch {
                // apiService handles 401 redirect
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                {children}
            </main>
        </div>
    );
}
