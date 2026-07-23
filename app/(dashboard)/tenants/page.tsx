"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Bed,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/tenants?status=${statusFilter}&query=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setTenants(json.data.tenants || []);
      }
    } catch (e) {
      console.error("Failed to load tenants", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tenants Directory
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
              {tenants.length} Residents
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage active residents, upcoming bookings, and stay histories</p>
        </div>

        <Link
          href="/tenants/new"
          className="btn-teamhub text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Tenant</span>
        </Link>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant name, phone, room or ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
          {["all", "active", "upcoming", "vacated"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider text-[10px] transition-all whitespace-nowrap ${
                statusFilter === st ? "bg-gradient-to-r from-emerald-500 to-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* TeamHub Tenants Data Table */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
          <span>Loading tenants list...</span>
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No tenants found</p>
          <p className="text-xs text-slate-500 mt-1">Add your first tenant to assign them to a room or bed.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Tenant Name</th>
                  <th className="py-4 px-6">Phone (E.164)</th>
                  <th className="py-4 px-6">Room / Bed</th>
                  <th className="py-4 px-6">Move-In Date</th>
                  <th className="py-4 px-6">Agreed Rent</th>
                  <th className="py-4 px-6">ID Proof</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                {tenants.map((tenant) => {
                  const activeAllotment = tenant.allotments?.find((a: any) => a.status === "active" || a.status === "reserved" || a.status === "on_notice");

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-bold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white font-bold flex items-center justify-center border border-emerald-500/30 shadow-sm shrink-0">
                            {tenant.full_name.charAt(0)}
                          </div>
                          <div>
                            <Link href={`/tenants/${tenant.id}`} className="hover:text-emerald-400 transition-colors">
                              {tenant.full_name}
                            </Link>
                            <span className="block text-[11px] text-slate-400 font-normal">{tenant.email || "No email"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-emerald-400 font-bold">
                        {tenant.phone}
                      </td>

                      <td className="py-4 px-6">
                        {activeAllotment ? (
                          <div className="flex items-center gap-1.5">
                            <Bed className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-bold text-white">
                              Room {activeAllotment.room?.room_number} ({activeAllotment.bed?.bed_label})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Not Assigned</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-slate-300">
                        {activeAllotment?.move_in_date
                          ? new Date(activeAllotment.move_in_date).toLocaleDateString()
                          : "N/A"}
                      </td>

                      <td className="py-4 px-6 font-bold text-white">
                        {activeAllotment ? `₹${activeAllotment.agreed_rent?.toLocaleString()}` : "N/A"}
                      </td>

                      <td className="py-4 px-6 uppercase text-[11px] text-slate-400">
                        {tenant.id_proof_type || "N/A"}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border ${
                            tenant.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : tenant.status === "on_notice"
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                              : tenant.status === "upcoming"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1 transition-all text-xs font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
