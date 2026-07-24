"use client";

import { useState } from "react";
import {
  Home,
  CreditCard,
  Zap,
  Wrench,
  Wifi,
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  QrCode,
  Copy,
  Download,
  Plus,
  Send,
  ShieldCheck,
  Calendar,
  LogOut,
  Sparkles,
  ChevronRight,
  FileText
} from "lucide-react";

export default function TenantDashboardPage() {
  // Rent & Pay State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "qr" | "card">("qr");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

  // Complaints State
  const [complaints, setComplaints] = useState([
    {
      id: "TICK-101",
      category: "Plumbing",
      description: "Bathroom sink tap dripping slightly",
      status: "in_progress",
      createdAt: "2026-07-20",
    },
    {
      id: "TICK-088",
      category: "Wi-Fi",
      description: "1st floor router speed drop on Tuesday night",
      status: "resolved",
      createdAt: "2026-07-10",
    },
  ]);
  const [newCategory, setNewCategory] = useState("Plumbing");
  const [newDescription, setNewDescription] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState("");

  // Vacate Notice State
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [vacateDate, setVacateDate] = useState("2026-08-25");
  const [noticeReason, setNoticeReason] = useState("");
  const [noticeSubmitted, setNoticeSubmitted] = useState(false);

  const copyWifiPassword = () => {
    navigator.clipboard.writeText("RiddhiStay#2026");
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const handleAddComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;
    setSubmittingComplaint(true);

    setTimeout(() => {
      setComplaints([
        {
          id: `TICK-${Math.floor(100 + Math.random() * 900)}`,
          category: newCategory,
          description: newDescription,
          status: "open",
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...complaints,
      ]);
      setNewDescription("");
      setSubmittingComplaint(false);
      setComplaintSuccess("Complaint submitted successfully! PG Manager notified.");
      setTimeout(() => setComplaintSuccess(""), 4000);
    }, 600);
  };

  const handleConfirmPayment = () => {
    setPaymentSuccess(true);
  };

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeSubmitted(true);
    setTimeout(() => {
      setNoticeModalOpen(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600/20 via-teal-500/10 to-blue-600/20 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Resident Portal Active
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hello, Rahul Sharma 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Riddhi Residency • Room <strong className="text-emerald-400">101-A</strong> (First Floor)
            </p>
          </div>

          <button
            onClick={() => setPayModalOpen(true)}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay July Rent (₹8,950)</span>
          </button>
        </div>
      </div>

      {/* Grid Row 1: Stay Details & Rent Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: My Stay Details */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-400" />
              My Room & Stay Info
            </h3>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 uppercase">
              Active Allotment
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Room & Bed</p>
              <p className="text-sm font-black text-white mt-0.5">Room 101 - Bed A</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Double Sharing • 1st Floor</p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Monthly Rent</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5">₹8,500 / mo</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Due 5th of every month</p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Move-In Date</p>
              <p className="text-xs font-bold text-white mt-0.5">01 Jan 2026</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Stayed 6+ months</p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Security Deposit</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">₹8,500 (Held)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Refundable at move-out</p>
            </div>
          </div>
        </div>

        {/* Card 2: Current Rent & Electricity Bill */}
        <div id="pay" className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              July 2026 Rent & Utilities
            </h3>
            {paymentSuccess ? (
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Paid
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" /> Due July 5th
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400">Monthly Room Rent</span>
              <span className="font-bold text-white">₹8,500</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block">Electricity Units (45 kWh @ ₹10)</span>
                <span className="text-[10px] text-slate-500">Meter #MTR-101 (Reading: 1245 ➔ 1290)</span>
              </div>
              <span className="font-bold text-white">₹450</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-white block">Total Payable Amount</span>
                <span className="text-[10px] text-emerald-400 font-medium">Includes Rent + Electricity</span>
              </div>
              <span className="text-lg font-black text-emerald-400">₹8,950</span>
            </div>
          </div>

          <button
            onClick={() => setPayModalOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>{paymentSuccess ? "View Paid Receipt & Voucher" : "Pay ₹8,950 Now via UPI / QR"}</span>
          </button>
        </div>
      </div>

      {/* Grid Row 2: PG Info, Wi-Fi & Maintenance Desk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 3: Wi-Fi Credentials & PG Info */}
        <div id="wifi" className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-400" />
              PG Wi-Fi & Quick Info
            </h3>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/30">
              High Speed 300 Mbps
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Wi-Fi Copy Box */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Wi-Fi Network (SSID):</span>
                <span className="font-bold text-white">Riddhi_PG_5G</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Wi-Fi Password:</span>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold">
                    RiddhiStay#2026
                  </code>
                  <button
                    onClick={copyWifiPassword}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all"
                    title="Copy Password"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {copiedWifi && (
                <p className="text-[10px] text-emerald-400 font-bold text-right">Copied to clipboard! ✓</p>
              )}
            </div>

            {/* Quick Contacts & Timings */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">PG Owner Contact</p>
                <p className="text-xs font-bold text-white mt-0.5">+91 98765 43210</p>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <MessageSquare className="w-3 h-3" /> WhatsApp Owner
                </a>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Gate & Meal Timings</p>
                <p className="text-[11px] font-bold text-white mt-0.5">Gate Close: 10:30 PM</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Dinner: 8:00 - 10:00 PM</p>
              </div>
            </div>

            <button
              onClick={() => setNoticeModalOpen(true)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-2xl text-xs font-bold transition-all text-center"
            >
              Request Move-Out / Vacate Notice →
            </button>
          </div>
        </div>

        {/* Card 4: Maintenance & Complaint Desk */}
        <div id="complaints" className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-teal-400" />
              Raise Complaint / Maintenance Desk
            </h3>
            <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 text-[10px] font-bold rounded-full border border-teal-500/30">
              24/7 Response
            </span>
          </div>

          {complaintSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{complaintSuccess}</span>
            </div>
          )}

          {/* New Complaint Form */}
          <form onSubmit={handleAddComplaint} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {["Plumbing", "Wi-Fi", "Electrical", "Housekeeping", "Appliance", "Other"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewCategory(cat)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                    newCategory === cat
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe your issue (e.g. Tap leaking)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
              />
              <button
                type="submit"
                disabled={submittingComplaint}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-2xl transition-all shrink-0 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit</span>
              </button>
            </div>
          </form>

          {/* Active Complaints Tracker */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Recent Complaints & Trackers:
            </p>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{c.category}</span>
                      <span className="text-[10px] text-slate-500">#{c.id}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.description}</p>
                  </div>

                  {c.status === "open" && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30 shrink-0">
                      Open
                    </span>
                  )}
                  {c.status === "in_progress" && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/30 shrink-0">
                      In Progress
                    </span>
                  )}
                  {c.status === "resolved" && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 shrink-0">
                      Resolved ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Online Rent Payment Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPayModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Pay Rent Online</h3>
                <p className="text-[10px] text-slate-400">Riddhi Residency • Room 101-A</p>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            {paymentSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Payment Received!</h4>
                <p className="text-xs text-slate-400">
                  Transaction #TXN-2026-0701 for <strong className="text-emerald-400">₹8,950</strong> verified successfully.
                </p>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-1">
                  <p className="text-slate-400">Receipt No: <strong className="text-white">RCP-2026-0701</strong></p>
                  <p className="text-slate-400">Paid Amount: <strong className="text-emerald-400">₹8,950</strong></p>
                  <p className="text-slate-400">Paid Date: <strong className="text-white">{new Date().toLocaleDateString()}</strong></p>
                </div>
                <button
                  onClick={() => setPayModalOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-all"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Amount to Pay</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">₹8,950</p>
                  <p className="text-[10px] text-slate-400">Rent ₹8,500 + Electricity ₹450</p>
                </div>

                {/* QR Code view */}
                <div className="bg-white p-4 rounded-2xl text-center space-y-2 shadow-inner">
                  <div className="w-40 h-40 bg-slate-100 mx-auto rounded-xl border border-slate-300 flex items-center justify-center p-2">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=riddhipg@upi&pn=Riddhi%20Residency&am=8950&cu=INR"
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-800">Scan with PhonePe / GPay / Paytm</p>
                  <p className="text-[10px] text-slate-500 font-mono">UPI ID: riddhipg@upi</p>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all"
                >
                  I Have Completed Payment →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vacate Notice Modal */}
      {noticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setNoticeModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Submit Vacate Notice</h3>
              <button onClick={() => setNoticeModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            {noticeSubmitted ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="font-bold">Notice Submitted!</p>
                <p className="text-[11px] text-slate-300">Expected move-out set to {vacateDate}. PG Manager will inspect and process deposit refund.</p>
              </div>
            ) : (
              <form onSubmit={handleNoticeSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                    Requested Vacate Date (30 Days Notice)
                  </label>
                  <input
                    type="date"
                    required
                    value={vacateDate}
                    onChange={(e) => setVacateDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                    Reason for Move-Out (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={noticeReason}
                    onChange={(e) => setNoticeReason(e.target.value)}
                    placeholder="e.g. Job transfer or college completion..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl transition-all"
                >
                  Submit Notice Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
