"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building,
  Bed,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  Percent,
  Plus,
  RefreshCw,
  X,
  UserPlus,
  Sliders,
  AlertCircle,
  Zap,
  Info,
  CalendarDays,
  ArrowRightLeft,
  BellRing,
  LogOut as LogOutIcon
} from "lucide-react";

export default function OccupancyBoardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Availability date picker
  const [availabilityDate, setAvailabilityDate] = useState<string>("");
  const [isProjectedView, setIsProjectedView] = useState(false);

  // Drawer action state
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [newCapacity, setNewCapacity] = useState(1);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Bed-level action modals
  const [bedActionModal, setBedActionModal] = useState<{ type: "notice" | "vacate" | "transfer"; bedId: string; allotment: any } | null>(null);
  const [bedActionProcessing, setBedActionProcessing] = useState(false);
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split("T")[0]);
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().split("T")[0]);
  const [vacateDeductions, setVacateDeductions] = useState("0");
  const [transferRoomId, setTransferRoomId] = useState("");
  const [transferBedId, setTransferBedId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [transferRent, setTransferRent] = useState("");
  const [vacateSettlement, setVacateSettlement] = useState<any>(null);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/rooms");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setAllRooms(json.data.rooms || []);
        setIsProjectedView(false);
        setAvailabilityDate("");
      }
    } catch (e) {
      console.error("Failed to load rooms", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/rooms/availability?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setIsProjectedView(true);
      }
    } catch (e) {
      console.error("Failed to load availability", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Bed action handlers
  const handleBedNotice = async () => {
    if (!bedActionModal) return;
    setBedActionProcessing(true);
    try {
      const res = await fetch(`/api/v1/allotments/${bedActionModal.allotment.id}/notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeDate }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Notice given. Expected move-out: ${json.data.expectedMoveOutDate}`);
        setBedActionModal(null);
        await fetchRooms();
        const refreshed = await fetch(`/api/v1/rooms/${selectedRoom.id}`);
        const rj = await refreshed.json();
        if (rj.success) setSelectedRoom(rj.data.room);
      } else {
        setActionError(json.error?.message || "Failed");
      }
    } catch (e: any) { setActionError(e.message); }
    setBedActionProcessing(false);
  };

  const handleBedVacate = async () => {
    if (!bedActionModal) return;
    setBedActionProcessing(true);
    try {
      const res = await fetch(`/api/v1/allotments/${bedActionModal.allotment.id}/vacate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveOutDate: vacateDate, deductions: vacateDeductions }),
      });
      const json = await res.json();
      if (json.success) {
        setVacateSettlement(json.data.settlement);
        setActionSuccess("Tenant vacated successfully");
        setBedActionModal(null);
        await fetchRooms();
        const refreshed = await fetch(`/api/v1/rooms/${selectedRoom.id}`);
        const rj = await refreshed.json();
        if (rj.success) setSelectedRoom(rj.data.room);
      } else {
        setActionError(json.error?.message || "Failed");
      }
    } catch (e: any) { setActionError(e.message); }
    setBedActionProcessing(false);
  };

  const handleBedTransfer = async () => {
    if (!bedActionModal) return;
    setBedActionProcessing(true);
    try {
      const res = await fetch(`/api/v1/allotments/${bedActionModal.allotment.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRoomId: transferRoomId, newBedId: transferBedId, transferDate, newRent: transferRent || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Transferred to ${json.data.newRoom}`);
        setBedActionModal(null);
        await fetchRooms();
        const refreshed = await fetch(`/api/v1/rooms/${selectedRoom.id}`);
        const rj = await refreshed.json();
        if (rj.success) setSelectedRoom(rj.data.room);
      } else {
        setActionError(json.error?.message || "Failed");
      }
    } catch (e: any) { setActionError(e.message); }
    setBedActionProcessing(false);
  };

  const openDrawer = (room: any) => {
    setSelectedRoom(room);
    setNewCapacity(room.capacity);
    setActionError("");
    setActionSuccess("");
    setDrawerOpen(true);
  };

  const handleUpdateCapacity = async () => {
    if (!selectedRoom) return;
    setActionError("");
    setActionSuccess("");
    setProcessing(true);

    try {
      const res = await fetch(`/api/v1/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_capacity",
          capacity: newCapacity,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update capacity");
      }

      setActionSuccess(`Room ${selectedRoom.room_number} capacity updated successfully!`);
      setCapacityModalOpen(false);
      await fetchRooms();
      // Update drawer room
      const refreshedRoomRes = await fetch(`/api/v1/rooms/${selectedRoom.id}`);
      const refreshedRoomJson = await refreshedRoomRes.json();
      if (refreshedRoomJson.success) {
        setSelectedRoom(refreshedRoomJson.data.room);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivateRoom = async () => {
    if (!selectedRoom) return;
    if (!confirm(`Are you sure you want to deactivate Room ${selectedRoom.room_number}?`)) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);

    try {
      const res = await fetch(`/api/v1/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to deactivate room");
      }

      setActionSuccess(`Room ${selectedRoom.room_number} deactivated.`);
      setDrawerOpen(false);
      await fetchRooms();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Occupancy Board...</span>
      </div>
    );
  }

  const { rooms = [], stats = {} } = data || {};

  // Group rooms by floor with logical floor order
  const floorOrder = (name: string) => {
    const n = (name || "").toLowerCase();
    if (n.includes("basement")) return n.includes("lower") ? -2 : -1;
    if (n.includes("ground")) return 0;
    const match = n.match(/\d+/);
    return match ? parseInt(match[0], 10) : 99;
  };
  const floors: string[] = Array.from(new Set<string>(rooms.map((r: any) => String(r.floor || "Ground")))).sort((a: string, b: string) => floorOrder(a) - floorOrder(b));
  const filteredRooms = selectedFloor === "all" ? rooms : rooms.filter((r: any) => r.floor === selectedFloor);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live Occupancy Board
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30">Live</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isProjectedView ? `Projected availability for ${new Date(availabilityDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : "Real-time vacancy, occupancy, and bed management for property"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Availability date picker */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shadow-inner">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={availabilityDate}
              onChange={(e) => {
                const val = e.target.value;
                setAvailabilityDate(val);
                if (val) fetchAvailability(val);
                else fetchRooms();
              }}
              className="bg-transparent text-xs text-white border-none focus:outline-none w-32"
              title="View availability as of date"
            />
            {isProjectedView && (
              <button onClick={() => { setAvailabilityDate(""); fetchRooms(); }} className="text-slate-400 hover:text-white" title="Clear & show live">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Link
            href="/rooms/new"
            className="btn-electric text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rooms</span>
          </Link>
          <button
            onClick={fetchRooms}
            title="Refresh Board"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projected view banner */}
      {isProjectedView && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2 text-xs text-amber-400 font-medium">
          <CalendarDays className="w-4 h-4 shrink-0" />
          Showing projected availability for {new Date(availabilityDate).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}. This is not the live view.
          <button onClick={() => { setAvailabilityDate(""); fetchRooms(); }} className="ml-auto px-2 py-1 bg-amber-500/20 rounded-lg hover:bg-amber-500/30 transition-all font-bold">Show Live</button>
        </div>
      )}

      {/* Header Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Rooms</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalRooms || 0}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Beds</span>
            <Bed className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalBeds || 0}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Occupied</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{stats.occupiedBeds || 0}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Vacant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.vacantBeds || 0}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Reserved</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{stats.reservedBeds || 0}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Occupancy</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-gradient-electric">{stats.occupancyPercent || 0}%</p>
        </div>
      </div>

      {/* Legend & Floor Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
        {/* Status Legend */}
        <div className="flex items-center gap-3.5 text-xs font-medium text-slate-300 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Bed Status:</span>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-xs font-semibold text-slate-300">Vacant</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-xs font-semibold text-slate-300">Occupied</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-xs font-semibold text-slate-300">Reserved</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-xs font-semibold text-slate-300">Maintenance</span>
          </div>
        </div>

        {/* Floor Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedFloor("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedFloor === "all" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            All Floors ({rooms.length})
          </button>
          {floors.map((floorName: any) => {
            const floorCount = rooms.filter((r: any) => r.floor === floorName).length;
            return (
              <button
                key={floorName}
                onClick={() => setSelectedFloor(floorName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFloor === floorName ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                {floorName} ({floorCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Room Grid Grouped by Floor */}
      <div className="space-y-8">
        {(selectedFloor === "all" ? floors : [selectedFloor]).map((floorName: any) => {
          const floorRooms = rooms.filter((r: any) => r.floor === floorName);
          if (floorRooms.length === 0) return null;

          return (
            <div key={floorName} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-white tracking-wide">{floorName}</h2>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-medium">
                  {floorRooms.length} Rooms
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {floorRooms.map((room: any) => {
                  const beds = room.beds || [];
                  const occupiedCount = beds.filter((b: any) => b.status === "occupied").length;
                  const vacantCount = beds.filter((b: any) => b.status === "vacant").length;
                  const reservedCount = beds.filter((b: any) => b.status === "reserved").length;

                  return (
                    <div
                      key={room.id}
                      onClick={() => openDrawer(room)}
                      className="group bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                          Room {room.room_number}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          {room.sharing_type}
                        </span>
                      </div>

                      {/* Bed Status Dots */}
                      <div className="flex items-center gap-2 my-3 py-2 bg-slate-950/60 px-3 rounded-xl border border-slate-800/80">
                        {beds.map((bed: any) => {
                          let dotColor = "bg-emerald-500 shadow-emerald-500/50";
                          if (bed.status === "occupied") dotColor = "bg-blue-500 shadow-blue-500/50";
                          else if (bed.status === "reserved") dotColor = "bg-amber-500 shadow-amber-500/50";
                          else if (bed.status === "blocked") dotColor = "bg-slate-500";

                          return (
                            <div key={bed.id} className="flex items-center gap-1" title={`Bed ${bed.bed_label}: ${bed.status}`}>
                              <div className={`w-3.5 h-3.5 rounded-full ${dotColor} shadow-md transition-transform group-hover:scale-110`} />
                              <span className="text-[10px] font-semibold text-slate-400">{bed.bed_label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>₹{room.default_rent?.toLocaleString()}/bed</span>
                        <span className="font-medium text-emerald-400">{vacantCount} vacant</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Detail Drawer Overlay */}
      {drawerOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-stretch sm:justify-end transition-opacity">
          <div className="w-full sm:max-w-lg bg-[#090d16] border-t sm:border-t-0 sm:border-l border-slate-800 rounded-t-3xl sm:rounded-none max-h-[90vh] sm:max-h-full h-auto sm:h-full p-5 sm:p-6 overflow-y-auto flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">Room {selectedRoom.room_number}</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      {selectedRoom.sharing_type} Sharing
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Floor: {selectedRoom.floor} · Meter: {selectedRoom.meter_number || "N/A"}</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Error / Success Display */}
              {actionError && (
                <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Validation Error:</span>
                    {actionError}
                  </div>
                </div>
              )}

              {actionSuccess && (
                <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Beds & Current Occupants */}
              <div className="mt-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Beds ({selectedRoom.capacity}) & Current Occupants
                </h3>

                <div className="space-y-3">
                  {selectedRoom.beds?.map((bed: any) => {
                    const activeAllotment = bed.allotments?.[0];
                    const tenant = activeAllotment?.tenant;
                    const isOccupied = bed.status === "occupied" || bed.status === "reserved";
                    const allotmentStatus = activeAllotment?.status;

                    return (
                      <div key={bed.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                bed.status === "occupied"
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : bed.status === "reserved"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {bed.bed_label}
                            </div>

                            <div>
                              {tenant ? (
                                <div>
                                  <Link href={`/tenants/${tenant.id}`} className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">{tenant.full_name}</Link>
                                  <p className="text-[11px] text-slate-400">{tenant.phone} · Move-in: {new Date(activeAllotment.move_in_date).toLocaleDateString()}</p>
                                  {allotmentStatus === "on_notice" && activeAllotment.expected_move_out_date && (
                                    <p className="text-[10px] text-orange-400 font-medium mt-0.5">⚠ On notice — expected move-out: {new Date(activeAllotment.expected_move_out_date).toLocaleDateString()}</p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-slate-400">Bed {bed.bed_label} is Vacant</p>
                                  <p className="text-[11px] text-emerald-400 font-medium">Ready for immediate allotment</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${
                              bed.status === "occupied"
                                ? allotmentStatus === "on_notice" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : bed.status === "reserved"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {allotmentStatus === "on_notice" ? "On Notice" : bed.status}
                          </span>
                        </div>

                        {/* Bed-level action buttons */}
                        {isOccupied && activeAllotment && !isProjectedView && (
                          <div className="flex items-center gap-1.5 pt-1">
                            {allotmentStatus === "active" && (
                              <>
                                <button onClick={() => { setBedActionModal({ type: "notice", bedId: bed.id, allotment: activeAllotment }); setActionError(""); setActionSuccess(""); setVacateSettlement(null); }} className="px-2 py-1 text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-all flex items-center gap-1">
                                  <BellRing className="w-3 h-3" /> Notice
                                </button>
                                <button onClick={() => { setBedActionModal({ type: "transfer", bedId: bed.id, allotment: activeAllotment }); setActionError(""); setActionSuccess(""); setVacateSettlement(null); setTransferRoomId(""); setTransferBedId(""); }} className="px-2 py-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-1">
                                  <ArrowRightLeft className="w-3 h-3" /> Transfer
                                </button>
                              </>
                            )}
                            {(allotmentStatus === "active" || allotmentStatus === "on_notice") && (
                              <button onClick={() => { setBedActionModal({ type: "vacate", bedId: bed.id, allotment: activeAllotment }); setActionError(""); setActionSuccess(""); setVacateSettlement(null); }} className="px-2 py-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-1">
                                <LogOutIcon className="w-3 h-3" /> Vacate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>

                <Link
                  href={`/allotments/new?roomId=${selectedRoom.id}`}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign Tenant to Vacant Bed</span>
                </Link>

                <button
                  onClick={() => setCapacityModalOpen(!capacityModalOpen)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Change Capacity (Add / Remove Beds)</span>
                </button>

                {capacityModalOpen && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <label className="block text-xs font-semibold text-slate-300">
                      New Capacity for Room {selectedRoom.room_number}:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={newCapacity}
                        onChange={(e) => setNewCapacity(parseInt(e.target.value, 10))}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white w-24 text-center focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={handleUpdateCapacity}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                      >
                        {processing ? "Saving..." : "Apply Capacity Change"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      * Decreasing capacity removes vacant beds only. Occupied beds are protected.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleDeactivateRoom}
                  disabled={processing}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-red-500/20 transition-all"
                >
                  <Ban className="w-4 h-4" />
                  <span>Deactivate Room</span>
                </button>
              </div>

              {/* Bed Action Modal (Notice/Vacate/Transfer) */}
              {bedActionModal && (
                <div className="mt-6 bg-slate-950 border border-slate-700 rounded-xl p-4 space-y-3">
                  {bedActionModal.type === "notice" && (
                    <>
                      <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2"><BellRing className="w-4 h-4" /> Give Notice — {bedActionModal.allotment.tenant?.full_name}</h3>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">Notice Date</label>
                        <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleBedNotice} disabled={bedActionProcessing} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50">{bedActionProcessing ? "Processing..." : "Confirm Notice"}</button>
                        <button onClick={() => setBedActionModal(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all">Cancel</button>
                      </div>
                    </>
                  )}
                  {bedActionModal.type === "vacate" && (
                    <>
                      <h3 className="text-sm font-bold text-red-400 flex items-center gap-2"><LogOutIcon className="w-4 h-4" /> Vacate — {bedActionModal.allotment.tenant?.full_name}</h3>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">Move-out Date</label>
                        <input type="date" value={vacateDate} onChange={(e) => setVacateDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">Deposit Deductions (₹)</label>
                        <input type="number" value={vacateDeductions} onChange={(e) => setVacateDeductions(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleBedVacate} disabled={bedActionProcessing} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50">{bedActionProcessing ? "Processing..." : "Confirm Vacate"}</button>
                        <button onClick={() => setBedActionModal(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all">Cancel</button>
                      </div>
                    </>
                  )}
                  {bedActionModal.type === "transfer" && (
                    <>
                      <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Transfer — {bedActionModal.allotment.tenant?.full_name}</h3>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">Transfer Date</label>
                        <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">New Room</label>
                        <select value={transferRoomId} onChange={(e) => { setTransferRoomId(e.target.value); setTransferBedId(""); const r = allRooms.find((rm: any) => rm.id === e.target.value); if (r) setTransferRent(String(r.default_rent)); }} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500">
                          <option value="">Select room...</option>
                          {allRooms.filter((r: any) => r.beds?.some((b: any) => b.status === "vacant")).map((r: any) => <option key={r.id} value={r.id}>{r.room_number} ({r.floor})</option>)}
                        </select>
                      </div>
                      {transferRoomId && (
                        <div>
                          <label className="block text-[11px] text-slate-400 font-medium mb-1">New Bed</label>
                          <select value={transferBedId} onChange={(e) => setTransferBedId(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500">
                            <option value="">Select bed...</option>
                            {allRooms.find((r: any) => r.id === transferRoomId)?.beds?.filter((b: any) => b.status === "vacant").map((b: any) => <option key={b.id} value={b.id}>Bed {b.bed_label}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">New Rent (₹)</label>
                        <input type="number" value={transferRent} onChange={(e) => setTransferRent(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleBedTransfer} disabled={bedActionProcessing || !transferBedId} className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50">{bedActionProcessing ? "Processing..." : "Confirm Transfer"}</button>
                        <button onClick={() => setBedActionModal(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all">Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Vacate Settlement Display */}
              {vacateSettlement && (
                <div className="mt-4 bg-slate-950 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Info className="w-4 h-4 text-emerald-400" /> Final Settlement</h3>
                  {[{ l: "Pro-rated Rent", v: vacateSettlement.proRatedRent }, { l: "Outstanding Dues", v: vacateSettlement.outstandingDues }, { l: "Deposit Paid", v: vacateSettlement.securityDepositPaid }, { l: "Deductions", v: vacateSettlement.deductions }].map(i => (
                    <div key={i.l} className="flex justify-between text-xs"><span className="text-slate-400">{i.l}</span><span className="text-white font-medium">₹{i.v?.toLocaleString("en-IN")}</span></div>
                  ))}
                  <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-xs font-bold">
                    {vacateSettlement.netRefundable > 0
                      ? <><span className="text-emerald-400">Refund to Tenant</span><span className="text-emerald-400">₹{vacateSettlement.netRefundable.toLocaleString("en-IN")}</span></>
                      : <><span className="text-amber-400">Payable by Tenant</span><span className="text-amber-400">₹{vacateSettlement.netPayableByTenant?.toLocaleString("en-IN")}</span></>
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 text-center">
              <span className="text-[11px] text-slate-500">PG Manager v1.0 · Riddhi Residency</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
