import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import confetti from 'canvas-confetti';
import { 
  X, 
  ClipboardPaste, 
  Check, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Plus, 
  RefreshCw,
  HelpCircle,
  PackageCheck
} from 'lucide-react';
import { supabaseApi, isSupabaseConfigured } from '../utils/supabase';
import { detectCategoryFromSheetOrSku } from '../utils/excelInventoryParser';

export function BulkPasteModal({ isOpen, onClose }) {
  const { inventory, categories, sizesMap, addProduct, updateProduct, currentStore } = useInventory();
  const currentStoreUserId = currentStore?.userId || 'usr-krishan';

  const [rawText, setRawText] = useState('');
  const [pasteMode, setPasteMode] = useState('add'); // 'add' (plus quantities) | 'set' (exact replace)
  const [defaultCategory, setDefaultCategory] = useState('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importReport, setImportReport] = useState(null);
  const [copiedUnmatched, setCopiedUnmatched] = useState(false);

  // Sample templates to help the user
  const sample1 = `SG-F-1732-RED 37
SG-F-1852-SILVER 38
SG-F-1867-BLACK 36`;

  const sample2 = `SG-F-1732-RED 1 2 1 1 1 1
SG-F-1852-SILVER 0 1 2 1 1 1 0
SG-F-1867-OFFWHITE 1 2 1 1 1 2`;

  // Parse pasted raw text
  const parsedRows = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n');
    const results = [];

    const categorySizes = sizesMap[defaultCategory] || ['35', '36', '37', '38', '39', '40', '41'];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Skip header lines
      const upper = trimmed.toUpperCase();
      if (upper.includes('SR NO') || upper.includes('SKU CODE') || upper.includes('STYLE CATEGORY')) {
        return;
      }

      // Split by tab, comma, or space
      const tokens = trimmed.split(/[\t, ]+/).filter(Boolean);
      if (tokens.length === 0) return;

      // If line starts with a number like "1", "2" (row index), skip it if next token looks like SKU
      let startIdx = 0;
      if (/^\d+$/.test(tokens[0]) && tokens.length > 2 && /^[a-zA-Z]/.test(tokens[1])) {
        startIdx = 1;
      }

      const sku = (tokens[startIdx] || '').toUpperCase();
      if (!sku) return;

      const restTokens = tokens.slice(startIdx + 1);

      // Find matching product in existing catalog
      const matched = inventory.find(p => p.sku?.toUpperCase() === sku);

      // Detect category per row
      const detectedCat = detectCategoryFromSheetOrSku('', sku);
      const rowCategory = matched?.category || (defaultCategory === 'auto' ? detectedCat : (detectedCat !== 'women_footwear' ? detectedCat : defaultCategory));

      const parsedSizes = {};
      let isSingleSize = false;

      if (restTokens.length === 1) {
        // Single size format: e.g. "37" or "M"
        const singleSize = restTokens[0].toUpperCase();
        parsedSizes[singleSize] = 1;
        isSingleSize = true;
      } else if (restTokens.length === 2 && /^\d+$/.test(restTokens[1])) {
        // Single size with custom qty: e.g. "37 2"
        const singleSize = restTokens[0].toUpperCase();
        parsedSizes[singleSize] = Number(restTokens[1]) || 1;
        isSingleSize = true;
      } else if (restTokens.length > 1) {
        // Multi-number distribution format: e.g. "1 2 1 1 1 1"
        const numbers = restTokens.map(t => parseInt(t, 10)).filter(n => !isNaN(n));

        if (rowCategory === 'men_footwear') {
          // Mens Footwear sizes 40 to 45 (or 39 to 45 if 7 numbers)
          if (numbers.length === 6) {
            const sizesMen6 = ['40', '41', '42', '43', '44', '45'];
            sizesMen6.forEach((sz, sIdx) => {
              parsedSizes[sz] = numbers[sIdx] || 0;
            });
          } else if (numbers.length === 7) {
            const sizesMen7 = ['39', '40', '41', '42', '43', '44', '45'];
            sizesMen7.forEach((sz, sIdx) => {
              parsedSizes[sz] = numbers[sIdx] || 0;
            });
          } else {
            const mSizes = sizesMap['men_footwear'] || ['40', '41', '42', '43', '44', '45'];
            mSizes.forEach((sz, sIdx) => {
              if (numbers[sIdx] !== undefined) parsedSizes[sz] = numbers[sIdx];
            });
          }
        } else if (rowCategory === 'men_jacket' || rowCategory === 'women_jacket') {
          // Jackets: S, M, L, XL, XXL
          const sizes5 = ['S', 'M', 'L', 'XL', 'XXL'];
          sizes5.forEach((sz, sIdx) => {
            if (numbers[sIdx] !== undefined) {
              parsedSizes[sz] = numbers[sIdx] || 0;
            }
          });
        } else if (rowCategory === 'bags') {
          parsedSizes['Standard'] = numbers[0] || 1;
        } else {
          // Default / Women Footwear
          if (numbers.length === 6) {
            const sizes6 = ['36', '37', '38', '39', '40', '41'];
            sizes6.forEach((sz, sIdx) => {
              parsedSizes[sz] = numbers[sIdx] || 0;
            });
          } else if (numbers.length === 7) {
            const sizes7 = ['35', '36', '37', '38', '39', '40', '41'];
            sizes7.forEach((sz, sIdx) => {
              parsedSizes[sz] = numbers[sIdx] || 0;
            });
          } else {
            const catSizes = sizesMap[rowCategory] || ['35', '36', '37', '38', '39', '40', '41'];
            catSizes.forEach((sz, sIdx) => {
              if (numbers[sIdx] !== undefined) {
                parsedSizes[sz] = numbers[sIdx];
              }
            });
          }
        }
      }

      // Guess color from SKU if not matched
      let guessedColor = 'Black';
      const parts = sku.split('-');
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        if (isNaN(Number(lastPart))) {
          guessedColor = lastPart.charAt(0) + lastPart.slice(1).toLowerCase();
        }
      }

      const totalQty = Object.values(parsedSizes).reduce((a, b) => a + (Number(b) || 0), 0);

      results.push({
        lineIndex: idx + 1,
        sku,
        category: rowCategory,
        isMatched: !!matched,
        product: matched || null,
        parsedSizes,
        isSingleSize,
        totalQty,
        guessedColor
      });
    });

    return results;
  }, [rawText, defaultCategory, inventory, sizesMap]);

  if (!isOpen) return null;

  const totalParsedPieces = parsedRows.reduce((sum, r) => sum + r.totalQty, 0);

  const handleApplyAll = async () => {
    if (parsedRows.length === 0) {
      setErrorMessage('Pehle kuch data paste karein');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let updatedCount = 0;
      let createdCount = 0;
      const matchedList = [];
      const unmatchedList = [];

      for (const row of parsedRows) {
        if (row.product) {
          // Update existing item
          const existingSizes = { ...(row.product.sizes || {}) };
          
          if (pasteMode === 'add') {
            // Plus / Increment
            Object.entries(row.parsedSizes).forEach(([sz, qty]) => {
              existingSizes[sz] = (Number(existingSizes[sz]) || 0) + (Number(qty) || 0);
            });
          } else {
            // Exact Replace
            Object.entries(row.parsedSizes).forEach(([sz, qty]) => {
              existingSizes[sz] = Number(qty) || 0;
            });
          }

          const updatedProduct = {
            ...row.product,
            sizes: existingSizes,
            updatedAt: new Date().toISOString()
          };

          await updateProduct(row.product.id, updatedProduct);

          // Sync to Supabase if configured
          if (isSupabaseConfigured()) {
            try {
              await supabaseApi.upsertProduct(updatedProduct, currentStoreUserId);
            } catch (e) {
              console.warn('Supabase bulk sync warning:', e);
            }
          }
          updatedCount++;
          matchedList.push({
            sku: row.sku,
            styleCategory: row.product.styleCategory || row.product.name,
            color: row.product.color,
            sizes: row.parsedSizes,
            totalQty: row.totalQty
          });
        } else {
          // Create new product with accurate category auto-detection
          const newId = `prod-${currentStore?.code?.toLowerCase() || 'mgs'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const targetCategory = row.category || (defaultCategory === 'auto' ? 'women_footwear' : defaultCategory);
          
          let defaultDisplaySize = '37';
          let defaultStyleCat = 'Block Heels';
          let defaultPrice = 3990;

          if (targetCategory === 'men_footwear') {
            defaultDisplaySize = '41';
            defaultStyleCat = 'Mens Shoes';
          } else if (targetCategory === 'men_jacket') {
            defaultDisplaySize = 'M';
            defaultStyleCat = 'Mens Jackets';
            defaultPrice = 4990;
          } else if (targetCategory === 'women_jacket') {
            defaultDisplaySize = 'M';
            defaultStyleCat = 'Women Jackets';
            defaultPrice = 4990;
          } else if (targetCategory === 'bags') {
            defaultDisplaySize = 'Standard';
            defaultStyleCat = 'Leather Bags';
          }

          const initialSizes = {};
          const catSizes = sizesMap[targetCategory] || (
            targetCategory === 'men_footwear' ? ['40', '41', '42', '43', '44', '45'] :
            targetCategory.includes('jacket') ? ['S', 'M', 'L', 'XL', 'XXL'] :
            targetCategory === 'bags' ? ['Standard'] :
            ['35', '36', '37', '38', '39', '40', '41']
          );
          
          catSizes.forEach(sz => {
            initialSizes[sz] = Number(row.parsedSizes[sz]) || 0;
          });
          // Also set any parsed size not explicitly in default set
          Object.entries(row.parsedSizes).forEach(([sz, q]) => {
            initialSizes[sz] = Number(q) || 0;
          });

          const newProduct = {
            id: newId,
            userId: currentStoreUserId,
            sku: row.sku,
            name: row.sku,
            styleCategory: defaultStyleCat,
            color: row.guessedColor,
            category: targetCategory,
            brand: 'Saint G',
            costPrice: 0,
            sellingPrice: defaultPrice,
            sizes: initialSizes,
            displaySize: defaultDisplaySize,
            imageUrl: `/products/${row.sku.toUpperCase()}.png`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await addProduct(newProduct);

          if (isSupabaseConfigured()) {
            try {
              await supabaseApi.upsertProduct(newProduct, currentStoreUserId);
            } catch (e) {
              console.warn('Supabase bulk create warning:', e);
            }
          }
          createdCount++;
          unmatchedList.push({
            sku: row.sku,
            guessedColor: row.guessedColor,
            sizes: row.parsedSizes,
            totalQty: row.totalQty
          });
        }
      }

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setImportReport({
        updatedCount,
        createdCount,
        totalQty: totalParsedPieces,
        matchedList,
        unmatchedList
      });
      setSuccessMessage(`✅ Process complete: ${updatedCount} matched & updated, ${createdCount} not matched (added as new).`);
    } catch (err) {
      setErrorMessage(err.message || 'Bulk add failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Bulk Paste / Add Multiple Items</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Fast Import
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Excel, WhatsApp ya Notepad se copy karke ek saath saare articles paste karein.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {importReport && (
            <div className="p-4 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                  <Check className="w-5 h-5" />
                  <span>Import Summary Report</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportReport(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Clear & Paste Another Batch
                </button>
              </div>

              {/* Matched box */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span>✅ Matched in Inventory ({importReport.matchedList.length} articles):</span>
                  <span>{importReport.matchedList.reduce((s, m) => s + m.totalQty, 0)} units added</span>
                </div>
                {importReport.matchedList.length > 0 ? (
                  <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {importReport.matchedList.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
                        <span className="font-bold text-emerald-400">{m.sku}</span>
                        <span className="text-slate-400 truncate max-w-[150px]">{m.styleCategory}</span>
                        <span className="font-black text-white">+{m.totalQty}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">None matched existing catalog.</p>
                )}
              </div>

              {/* Unmatched box */}
              {importReport.unmatchedList.length > 0 ? (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span>⚠️ NOT in Catalog / Unmatched ({importReport.unmatchedList.length} articles):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = importReport.unmatchedList.map(u => `${u.sku} ${Object.entries(u.sizes).map(([sz, q]) => `${sz}:${q}`).join(' ')}`).join('\n');
                        navigator.clipboard.writeText(txt);
                        setCopiedUnmatched(true);
                        setTimeout(() => setCopiedUnmatched(false), 2000);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] transition font-mono flex items-center gap-1 font-bold"
                    >
                      {copiedUnmatched ? 'Copied!' : 'Copy Unmatched SKUs'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Yeh articles catalog me pehle se nahi the. Inka stock new entry banakar add kiya gaya hai:
                  </p>
                  <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {importReport.unmatchedList.map((u, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
                        <span className="font-bold text-amber-400">{u.sku}</span>
                        <span className="text-slate-400">Color: {u.guessedColor}</span>
                        <span className="font-black text-amber-200">+{u.totalQty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Stock Addition Mode:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasteMode('add')}
                  className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    pasteMode === 'add'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add (+) Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode('set')}
                  className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    pasteMode === 'set'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Exact Set (=)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Default Category for New Items:
              </label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="auto">✨ Auto-Detect (Mixed Categories)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Paste Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4" />
                <span>Paste Articles List Here *</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRawText(sample1)}
                  className="text-[10px] text-slate-400 hover:text-amber-300 font-bold underline"
                >
                  Sample 1 (Single Size)
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => setRawText(sample2)}
                  className="text-[10px] text-slate-400 hover:text-amber-300 font-bold underline"
                >
                  Sample 2 (Multi Sizes)
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Paste formats supported:\n1. SG-F-1732-RED 37\n2. SG-F-1852-SILVER 1 2 1 1 1 1\n3. Directly copied rows from Excel (Tab separated)`}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border-2 border-slate-800 focus:border-amber-500 text-xs sm:text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none transition shadow-inner leading-relaxed"
            />
          </div>

          {/* Parsed Live Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-300">
                  Preview Parsed Articles ({parsedRows.length} models, {totalParsedPieces} pcs):
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {parsedRows.filter(r => r.isMatched).length} matched existing &bull; {parsedRows.filter(r => !r.isMatched).length} new
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl divide-y divide-slate-800/80 bg-slate-950 text-xs">
                {parsedRows.map((row, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-500 font-mono text-[10px]">#{row.lineIndex}</span>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-amber-300 text-xs">{row.sku}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            row.isMatched ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {row.isMatched ? 'Matched' : 'New Article'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            row.category === 'men_footwear' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' :
                            row.category === 'men_jacket' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' :
                            row.category === 'women_jacket' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30' :
                            row.category === 'bags' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
                            'bg-pink-500/10 text-pink-300 border border-pink-500/30'
                          }`}>
                            {row.category === 'men_footwear' ? '👞 Men Footwear' :
                             row.category === 'men_jacket' ? '🧥 Men Jacket' :
                             row.category === 'women_jacket' ? '🧥 Women Jacket' :
                             row.category === 'bags' ? '👜 Bags' :
                             '👠 Women Footwear'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {row.product ? `${row.product.styleCategory || row.product.name} • ${row.product.color}` : `Will create as ${row.guessedColor}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end font-mono text-[11px]">
                        {Object.entries(row.parsedSizes).map(([sz, qty]) => (
                          <span key={sz} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                            {sz}: <strong className="text-emerald-400">{pasteMode === 'add' ? `+${qty}` : qty}</strong>
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                        Total: {row.totalQty} pairs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            {parsedRows.length > 0 ? (
              <span>Ready to import <strong className="text-amber-400">{parsedRows.length}</strong> articles ({totalParsedPieces} pcs).</span>
            ) : (
              <span>Paste items above to see live preview.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={parsedRows.length === 0 || isSubmitting}
              onClick={handleApplyAll}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Adding to Inventory...</span>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirm & Add All ({totalParsedPieces} pcs)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
