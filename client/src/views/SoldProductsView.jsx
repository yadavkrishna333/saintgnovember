import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  ShoppingBag, 
  RotateCcw, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Edit3,
  Trash2,
  AlertCircle,
  Copy,
  Check,
  PackageCheck,
  Clock,
  Filter,
  X,
  CalendarPlus
} from 'lucide-react';
import { EditSaleModal } from '../components/EditSaleModal';
import { ManualSaleModal } from '../components/ManualSaleModal';

export function SoldProductsView() {
  const { sales, revertSale, inventory, stats } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [revertingId, setRevertingId] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [isManualSaleOpen, setIsManualSaleOpen] = useState(false);
  const [copiedSku, setCopiedSku] = useState(null);

  // Helper date strings (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Default to today's date so sales from today show immediately
  const [selectedDate, setSelectedDate] = useState(() => getTodayStr());

  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleCopySku = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  // User's exact baseline replenishment logic:
  // Women footwear: size 37 requires 2 pcs, all other sizes 1 pc.
  // Mens footwear: size 41 requires 2 pcs, all other sizes 1 pc.
  // Jackets (Men & Women): size M requires 2 pcs, all other sizes 1 pc.
  // Bags: 1 pc.
  const getReplenishmentStatus = (sale) => {
    const isWarehouse = sale.source === 'warehouse' || sale.deductStock === false;
    if (isWarehouse) {
      return { isWarehouse: true, isReceived: false, currentStock: 0, requiredBaseline: 0 };
    }

    // Find matching product in current inventory
    const product = inventory.find(p => p.id === sale.productId || (sale.sku && p.sku === sale.sku));
    if (!product) {
      return { isWarehouse: false, isReceived: false, currentStock: 0, requiredBaseline: 1 };
    }

    const category = product.category || sale.category;
    const size = String(sale.size || '').toUpperCase();

    let requiredBaseline = 1;
    if (category === 'women_footwear') {
      requiredBaseline = size === '37' ? 2 : 1;
    } else if (category === 'men_footwear') {
      requiredBaseline = size === '41' ? 2 : 1;
    } else if (category === 'men_jacket' || category === 'women_jacket') {
      requiredBaseline = size === 'M' ? 2 : 1;
    } else {
      requiredBaseline = 1;
    }

    const currentStock = Number(product.sizes?.[sale.size] || 0);
    const isReceived = currentStock >= requiredBaseline;

    return { isWarehouse: false, isReceived, currentStock, requiredBaseline };
  };

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Date filter: if selectedDate is chosen, match sale timestamp to that day (local date)
      if (selectedDate) {
        const saleDateObj = new Date(sale.timestamp || sale.createdAt || Date.now());
        const year = saleDateObj.getFullYear();
        const month = String(saleDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(saleDateObj.getDate()).padStart(2, '0');
        const saleDateStr = `${year}-${month}-${day}`;
        if (saleDateStr !== selectedDate) return false;
      }

      // Search term filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        sale.productName?.toLowerCase().includes(q) ||
        sale.sku?.toLowerCase().includes(q) ||
        sale.styleCategory?.toLowerCase().includes(q) ||
        sale.customerName?.toLowerCase().includes(q) ||
        sale.paymentMode?.toLowerCase().includes(q) ||
        sale.size?.toLowerCase().includes(q)
      );
    });
  }, [sales, searchTerm, selectedDate]);

  // Specific delete sale handler with stock restoration confirmation
  const handleDeleteSale = async (sale) => {
    const sku = sale.sku || 'N/A';
    const confirmMsg = `Kya aap is sold article ko DELETE karna chahte hain?\n\n` +
      `SKU: ${sku}\n` +
      `Style: ${sale.styleCategory || sale.productName || 'Article'}\n` +
      `Size: ${sale.size}\n` +
      `Quantity: ${sale.quantity || 1} piece\n\n` +
      `👉 Delete karne par iska stock wapas inventory me turant add ho jayega.`;

    if (window.confirm(confirmMsg)) {
      setRevertingId(sale.id);
      try {
        await revertSale(sale.id);
      } catch (err) {
        alert(err.message || 'Failed to delete sale');
      } finally {
        setRevertingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Financial Summary Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Units Sold</span>
          <div className="text-2xl font-black text-white mt-1">
            {sales.reduce((sum, s) => sum + (s.quantity || 0), 0)}
          </div>
          <span className="text-[11px] text-slate-500">{sales.length} transactions</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}
          </div>
          <span className="text-[11px] text-slate-500">Gross billed</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Replenishment Status</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {sales.filter(s => getReplenishmentStatus(s).isReceived).length} / {sales.length}
          </div>
          <span className="text-[11px] text-slate-400">Received back in stock</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today Sales</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(stats.todayRevenue)}
          </div>
          <span className="text-[11px] text-slate-500">{stats.todayItemsSold || 0} items today</span>
        </div>
      </div>

      {/* Action Banner: Add Past / Manual Sale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Sold Articles Entry</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                कल या पुरानी तारीख
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              आर्टिकल कोड, साइज़, अमाउंट और तारीख डालकर पुरानी बिकी हुई आइटम को सीधे उस दिन की सेल में जोड़ें
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsManualSaleOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>+ Add Past / Manual Sale (सेल जोड़ें)</span>
        </button>
      </div>

      {/* Date Filter Bar & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-lg">
        {/* Quick Date Selector & Custom Date Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              <span>Date Filter:</span>
            </span>

            {/* Quick Pills */}
            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                selectedDate === getTodayStr()
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              Today (आज)
            </button>

            <button
              onClick={() => setSelectedDate(getYesterdayStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                selectedDate === getYesterdayStr()
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              Yesterday (कल)
            </button>

            <button
              onClick={() => setSelectedDate('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                selectedDate === ''
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              All Dates (सभी तारीखें)
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Pick Date:</span>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              />
            </div>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                title="Clear date filter (show all)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input & Live Filter Summary */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU Code (e.g. SG-F-1560-TAN), Style, Customer, Size..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition font-medium"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">
              {selectedDate ? `Date: ${selectedDate}` : 'All Dates'}
            </span>
            <span className="text-amber-400">&bull;</span>
            <span className="text-white">
              {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'}
            </span>
            <span className="text-amber-400">&bull;</span>
            <span className="text-emerald-400 font-mono">
              {formatCurrency(filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* SOLD PRODUCTS TABLE */}
      {filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 text-slate-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-300">
            {selectedDate ? `No sales recorded for ${selectedDate}` : 'No sold records found'}
          </h3>
          <p className="text-xs mt-1 text-slate-400">
            Agar koi article bika tha aur add nahi ho paya, to aap use yahan add kar sakte hain.
          </p>
          <button
            onClick={() => setIsManualSaleOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>+ Add Past Sale (बिक्री जोड़ें)</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[11px] select-none">
                  <th className="py-3.5 px-3 text-center w-14">SR NO</th>
                  <th className="py-3.5 px-3 min-w-[130px]">DATE & TIME</th>
                  {/* PROMINENT SKU CODE COLUMN */}
                  <th className="py-3.5 px-3 min-w-[180px] text-sky-300 font-black">
                    <div className="flex items-center gap-1.5">
                      <span>SKU CODE</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">MAIN</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 min-w-[180px]">PRODUCT / STYLE</th>
                  <th className="py-3.5 px-3 text-center w-20">SIZE</th>
                  <th className="py-3.5 px-3 text-center w-16">QTY</th>
                  <th className="py-3.5 px-3 text-right min-w-[100px]">TOTAL BILL</th>
                  <th className="py-3.5 px-3 text-center min-w-[90px]">PAYMENT</th>
                  <th className="py-3.5 px-3 min-w-[120px]">CUSTOMER</th>
                  {/* REPLENISHMENT STATUS COLUMN */}
                  <th className="py-3.5 px-3 text-center min-w-[150px] bg-slate-950/60 border-x border-slate-800">
                    REPLENISHMENT
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[130px]">ACTIONS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredSales.map((sale, idx) => {
                  const srNo = String(idx + 1).padStart(2, '0');
                  const date = new Date(sale.timestamp);
                  const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const skuCode = sale.sku || inventory.find(p => p.id === sale.productId)?.sku || 'N/A';

                  // Replenishment status calculation
                  const { isWarehouse, isReceived, currentStock, requiredBaseline } = getReplenishmentStatus(sale);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors group">
                      
                      {/* SR NO */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 group-hover:text-amber-400 transition">
                        #{srNo}
                      </td>

                      {/* DATE */}
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        <div>{formattedDate}</div>
                        <div className="text-[10px] text-slate-500">{formattedTime}</div>
                      </td>

                      {/* PROMINENT SKU CODE */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border-2 font-mono font-black text-xs shadow-md transition ${
                            isWarehouse 
                              ? 'border-purple-500/80 text-purple-200' 
                              : 'border-sky-400/90 text-sky-200 group-hover:border-sky-300'
                          }`}>
                            <span className="select-all font-black text-white">{skuCode}</span>
                            <button
                              onClick={() => handleCopySku(skuCode)}
                              title="Copy SKU Code"
                              className="text-slate-500 hover:text-white transition ml-0.5"
                            >
                              {copiedSku === skuCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {isWarehouse && (
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              WAREHOUSE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PRODUCT / STYLE */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-white text-xs">{sale.styleCategory || sale.productName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{sale.productName}</div>
                      </td>

                      {/* SIZE */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-black font-mono px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs">
                          {sale.size}
                        </span>
                      </td>

                      {/* QTY */}
                      <td className="py-3 px-3 text-center font-bold text-white font-mono">
                        {sale.quantity}
                      </td>

                      {/* TOTAL BILL */}
                      <td className="py-3 px-3 text-right font-black text-emerald-400 text-xs sm:text-sm font-mono whitespace-nowrap">
                        {formatCurrency(sale.totalAmount)}
                      </td>

                      {/* PAYMENT */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {sale.paymentMode || 'Cash'}
                        </span>
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3 px-3 text-slate-300 text-xs">
                        {sale.customerName || <span className="text-slate-600 italic">Walk-in</span>}
                      </td>

                      {/* REPLENISHMENT STATUS (GREEN / RED / WAREHOUSE) */}
                      <td className="py-3 px-3 text-center bg-slate-950/40 border-x border-slate-800">
                        {isWarehouse ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20 flex items-center gap-1">
                              <span>🏭</span>
                              <span>Sold from Warehouse</span>
                            </span>
                            <span className="text-[9px] text-purple-400/80 font-mono mt-0.5 font-semibold">
                              Direct Warehouse Sale
                            </span>
                          </div>
                        ) : isReceived ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Received
                            </span>
                            <span className="text-[9px] text-emerald-500/80 font-mono mt-0.5">
                              Stock: {currentStock} (Req: {requiredBaseline})
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/10 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Not Received
                            </span>
                            <span className="text-[9px] text-rose-400/80 font-mono mt-0.5">
                              Stock: {currentStock}/{requiredBaseline}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ACTIONS: EDIT & REVERT */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* EDIT SALE BUTTON */}
                          <button
                            onClick={() => setEditingSale(sale)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 active:scale-95 transition flex items-center gap-1"
                            title="Edit this sale (change article, size, or price)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold hidden sm:inline">Edit</span>
                          </button>

                          {/* DELETE SALE BUTTON (RESTORE STOCK) */}
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            disabled={revertingId === sale.id}
                            className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 active:scale-95 transition flex items-center gap-1 text-[10px] font-bold disabled:opacity-40"
                            title="Delete this sale entry and restore stock back to store inventory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>
      )}

      {/* Global Edit Sale Modal */}
      <EditSaleModal
        isOpen={!!editingSale}
        onClose={() => setEditingSale(null)}
        saleToEdit={editingSale}
      />

      {/* Manual / Past Date Sale Modal */}
      <ManualSaleModal
        isOpen={isManualSaleOpen}
        onClose={() => setIsManualSaleOpen(false)}
        onSaleAdded={(dateAdded) => {
          setSelectedDate(dateAdded);
        }}
      />

    </div>
  );
}
