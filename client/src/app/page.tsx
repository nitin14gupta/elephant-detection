"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Camera, Activity, ArrowRight, Bell, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in
    const token = localStorage.getItem("access_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const features = [
    { title: "Real-time Detection", description: "Advanced ML models monitor live feeds with 98%+ accuracy.", icon: Zap },
    { title: "Smart Alerts", description: "Instant SMS and Telegram notifications for high-priority encounters.", icon: Bell },
    { title: "Fleet Management", description: "Scale across dozens of solar-powered nodes in remote locations.", icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/50">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Elephant AI
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all">
              Launch Console
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-32 px-8 overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v2.4 Active Monitoring
            </div>
            <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter leading-[0.9] text-balance">
              Safeguarding <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Wildlife</span> with Intelligence.
            </h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-xl">
              Prevent human-wildlife conflict using state-of-the-art computer vision and real-time distributed edge computing.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <Link href="/login" className="bg-emerald-500 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2">
                Launch System <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-8 py-4 rounded-full text-lg font-bold border border-white/10 hover:bg-white/5 transition-all">
                View Infrastructure
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-[600px] w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-black/80 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
              <Image 
                src="/elephant-hero.png" 
                alt="Elephant AI Monitoring" 
                fill 
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
              {/* Corner Accents */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-emerald-400/50" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-emerald-400/50" />
            </div>
          </motion.div>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[100px] -z-10" />
      </section>

      {/* Features */}
      <section className="py-32 bg-zinc-950/50 border-y border-white/5 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="space-y-4 p-8 rounded-[2rem] bg-zinc-900/30 border border-white/5 hover:border-emerald-500/20 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-emerald-500" />
          <span className="text-lg font-bold">Elephant AI</span>
        </div>
        <p className="text-zinc-600 text-sm italic">"Advanced technology for conservation."</p>
      </footer>
    </div>
  );
}
