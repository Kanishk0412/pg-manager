"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowLeft, AlertTriangle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GenerateInvoicesPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthValue());
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const runPreview = async () => {
    setLoading(true);
    setError("");
    setDone("");
    setPreview(null);
    try {
      const res = await fetch("/api/v1/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, preview: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to preview");
      setPreview(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/v1/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, preview: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to generate");
      setDone(`Generated ${json.data.created} invoices.`);
      setTimeout(() => router.push("/invoices"), 1400);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Generate Bills</h1>
          <p className="text-sm text-slate-400 mt-0.5">Preview monthly invoices, then confirm to issue them.</p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Billing Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPreview(null); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={runPreview}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{loading ? "Computing…" : "Preview Bills"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {done && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> <span>{done}</span>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Eligible" value={preview.summary.eligible} />
            <Stat label="Skipped" value={preview.summary.skipped} hint="already billed / ₹0" />
            <Stat label="Total ₹" value={`₹${preview.summary.totalBilled.toLocaleString()}`} />
            <Stat label="Rooms w/o meter" value={preview.missingMeterRooms} warn={preview.missingMeterRooms > 0} />
          </div>

          {preview.missingMeterRooms > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{preview.missingMeterRooms} occupied room(s) have no meter reading for this month — electricity will be omitted from those bills. Enter readings first if needed.</span>
            </div>
          )}

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 uppercase bg-slate-950/60">
                  <tr>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Room/Bed</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Tax</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.invoices.map((inv: any) => (
                    <tr key={inv.allotment_id} className={`border-t border-slate-800/60 ${inv.alreadyBilled ? "opacity-50" : ""}`}>
                      <td className="py-2.5 px-4 font-semibold text-white">{inv.tenant_name}</td>
                      <td className="py-2.5 px-4 text-slate-400">{inv.room_number}-{inv.bed_label}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-300">₹{inv.subtotal.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400">₹{inv.taxAmount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">₹{inv.total.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-[10px] uppercase font-bold ${inv.alreadyBilled ? "text-slate-500" : "text-emerald-400"}`}>
                          {inv.alreadyBilled ? "Billed" : "New"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={confirm}
              disabled={confirming || preview.summary.eligible === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>{confirming ? "Generating…" : `Confirm & Issue ${preview.summary.eligible} Invoices`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: any; hint?: string; warn?: boolean }) {
  return (
    <div className={`bg-slate-900/90 border rounded-2xl p-4 ${warn ? "border-amber-500/40" : "border-slate-800"}`}>
      <div className={`text-2xl font-bold ${warn ? "text-amber-400" : "text-white"}`}>{value}</div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">{label}</div>
      {hint && <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}
