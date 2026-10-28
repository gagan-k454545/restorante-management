'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  Receipt,
  FileText,
  Banknote,
  Download,
  Search,
  Sparkles,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/money';
import { AdminNavbar } from '@/components/admin/AdminNavbar';

export default function AdminReportsPage() {
  const [salesData, setSalesData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    async function loadReports() {
      try {
        const [salesRes, gstRes, auditRes] = await Promise.all([
          fetch('/api/staff/reports/sales').then((r) => r.json()),
          fetch('/api/staff/reports/gst-summary').then((r) => r.json()),
          fetch('/api/staff/audit').then((r) => r.json()),
        ]);
        if (salesRes.data) setSalesData(salesRes.data);
        if (gstRes.data) setGstData(gstRes.data);
        if (auditRes.data) setAuditLogs(auditRes.data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const filteredLogs = auditLogs.filter(
    (l) =>
      !auditSearch ||
      l.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.entity?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans selection:bg-orange-500 selection:text-white">
      {/* Shared Admin Navbar */}
      <AdminNavbar />

      {/* Reports Sub-header */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            Financial & GST Statutory Reports
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
              India Dine-In Compliance
            </span>
          </h1>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4 text-purple-400" />
          <span>Export / Print</span>
        </button>
      </div>

      <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Net Taxable Sales
              <TrendingUp className="w-4 h-4 text-orange-400" />
            </span>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatPaiseToRupees(salesData?.netSalesPaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500">Excludes service charges & discounts</p>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Total GST Collected
              <Receipt className="w-4 h-4 text-purple-400" />
            </span>
            <div className="text-2xl font-black text-purple-400 tracking-tight">
              {formatPaiseToRupees(salesData?.totalTaxCollectedPaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500">
              CGST: {formatPaiseToRupees(salesData?.cgstCollectedPaise || 0)} • SGST: {formatPaiseToRupees(salesData?.sgstCollectedPaise || 0)}
            </p>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Gross Collections
              <Banknote className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatPaiseToRupees(salesData?.grossCollectionPaise || 0)}
            </div>
            <p className="text-[11px] text-slate-500">Net payments captured in cash & digital</p>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Documents Issued
              <FileText className="w-4 h-4 text-blue-400" />
            </span>
            <div className="text-2xl font-black text-white tracking-tight">
              {salesData?.invoicesIssued || 0} Invoices
            </div>
            <p className="text-[11px] text-slate-500">
              {salesData?.creditNotesIssued || 0} Credit Notes • {salesData?.writeOffCount || 0} Write-offs
            </p>
          </div>
        </div>

        {/* GST Statutory Summary Table */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                GST Statutory Summary (GSTR-1 Preparation)
              </h2>
              <p className="text-xs text-slate-400">
                GSTIN: <span className="font-semibold text-white">{gstData?.gstin || '29ABCDE1234F1Z5'}</span> •{' '}
                {gstData?.taxScheme || 'REGULAR'} Scheme
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Financial Year 2026-27
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">HSN / Tax Rate</th>
                  <th className="py-3 px-4 text-right">Taxable Turnover</th>
                  <th className="py-3 px-4 text-right">CGST</th>
                  <th className="py-3 px-4 text-right">SGST</th>
                  <th className="py-3 px-4 text-right">Total GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {(!gstData?.rates || gstData.rates.length === 0) ? (
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      GST 5.0% (Restaurant Dine-in)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {formatPaiseToRupees(salesData?.netSalesPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-purple-400 font-semibold">
                      {formatPaiseToRupees(salesData?.cgstCollectedPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-purple-400 font-semibold">
                      {formatPaiseToRupees(salesData?.sgstCollectedPaise || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white font-bold">
                      {formatPaiseToRupees(salesData?.totalTaxCollectedPaise || 0)}
                    </td>
                  </tr>
                ) : (
                  gstData.rates.map((r: any) => (
                    <tr key={r.taxRateBp} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />
                        {r.taxRatePercent} (Restaurant Dine-in)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatPaiseToRupees(r.taxableValuePaise)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-purple-400 font-semibold">
                        {formatPaiseToRupees(r.cgstPaise)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-purple-400 font-semibold">
                        {formatPaiseToRupees(r.sgstPaise)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-white font-bold">
                        {formatPaiseToRupees(r.totalTaxPaise)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Trail Section */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Append-Only Audit Trail
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {auditLogs.length} Events
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Immutable security and transaction log satisfying Section 15 of specification
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter audit events..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No audit events recorded matching current criteria
              </p>
            ) : (
              filteredLogs.slice(0, 10).map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <div>
                      <span className="font-bold text-white">{log.action || 'STAFF_ACTION'}</span>
                      <span className="text-slate-400 ml-2">({log.entity || 'SYSTEM'})</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(log.at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}