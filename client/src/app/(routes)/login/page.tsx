"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/src/api/apiService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (apiService.isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiService.login({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[520px]"
      >
        {/* ── Left panel ── */}
        <div
          className="relative hidden md:flex flex-col items-center justify-between w-[46%] flex-shrink-0 px-10 py-10 text-white overflow-hidden"
          style={{ background: "linear-gradient(160deg, #2e7d32 0%, #1b5e20 100%)" }}
        >
          {/* decorative circles */}
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute bottom-10 -right-20 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -left-10 w-40 h-40 rounded-full bg-white/5" />

          {/* Logo + title */}
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-lg overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="Aeronics Technologies"
                width={88}
                height={88}
                className="object-contain rounded-full"
                priority
              />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight drop-shadow">
                Hello, Welcome!
              </h2>
              <p className="mt-1 text-green-200 text-sm font-medium">
                Elephant Intelligence System
              </p>
            </div>
          </div>

          {/* Credits */}
          <div className="relative z-10 w-full border-l-4 border-green-300/60 pl-4 space-y-2">
            <p className="text-sm font-semibold text-green-100 leading-snug">
              Conceptualized by:
            </p>
            <p className="text-base font-bold text-white leading-snug">
              Shri Umar Imam, IFS
            </p>
            <p className="text-sm text-green-200">DFO Jhargram</p>

            <div className="pt-3">
              <p className="text-sm font-semibold text-green-100 leading-snug">
                Developed by:
              </p>
              <p className="text-base font-bold text-white leading-snug">
                Aeronics Technologies Pvt. Ltd.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
          {/* Mobile logo (shown only on small screens) */}
          <div className="flex md:hidden justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-50 border border-green-100 p-1.5 shadow overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="Aeronics Technologies"
                width={72}
                height={72}
                className="object-contain rounded-full"
                priority
              />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mb-8">Login</h1>

          <form onSubmit={handleLogin} className="space-y-5 w-full max-w-sm">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username"
                className="w-full border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 placeholder:text-gray-400 bg-gray-50 focus:outline-none focus:border-green-500 focus:bg-white transition-all text-sm"
                required
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 placeholder:text-gray-400 bg-gray-50 focus:outline-none focus:border-green-500 focus:bg-white transition-all text-sm"
                required
              />
            </div>

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-green-700 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-600 active:scale-[0.98] text-white py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none group shadow-md shadow-green-900/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Mobile credits */}
          <p className="md:hidden mt-10 text-[11px] text-gray-400 text-center leading-relaxed">
            Conceptualized by <span className="text-gray-600 font-semibold">Shri Umar Imam, IFS</span>, DFO Jhargram
            <br />
            Developed by <span className="text-gray-600 font-semibold">Aeronics Technologies Pvt. Ltd.</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
