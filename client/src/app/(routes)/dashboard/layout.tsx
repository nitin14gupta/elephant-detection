"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/src/components/dashboard/Sidebar";
import { apiService } from "@/src/api/apiService";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!apiService.isAuthenticated()) {
        router.push("/login");
        return;
      }

      try {
        const userData = await apiService.getMe();
        setUser(userData);
      } catch (err) {
        // apiService handles 401
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 font-medium animate-pulse">Synchronizing Security Protocol...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar userEmail={user?.email} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
