"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, Save, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

type Row = {
  room_id: string;
  room_number: string;
  floor: string;
  meter_number: string | null;
  previous_reading: number;
  current_reading: number | null;
  units_consumed: number | null;
  amount: number | null;
  rate: number;
  saved: boolean;
  // local edit state
  input?: string;
  meterReset?: boolean;
};

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ElectricityPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [rows, setRows] = useState<Row[]>([]);
  const [rate, setRate] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setWarnings([]);
    try {
      const res = await fetch(`/api/v1/meter-readings?month=${month}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load readings");
      setRate(json.data.rate);
      setRows(
        json.data.rows.map((r: Row) => ({
          ...r,
          input: r.current_reading != null ? String(r.current_reading) : "",
          meterReset: false,
        }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (roomId: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.room_id === roomId ? { ...r, ...patch } : r)));
  };

  const computed = (r: Row) => {
    const current = parseFloat(r.input || "");
    if (!Number.isFinite(current)) return { units: null as number | null, amount: null as number | null, invalid: false };
    const units = r.meterReset ? current : current - r.previous_reading;
    const invalid = !r.meterReset && current < r.previous_reading;
    return { units, amount: Math.round(units * r.rate * 100) / 100, invalid };
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    setWarnings([]);
    const readings = rows
      .filter((r) => (r.input || "").trim() !== "")
      .map((r) => ({
        roomId: r.room_id,
        currentReading: r.input,
        previousReading: r.previous_reading,
        meterReset: r.meterReset,
        rate: r.rate,
      }));
    if (readings.length === 0) {
      setError("Enter at least one current reading before saving.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/meter-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, readings }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to save readings");
      setSuccess(`Saved ${json.data.savedCount} readings for ${month}.`);
      if (json.data.warnings?.length) setWarnings(json.data.warnings);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Meter Readings</h1>
            <p className="text-sm text-slate-400 mt-0.5">Enter monthly electricity readings · ₹{rate}/unit</p>
          </div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> <span>{success}</span>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 text-xs space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" /> Loading rooms…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No metered rooms found for this property.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 uppercase bg-slate-950/60">
                <tr>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Meter</th>
                  <th className="py-3 px-4 text-right">Previous</th>
                  <th className="py-3 px-4 text-right">Current</th>
                  <th className="py-3 px-4 text-center">Reset?</th>
                  <th className="py-3 px-4 text-right">Units</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = computed(r);
                  return (
                    <tr key={r.room_id} className="border-t border-slate-800/60">
                      <td className="py-2.5 px-4 font-bold text-white">
                        {r.room_number}
                        <span className="text-slate-500 font-normal ml-1">· {r.floor}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{r.meter_number || "—"}</td>
                      <td className="py-2.5 px-4 text-right text-slate-300 font-mono">{r.previous_reading}</td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          value={r.input}
                          onChange={(e) => updateRow(r.room_id, { input: e.target.value })}
                          placeholder="—"
                          className={`w-24 bg-slate-950 border rounded-lg px-2 py-1.5 text-white text-right font-mono focus:outline-none ${
                            c.invalid ? "border-red-500" : "border-slate-800 focus:border-emerald-500"
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={r.meterReset || false}
                          onChange={(e) => updateRow(r.room_id, { meterReset: e.target.checked })}
                          className="w-4 h-4 accent-amber-500"
                          title="Meter was reset/replaced"
                        />
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono ${c.invalid ? "text-red-400" : "text-slate-200"}`}>
                        {c.invalid ? "invalid" : c.units ?? "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                        {c.amount != null && !c.invalid ? `₹${c.amount.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {r.saved ? (
                          <span className="text-[10px] uppercase font-bold text-emerald-400">Saved</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-slate-500">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving…" : "Save All Readings"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
