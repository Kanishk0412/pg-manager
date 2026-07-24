"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, PlusCircle, RefreshCw, ChevronRight } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  partially_paid: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  sent: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  cancelled: "bg-slate-700/20 text-slate-500 border-slate-700/30",
};

const FILTERS = ["all", "sent", "partially_paid", "paid", "overdue"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/invoices?status=${filter}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setInvoices(json.data.invoices || []);
          setStats(json.data.stats || {});
        }
      })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Invoices</h1>
            <p className="text-sm text-slate-400 mt-0.5">Monthly bills and their payment status</p>
          </div>
        </div>
        <Link
          href="/invoices/generate"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> <span>Generate Bills</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Invoices" value={stats.count ?? 0} />
        <Stat label="Billed" value={`₹${(stats.totalBilled ?? 0).toLocaleString()}`} />
        <Stat label="Collected" value={`₹${(stats.totalCollected ?? 0).toLocaleString()}`} tone="emerald" />
        <Stat label="Outstanding" value={`₹${(stats.totalOutstanding ?? 0).toLocaleString()}`} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
              filter === f ? "bg-emerald-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" /> Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No invoices yet.{" "}
            <Link href="/invoices/generate" className="text-emerald-400 hover:underline">Generate bills</Link> to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{inv.invoice_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>
                      {inv.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {inv.tenant?.full_name} · {inv.room?.room_number}-{inv.bed?.bed_label} ·{" "}
                    {new Date(inv.billing_month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">₹{inv.total_amount.toLocaleString()}</div>
                    {inv.balance_due > 0 && <div className="text-[10px] text-red-400">₹{inv.balance_due.toLocaleString()} due</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "emerald" | "red" }) {
  const color = tone === "emerald" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-white";
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
