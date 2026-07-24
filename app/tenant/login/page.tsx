"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Home
} from "lucide-react";

export default function TenantLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/tenant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Login failed. Please check your details.");
      }

      router.push("/tenant/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSelect = async (email: string, name: string) => {
    setError("");
    setLoading(true);
    setGoogleModalOpen(false);

    try {
      const res = await fetch("/api/auth/tenant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGoogleLogin: true,
          googleEmail: email,
          googleName: name,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Google Authentication failed.");
      }

      router.push("/tenant/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = (phone: string) => {
    setIdentifier(phone);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="pt-[calc(env(safe-area-inset-top,12px)+4px)] pb-4 flex items-center justify-between z-10 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-400 via-teal-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-white tracking-tight">TeamHub</h1>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase border border-emerald-500/30">Resident</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Tenant Portal & Services</p>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl transition-all"
        >
          PG Owner Portal →
        </Link>
      </header>

      {/* Login Card */}
      <main className="my-auto py-6 z-10 max-w-md mx-auto w-full">
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Resident Access
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight pt-2">Welcome Back!</h2>
            <p className="text-xs text-slate-400">Sign in to pay rent, view Wi-Fi, and request PG services</p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Google OAuth Button */}
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl border border-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
          >
            {/* Official Google Color SVG Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Or Mobile / Email
            </span>
          </div>

          {/* 2. Standard Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Phone Number or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. +91 9811000000 or rahul@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold cursor-pointer hover:underline">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:opacity-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Resident...</span>
              ) : (
                <>
                  <span>Login to Resident Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              ⚡ 1-Click Resident Demo Logins:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickDemoLogin("+919811000000")}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all"
              >
                <p className="text-[11px] font-bold text-white truncate">Rahul Sharma</p>
                <p className="text-[9px] text-emerald-400 font-semibold">Room 101-A (Active)</p>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin("+919811000001")}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all"
              >
                <p className="text-[11px] font-bold text-white truncate">Priya Verma</p>
                <p className="text-[9px] text-teal-400 font-semibold">Room 102-A (Active)</p>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 text-center py-2">
        <p className="text-[10px] text-slate-500 font-medium">
          Protected by TeamHub PG Safe-Key Security • Need help? Contact your PG Owner
        </p>
      </footer>

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
                <h3 className="text-sm font-bold text-white">Choose a Google Account</h3>
              </div>
              <button
                onClick={() => setGoogleModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an account to sign in to <strong className="text-white">TeamHub PG Resident Portal</strong>
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
                <ChevronRightIcon />
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
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
