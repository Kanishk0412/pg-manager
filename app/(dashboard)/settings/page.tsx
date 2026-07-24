"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Building,
  Zap,
  Tag,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Layers,
  Trash2
} from "lucide-react";

export default function SettingsPage() {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"branding" | "billing" | "floors" | "charges">("branding");

  // Floor Labels state
  const [floorLabels, setFloorLabels] = useState<string[]>(["Basement", "Ground", "1st Floor", "2nd Floor", "3rd Floor"]);
  const [newFloorName, setNewFloorName] = useState("");

  // Branding state
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [code, setCode] = useState("");
  const [brandColor, setBrandColor] = useState("#16a34a");

  // Billing state
  const [electricityRate, setElectricityRate] = useState(10);
  const [billDay, setBillDay] = useState(1);
  const [dueDay, setDueDay] = useState(5);
  const [lateFeeAmount, setLateFeeAmount] = useState(200);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(5);

  // Charge Heads state
  const [chargeHeads, setChargeHeads] = useState<any[]>([]);
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadAmount, setNewHeadAmount] = useState(500);
  const [newHeadType, setNewHeadType] = useState("recurring_monthly");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settings");
      const json = await res.json();
      if (json.success && json.data.property) {
        const prop = json.data.property;
        setProperty(prop);
        setName(prop.name);
        setLegalName(prop.legal_name || "");
        setCode(prop.code);
        setBrandColor(prop.brand_color || "#16a34a");

        if (prop.settings) {
          setElectricityRate(prop.settings.electricity_rate_per_unit || 10);
          setBillDay(prop.settings.bill_generation_day || 1);
          setDueDay(prop.settings.payment_due_day || 5);
          setLateFeeAmount(prop.settings.late_fee_amount || 200);
          setLateFeeGraceDays(prop.settings.late_fee_grace_days || 5);

          if (prop.settings.floor_labels) {
            try {
              const parsed = typeof prop.settings.floor_labels === "string"
                ? JSON.parse(prop.settings.floor_labels)
                : prop.settings.floor_labels;
              if (Array.isArray(parsed) && parsed.length > 0) {
                setFloorLabels(parsed);
              }
            } catch (e) {}
          }
        }

        setChargeHeads(prop.charge_heads || []);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          name,
          legalName,
          code,
          brandColor,
          electricityRate,
          billDay,
          dueDay,
          lateFeeAmount,
          lateFeeGraceDays,
          floorLabels,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save settings");
      }

      setSuccess("Property settings updated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleChargeHead = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/v1/charge-heads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_active",
          chargeHeadId: id,
          isActive: !currentActive,
        }),
      });
      if (res.ok) fetchSettings();
    } catch (e) {
      console.error("Toggle charge head error", e);
    }
  };

  const handleAddChargeHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName) return;

    try {
      const res = await fetch("/api/v1/charge-heads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          propertyId: property.id,
          name: newHeadName,
          type: newHeadType,
          defaultAmount: newHeadAmount,
        }),
      });
      if (res.ok) {
        setNewHeadName("");
        fetchSettings();
      }
    } catch (e) {
      console.error("Add charge head error", e);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-emerald-500" />
          White-Label Property Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure branding, electricity rates, billing defaults, and recurring charge heads for {property?.name}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold overflow-x-auto max-w-full whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab("branding")}
          className={`flex-none py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "branding" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Building className="w-4 h-4 shrink-0" />
          <span>Branding & Property Info</span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`flex-none py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "billing" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>Billing & Electricity Config</span>
        </button>

        <button
          onClick={() => setActiveTab("floors")}
          className={`flex-none py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "floors" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>Floors & Structure ({floorLabels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("charges")}
          className={`flex-none py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === "charges" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Tag className="w-4 h-4 shrink-0" />
          <span>Charge Heads Manager ({chargeHeads.length})</span>
        </button>
      </div>

      {/* Tab 1: Branding */}
      {activeTab === "branding" && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Property Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Property Code (Invoice Prefix) *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Legal / Registered Business Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-10 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-sm font-mono text-slate-300">{brandColor}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Property Branding"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Billing & Electricity */}
      {activeTab === "billing" && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Electricity Rate per Unit (₹)
              </label>
              <input
                type="number"
                step="0.5"
                value={electricityRate}
                onChange={(e) => setElectricityRate(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Bill Generation Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={billDay}
                onChange={(e) => setBillDay(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Payment Due Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Late Fee Amount (₹)
              </label>
              <input
                type="number"
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Billing Settings"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Charge Heads */}
      {activeTab === "charges" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Configurable Charge Heads</h2>
              <p className="text-xs text-slate-400 mt-0.5">Activate or deactivate property charges without any code changes</p>
            </div>
          </div>

          {/* Charge Heads Table */}
          <div className="space-y-3">
            {chargeHeads.map((head) => (
              <div
                key={head.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{head.name}</span>
                    {head.is_system && (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase font-bold rounded">
                        System Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Type: {head.type} · Applies To: {head.applies_to} · Default: ₹{head.default_amount}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${head.is_active ? "text-emerald-400" : "text-slate-500"}`}>
                    {head.is_active ? "Active" : "Inactive"}
                  </span>
                  {!head.is_system && (
                    <button
                      onClick={() => toggleChargeHead(head.id, head.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        head.is_active ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {head.is_active ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Charge Head Form */}
          <form onSubmit={handleAddChargeHead} className="pt-6 border-t border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Custom Charge Head</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                required
                value={newHeadName}
                onChange={(e) => setNewHeadName(e.target.value)}
                placeholder="Charge Name (e.g. WiFi, Mess, Laundry)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />

              <select
                value={newHeadType}
                onChange={(e) => setNewHeadType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="recurring_monthly">Recurring Monthly</option>
                <option value="one_time">One Time</option>
              </select>

              <input
                type="number"
                value={newHeadAmount}
                onChange={(e) => setNewHeadAmount(parseFloat(e.target.value))}
                placeholder="Default Amount (₹)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Charge Head</span>
              </button>
          </form>
        </div>
      )}

      {/* Tab 3: Floors & Structure */}
      {activeTab === "floors" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" /> Building Floors & Structure Config
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Define building floors (Basement, Ground, 1st, 2nd, etc.) for room allocation and board navigation</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Floor Structure"}</span>
            </button>
          </div>

          {/* Active Floors List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Building Floors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {floorLabels.map((fl, idx) => (
                <div key={fl} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-semibold text-white">{fl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFloorLabels(floorLabels.filter((_, i) => i !== idx));
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Remove floor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Floor Input */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Floor (e.g. Basement, Penthouse, 5th Floor)</h3>
            <div className="flex items-center gap-3 max-w-md">
              <input
                type="text"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="Floor Label (e.g. Basement 2)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newFloorName.trim()) return;
                  if (!floorLabels.includes(newFloorName.trim())) {
                    setFloorLabels([...floorLabels, newFloorName.trim()]);
                  }
                  setNewFloorName("");
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Floor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
