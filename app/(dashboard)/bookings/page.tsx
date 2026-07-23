"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Building,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  X,
  BellRing,
  LogOut as LogOutIcon,
  Info,
} from "lucide-react";

interface Allotment {
  id: string;
  tenant: { id: string; full_name: string; phone: string };
  room: { id: string; room_number: string; floor: string };
  bed: { id: string; bed_label: string };
  status: string;
  move_in_date: string;
  expected_move_out_date: string | null;
  actual_move_out_date: string | null;
  notice_given_date: string | null;
  agreed_rent: number;
  booking_date: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", bar: "bg-emerald-500" },
  reserved: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", bar: "bg-amber-500" },
  on_notice: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", bar: "bg-orange-500" },
  vacated: { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-600/30", bar: "bg-slate-600" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", bar: "bg-red-500" },
};

export default function BookingsCalendarPage() {
  const [allotments, setAllotments] = useState<Allotment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedAllotment, setSelectedAllotment] = useState<Allotment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Action state
  const [actionModal, setActionModal] = useState<"notice" | "vacate" | "transfer" | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Notice form
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split("T")[0]);

  // Vacate form
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().split("T")[0]);
  const [deductions, setDeductions] = useState("0");
  const [deductionNotes, setDeductionNotes] = useState("");
  const [settlement, setSettlement] = useState<any>(null);

  // Transfer form
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [transferRoomId, setTransferRoomId] = useState("");
  const [transferBedId, setTransferBedId] = useState("");
  const [transferRent, setTransferRent] = useState("");

  const fetchAllotments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/rooms");
      const json = await res.json();
      if (json.success) {
        setRooms(json.data.rooms || []);
      }
      // Fetch all allotments via a different approach - get from rooms data
      // Since we need all allotments including vacated, let's get them directly
      // We'll reconstruct from room data for now and merge
    } catch (e) {
      console.error("Failed to load rooms", e);
    }
    try {
      const res = await fetch("/api/v1/allotments");
      const json = await res.json();
      // The current endpoint doesn't have a GET - let's use rooms data
    } catch {}
    setLoading(false);
  };

  const fetchAllAllotments = async () => {
    setLoading(true);
    try {
      // Get rooms with allotments
      const res = await fetch("/api/v1/rooms");
      const json = await res.json();
      if (json.success) {
        setRooms(json.data.rooms || []);
        // Extract allotments from room data
        const allAllotments: Allotment[] = [];
        for (const room of json.data.rooms || []) {
          for (const bed of room.beds || []) {
            for (const allotment of bed.allotments || []) {
              allAllotments.push({
                ...allotment,
                room: { id: room.id, room_number: room.room_number, floor: room.floor },
                bed: { id: bed.id, bed_label: bed.bed_label },
              });
            }
          }
        }
        setAllotments(allAllotments);
      }
    } catch (e) {
      console.error("Failed to load bookings", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllAllotments();
  }, []);

  // Calendar computation
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const monthName = currentMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Filter allotments visible in the current month
  const filteredAllotments = useMemo(() => {
    const monthStart = currentMonth;
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    return allotments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      const moveIn = new Date(a.move_in_date);
      const moveOut = a.actual_move_out_date
        ? new Date(a.actual_move_out_date)
        : a.expected_move_out_date
        ? new Date(a.expected_move_out_date)
        : new Date(monthEnd.getFullYear() + 1, 0, 1); // far future if open-ended

      // Check if allotment overlaps with current month
      return moveIn <= monthEnd && moveOut >= monthStart;
    });
  }, [allotments, currentMonth, statusFilter]);

  // Group allotments by room-bed
  const groupedByBed = useMemo(() => {
    const groups = new Map<string, { room: string; bed: string; floor: string; allotments: Allotment[] }>();

    for (const a of filteredAllotments) {
      const key = `${a.room.room_number}-${a.bed.bed_label}`;
      if (!groups.has(key)) {
        groups.set(key, { room: a.room.room_number, bed: a.bed.bed_label, floor: a.room.floor, allotments: [] });
      }
      groups.get(key)!.allotments.push(a);
    }

    // Sort by room number
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filteredAllotments]);

  // Compute bar position for an allotment within the month
  const getBarStyle = (allotment: Allotment) => {
    const monthStart = currentMonth;
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const moveIn = new Date(allotment.move_in_date);
    const moveOut = allotment.actual_move_out_date
      ? new Date(allotment.actual_move_out_date)
      : allotment.expected_move_out_date
      ? new Date(allotment.expected_move_out_date)
      : monthEnd;

    const startDay = Math.max(1, moveIn <= monthStart ? 1 : moveIn.getDate());
    const endDay = Math.min(daysInMonth, moveOut >= monthEnd ? daysInMonth : moveOut.getDate());

    const left = ((startDay - 1) / daysInMonth) * 100;
    const width = ((endDay - startDay + 1) / daysInMonth) * 100;

    const colors = STATUS_COLORS[allotment.status] || STATUS_COLORS.active;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%`, // min 2% to be visible
      className: colors.bar,
    };
  };

  // Action handlers
  const handleGiveNotice = async () => {
    if (!selectedAllotment) return;
    setActionProcessing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/v1/allotments/${selectedAllotment.id}/notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeDate }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Notice given. Expected move-out: ${json.data.expectedMoveOutDate}`);
        setActionModal(null);
        await fetchAllAllotments();
        setDetailOpen(false);
        setSelectedAllotment(null);
      } else {
        setActionError(json.error?.message || "Failed to give notice");
      }
    } catch (e: any) {
      setActionError(e.message);
    }
    setActionProcessing(false);
  };

  const handleVacate = async () => {
    if (!selectedAllotment) return;
    setActionProcessing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/v1/allotments/${selectedAllotment.id}/vacate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveOutDate: vacateDate, deductions, deductionNotes }),
      });
      const json = await res.json();
      if (json.success) {
        setSettlement(json.data.settlement);
        setActionSuccess("Tenant vacated successfully");
        await fetchAllAllotments();
      } else {
        setActionError(json.error?.message || "Failed to vacate");
      }
    } catch (e: any) {
      setActionError(e.message);
    }
    setActionProcessing(false);
  };

  const handleTransfer = async () => {
    if (!selectedAllotment) return;
    setActionProcessing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/v1/allotments/${selectedAllotment.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newRoomId: transferRoomId,
          newBedId: transferBedId,
          transferDate,
          newRent: transferRent || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Transferred from ${json.data.previousRoom} → ${json.data.newRoom}`);
        setActionModal(null);
        await fetchAllAllotments();
        setDetailOpen(false);
        setSelectedAllotment(null);
      } else {
        setActionError(json.error?.message || "Failed to transfer");
      }
    } catch (e: any) {
      setActionError(e.message);
    }
    setActionProcessing(false);
  };

  const todayDay = new Date().getDate();
  const isCurrentMonth =
    currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
        <span>Loading bookings calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/15 border border-emerald-500/30 rounded-xl">
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
            Bookings Calendar
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-14">Visualize all bookings, stays, and move-outs across rooms</p>
        </div>
        <button
          onClick={fetchAllAllotments}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl min-w-[200px] text-center">
              <span className="text-sm font-bold text-white">{monthName}</span>
            </div>
            <button onClick={nextMonth} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-400 transition-all">
              Today
            </button>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            {["all", "active", "reserved", "on_notice", "vacated"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all ${
                  statusFilter === s
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700"
                }`}
              >
                {s === "on_notice" ? "On Notice" : s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3">
            {Object.entries(STATUS_COLORS).filter(([k]) => k !== "cancelled").map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.bar}`} />
                <span className="text-[10px] text-slate-500 uppercase font-medium">
                  {status === "on_notice" ? "Notice" : status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="flex border-b border-slate-800">
          <div className="w-28 shrink-0 px-3 py-2.5 bg-slate-950/60 border-r border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Room / Bed</span>
          </div>
          <div className="flex-1 flex">
            {days.map((d) => {
              const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const isToday = isCurrentMonth && d === todayDay;
              return (
                <div
                  key={d}
                  className={`flex-1 py-2.5 text-center border-r border-slate-800/50 last:border-r-0 ${
                    isToday ? "bg-emerald-500/10" : isWeekend ? "bg-slate-950/40" : ""
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? "text-emerald-400" : isWeekend ? "text-slate-600" : "text-slate-500"}`}>
                    {d}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking rows */}
        {groupedByBed.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-medium">No bookings found for this month</p>
            <p className="text-xs text-slate-600 mt-1">Try navigating to a different month or changing the filter</p>
          </div>
        ) : (
          groupedByBed.map(([key, group]) => (
            <div key={key} className="flex border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/20 transition-colors">
              {/* Room label */}
              <div className="w-28 shrink-0 px-3 py-3 bg-slate-950/30 border-r border-slate-800 flex items-center gap-1.5">
                <Building className="w-3 h-3 text-slate-600" />
                <span className="text-xs font-bold text-slate-300">{group.room}-{group.bed}</span>
              </div>

              {/* Timeline bar area */}
              <div className="flex-1 relative py-1.5" style={{ minHeight: "36px" }}>
                {/* Today line */}
                {isCurrentMonth && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-emerald-500/40 z-10"
                    style={{ left: `${((todayDay - 0.5) / daysInMonth) * 100}%` }}
                  />
                )}

                {/* Allotment bars */}
                {group.allotments.map((a) => {
                  const barStyle = getBarStyle(a);
                  const colors = STATUS_COLORS[a.status] || STATUS_COLORS.active;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAllotment(a);
                        setDetailOpen(true);
                        setActionError("");
                        setActionSuccess("");
                        setSettlement(null);
                      }}
                      className={`absolute top-1.5 h-6 rounded-md ${barStyle.className} opacity-80 hover:opacity-100 transition-all cursor-pointer flex items-center px-1.5 overflow-hidden`}
                      style={{ left: barStyle.left, width: barStyle.width }}
                      title={`${a.tenant.full_name} — ${a.status}`}
                    >
                      <span className="text-[9px] font-bold text-white truncate drop-shadow-sm">
                        {a.tenant.full_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Stays", count: allotments.filter((a) => a.status === "active").length, color: "emerald" },
          { label: "Reserved", count: allotments.filter((a) => a.status === "reserved").length, color: "amber" },
          { label: "On Notice", count: allotments.filter((a) => a.status === "on_notice").length, color: "orange" },
          { label: "Vacated", count: allotments.filter((a) => a.status === "vacated").length, color: "slate" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-black text-${s.color}-400`}>{s.count}</p>
            <p className="text-[11px] text-slate-500 font-semibold uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Detail Drawer */}
      {detailOpen && selectedAllotment && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setDetailOpen(false); setActionModal(null); }} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto animate-slide-in-right">
            {/* Drawer header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-5 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedAllotment.tenant.full_name}</h2>
                <p className="text-xs text-slate-400">
                  Room {selectedAllotment.room.room_number}-{selectedAllotment.bed.bed_label}
                </p>
              </div>
              <button onClick={() => { setDetailOpen(false); setActionModal(null); }} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status badge */}
              {(() => {
                const colors = STATUS_COLORS[selectedAllotment.status] || STATUS_COLORS.active;
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} border ${colors.border}`}>
                    <div className={`w-2 h-2 rounded-full ${colors.bar}`} />
                    <span className={`text-xs font-bold uppercase ${colors.text}`}>{selectedAllotment.status.replace("_", " ")}</span>
                  </div>
                );
              })()}

              {/* Details grid */}
              <div className="space-y-3">
                {[
                  { label: "Move-in Date", value: new Date(selectedAllotment.move_in_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                  { label: "Expected Move-out", value: selectedAllotment.expected_move_out_date ? new Date(selectedAllotment.expected_move_out_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Open-ended" },
                  { label: "Agreed Rent", value: `₹${selectedAllotment.agreed_rent.toLocaleString("en-IN")}` },
                  { label: "Booking Date", value: new Date(selectedAllotment.booking_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                  ...(selectedAllotment.notice_given_date ? [{ label: "Notice Given", value: new Date(selectedAllotment.notice_given_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }] : []),
                  ...(selectedAllotment.actual_move_out_date ? [{ label: "Actual Move-out", value: new Date(selectedAllotment.actual_move_out_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-800/50">
                    <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                    <span className="text-xs font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Success/Error messages */}
              {actionSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" /> {actionError}
                </div>
              )}

              {/* Settlement summary (after vacate) */}
              {settlement && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-400" /> Final Settlement
                  </h3>
                  <div className="space-y-1.5">
                    {[
                      { label: "Pro-rated Rent", value: `₹${settlement.proRatedRent?.toLocaleString("en-IN")}`, sub: `${settlement.occupiedDays} of ${settlement.daysInMonth} days` },
                      { label: "Outstanding Dues", value: `₹${settlement.outstandingDues?.toLocaleString("en-IN")}` },
                      { label: "Security Deposit Paid", value: `₹${settlement.securityDepositPaid?.toLocaleString("en-IN")}` },
                      { label: "Deductions", value: `₹${settlement.deductions?.toLocaleString("en-IN")}` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs">
                        <span className="text-slate-400">{item.label}</span>
                        <div className="text-right">
                          <span className="text-white font-medium">{item.value}</span>
                          {item.sub && <p className="text-[10px] text-slate-500">{item.sub}</p>}
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-700 pt-2 mt-2">
                      {settlement.netRefundable > 0 ? (
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-400 font-bold">Refund to Tenant</span>
                          <span className="text-emerald-400 font-bold">₹{settlement.netRefundable.toLocaleString("en-IN")}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-400 font-bold">Payable by Tenant</span>
                          <span className="text-amber-400 font-bold">₹{settlement.netPayableByTenant.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!actionModal && !settlement && (
                <div className="space-y-2">
                  {selectedAllotment.status === "active" && (
                    <>
                      <button
                        onClick={() => { setActionModal("notice"); setActionError(""); setActionSuccess(""); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl text-xs font-bold text-orange-400 transition-all"
                      >
                        <BellRing className="w-4 h-4" /> Give Notice
                      </button>
                      <button
                        onClick={() => { setActionModal("transfer"); setActionError(""); setActionSuccess(""); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 transition-all"
                      >
                        <ArrowRightLeft className="w-4 h-4" /> Transfer Room
                      </button>
                      <button
                        onClick={() => { setActionModal("vacate"); setActionError(""); setActionSuccess(""); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 transition-all"
                      >
                        <LogOutIcon className="w-4 h-4" /> Vacate
                      </button>
                    </>
                  )}
                  {selectedAllotment.status === "on_notice" && (
                    <button
                      onClick={() => { setActionModal("vacate"); setActionError(""); setActionSuccess(""); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 transition-all"
                    >
                      <LogOutIcon className="w-4 h-4" /> Vacate Now
                    </button>
                  )}

                  <Link
                    href={`/tenants/${selectedAllotment.tenant.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                  >
                    <User className="w-4 h-4" /> View Tenant Profile
                  </Link>
                </div>
              )}

              {/* Notice Form */}
              {actionModal === "notice" && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                    <BellRing className="w-4 h-4" /> Give Notice
                  </h3>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Notice Date</label>
                    <input
                      type="date"
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGiveNotice}
                      disabled={actionProcessing}
                      className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      {actionProcessing ? "Processing..." : "Confirm Notice"}
                    </button>
                    <button
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Vacate Form */}
              {actionModal === "vacate" && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                    <LogOutIcon className="w-4 h-4" /> Vacate Tenant
                  </h3>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Move-out Date</label>
                    <input
                      type="date"
                      value={vacateDate}
                      onChange={(e) => setVacateDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Security Deposit Deductions (₹)</label>
                    <input
                      type="number"
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Deduction Notes</label>
                    <input
                      type="text"
                      value={deductionNotes}
                      onChange={(e) => setDeductionNotes(e.target.value)}
                      placeholder="e.g. Damage to furniture"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleVacate}
                      disabled={actionProcessing}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      {actionProcessing ? "Processing..." : "Confirm Vacate"}
                    </button>
                    <button
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Transfer Form */}
              {actionModal === "transfer" && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> Transfer Room
                  </h3>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Transfer Date</label>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">New Room</label>
                    <select
                      value={transferRoomId}
                      onChange={(e) => {
                        setTransferRoomId(e.target.value);
                        setTransferBedId("");
                        const room = rooms.find((r: any) => r.id === e.target.value);
                        if (room) setTransferRent(String(room.default_rent));
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select room...</option>
                      {rooms
                        .filter((r: any) => r.beds?.some((b: any) => b.status === "vacant"))
                        .map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.room_number} ({r.floor} — {r.sharing_type})
                          </option>
                        ))}
                    </select>
                  </div>
                  {transferRoomId && (
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">New Bed</label>
                      <select
                        value={transferBedId}
                        onChange={(e) => setTransferBedId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Select bed...</option>
                        {rooms
                          .find((r: any) => r.id === transferRoomId)
                          ?.beds?.filter((b: any) => b.status === "vacant")
                          .map((b: any) => (
                            <option key={b.id} value={b.id}>
                              Bed {b.bed_label}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">New Rent (₹)</label>
                    <input
                      type="number"
                      value={transferRent}
                      onChange={(e) => setTransferRent(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleTransfer}
                      disabled={actionProcessing || !transferBedId}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      {actionProcessing ? "Processing..." : "Confirm Transfer"}
                    </button>
                    <button
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
