"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Activity, ArrowRight, Bell, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) router.push("/dashboard");
  }, [router]);

  const features = [
    { title: "Real-time Detection", description: "Advanced ML models monitor live feeds and detect elephants with high accuracy.", icon: Zap },
    { title: "Smart Alerts", description: "Instant Telegram notifications sent the moment an elephant is confirmed.", icon: Bell },
    { title: "Fleet Management", description: "Manage multiple camera nodes across remote forest locations from one dashboard.", icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
              <Image src="/logo.jpeg" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-base font-bold text-gray-900">Elephant Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
              Live Monitoring Active
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-gray-900">
              Protecting Wildlife with{" "}
              <span className="text-green-700">Intelligent</span>{" "}
              Detection
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
              AI-powered elephant detection system for the Jhargram Forest Department — preventing human-wildlife conflict in real time.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="/login"
                className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-sm">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="px-6 py-3 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Learn More
              </Link>
            </div>
            {/* Credits */}
            <p className="text-xs text-gray-400 pt-2 leading-relaxed border-t border-gray-100 pt-4">
              Conceptualized by <span className="text-gray-600 font-medium">Shri Umar Imam, IFS</span>, DFO Jhargram ·
              Developed by <span className="text-gray-600 font-medium">Aeronics Technologies Pvt. Ltd.</span>
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="relative h-[460px] rounded-2xl overflow-hidden shadow-xl border border-gray-200">
            <Image src="/elephant-hero.png" alt="Elephant monitoring" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {/* Live badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-gray-800">System Active</span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-700">Jhargram Forest Department</p>
              <p className="text-xs text-gray-500 mt-0.5">West Bengal · Elephant Monitoring Network</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 border-y border-gray-200 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-2 text-sm">End-to-end detection from camera to alert</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
                className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200">
              <Image src="/logo.jpeg" alt="Logo" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Elephant Intelligence</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Aeronics Technologies Pvt. Ltd. · Jhargram Forest Department
          </p>
        </div>
      </footer>
    </div>
  );
}
