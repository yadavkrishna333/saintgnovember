import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import confetti from 'canvas-confetti';
import { 
  X, 
  Warehouse, 
  ClipboardPaste, 
  Check, 
  AlertCircle, 
  Layers, 
  ArrowUpRight,
  Package,
  Calendar,
  Truck,
  Sparkles,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { getColorDetails, formatColorName } from '../utils/colors';

export function BulkWarehousePasteModal({ isOpen, onClose }) {
  const { inventory, sizesMap, sendStockToWarehouse } = useInventory();

  // Form states
  const [rawText, setRawText] = useState('');
  const [destination, setDestination] = useState('Central Warehouse');
  const [reason, setReason] = useState('Seasonal Return');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [dispatchNo, setDispatchNo] = useState(`WH-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sample templates to help the user
  const sample1 = `SG-F-1732-RED 37
SG-F-1852-SILVER 38 2
SG-F-1867-BLACK 36`;

  const sample2 = `SG-F-1732-RED 1 2 1 1 1 1
SG-F-1852-SILVER 0 1 2 1 1 1 0
SG-F-1867-OFFWHITE 1 2 1 1 1 2`;

  // Parse raw text into structured rows
  const parsedRows = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n');
    const results = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const upper = trimmed.toUpperCase();
      if (upper.includes('SR NO') || upper.includes('SKU CODE') || upper.includes('STYLE CATEGORY')) {
        return;
      }

      // Split by tab, comma, or spaces
      const tokens = trimmed.split(/[\t, ]+/).filter(Boolean);
      if (tokens.length === 0) return;

      // Skip row index number if present (e.g. "1 SG-F-1852-SILVER")
      let startIdx = 0;
      if (/^\d+$/.test(tokens[0]) && tokens.length > 2 && /^[a-zA-Z]/.test(tokens[1])) {
        startIdx = 1;
      }

      const sku = (tokens[startIdx] || '').toUpperCase();
      if (!sku) return;

      const restTokens = tokens.slice(startIdx + 1);

      // Find matching product in catalog
      const matched = inventory.find(p => p.sku?.toUpperCase() === sku);
      const categorySizes = matched 
        ? (sizesMap[matched.category] || ['35', '36', '37', '38', '39', '40', '41'])
        : ['35', '36', '37', '38', '39', '40', '41'];

      const requestedSizes = {};
      let isSingle = false;

      if (restTokens.length === 1) {
        // e.g. "37" -> 1 piece
        const sz = restTokens[0].toUpperCase();
        requestedSizes[sz] = 1;
        isSingle = true;
      } else if (restTokens.length === 2 && /^\d+$/.test(restTokens[1])) {
        // e.g. "37 2" -> 2 pieces
        const sz = restTokens[0].toUpperCase();
        requestedSizes[sz] = Number(restTokens[1]) || 1;
        isSingle = true;
      } else if (restTokens.length > 1) {
        // Multi-number distribution e.g. "1 2 1 1 1 1"
        const numbers = restTokens.map(t => parseInt(t, 10)).filter(n => !isNaN(n));

        if (numbers.length === 6) {
          const sizes6 = ['36', '37', '38', '39', '40', '41'];
          sizes6.forEach((sz, sIdx) => {
            if (numbers[sIdx] > 0) requestedSizes[sz] = numbers[sIdx];
          });
        } else if (numbers.length === 7) {
          const sizes7 = ['35', '36', '37', '38', '39', '40', '41'];
          sizes7.forEach((sz, sIdx) => {
            if (numbers[sIdx] > 0) requestedSizes[sz] = numbers[sIdx];
          });
        } else if (numbers.length === 5) {
          const sizes5 = ['S', 'M', 'L', 'XL', 'XXL'];
          sizes5.forEach((sz, sIdx) => {
            if (numbers[sIdx] > 0) requestedSizes[sz] = numbers[sIdx];
          });
        } else {
          categorySizes.forEach((sz, sIdx) => {
            if (numbers[sIdx] && numbers[sIdx] > 0) {
              requestedSizes[sz] = numbers[sIdx];
            }
          });
        }
      }

      // Check stock availability
      let hasStockDeficit = false;
      let totalSendUnits = 0;
      const verifiedSizes = {};

      if (matched) {
        Object.entries(requestedSizes).forEach(([sz, reqQty]) => {
          const available = Number(matched.sizes?.[sz] || 0);
          const actualSend = Math.min(reqQty, available);
          if (actualSend > 0) {
            verifiedSizes[sz] = actualSend;
            totalSendUnits += actualSend;
          }
          if (reqQty > available) {
            hasStockDeficit = true;
          }
        });
      }

      results.push({
        lineIndex: idx + 1,
        sku,
        isMatched: !!matched,
        product: matched || null,
        requestedSizes,
        verifiedSizes,
        totalSendUnits,
        hasStockDeficit,
        isSingle
      });
    });

    return results;
  }, [rawText, inventory, sizesMap]);

  if (!isOpen) return null;

  const validRows = parsedRows.filter(r => r.isMatched && r.totalSendUnits > 0);
  const totalUnitsToDispatch = validRows.reduce((sum, r) => sum + r.totalSendUnits, 0);

  const handleApplyDispatch = async () => {
    if (validRows.length === 0) {
      setErrorMessage('Koi valid article ya stock nahi mila dispatch karne ke liye. Kripya SKU aur sizes check karein.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let dispatchedArticlesCount = 0;
      let totalUnitsSent = 0;

      for (const row of validRows) {
        const res = await sendStockToWarehouse({
          productId: row.product.id,
          dispatchNo: dispatchNo.trim() || `WH-${Date.now().toString().slice(-6)}`,
          destination: destination.trim(),
          reason: reason.trim(),
          notes: notes.trim(),
          date: dispatchDate,
          sizeQuantities: row.verifiedSizes
        });

        if (res?.success || res?.record) {
          dispatchedArticlesCount++;
          totalUnitsSent += row.totalSendUnits;
        }
      }

      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSuccessMessage(`✅ Safalta! ${dispatchedArticlesCount} articles (${totalUnitsSent} pieces) warehouse dispatch ho gaye!`);
      
      setTimeout(() => {
        setRawText('');
        setNotes('');
        setDispatchNo(`WH-${Date.now().toString().slice(-6)}`);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Bulk warehouse dispatch error:', err);
      setErrorMessage(err.message || 'Dispatch karte samay error aaya. Kripya dubara koshish karein.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Bulk Send to Warehouse
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Bulk Paste
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ek saath kai articles paste karke warehouse ko dispatch karein
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Dispatch Metadata Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Destination (Warehouse) *
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Central Warehouse"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Reason (कारण) *
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                <option value="Seasonal Return">Seasonal Return</option>
                <option value="Overstock Return">Overstock Return</option>
                <option value="Defective / Damaged">Defective / Damaged</option>
                <option value="Store Transfer">Store Transfer</option>
                <option value="Slow Moving Article">Slow Moving Article</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Dispatch Date *
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Challan / Dispatch No
              </label>
              <input
                type="text"
                value={dispatchNo}
                onChange={e => setDispatchNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Format Quick Helper Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
              Neeche box me SKU aur sizes paste karein:
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawText(sample1)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
              >
                Sample 1 (Single Size)
              </button>
              <button
                type="button"
                onClick={() => setRawText(sample2)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition"
              >
                Sample 2 (Multi-Size 36-41)
              </button>
            </div>
          </div>

          {/* Paste Input Textarea */}
          <div className="relative">
            <textarea
              rows={5}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Udharan ke liye paste karein:\nSG-F-1732-RED 37\nSG-F-1852-SILVER 38 2\nSG-F-1867-BLACK 1 2 1 1 1 1\nYa Excel sheet se copy karke sidha paste karein...`}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-y shadow-inner"
            />
          </div>

          {/* Live Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Live Preview ({parsedRows.length} rows parsed):</span>
                <span className="text-amber-400 font-mono">
                  {validRows.length} valid articles &bull; {totalUnitsToDispatch} total pieces to dispatch
                </span>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 font-black text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">SKU CODE</th>
                      <th className="py-2 px-3">ARTICLE</th>
                      <th className="py-2 px-3 text-center">DISPATCH SIZES</th>
                      <th className="py-2 px-3 text-center">SEND PCS</th>
                      <th className="py-2 px-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {parsedRows.map((row) => {
                      return (
                        <tr key={row.lineIndex} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-mono text-slate-500 text-[10px]">
                            {row.lineIndex}
                          </td>

                          <td className="py-2 px-3 font-mono font-bold text-amber-300 text-[11px]">
                            {row.sku}
                          </td>

                          <td className="py-2 px-3 text-slate-300 truncate max-w-[150px]">
                            {row.product ? (
                              <div>
                                <span className="font-bold">{row.product.styleCategory || row.product.name}</span>
                                <span className="text-[10px] text-slate-500 ml-1.5 font-bold">({row.product.color})</span>
                              </div>
                            ) : (
                              <span className="text-rose-400 font-bold">Not in catalog</span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-center">
                            {row.product ? (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {Object.entries(row.requestedSizes).map(([sz, qty]) => {
                                  const avail = Number(row.product.sizes?.[sz] || 0);
                                  const isShort = qty > avail;

                                  return (
                                    <span 
                                      key={sz} 
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                                        isShort
                                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      }`}
                                      title={`Requested: ${qty}, In Store: ${avail}`}
                                    >
                                      {sz}: {Math.min(qty, avail)} {isShort && `(Avail: ${avail})`}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-center font-mono font-black text-amber-400">
                            {row.totalSendUnits} pcs
                          </td>

                          <td className="py-2 px-3 text-center">
                            {!row.isMatched ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                ❌ Not Found
                              </span>
                            ) : row.totalSendUnits === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                0 Stock
                              </span>
                            ) : row.hasStockDeficit ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⚠️ Capped Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ✅ Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {totalUnitsToDispatch > 0 ? (
              <span>
                Total <strong className="text-amber-400 font-mono text-sm">{totalUnitsToDispatch} pieces</strong> will be deducted from store and dispatched.
              </span>
            ) : (
              <span>Paste articles above to calculate dispatch quantity</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting || totalUnitsToDispatch <= 0}
              onClick={handleApplyDispatch}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Dispatch All ({totalUnitsToDispatch} pcs)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
