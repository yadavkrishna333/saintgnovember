import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  ArrowUpRight, 
  Warehouse, 
  Calendar, 
  FileText, 
  Search, 
  Check, 
  AlertCircle, 
  Package, 
  Printer, 
  Clock, 
  Layers, 
  Tag,
  ChevronDown,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { getColorHex } from '../utils/colors';
import { EditWarehouseModal } from '../components/EditWarehouseModal';

export function WarehouseSendView() {
  const { 
    inventory, 
    categories, 
    sizesMap, 
    sendStockToWarehouse, 
    warehouseSends 
  } = useInventory();

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState(inventory[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dispatch details
  const [dispatchNo, setDispatchNo] = useState(`WH-${Date.now().toString().slice(-6)}`);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [destination, setDestination] = useState('Central Warehouse');
  const [reason, setReason] = useState('Seasonal Return');
  const [notes, setNotes] = useState('');

  // Size quantities to send
  const [sizeQuantities, setSizeQuantities] = useState({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [historySearch, setHistorySearch] = useState('');
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  // Active product
  const currentProduct = useMemo(() => {
    return inventory.find(p => p.id === selectedProductId) || inventory[0] || null;
  }, [inventory, selectedProductId]);

  // Sizes for current product's category
  const activeSizes = useMemo(() => {
    if (!currentProduct) return [];
    return sizesMap[currentProduct.category] || ['Standard'];
  }, [currentProduct, sizesMap]);

  // Filtered products for dropdown selection
  const filteredProducts = useMemo(() => {
    return inventory.filter(p => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch = !q || 
        (p.sku && p.sku.toLowerCase().includes(q)) || 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.styleCategory && p.styleCategory.toLowerCase().includes(q)) ||
        (p.color && p.color.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [inventory, categoryFilter, searchTerm]);

  // Total quantity being sent
  const totalUnitsToSend = useMemo(() => {
    return Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q, 10) || 0), 0);
  }, [sizeQuantities]);

  // Handle size qty change
  const handleQtyChange = (size, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const available = Number(currentProduct?.sizes?.[size] || 0);
    
    // Cap at available stock
    const capped = Math.min(num, available);
    setSizeQuantities(prev => ({
      ...prev,
      [size]: capped
    }));
  };

  const handleQuickAdd = (size, delta) => {
    const cur = Number(sizeQuantities[size] || 0);
    const available = Number(currentProduct?.sizes?.[size] || 0);
    const next = Math.max(0, Math.min(cur + delta, available));
    setSizeQuantities(prev => ({
      ...prev,
      [size]: next
    }));
  };

  // Submit dispatch
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!currentProduct) {
      setStatusMsg({ type: 'error', text: 'Please select a product first' });
      return;
    }

    if (totalUnitsToSend <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter at least 1 piece to send' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      await sendStockToWarehouse({
        productId: currentProduct.id,
        dispatchNo: dispatchNo.trim() || `WH-${Date.now().toString().slice(-6)}`,
        destination: destination.trim(),
        reason: reason.trim(),
        notes: notes.trim(),
        date: dispatchDate,
        sizeQuantities
      });

      setStatusMsg({
        type: 'success',
        text: `Successfully dispatched ${totalUnitsToSend} units of ${currentProduct.styleCategory || currentProduct.name} to ${destination}!`
      });

      // Reset form
      setSizeQuantities({});
      setNotes('');
      setDispatchNo(`WH-${Date.now().toString().slice(-6)}`);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to dispatch to warehouse' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Total statistics for warehouse sends
  const stats = useMemo(() => {
    const totalDispatches = warehouseSends.length;
    const totalUnits = warehouseSends.reduce((s, w) => s + (Number(w.totalCount) || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayUnits = warehouseSends
      .filter(w => (w.timestamp || '').slice(0, 10) === today)
      .reduce((s, w) => s + (Number(w.totalCount) || 0), 0);

    return { totalDispatches, totalUnits, todayUnits };
  }, [warehouseSends]);

  // Filtered dispatch history
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return warehouseSends;
    const q = historySearch.toLowerCase();
    return warehouseSends.filter(w => 
      (w.dispatchNo && w.dispatchNo.toLowerCase().includes(q)) ||
      (w.productName && w.productName.toLowerCase().includes(q)) ||
      (w.sku && w.sku.toLowerCase().includes(q)) ||
      (w.destination && w.destination.toLowerCase().includes(q)) ||
      (w.reason && w.reason.toLowerCase().includes(q))
    );
  }, [warehouseSends, historySearch]);

  const handlePrintChallan = (challan) => {
    setSelectedChallan(challan);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Stock Send to Warehouse
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                गोदाम में माल वापसी / भेजना (Deducts available inventory in real time)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pill Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Dispatches</span>
            <span className="text-lg font-black text-white">{stats.totalDispatches}</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-amber-400/90 font-semibold block uppercase">Total Pieces Sent</span>
            <span className="text-lg font-black text-amber-400">{stats.totalUnits}</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-emerald-400 font-semibold block uppercase">Today's Units</span>
            <span className="text-lg font-black text-emerald-400">{stats.todayUnits}</span>
          </div>
        </div>
      </div>

      {/* Main Dispatch Creation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Dispatch Details (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Warehouse className="w-4 h-4 text-amber-400" />
            Create Warehouse Dispatch Challan
          </h2>

          {/* Status Message */}
          {statusMsg.text && (
            <div className={`mb-5 p-3.5 rounded-xl border flex items-center gap-3 text-sm ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {statusMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleDispatch} className="space-y-5">
            
            {/* Row 1: Product Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select Article / Product <span className="text-amber-400">*</span>
              </label>

              {/* Filters for quick search */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search SKU (e.g. SG-F-1560-TAN, SGM-21) or Style..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Product Select Dropdown */}
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSizeQuantities({});
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                {filteredProducts.map(p => {
                  const stock = Object.values(p.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.styleCategory || p.name} ({p.color}) [Stock: {stock}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Product Card Preview */}
            {currentProduct && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full border border-white/20 shadow-inner flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: getColorHex(currentProduct.color) }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-amber-400">{currentProduct.sku}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {categories.find(c => c.id === currentProduct.category)?.label || currentProduct.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-semibold">
                      Style: <span className="text-white">{currentProduct.styleCategory || currentProduct.name}</span> | Color: <span className="text-white">{currentProduct.color}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Row 2: Challan No, Date, Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Dispatch / Challan No
                </label>
                <input
                  type="text"
                  value={dispatchNo}
                  onChange={(e) => setDispatchNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Dispatch Date
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Destination Warehouse
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Central Warehouse">Central Warehouse (Main)</option>
                  <option value="Regional Hub">Regional Distribution Hub</option>
                  <option value="Factory / Supplier">Factory / Vendor Return</option>
                  <option value="Other Outlet">Branch / Outlet Transfer</option>
                </select>
              </div>
            </div>

            {/* Row 3: Return Reason & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason for Sending
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Seasonal Return">Seasonal Return (सीजनल वापसी)</option>
                  <option value="Defect / Damaged">Defect / Damaged Piece (खराब / कटा-फटा)</option>
                  <option value="Excess Stock">Excess Stock / Rebalance (ज्यादा स्टॉक)</option>
                  <option value="Customer Return to Hub">Customer Return to Warehouse</option>
                  <option value="Slow Mover">Slow Mover Relocation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Notes / Driver / Vehicle
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sent via Driver Ramesh, Tempo DL-1L-4412"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Row 4: Size Selection Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Sizes & Quantities to Dispatch <span className="text-amber-400">*</span>
                </label>
                <span className="text-xs font-bold text-amber-400">
                  Total To Send: {totalUnitsToSend} Pieces
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 gap-2">
                {activeSizes.map(size => {
                  const available = Number(currentProduct?.sizes?.[size] || 0);
                  const sending = Number(sizeQuantities[size] || 0);
                  const isAvailable = available > 0;

                  return (
                    <div 
                      key={size}
                      className={`p-2.5 rounded-xl border transition-all text-center ${
                        sending > 0
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : isAvailable
                            ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950/40 border-slate-900 opacity-50'
                      }`}
                    >
                      <span className="text-xs font-black text-white block mb-0.5">{size}</span>
                      
                      <span className={`text-[10px] font-bold block mb-1.5 ${
                        available === 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        Stock: {available}
                      </span>

                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={!isAvailable || sending === 0}
                          onClick={() => handleQuickAdd(size, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          min="0"
                          max={available}
                          disabled={!isAvailable}
                          value={sizeQuantities[size] || ''}
                          onChange={(e) => handleQtyChange(size, e.target.value)}
                          placeholder="0"
                          className="w-10 bg-slate-900 border border-slate-700 rounded-lg text-center text-xs font-black text-amber-400 py-1 focus:outline-none focus:border-amber-400 disabled:opacity-40"
                        />

                        <button
                          type="button"
                          disabled={!isAvailable || sending >= available}
                          onClick={() => handleQuickAdd(size, 1)}
                          className="w-6 h-6 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSizeQuantities({})}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition"
              >
                Clear Sizes
              </button>

              <button
                type="submit"
                disabled={isSubmitting || totalUnitsToSend === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    Dispatch {totalUnitsToSend > 0 ? `${totalUnitsToSend} Units` : ''} to Warehouse
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Info: Quick Summary / Rules (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-amber-400" />
              Warehouse Dispatch Guidelines
            </h3>
            
            <ul className="text-xs text-slate-300 space-y-2.5 list-disc pl-4">
              <li>
                <strong className="text-white">Instant Stock Deduction:</strong> Once dispatched, the selected quantities are automatically deducted from the store's inventory on both PC and mobile devices.
              </li>
              <li>
                <strong className="text-white">Challan Record:</strong> Each dispatch creates an official warehouse challan number for stock audit and reconciliation.
              </li>
              <li>
                <strong className="text-white">Audit History:</strong> All dispatches are archived under the <span className="text-amber-400 font-bold">History</span> tab and can be exported to Excel anytime.
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-4 sm:p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Live Store Status
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ensure all defective or end-of-season footwear and jackets are verified before handing over to transit.
            </p>
          </div>
        </div>

      </div>

      {/* Dispatch History Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Recent Warehouse Dispatches ({warehouseSends.length})
            </h2>
            <p className="text-xs text-slate-400">Past stock dispatches sent from this store</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search challan, SKU, dest..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No warehouse dispatch records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">SR NO</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Challan No</th>
                  <th className="py-2.5 px-3">Article / SKU</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Sizes Sent</th>
                  <th className="py-2.5 px-3 text-right">Total Qty</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredHistory.map((item, idx) => {
                  const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : 'N/A';

                  const sizesStr = Object.entries(item.sentItems || {})
                    .map(([s, q]) => `${s}: ${q}`)
                    .join(', ');

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{dateStr}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{item.dispatchNo}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{item.styleCategory || item.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{item.destination}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700">
                          {item.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-200">{sizesStr || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-400 text-sm">
                        {item.totalCount} pcs
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingRecord(item)}
                            title="Edit this dispatch (change sizes or reason)"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handlePrintChallan(item)}
                            title="Print Dispatch Challan"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Challan Slip (Visible when printing) */}
      {selectedChallan && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-50">
          <div className="text-center border-b pb-4 mb-4">
            <h1 className="text-2xl font-black">KY INVENTORY — DISPATCH CHALLAN</h1>
            <p className="text-xs text-gray-600">Stock Transfer & Warehouse Return Slip</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <p><strong>Challan No:</strong> {selectedChallan.dispatchNo}</p>
              <p><strong>Date:</strong> {new Date(selectedChallan.timestamp).toLocaleString('en-IN')}</p>
              <p><strong>Destination:</strong> {selectedChallan.destination}</p>
            </div>
            <div>
              <p><strong>Article:</strong> {selectedChallan.styleCategory || selectedChallan.productName}</p>
              <p><strong>SKU:</strong> {selectedChallan.sku}</p>
              <p><strong>Reason:</strong> {selectedChallan.reason}</p>
            </div>
          </div>

          <table className="w-full text-xs border border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100 border">
                <th className="p-2 border text-left">Size</th>
                <th className="p-2 border text-right">Quantity (Pieces)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(selectedChallan.sentItems || {}).map(([s, q]) => (
                <tr key={s} className="border">
                  <td className="p-2 border">{s}</td>
                  <td className="p-2 border text-right font-bold">{q}</td>
                </tr>
              ))}
              <tr className="font-black bg-gray-50 border">
                <td className="p-2 border">TOTAL PIECES</td>
                <td className="p-2 border text-right">{selectedChallan.totalCount}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-12 flex justify-between text-xs pt-8 border-t border-gray-400">
            <div>
              <p className="border-t border-gray-500 w-40 text-center pt-1">Prepared By (Store)</p>
            </div>
            <div>
              <p className="border-t border-gray-500 w-40 text-center pt-1">Receiver's Signature (Warehouse)</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Warehouse Dispatch Modal */}
      <EditWarehouseModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        recordToEdit={editingRecord}
      />

    </div>
  );
}
