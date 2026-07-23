"use client";

import { useState } from "react";
import { Building2, Key, Mail, UserCheck, ShieldCheck, Zap, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("owner@riddhi.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Login failed");
      }

      window.location.href = "/rooms";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "password123" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Login failed");
      }

      window.location.href = "/rooms";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* RentOk Inspired Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: RentOk Inspired Brand Pitch & Highlights */}
        <div className="lg:col-span-7 space-y-6 text-left hidden sm:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Next-Gen PG & Co-Living Software</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Manage your PG & Hostel <span className="text-gradient-electric">Smartly & Effortlessly</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
            Automated monthly billing, WhatsApp tenant reminders, live occupancy boards, meter readings, and instant digital receipts.
          </p>

          {/* Feature Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { title: "Live Occupancy Board", desc: "Real-time vacant, occupied & reserved beds" },
              { title: "Automated Electricity Split", desc: "Meter readings carry-forward & split" },
              { title: "WhatsApp Reminders", desc: "Instant bills & receipt delivery" },
              { title: "Multi-Tenant Isolation", desc: "Multi-property SaaS security" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-white">{f.title}</h2>
                  <p className="text-[11px] text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: RentOk Glassmorphism Login Card */}
        <div className="lg:col-span-5 w-full">
          <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80 relative">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-emerald-400 rounded-2xl flex items-center justify-center mb-3 text-white font-bold shadow-lg shadow-blue-600/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Sign In to Dashboard</h2>
              <p className="text-xs text-slate-400 mt-1">Select demo account or enter credentials</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="name@property.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-electric text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
              >
                <span>{loading ? "Signing in..." : "Sign In to Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Accounts Selector */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Quick One-Click Demo Login
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => quickLogin("owner@riddhi.com")}
                  className="w-full text-left text-xs bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 p-2.5 rounded-xl flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="font-bold text-white">Riddhi Residency (Owner)</span>
                    <span className="block text-slate-400 text-[10px]">owner@riddhi.com</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">
                    Owner
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => quickLogin("manager@riddhi.com")}
                  className="w-full text-left text-xs bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-2.5 rounded-xl flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="font-bold text-white">Riddhi Residency (Manager)</span>
                    <span className="block text-slate-400 text-[10px]">manager@riddhi.com</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">
                    Manager
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
