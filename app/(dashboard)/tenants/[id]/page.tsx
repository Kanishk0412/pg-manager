"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  FileText,
  CreditCard,
  MessageSquare,
  History,
  ArrowLeft,
  RefreshCw,
  Bed,
  Building
} from "lucide-react";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "stay" | "invoices" | "payments" | "messages">("profile");

  useEffect(() => {
    fetch(`/api/v1/tenants/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTenant(json.data.tenant);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
        <span>Loading tenant profile...</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>Tenant not found.</p>
        <Link href="/tenants" className="text-emerald-400 text-xs hover:underline mt-2 inline-block">
          Return to Tenants directory
        </Link>
      </div>
    );
  }

  const activeAllotment = tenant.allotments?.find((a: any) => a.status === "active" || a.status === "reserved");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/tenants"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{tenant.full_name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  tenant.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-400"
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{tenant.phone} · {tenant.email || "No email"}</p>
          </div>
        </div>

        {activeAllotment?.room && (
          <div className="bg-slate-900 border border-emerald-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Bed className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Bed</span>
              <span className="text-xs font-bold text-white">
                Room {activeAllotment.room.room_number} (Bed {activeAllotment.bed?.bed_label})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "profile" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Details</span>
        </button>

        <button
          onClick={() => setActiveTab("stay")}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "stay" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stay History ({tenant.allotments?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "invoices" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices ({tenant.invoices?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "payments" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments ({tenant.payments?.length || 0})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "profile" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Personal & Contact Info
              </h3>
              <div className="space-y-2 text-xs">
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="font-semibold text-white">{tenant.full_name}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Phone (E.164):</span>
                  <span className="font-mono text-emerald-400">{tenant.phone}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-200">{tenant.email || "N/A"}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Gender:</span>
                  <span className="text-slate-200">{tenant.gender || "N/A"}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Occupation:</span>
                  <span className="text-slate-200">{tenant.occupation || "N/A"}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Identity & Emergency Contact
              </h3>
              <div className="space-y-2 text-xs">
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">ID Proof Type:</span>
                  <span className="uppercase text-slate-200">{tenant.id_proof_type}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">ID Proof Number:</span>
                  <span className="font-mono text-white">{tenant.id_proof_number || "N/A"}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Emergency Contact:</span>
                  <span className="text-slate-200">{tenant.emergency_contact_name || "N/A"}</span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Emergency Phone:</span>
                  <span className="font-mono text-slate-300">{tenant.emergency_contact_phone || "N/A"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "stay" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Tenancy Allotments History
          </h3>

          <div className="space-y-3">
            {tenant.allotments?.map((a: any) => (
              <div key={a.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white text-sm">
                    Room {a.room?.room_number} (Bed {a.bed?.bed_label})
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Move-in: {new Date(a.move_in_date).toLocaleDateString()} · Agreed Rent: ₹{a.agreed_rent?.toLocaleString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg uppercase font-bold text-[10px]">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Tenant Invoices
          </h3>

          <div className="space-y-3 text-xs">
            {tenant.invoices?.map((inv: any) => (
              <div key={inv.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{inv.invoice_number}</p>
                  <p className="text-slate-400 text-[11px]">
                    Billing Month: {new Date(inv.billing_month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-sm block">₹{inv.total_amount?.toLocaleString()}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Payment Receipts
          </h3>

          <div className="space-y-3 text-xs">
            {tenant.payments?.map((p: any) => (
              <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-400">{p.receipt_number}</p>
                  <p className="text-slate-400 text-[11px]">Paid via {p.payment_method?.toUpperCase()} · Txn: {p.reference_number || "N/A"}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-sm">₹{p.amount?.toLocaleString()}</span>
                  <span className="block text-[10px] text-slate-500">{new Date(p.paid_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
