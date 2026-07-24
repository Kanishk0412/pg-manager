"use client";

import { useState } from "react";
import {
  Building2,
  Key,
  Mail,
  UserCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Shield,
  Home,
  Phone,
  Sparkles,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function LoginPage() {
  // Mode selection: "owner" (PG Owner / Manager) or "tenant" (Resident / Tenant)
  const [loginMode, setLoginMode] = useState<"owner" | "tenant">("owner");

  // Owner form state
  const [email, setEmail] = useState("owner@riddhi.com");
  const [password, setPassword] = useState("password123");

  // Tenant form state
  const [tenantIdentifier, setTenantIdentifier] = useState("+919811000000");
  const [tenantPassword, setTenantPassword] = useState("password123");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  // PG Owner / Manager Login Handler
  const handleOwnerLogin = async (e: React.FormEvent) => {
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

  // Resident / Tenant Login Handler
  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/tenant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: tenantIdentifier, password: tenantPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Tenant login failed");
      }

      window.location.href = "/tenant/dashboard";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleLoginSelect = async (gEmail: string, gName: string) => {
    setError("");
    setLoading(true);
    setGoogleModalOpen(false);

    try {
      const res = await fetch("/api/auth/tenant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGoogleLogin: true,
          googleEmail: gEmail,
          googleName: gName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Google Authentication failed.");
      }

      window.location.href = "/tenant/dashboard";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const quickOwnerLogin = async (demoEmail: string) => {
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

  const quickTenantLogin = (phone: string) => {
    setTenantIdentifier(phone);
    setTenantPassword("password123");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: Brand Highlights */}
        <div className="lg:col-span-7 space-y-6 text-left hidden sm:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Next-Gen PG & Co-Living Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Manage your PG <span className="text-gradient-electric">& Resident Services</span> Smartly
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
            Unified portal for PG Owners, Property Managers, and Residents. Automated rent collection, Google sign-in, live room occupancy, and WhatsApp bill delivery.
          </p>

          {/* Feature Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { title: "Live Occupancy Board", desc: "Real-time vacant, occupied & reserved beds" },
              { title: "Resident Self-Service Portal", desc: "Pay rent online & raise maintenance tickets" },
              { title: "Automated Electricity Split", desc: "Meter readings carry-forward & split" },
              { title: "Google OAuth Integration", desc: "1-click Google Sign-In for residents" },
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

        {/* Right Side: Dual-Mode Login Card (Owner vs Tenant) */}
        <div className="lg:col-span-5 w-full">
          <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80 relative space-y-5">
            
            {/* ROLE MODE SWITCHER TABS: Owner/Manager vs Tenant */}
            <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-2 gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setLoginMode("owner"); setError(""); }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  loginMode === "owner"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Owner / Manager</span>
              </button>

              <button
                type="button"
                onClick={() => { setLoginMode("tenant"); setError(""); }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  loginMode === "tenant"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Tenant / Resident</span>
              </button>
            </div>

            {/* Header Title */}
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-white font-bold shadow-lg">
                {loginMode === "owner" ? <Building2 className="w-5 h-5" /> : <Home className="w-5 h-5" />}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight pt-1">
                {loginMode === "owner" ? "PG Manager / Owner Sign In" : "Resident / Tenant Portal Sign In"}
              </h2>
              <p className="text-xs text-slate-400">
                {loginMode === "owner" ? "Access property dashboard & room allocations" : "Pay rent, view Wi-Fi password & raise complaints"}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ================= MODE 1: OWNER / MANAGER LOGIN ================= */}
            {loginMode === "owner" && (
              <>
                <form onSubmit={handleOwnerLogin} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Owner / Manager Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
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
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <span>{loading ? "Signing in..." : "Sign In to Manager Dashboard"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Owner Demo Accounts */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ⚡ Quick Manager Demo Logins:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => quickOwnerLogin("owner@riddhi.com")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition-all"
                    >
                      <p className="text-[11px] font-bold text-white truncate">Riddhi Owner</p>
                      <p className="text-[9px] text-blue-400 font-semibold">owner@riddhi.com</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => quickOwnerLogin("manager@riddhi.com")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition-all"
                    >
                      <p className="text-[11px] font-bold text-white truncate">Riddhi Manager</p>
                      <p className="text-[9px] text-emerald-400 font-semibold">manager@riddhi.com</p>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ================= MODE 2: TENANT / RESIDENT LOGIN ================= */}
            {loginMode === "tenant" && (
              <>
                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-xl border border-slate-800 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-1">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-2.5 text-[9px] uppercase font-bold text-slate-500">
                    Or Mobile / Email
                  </span>
                </div>

                <form onSubmit={handleTenantLogin} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number or Email
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={tenantIdentifier}
                        onChange={(e) => setTenantIdentifier(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                        placeholder="+91 9811000000 or rahul@example.com"
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
                        value={tenantPassword}
                        onChange={(e) => setTenantPassword(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <span>{loading ? "Authenticating..." : "Login to Resident Portal"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Tenant Demo Accounts */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ⚡ Quick Resident Demo Logins:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => quickTenantLogin("+919811000000")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition-all"
                    >
                      <p className="text-[11px] font-bold text-white truncate">Rahul Sharma</p>
                      <p className="text-[9px] text-emerald-400 font-semibold">Room 101-A</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => quickTenantLogin("+919811000001")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition-all"
                    >
                      <p className="text-[11px] font-bold text-white truncate">Priya Verma</p>
                      <p className="text-[9px] text-teal-400 font-semibold">Room 102-A</p>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Google Account Selector Modal */}
      {googleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGoogleModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-sm font-bold text-white">Select Google Account</h3>
              </div>
              <button
                onClick={() => setGoogleModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sign in to <strong className="text-white">TeamHub PG Resident Portal</strong>
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleGoogleLoginSelect("rahul.sharma@gmail.com", "Rahul Sharma")}
                className="w-full p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center justify-between transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                    RS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Rahul Sharma</p>
                    <p className="text-[10px] text-slate-400">rahul.sharma@gmail.com</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLoginSelect("priya.verma@gmail.com", "Priya Verma")}
                className="w-full p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center justify-between transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                    PV
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Priya Verma</p>
                    <p className="text-[10px] text-slate-400">priya.verma@gmail.com</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
