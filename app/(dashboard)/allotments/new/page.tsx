"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Bed, Building, User } from "lucide-react";

function AssignBedForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTenantId = searchParams.get("tenantId") || "";
  const initialRoomId = searchParams.get("roomId") || "";

  const [tenants, setTenants] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId);
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split("T")[0]);
  const [agreedRent, setAgreedRent] = useState(6000);
  const [securityDeposit, setSecurityDeposit] = useState(6000);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Load unassigned/active tenants
    fetch("/api/v1/tenants")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTenants(json.data.tenants || []);
      });

    // Load rooms and beds
    fetch("/api/v1/rooms")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setRooms(json.data.rooms || []);
          if (initialRoomId) {
            const r = json.data.rooms.find((rm: any) => rm.id === initialRoomId);
            if (r) {
              setAgreedRent(r.default_rent || 6000);
              setSecurityDeposit(r.default_rent || 6000);
              const vacantBed = r.beds.find((b: any) => b.status === "vacant");
              if (vacantBed) setSelectedBedId(vacantBed.id);
            }
          }
        }
      })
      .finally(() => setLoadingRooms(false));
  }, [initialRoomId]);

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setAgreedRent(room.default_rent || 6000);
      setSecurityDeposit(room.default_rent || 6000);
      const vacantBed = room.beds?.find((b: any) => b.status === "vacant");
      setSelectedBedId(vacantBed ? vacantBed.id : "");
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const vacantBeds = selectedRoom?.beds?.filter((b: any) => b.status === "vacant") || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/allotments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          roomId: selectedRoomId,
          bedId: selectedBedId,
          moveInDate,
          agreedRent,
          securityDeposit,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to allot bed");
      }

      setSuccess("Bed assigned successfully!");
      setTimeout(() => router.push("/rooms"), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/rooms"
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Assign Bed / Bed Allotment</h1>
          <p className="text-sm text-slate-400 mt-0.5">Assign an active resident to an available vacant bed</p>
        </div>
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

      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Tenant *
            </label>
            <select
              required
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose Tenant --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.phone})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Need a new tenant?{" "}
              <Link href="/tenants/new" className="text-emerald-400 hover:underline">
                Register new tenant first
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Room *
              </label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose Room --</option>
                {rooms.map((r) => {
                  const vacCount = r.beds?.filter((b: any) => b.status === "vacant").length || 0;
                  return (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} ({r.floor} · {vacCount} vacant beds)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Vacant Bed *
              </label>
              <select
                required
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Vacant Bed --</option>
                {vacantBeds.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    Bed {b.bed_label} (Vacant)
                  </option>
                ))}
              </select>
              {selectedRoomId && vacantBeds.length === 0 && (
                <p className="text-xs text-red-400 mt-1">This room has no vacant beds available.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Move-In Date *
              </label>
              <input
                type="date"
                required
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Agreed Monthly Rent (₹) *
              </label>
              <input
                type="number"
                required
                value={agreedRent}
                onChange={(e) => setAgreedRent(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Security Deposit Amount (₹)
              </label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !selectedBedId}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? "Assigning..." : "Confirm & Assign Bed"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewAllotmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading form...</div>}>
      <AssignBedForm />
    </Suspense>
  );
}
