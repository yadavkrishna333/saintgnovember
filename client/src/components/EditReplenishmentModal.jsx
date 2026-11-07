import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  X, 
  Save, 
  Trash2, 
  Calendar, 
  FileText, 
  Truck, 
  Layers, 
  AlertCircle, 
  CheckCircle2,
  PackageCheck
} from 'lucide-react';

export function EditReplenishmentModal({ isOpen, onClose, replenishment }) {
  const { updateReplenishmentRecord, deleteReplenishmentRecord, inventory, sizesMap } = useInventory();

  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Find linked product in inventory
  const linkedProduct = replenishment 
    ? inventory.find(p => p.id === replenishment.productId || (p.sku && p.sku === replenishment.sku))
    : null;

  useEffect(() => {
    if (isOpen && replenishment) {
      const d = replenishment.timestamp ? new Date(replenishment.timestamp) : new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');

      setDateStr(`${yr}-${mo}-${da}`);
      setTimeStr(`${hr}:${mi}`);
      setSupplier(replenishment.supplier || '');
      setInvoiceNo(replenishment.invoiceNo || '');
      setNotes(replenishment.notes || '');

      // Load size quantities
      const initialSizes = {};
      if (replenishment.receivedItems) {
        Object.entries(replenishment.receivedItems).forEach(([sz, q]) => {
          initialSizes[sz] = Number(q) || 0;
        });
      } else if (replenishment.size) {
        initialSizes[replenishment.size] = Number(replenishment.quantity || replenishment.qty || 1);
      }
      setSizeQuantities(initialSizes);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, replenishment]);

  if (!isOpen || !replenishment) return null;

  // Available sizes for this category
  const categoryKey = linkedProduct?.category || replenishment.category || 'women_footwear';
  const categorySizes = sizesMap[categoryKey] || ['35', '36', '37', '38', '39', '40', '41', 'Standard'];
  
  // Combine category sizes with any already in the replenishment
  const allAvailableSizes = Array.from(new Set([
    ...categorySizes,
    ...Object.keys(sizeQuantities)
  ]));

  const handleSizeChange = (sz, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSizeQuantities(prev => ({
      ...prev,
      [sz]: num
    }));
  };

  const totalUnits = Object.values(sizeQuantities).reduce((a, b) => a + (Number(b) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalUnits === 0) {
      setErrorMsg('कम से कम 1 साइज़ में क्वांटिटी होना अनिवार्य है (Specify at least 1 unit)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = (timeStr || '12:00').split(':').map(Number);
      const targetDate = new Date(year, month - 1, day, hours || 12, minutes || 0, 0);

      // Filter out zero quantities
      const cleanReceivedItems = {};
      Object.entries(sizeQuantities).forEach(([sz, q]) => {
        if (Number(q) > 0) cleanReceivedItems[sz] = Number(q);
      });

      await updateReplenishmentRecord(replenishment.id, {
        supplier: supplier.trim(),
        invoiceNo: invoiceNo.trim(),
        notes: notes.trim(),
        receivedItems: cleanReceivedItems,
        timestamp: targetDate.toISOString()
      });

      setSuccessMsg('✓ Stock Received (Replenishment) रिकॉर्ड और इन्वेंट्री स्टॉक सफलतापूर्वक अपडेट हो गए!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'अपडेट करने में समस्या आई');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmMsg = `Kya aap is Replenishment record ko DELETE karna chahte hain?\n\n` +
      `Article: ${replenishment.productName || replenishment.sku}\n` +
      `Invoice: ${replenishment.invoiceNo || 'N/A'}\n` +
      `Total Received: ${replenishment.totalCount || totalUnits} pcs\n\n` +
      `⚠️ Note: Is record se joda gaya stock inventory se wapas MINUS kar diya jayega.`;

    if (window.confirm(confirmMsg)) {
      setIsSubmitting(true);
      try {
        await deleteReplenishmentRecord(replenishment.id);
        onClose();
      } catch (err) {
        setErrorMsg(err.message || 'Failed to delete replenishment');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Edit Stock In Received (स्टॉक इन संपादित करें)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                SKU: {replenishment.sku} &bull; {replenishment.productName || 'Article'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Receipt Date (तारीख)*:
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Receipt Time (समय):
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Supplier & Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Invoice / Bill No:
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2024-889"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Supplier / Vendor:
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Factory / Distributor name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Size Wise Quantities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Received Quantities by Size (साइज़ अनुसार पीस):
              </label>
              <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                Total: {totalUnits} pieces
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              {allAvailableSizes.map((sz) => {
                const val = sizeQuantities[sz] !== undefined ? sizeQuantities[sz] : 0;
                const oldVal = replenishment.receivedItems?.[sz] || 0;
                const isChanged = val !== oldVal;

                return (
                  <div key={sz} className="flex flex-col items-center">
                    <span className="text-[11px] font-mono font-bold text-slate-400 mb-1">
                      {sz}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={val}
                      onChange={(e) => handleSizeChange(sz, e.target.value)}
                      className={`w-full text-center py-1.5 rounded-lg text-xs font-mono font-black border transition ${
                        isChanged
                          ? 'bg-blue-950/40 border-blue-400 text-blue-300'
                          : val > 0
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500'
                      } focus:outline-none focus:border-blue-500`}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              ℹ️ Quantities badalne par inventory ka stock difference automatic plus/minus ho jayega.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes / Remarks (रिमार्क):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Batch 2, verified with delivery challan"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete / Revert</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes (अपडेट करें)'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
