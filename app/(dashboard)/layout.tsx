"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Grid3X3,
  Settings,
  PlusCircle,
  LogOut,
  Shield,
  ChevronRight,
  UserPlus,
  Calendar,
  Menu,
  X,
  Search,
  Bell,
  Sparkles,
  SlidersHorizontal,
  LayoutDashboard,
  Zap,
  FileText,
  CreditCard
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [propertyName, setPropertyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSessionUser(data.data.user);
          setPropertyName(data.data.property?.name || data.data.organizationName || "");
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center text-white animate-bounce shadow-lg shadow-emerald-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">Loading TeamHub PG...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Occupancy Board", shortLabel: "Board", href: "/rooms", icon: Grid3X3 },
    { label: "Bookings Calendar", shortLabel: "Bookings", href: "/bookings", icon: Calendar },
    { label: "Tenants Directory", shortLabel: "Tenants", href: "/tenants", icon: Users },
    { label: "Meter Readings", shortLabel: "Electricity", href: "/electricity", icon: Zap },
    { label: "Invoices", shortLabel: "Invoices", href: "/invoices", icon: FileText },
    { label: "Payments", shortLabel: "Payments", href: "/payments", icon: CreditCard },
    { label: "Add Room / Bulk", shortLabel: "Add Room", href: "/rooms/new", icon: PlusCircle },
    { label: "Assign Bed", shortLabel: "Assign", href: "/allotments/new", icon: UserPlus },
    { label: "Property Settings", shortLabel: "Settings", href: "/settings", icon: Settings },
  ];

  const mobileBottomNavItems = [
    { label: "Board", href: "/rooms", icon: Grid3X3 },
    { label: "Bookings", href: "/bookings", icon: Calendar },
    { label: "Tenants", href: "/tenants", icon: Users },
    { label: "Add Room", href: "/rooms/new", icon: PlusCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full p-4">
      <div>
        {/* TeamHub Dual Green & Blue Logo Badge */}
        <div className="flex items-center gap-3 px-3 py-3.5 mb-6 bg-slate-950/90 border border-slate-800/80 rounded-2xl shadow-xl">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-400 via-teal-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 shrink-0">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-white leading-tight tracking-tight">TeamHub</h1>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase border border-emerald-500/30">PG</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">{propertyName || "Your Property"}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-blue-600/20 text-white border border-emerald-500/30 shadow-md shadow-emerald-500/10"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Card */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
              {sessionUser?.fullName?.charAt(0) || "U"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{sessionUser?.fullName}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>{sessionUser?.role}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col md:flex-row">
      {/* Mobile App Top Header with Mobile Notch Safe Area Padding */}
      <header className="md:hidden sticky top-0 z-40 bg-[#070b14]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 pt-[calc(env(safe-area-inset-top,16px)+8px)] pb-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-emerald-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-tight block leading-tight">TeamHub PG</span>
            <span className="text-[10px] text-emerald-400 font-semibold">{propertyName || "Your Property"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition-all shadow-md active:scale-95"
            aria-label="Toggle Navigation Drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 bg-[#090d16] border-r border-slate-800 h-full z-10 pt-[calc(env(safe-area-inset-top,16px)+8px)]">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#090d16] border-r border-slate-800/80 flex-col justify-between sticky top-0 h-screen shrink-0">
        <SidebarContent />
      </aside>

      {/* Main App Content Area with TeamHub Top Header Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TeamHub Top Header Bar (Desktop/Tablet) */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#090d16]/80 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search rooms, beds, tenants, invoices..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{propertyName || "Your Property"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <button className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-xl relative hover:border-slate-700 transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>

            <Link
              href="/allotments/new"
              className="btn-teamhub text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign Bed</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Native-Like Bottom App Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {mobileBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-emerald-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : ""}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
