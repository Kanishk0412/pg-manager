"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw, ChevronRight } from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/payments")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setPayments(json.data.payments || []);
          setStats(json.data.stats || {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center text-emerald-400">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          <p className="text-sm text-slate-400 mt-0.5">Recorded receipts across the property</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xl font-bold text-white">{stats.count ?? 0}</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Receipts</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xl font-bold text-emerald-400">₹{(stats.totalCollected ?? 0).toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Total Collected</div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" /> Loading…
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No payments recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {payments.map((p) => (
              <Link key={p.id} href={`/payments/${p.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{p.receipt_number}</span>
                    {p.status === "reversed" && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">Reversed</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {p.tenant?.full_name} · {p.payment_method?.toUpperCase()} · {new Date(p.paid_at).toLocaleDateString()}
                    {p.invoice ? ` · ${p.invoice.invoice_number}` : " · Advance"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-bold text-sm ${p.status === "reversed" ? "text-slate-500 line-through" : "text-white"}`}>₹{p.amount.toLocaleString()}</span>
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
