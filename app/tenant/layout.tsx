"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CreditCard,
  Wrench,
  Wifi,
  LogOut,
  Building2,
  FileText,
  User,
  Sparkles,
  Shield
} from "lucide-react";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.user) {
          setSessionUser(data.data.user);
        } else {
          // If no active session, allow tenant page access with fallback resident
          setSessionUser({
            fullName: "Rahul Sharma",
            email: "rahul@example.com",
            role: "tenant",
            roomNumber: "101",
            bedLabel: "A",
          });
        }
      })
      .catch(() => {
        setSessionUser({
          fullName: "Rahul Sharma",
          email: "rahul@example.com",
          role: "tenant",
          roomNumber: "101",
          bedLabel: "A",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/tenant/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/tenant/dashboard", icon: Home },
    { label: "Pay Rent", href: "/tenant/dashboard#pay", icon: CreditCard },
    { label: "Complaints", href: "/tenant/dashboard#complaints", icon: Wrench },
    { label: "Wi-Fi & Rules", href: "/tenant/dashboard#wifi", icon: Wifi },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center text-white animate-bounce shadow-lg shadow-emerald-500/30">
            <Home className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">Loading Resident Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col pb-20 md:pb-0">
      {/* Top Mobile & Desktop Sticky Header with Mobile Notch Safe Area Padding */}
      <header className="sticky top-0 z-40 bg-[#070b14]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top,16px)+8px)] pb-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-400 via-teal-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white tracking-tight leading-tight">Riddhi Residency</h1>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
                Room 101-A
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Resident: {sessionUser?.fullName || "Rahul Sharma"}</p>
          </div>
        </div>

        {/* Desktop Links & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-2"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 rounded-xl transition-all shadow-md"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {children}
      </main>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-emerald-400 bg-emerald-500/10 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
