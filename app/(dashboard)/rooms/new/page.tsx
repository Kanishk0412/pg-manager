"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Sparkles,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Layers
} from "lucide-react";

export default function NewRoomPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "csv">("bulk");

  // Single Room State
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("Ground");
  const [sharingType, setSharingType] = useState("Single");
  const [capacity, setCapacity] = useState(1);
  const [rent, setRent] = useState(8000);
  const [meterNumber, setMeterNumber] = useState("");

  // Bulk Generator State
  const [roomsPerFloor, setRoomsPerFloor] = useState(15);
  const [bulkSharing, setBulkSharing] = useState("Single");
  const [bulkRent, setBulkRent] = useState(8000);
  const [floorsInput, setFloorsInput] = useState([
    { label: "Basement", prefix: "B", checked: false },
    { label: "Ground", prefix: "G", checked: true },
    { label: "1st Floor", prefix: "1", checked: true },
    { label: "2nd Floor", prefix: "2", checked: true },
    { label: "3rd Floor", prefix: "3", checked: false },
    { label: "4th Floor", prefix: "4", checked: false },
  ]);

  // Custom Floor Input State
  const [customFloorLabel, setCustomFloorLabel] = useState("");
  const [customFloorPrefix, setCustomFloorPrefix] = useState("");
  const [showAddCustomFloor, setShowAddCustomFloor] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_single",
          roomNumber,
          floor,
          sharingType,
          capacity,
          rent,
          meterNumber: meterNumber || `MTR-${roomNumber}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create room");
      }

      setSuccess(`Room ${roomNumber} created successfully!`);
      setTimeout(() => router.push("/rooms"), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const selectedFloors = floorsInput.filter((f) => f.checked);
    if (selectedFloors.length === 0) {
      setError("Please select at least one floor to generate.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_generate",
          floors: selectedFloors,
          roomsPerFloor,
          defaultSharing: bulkSharing,
          defaultRent: bulkRent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to bulk generate rooms");
      }

      setSuccess(`Successfully generated ${json.data.count} rooms and beds!`);
      setTimeout(() => router.push("/rooms"), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/rooms"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Add Rooms & Setup Capacity</h1>
            <p className="text-sm text-slate-400 mt-0.5">Quickly setup single rooms or bulk-generate entire property floors</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "bulk"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Quick Bulk Generator</span>
        </button>

        <button
          onClick={() => setActiveTab("single")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "single"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Single Room Add</span>
        </button>

        <button
          onClick={() => setActiveTab("csv")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "csv"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>CSV Import</span>
        </button>
      </div>

      {/* Feedback Messages */}
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

      {/* Tab 1: Bulk Generator */}
      {activeTab === "bulk" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">Generate Property Rooms in Seconds</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select floors and rooms count. All rooms and beds will be created with automatic numbering and bed labels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Select Floors to Generate
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomFloor(!showAddCustomFloor)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Custom Floor</span>
                </button>
              </div>

              {/* Add Custom Floor Form */}
              {showAddCustomFloor && (
                <div className="mb-3 bg-slate-950 p-3 rounded-xl border border-emerald-500/30 space-y-2">
                  <span className="text-xs font-semibold text-emerald-400">Add New Floor (e.g. Basement 2, Penthouse)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Floor Label (e.g. Basement)"
                      value={customFloorLabel}
                      onChange={(e) => setCustomFloorLabel(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Prefix (e.g. B)"
                      value={customFloorPrefix}
                      onChange={(e) => setCustomFloorPrefix(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!customFloorLabel.trim()) return;
                      const pref = customFloorPrefix.trim() || customFloorLabel.charAt(0).toUpperCase();
                      setFloorsInput([...floorsInput, { label: customFloorLabel.trim(), prefix: pref, checked: true }]);
                      setCustomFloorLabel("");
                      setCustomFloorPrefix("");
                      setShowAddCustomFloor(false);
                    }}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Add Floor to Generator
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {floorsInput.map((f, idx) => (
                  <label key={f.label} className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                    <input
                      type="checkbox"
                      checked={f.checked}
                      onChange={(e) => {
                        const copy = [...floorsInput];
                        copy[idx].checked = e.target.checked;
                        setFloorsInput(copy);
                      }}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="text-sm font-semibold text-white">{f.label}</span>
                    <span className="text-xs text-slate-500 ml-auto">(Prefix: {f.prefix})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Rooms per Floor
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={roomsPerFloor}
                  onChange={(e) => setRoomsPerFloor(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Default Sharing Type
                </label>
                <select
                  value={bulkSharing}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkSharing(val);
                    setBulkRent(val === "Single" ? 8000 : val === "Double" ? 6000 : 5000);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Single">Single Sharing (1 Bed)</option>
                  <option value="Double">Double Sharing (2 Beds)</option>
                  <option value="Triple">Triple Sharing (3 Beds)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Rent per Bed (₹)
                </label>
                <input
                  type="number"
                  value={bulkRent}
                  onChange={(e) => setBulkRent(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleBulkSubmit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Generating Rooms..." : "Confirm & Bulk Generate Rooms"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Single Room */}
      {activeTab === "single" && (
        <form onSubmit={handleSingleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Room Number (e.g. B01, 203) *
              </label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. B01 or 203"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Floor Label *
              </label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Basement">Basement</option>
                <option value="Lower Basement">Lower Basement</option>
                <option value="Ground">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
                <option value="3rd Floor">3rd Floor</option>
                <option value="4th Floor">4th Floor</option>
                <option value="5th Floor">5th Floor</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Sharing Type
              </label>
              <select
                value={sharingType}
                onChange={(e) => {
                  const val = e.target.value;
                  setSharingType(val);
                  const newCap = val === "Single" ? 1 : val === "Double" ? 2 : 3;
                  setCapacity(newCap);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Single">Single Sharing</option>
                <option value="Double">Double Sharing</option>
                <option value="Triple">Triple Sharing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Capacity (Number of Beds)
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Rent per Bed (₹)
              </label>
              <input
                type="number"
                value={rent}
                onChange={(e) => setRent(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Electricity Meter Number
              </label>
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="e.g. MTR-203"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? "Creating..." : "Create Room & Auto-Generate Beds"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: CSV Import */}
      {activeTab === "csv" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-4 py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <Upload className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-white">Import Rooms via CSV</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Upload a standard CSV file with columns: <code className="text-emerald-400">room_number, floor, sharing_type, capacity, rent_per_bed, meter_number</code>.
          </p>
          <div className="pt-4">
            <button
              onClick={() => alert("CSV Import demo template ready. Use Quick Generator or Single Add for instant test.")}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs border border-slate-700"
            >
              Download CSV Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
