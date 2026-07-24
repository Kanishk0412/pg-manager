"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RefreshCw, IndianRupee, X, Loader2, Undo2 } from "lucide-react";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Record-payment modal state
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("upi");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    return fetch(`/api/v1/invoices/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setInvoice(json.data.invoice); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openPay = () => {
    setPayAmount(String(invoice?.balance_due ?? ""));
    setPayError("");
    setShowPay(true);
  };

  const submitPayment = async () => {
    setPaySaving(true);
    setPayError("");
    try {
      const res = await fetch("/api/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id, amount: payAmount, method: payMethod, reference: payRef, notes: payNotes }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to record payment");
      setShowPay(false);
      setPayRef(""); setPayNotes("");
      await load();
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setPaySaving(false);
    }
  };

  const reversePayment = async (paymentId: string) => {
    const reason = window.prompt("Reason for reversing this payment?");
    if (!reason || !reason.trim()) return;
    const res = await fetch(`/api/v1/payments/${paymentId}/reverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) { alert(json.error?.message || "Failed to reverse"); return; }
    await load();
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500 mr-2" /> Loading invoice…
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>Invoice not found.</p>
        <Link href="/invoices" className="text-emerald-400 text-xs hover:underline mt-2 inline-block">Back to invoices</Link>
      </div>
    );
  }

  const property = invoice.property;
  const brand = property?.brand_color || "#059669";
  const symbol = property?.currency_symbol || "₹";
  const fmt = (n: number) => `${symbol}${(n || 0).toLocaleString()}`;
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Print isolation: only #invoice-print shows when printing */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #invoice-print, #invoice-print * { visibility: visible !important; }
        #invoice-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
        .no-print { display: none !important; }
      }`}</style>

      <div className="flex items-center justify-between no-print">
        <Link href="/invoices" className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          {invoice.balance_due > 0 && invoice.status !== "cancelled" && (
            <button
              onClick={openPay}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <IndianRupee className="w-4 h-4" /> <span>Record Payment</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" /> <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      <div id="invoice-print" className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl relative">
        {(isPaid || isOverdue) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-[110px] font-black opacity-10 rotate-[-20deg] ${isPaid ? "text-emerald-600" : "text-red-600"}`}>
              {isPaid ? "PAID" : "OVERDUE"}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="px-8 py-6 text-white" style={{ background: brand }}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black">{property?.name || "Property"}</h2>
              {property?.legal_name && <p className="text-xs opacity-90">{property.legal_name}</p>}
              <p className="text-xs opacity-80 mt-1">
                {[property?.address_line1, property?.city, property?.state].filter(Boolean).join(", ")}
              </p>
              {property?.gstin && <p className="text-xs opacity-80">GSTIN: {property.gstin}</p>}
            </div>
            <div className="text-right">
              <div className="text-lg font-black uppercase tracking-wide">Invoice</div>
              <div className="text-sm font-mono">{invoice.invoice_number}</div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="px-8 py-5 grid grid-cols-2 gap-4 border-b border-slate-100">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Billed To</div>
            <div className="font-bold text-slate-800">{invoice.tenant?.full_name}</div>
            <div className="text-xs text-slate-500">{invoice.tenant?.phone}</div>
            <div className="text-xs text-slate-500">Room {invoice.room?.room_number}-{invoice.bed?.bed_label}</div>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <div><span className="text-slate-400">Billing Month: </span>{new Date(invoice.billing_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
            <div><span className="text-slate-400">Issue Date: </span>{new Date(invoice.issue_date).toLocaleDateString()}</div>
            <div><span className="text-slate-400">Due Date: </span>{new Date(invoice.due_date).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Line items */}
        <div className="px-8 py-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-200">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Rate</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((li: any) => (
                <tr key={li.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{li.description}</td>
                  <td className="py-2 text-right text-slate-500">{li.quantity}</td>
                  <td className="py-2 text-right text-slate-500">{fmt(li.unit_price)}</td>
                  <td className="py-2 text-right font-medium text-slate-800">{fmt(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <div className="w-56 space-y-1 text-sm">
              <Row label="Subtotal" value={fmt(invoice.subtotal)} />
              {invoice.discount_amount > 0 && <Row label="Discount" value={`- ${fmt(invoice.discount_amount)}`} />}
              {invoice.tax_amount > 0 && <Row label="Tax" value={fmt(invoice.tax_amount)} />}
              {invoice.late_fee_amount > 0 && <Row label="Late Fee" value={fmt(invoice.late_fee_amount)} />}
              <div className="flex justify-between font-black text-base border-t border-slate-300 pt-1.5" style={{ color: brand }}>
                <span>Total</span><span>{fmt(invoice.total_amount)}</span>
              </div>
              <Row label="Paid" value={fmt(invoice.amount_paid)} />
              <div className="flex justify-between font-bold">
                <span>Balance Due</span><span className={invoice.balance_due > 0 ? "text-red-600" : "text-emerald-600"}>{fmt(invoice.balance_due)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 text-[11px] text-slate-500 flex justify-between">
          <span>{property?.phone || ""} {property?.email ? `· ${property.email}` : ""}</span>
          <span>Generated by PG Manager</span>
        </div>
      </div>

      {/* Payments against this invoice */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="no-print bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payments</h3>
          <div className="space-y-2">
            {invoice.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
                <div>
                  <Link href={`/payments/${p.id}`} className="font-mono font-bold text-emerald-400 hover:underline">{p.receipt_number}</Link>
                  <span className="text-slate-500 ml-2">{p.payment_method?.toUpperCase()} · {new Date(p.paid_at).toLocaleDateString()}</span>
                  {p.status === "reversed" && <span className="ml-2 text-red-400 font-bold uppercase text-[10px]">Reversed</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${p.status === "reversed" ? "text-slate-500 line-through" : "text-white"}`}>{fmt(p.amount)}</span>
                  {p.status === "recorded" && (
                    <button onClick={() => reversePayment(p.id)} className="text-slate-500 hover:text-red-400" title="Reverse payment">
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {showPay && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPay(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Record Payment</h3>
              <button onClick={() => setShowPay(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400">Balance due: <span className="font-bold text-red-400">{fmt(invoice.balance_due)}</span></p>

            {payError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">{payError}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Amount ({symbol})</label>
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                  {["cash", "upi", "bank_transfer", "card", "cheque", "other"].map((m) => (
                    <option key={m} value={m}>{m.replace("_", " ").toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Reference / Txn No. (optional)</label>
                <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Notes (optional)</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            <button onClick={submitPayment} disabled={paySaving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {paySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
              <span>{paySaving ? "Saving…" : "Save Payment & Generate Receipt"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
