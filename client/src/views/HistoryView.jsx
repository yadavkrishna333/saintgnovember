import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import * as XLSX from 'xlsx';
import { 
  History as HistoryIcon, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  ShoppingBag, 
  Truck, 
  ArrowUpRight, 
  Download,
  DollarSign,
  Layers,
  ChevronDown,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { EditReplenishmentModal } from '../components/EditReplenishmentModal';
import { EditSaleModal } from '../components/EditSaleModal';

export function HistoryView() {
  const { unifiedHistory, sales, replenishments, warehouseSends, excelImports = [] } = useInventory();

  // Filters
  const [kindFilter, setKindFilter] = useState('all'); // 'all' | 'sale' | 'replenishment' | 'warehouse_send' | 'excel_import'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [editingReplenishment, setEditingReplenishment] = useState(null);
  const [editingSale, setEditingSale] = useState(null);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalSalesQty = 0;
    let totalSalesRevenue = 0;
    sales.forEach(s => {
      totalSalesQty += Number(s.quantity || 1);
      totalSalesRevenue += Number(s.totalAmount || 0);
    });

    let totalInQty = 0;
    replenishments.forEach(r => {
      if (r.items && Array.isArray(r.items)) {
        r.items.forEach(it => { totalInQty += Number(it.qty || 1); });
      } else if (r.receivedItems) {
        Object.values(r.receivedItems).forEach(q => { totalInQty += Number(q || 0); });
      } else {
        totalInQty += Number(r.totalCount || 0);
      }
    });

    let totalOutQty = 0;
    warehouseSends.forEach(w => {
      totalOutQty += Number(w.totalCount || 0);
    });

    return {
      totalTransactions: unifiedHistory.length,
      totalSalesQty,
      totalSalesRevenue,
      totalInQty,
      totalOutQty
    };
  }, [sales, replenishments, warehouseSends, unifiedHistory]);

  // Filtered List
  const filteredList = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return unifiedHistory.filter(item => {
      // Kind filter
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;

      // Date filter
      if (dateRange !== 'all') {
        const itemDate = new Date(item.timestamp);
        if (dateRange === 'today') {
          if ((item.timestamp || '').slice(0, 10) !== todayStr) return false;
        } else if (dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < sevenDaysAgo) return false;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (itemDate < thirtyDaysAgo) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchSku = item.sku && item.sku.toLowerCase().includes(q);
        const matchName = item.productName && item.productName.toLowerCase().includes(q);
        const matchNotes = item.notes && item.notes.toLowerCase().includes(q);
        const matchType = item.typeLabel && item.typeLabel.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchNotes && !matchType) return false;
      }

      return true;
    });
  }, [unifiedHistory, kindFilter, dateRange, searchTerm]);

  // ---------------- EXCEL EXPORT ----------------
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      alert("No records to export with current filters.");
      return;
    }

    const rows = filteredList.map((item, idx) => ({
      "SR NO": idx + 1,
      "Date & Time": item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : 'N/A',
      "Transaction Type": item.typeLabel,
      "Article / Name": item.productName || 'N/A',
      "SKU Code": item.sku || 'N/A',
      "Style Category": item.styleCategory || 'Standard',
      "Size": item.size || 'N/A',
      "Quantity": item.qty,
      "Amount (₹)": item.amount > 0 ? item.amount : 0,
      "Reference / Details": item.notes || '—'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Auto-fit column widths
    const colWidths = [
      { wch: 8 },  // SR NO
      { wch: 22 }, // Date
      { wch: 24 }, // Type
      { wch: 28 }, // Article
      { wch: 20 }, // SKU
      { wch: 18 }, // Style
      { wch: 10 }, // Size
      { wch: 10 }, // Qty
      { wch: 12 }, // Amount
      { wch: 35 }, // Notes
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KY_INVENTORY_HISTORY");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `KY_INVENTORY_HISTORY_${dateStr}.xlsx`);
  };

  // ---------------- PRINT REPORT ----------------
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HistoryIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Audit & Transaction History
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Complete unified ledger of Sales, Stock In, and Warehouse Dispatches
              </p>
            </div>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
            title="Download Excel Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print / PDF Report</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        
        {/* Total Sales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Sales</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">{summary.totalSalesQty} <span className="text-xs font-semibold text-slate-400">pcs</span></div>
          <div className="text-xs font-bold text-emerald-400 mt-0.5">₹{summary.totalSalesRevenue.toLocaleString('en-IN')}</div>
        </div>

        {/* Stock Received (In) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Stock Received (In)</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-400">+{summary.totalInQty} <span className="text-xs font-semibold text-slate-400">pcs</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">{replenishments.length} Inward Batches</div>
        </div>

        {/* Stock Send to Warehouse (Out) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Warehouse Out</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">-{summary.totalOutQty} <span className="text-xs font-semibold text-slate-400">pcs</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">{warehouseSends.length} Challans Dispatched</div>
        </div>

        {/* Ledger Total Count */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Activities</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white">{summary.totalTransactions}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Audit Log Entries</div>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        
        {/* Type Toggle Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setKindFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              kindFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            All Logs ({unifiedHistory.length})
          </button>

          <button
            onClick={() => setKindFilter('sale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              kindFilter === 'sale'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Sales ({sales.length})
          </button>

          <button
            onClick={() => setKindFilter('replenishment')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              kindFilter === 'replenishment'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Stock Received (In)
          </button>

          <button
            onClick={() => setKindFilter('warehouse_send')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              kindFilter === 'warehouse_send'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Warehouse Out ({warehouseSends.length})
          </button>

          <button
            onClick={() => setKindFilter('excel_import')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              kindFilter === 'excel_import'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
            Excel Imports ({excelImports.length})
          </button>
        </div>

        {/* Search & Date Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, item, bill..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

      </div>

      {/* Main Table / Print Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl print:bg-white print:border-none print:shadow-none print:p-0">
        
        {/* Printable Header (Visible only when printing) */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
          <h1 className="text-2xl font-black text-black">KY INVENTORY — TRANSACTION AUDIT REPORT</h1>
          <p className="text-xs text-gray-600">Generated on: {new Date().toLocaleString('en-IN')} | Total Records: {filteredList.length}</p>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No transactions found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-950/80 print:bg-gray-100 text-[11px] uppercase tracking-wider text-slate-400 print:text-black border-b border-slate-800 print:border-gray-300">
                <tr>
                  <th className="py-2.5 px-3">SR NO</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Activity Type</th>
                  <th className="py-2.5 px-3">Article / Name</th>
                  <th className="py-2.5 px-3">SKU Code</th>
                  <th className="py-2.5 px-3 text-center">Size</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3">Reference / Remarks</th>
                  <th className="py-2.5 px-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200 font-medium">
                {filteredList.map((item, idx) => {
                  const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : 'N/A';

                  // Badge styles by activity kind
                  let badgeStyle = "bg-slate-800 text-slate-300 border-slate-700";
                  let qtyColor = "text-white";
                  let prefix = "";

                  if (item.kind === 'sale') {
                    badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                    qtyColor = "text-rose-400 font-bold";
                    prefix = "-";
                  } else if (item.kind === 'replenishment') {
                    badgeStyle = "bg-blue-500/15 text-blue-400 border-blue-500/30";
                    qtyColor = "text-emerald-400 font-bold";
                    prefix = "+";
                  } else if (item.kind === 'warehouse_send') {
                    badgeStyle = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                    qtyColor = "text-amber-400 font-bold";
                    prefix = "↑";
                  } else if (item.kind === 'excel_import') {
                    badgeStyle = "bg-purple-500/15 text-purple-400 border-purple-500/30";
                    qtyColor = "text-purple-300 font-bold";
                    prefix = "📊 ";
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 print:hover:bg-transparent transition">
                      <td className="py-2.5 px-3 font-mono text-slate-400 print:text-gray-600">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-300 print:text-black whitespace-nowrap">{dateStr}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${badgeStyle}`}>
                          {item.typeLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white print:text-black">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 print:text-gray-500">{item.styleCategory}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300 print:text-black whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white print:text-black">
                        {item.size || '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-center font-mono ${qtyColor} print:text-black`}>
                        {prefix}{item.qty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-white print:text-black">
                        {item.amount > 0 ? `₹${item.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 print:text-gray-700 max-w-xs truncate" title={item.notes}>
                        {item.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center print:hidden whitespace-nowrap">
                        {item.kind === 'replenishment' && (
                          <button
                            type="button"
                            onClick={() => setEditingReplenishment(item.raw)}
                            className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1 transition shadow-sm active:scale-95"
                            title="Edit Received Stock Details"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit (बदलें)</span>
                          </button>
                        )}
                        {item.kind === 'sale' && (
                          <button
                            type="button"
                            onClick={() => setEditingSale(item.raw)}
                            className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1 transition shadow-sm active:scale-95"
                            title="Edit Sale Details"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit (बदलें)</span>
                          </button>
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

      {/* Edit Replenishment Modal */}
      {editingReplenishment && (
        <EditReplenishmentModal
          isOpen={Boolean(editingReplenishment)}
          onClose={() => setEditingReplenishment(null)}
          replenishment={editingReplenishment}
        />
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          isOpen={Boolean(editingSale)}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
        />
      )}

    </div>
  );
}
