import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  X, 
  Edit3, 
  Check, 
  AlertCircle, 
  Warehouse, 
  RefreshCw 
} from 'lucide-react';

export function EditWarehouseModal({ isOpen, onClose, recordToEdit }) {
  const { inventory, sizesMap, updateWarehouseRecord } = useInventory();

  const [dispatchNo, setDispatchNo] = useState('');
  const [destination, setDestination] = useState('Central Warehouse');
  const [reason, setReason] = useState('Seasonal Return');
  const [notes, setNotes] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Find product in inventory
  const currentProduct = useMemo(() => {
    if (!recordToEdit) return null;
    return inventory.find(p => p.id === recordToEdit.productId) || null;
  }, [inventory, recordToEdit]);

  // Allowed sizes for this product
  const activeSizes = useMemo(() => {
    if (!currentProduct) return [];
    return sizesMap[currentProduct.category] || ['Standard'];
  }, [currentProduct, sizesMap]);

  // Initialize form with existing record
  useEffect(() => {
    if (recordToEdit && isOpen) {
      setDispatchNo(recordToEdit.dispatchNo || '');
      setDestination(recordToEdit.destination || 'Central Warehouse');
      setReason(recordToEdit.reason || 'Seasonal Return');
      setNotes(recordToEdit.notes || '');
      setSizeQuantities({ ...(recordToEdit.sentItems || {}) });
      setErrorMsg('');
    }
  }, [recordToEdit, isOpen]);

  if (!isOpen || !recordToEdit) return null;

  // Total units to send
  const totalUnits = Object.values(sizeQuantities).reduce((s, q) => s + (parseInt(q, 10) || 0), 0);

  // Maximum allowed for each size = current stock in inventory + previously sent in this record
  const getMaxAllowedForSize = (size) => {
    const inStock = Number(currentProduct?.sizes?.[size] || 0);
    const previouslySent = Number(recordToEdit?.sentItems?.[size] || 0);
    return inStock + previouslySent;
  };

  const handleQtyChange = (size, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const maxAllowed = getMaxAllowedForSize(size);
    const capped = Math.min(num, maxAllowed);
    setSizeQuantities(prev => ({ ...prev, [size]: capped }));
  };

  const handleQuickAdd = (size, delta) => {
    const cur = Number(sizeQuantities[size] || 0);
    const maxAllowed = getMaxAllowedForSize(size);
    const next = Math.max(0, Math.min(cur + delta, maxAllowed));
    setSizeQuantities(prev => ({ ...prev, [size]: next }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalUnits <= 0) {
      setErrorMsg('Please specify at least 1 unit to dispatch');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await updateWarehouseRecord(recordToEdit.id, {
        dispatchNo: dispatchNo.trim(),
        destination: destination.trim(),
        reason: reason.trim(),
        notes: notes.trim(),
        sizeQuantities
      });

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update warehouse dispatch');
    } finally {
      setIsSubmitting(false);
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Edit Warehouse Dispatch</h2>
              <p className="text-xs text-slate-400">गोदाम चालान सुधारें (Auto-adjusts inventory stock)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Article Info Preview */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-mono font-black text-amber-400 text-sm block">{recordToEdit.sku}</span>
              <span className="text-slate-300 font-semibold">{recordToEdit.styleCategory || recordToEdit.productName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Challan</span>
              <span className="font-mono font-bold text-white text-xs">{recordToEdit.dispatchNo}</span>
            </div>
          </div>

          {/* Destination & Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Destination
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

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Seasonal Return">Seasonal Return</option>
                <option value="Defect / Damaged">Defect / Damaged Piece</option>
                <option value="Excess Stock">Excess Stock / Rebalance</option>
                <option value="Customer Return to Hub">Customer Return to Warehouse</option>
                <option value="Slow Mover">Slow Mover Relocation</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Remarks / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Returned via driver, replaced defect piece"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Sizes Matrix */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sizes & Quantities to Dispatch
              </label>
              <span className="text-xs font-bold text-amber-400">
                Total: {totalUnits} Pieces
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {activeSizes.map(size => {
                const sending = Number(sizeQuantities[size] || 0);
                const maxAllowed = getMaxAllowedForSize(size);
                const isAvailable = maxAllowed > 0;

                return (
                  <div 
                    key={size}
                    className={`p-2 rounded-xl border text-center transition ${
                      sending > 0
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                        : isAvailable
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-950/40 border-slate-900 opacity-40'
                    }`}
                  >
                    <span className="text-xs font-black text-white block">{size}</span>
                    <span className="text-[9px] text-slate-400 block mb-1">Max: {maxAllowed}</span>

                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        disabled={sending === 0}
                        onClick={() => handleQuickAdd(size, -1)}
                        className="w-5 h-5 rounded bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center disabled:opacity-30"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="0"
                        max={maxAllowed}
                        disabled={!isAvailable}
                        value={sizeQuantities[size] || ''}
                        onChange={(e) => handleQtyChange(size, e.target.value)}
                        placeholder="0"
                        className="w-8 bg-slate-900 border border-slate-700 rounded text-center text-xs font-black text-amber-400 py-0.5 focus:outline-none"
                      />

                      <button
                        type="button"
                        disabled={sending >= maxAllowed}
                        onClick={() => handleQuickAdd(size, 1)}
                        className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || totalUnits <= 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-40 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Save Challan Changes
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
