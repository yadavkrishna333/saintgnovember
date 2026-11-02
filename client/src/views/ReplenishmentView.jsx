import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import * as XLSX from 'xlsx';
import { 
  Truck, 
  Upload, 
  FileSpreadsheet, 
  Plus, 
  Check, 
  AlertCircle, 
  PackageCheck, 
  Calendar, 
  Barcode,
  Search,
  Sparkles,
  FileText
} from 'lucide-react';

export function ReplenishmentView({ preselectedProduct = null }) {
  const { 
    inventory, 
    categories, 
    sizesMap, 
    addReplenishment, 
    bulkReplenishStock, 
    replenishments 
  } = useInventory();

  // Tab mode: 'excel' | 'quicktext' | 'form'
  const [tabMode, setTabMode] = useState('excel');

  // Common Header Info
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Mode 1: Excel / CSV parsed rows
  const [parsedItems, setParsedItems] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  
  // Mode 2: Quick Text input
  const [quickCategory, setQuickCategory] = useState('women_footwear');
  const [quickTextInput, setQuickTextInput] = useState('');
  const [parsedTextItems, setParsedTextItems] = useState([]);

  // Mode 3: Traditional single-product form
  const [selectedProductId, setSelectedProductId] = useState(preselectedProduct?.id || (inventory[0]?.id || ''));
  const [sizeQuantities, setSizeQuantities] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // ---------------- EXCEL FILE PARSING ----------------
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setStatusMsg({ type: '', text: '' });

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setStatusMsg({ type: 'error', text: 'Excel file appears to be empty' });
          return;
        }

        // Parse each row according to user specs:
        // EAN / SKU: e.g. SG-F-1940-CHESTNUT-39EU
        // Article Name: Shorten if long
        // Size: 39 or parsed from EAN
        // QTY: piece count (default 1 or 2)
        const extracted = [];

        rows.forEach((row) => {
          // Find keys case-insensitively
          const getVal = (candidates) => {
            for (const key of Object.keys(row)) {
              if (candidates.some(c => key.toLowerCase().includes(c))) {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const rawEan = getVal(['ean', 'sku', 'code', 'barcode', 'item']);
          let articleName = getVal(['article', 'name', 'desc', 'title', 'product']);
          let sizeVal = getVal(['size']);
          const qtyVal = parseInt(getVal(['qty', 'quantity', 'piece', 'count']) || 1, 10);

          if (!rawEan && !articleName) return; // skip blank row

          // Smart parse EAN like: SG-F-1940-CHESTNUT-39EU
          let cleanSize = sizeVal;
          let cleanSku = rawEan;
          let color = '';

          const parts = rawEan.split('-');
          if (parts.length >= 4) {
            // Check if last part is size like 39EU, 39, 41, M, etc.
            const last = parts[parts.length - 1];
            if (/\d+EU$/i.test(last) || /\d+$/.test(last) || ['S','M','L','XL','XXL'].includes(last.toUpperCase())) {
              cleanSize = cleanSize || last.replace(/EU$/i, '');
              color = parts[parts.length - 2];
              cleanSku = parts.slice(0, parts.length - 1).join('-');
            } else {
              color = last;
            }
          }

          // Truncate long article names as requested: "agar name bda ho to sirf thoda name likhna sara na"
          if (articleName.length > 30) {
            articleName = articleName.slice(0, 30) + '...';
          }

          // Detect category from SKU prefix
          let detectedCategory = 'women_footwear';
          const upperSku = cleanSku.toUpperCase();
          if (upperSku.startsWith('SGM-')) detectedCategory = 'men_footwear';
          else if (upperSku.startsWith('SG-F-')) detectedCategory = 'women_footwear';
          else if (upperSku.startsWith('JK-M-')) detectedCategory = 'men_jacket';
          else if (upperSku.startsWith('JK-F-')) detectedCategory = 'women_jacket';
          else if (upperSku.startsWith('BG-')) detectedCategory = 'bags';

          extracted.push({
            sku: cleanSku || `ART-${Date.now().toString().slice(-4)}`,
            articleName: articleName || `Article ${cleanSku}`,
            color: color || 'Standard',
            size: cleanSize || '37',
            qty: Math.max(1, qtyVal || 1),
            category: detectedCategory
          });
        });

        if (extracted.length === 0) {
          setStatusMsg({ type: 'error', text: 'No matching columns found in file. Please ensure columns include EAN/SKU, Article Name, and QTY.' });
        } else {
          setParsedItems(extracted);
          setStatusMsg({ type: 'success', text: `Loaded ${extracted.length} items from ${file.name}. Review below and confirm.` });
        }
      } catch (err) {
        console.error(err);
        setStatusMsg({ type: 'error', text: 'Failed to parse Excel file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ---------------- SMART QUICK TEXT PARSER ----------------
  // Supports:
  // jk-m-01-black m 1
  // jk-m-01-black-m 1
  // jk-m-01-black m
  // SG-F-1940-CHESTNUT 39 2
  // SG-F-1940-CHESTNUT-39EU 1
  const handleQuickTextChange = (text) => {
    setQuickTextInput(text);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];

    lines.forEach(line => {
      // Replace dash with space if format is code-size qty
      let tokens = line.split(/[\s,]+/);
      if (tokens.length === 0) return;

      let rawSku = tokens[0];
      let size = '';
      let qty = 1;

      // If token 1 is qty or size
      if (tokens.length >= 3) {
        // e.g. jk-m-01-black m 1
        rawSku = tokens[0];
        size = tokens[1].replace(/EU$/i, '');
        qty = parseInt(tokens[2], 10) || 1;
      } else if (tokens.length === 2) {
        // could be jk-m-01-black m OR jk-m-01-black-m 1
        if (rawSku.includes('-') && !isNaN(tokens[1])) {
          // e.g. jk-m-01-black-m 1
          qty = parseInt(tokens[1], 10) || 1;
          const subParts = rawSku.split('-');
          size = subParts.pop().replace(/EU$/i, '');
          rawSku = subParts.join('-');
        } else {
          // e.g. jk-m-01-black m
          size = tokens[1].replace(/EU$/i, '');
          qty = 1;
        }
      } else if (tokens.length === 1 && rawSku.includes('-')) {
        // e.g. SG-F-1940-CHESTNUT-39EU
        const subParts = rawSku.split('-');
        if (subParts.length >= 4) {
          size = subParts.pop().replace(/EU$/i, '');
          rawSku = subParts.join('-');
        }
      }

      parsed.push({
        sku: rawSku.toUpperCase(),
        size: size || '37',
        qty: Math.max(1, qty),
        category: quickCategory,
        articleName: `Article ${rawSku.toUpperCase()}`
      });
    });

    setParsedTextItems(parsed);
  };

  // ---------------- SUBMIT HANDLERS ----------------
  const handleCommitExcel = async () => {
    if (parsedItems.length === 0) return;
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await bulkReplenishStock({
        items: parsedItems,
        billNo: billNo || 'INV-EXCEL',
        supplier: supplier || 'Distributor',
        date: billDate,
        notes: `Excel Import: ${excelFileName} ${notes}`
      });

      setStatusMsg({
        type: 'success',
        text: `Success! Added ${res.totalIntakeCount} units across ${parsedItems.length} lines into inventory.`
      });
      setParsedItems([]);
      setExcelFileName('');
      setBillNo('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to import stock' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommitQuickText = async () => {
    if (parsedTextItems.length === 0) return;
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await bulkReplenishStock({
        items: parsedTextItems,
        billNo: billNo || 'QUICK-INTAKE',
        supplier: supplier || 'Warehouse Intake',
        date: billDate,
        notes: `Quick Text Entry: ${notes}`
      });

      setStatusMsg({
        type: 'success',
        text: `Success! Received ${res.totalIntakeCount} units into inventory.`
      });
      setQuickTextInput('');
      setParsedTextItems([]);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add items' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode 3: Traditional single product
  const currentProduct = inventory.find(p => p.id === selectedProductId) || inventory[0];
  const currentSizes = currentProduct ? (sizesMap[currentProduct.category] || Object.keys(currentProduct.sizes || {})) : [];
  const totalSingleQty = Object.values(sizeQuantities).reduce((a, b) => a + (Number(b) || 0), 0);

  const handleCommitSingle = async (e) => {
    e.preventDefault();
    if (!currentProduct) return;
    if (totalSingleQty <= 0) {
      setStatusMsg({ type: 'error', text: 'Enter at least 1 unit to receive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addReplenishment({
        productId: currentProduct.id,
        supplier,
        invoiceNo: billNo,
        notes,
        sizeQuantities
      });
      setStatusMsg({
        type: 'success',
        text: `Successfully received ${totalSingleQty} units for ${currentProduct.name}!`
      });
      setSizeQuantities({});
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Truck className="w-6 h-6 text-emerald-400" />
          <span>Replenishment Received (Stock In)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Excel / PDF upload ya smart text entry se sari delivery ek sath inventory me add karein.
        </p>
      </div>

      {/* Bill & Supplier Header (Common for all intake methods) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Bill / Invoice Number
            </label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="e.g. INV-2026-904"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Delivery Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Supplier / Factory Name
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Delhi Distributor / Factory"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* INTAKE MODE SELECTOR TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => { setTabMode('excel'); setStatusMsg({ type: '', text: '' }); }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            tabMode === 'excel'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel / CSV File Upload</span>
        </button>

        <button
          onClick={() => { setTabMode('quicktext'); setStatusMsg({ type: '', text: '' }); }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            tabMode === 'quicktext'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Smart Text Quick-Add</span>
        </button>

        <button
          onClick={() => { setTabMode('form'); setStatusMsg({ type: '', text: '' }); }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            tabMode === 'form'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Single Article Intake</span>
        </button>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {statusMsg.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ---------------- MODE 1: EXCEL / CSV UPLOAD ---------------- */}
      {tabMode === 'excel' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-3xl p-6 sm:p-8 text-center transition bg-slate-950/40 cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              {excelFileName ? excelFileName : "Click or Drag & Drop Excel / CSV Delivery File"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Auto-detects <strong>EAN / SKU</strong> (e.g. <code>SG-F-1940-CHESTNUT-39EU</code>), Article Name, Size, and QTY.
            </p>
          </div>

          {/* PARSED EXCEL PREVIEW TABLE */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300">
                  Preview: {parsedItems.length} lines parsed ({parsedItems.reduce((s, i) => s + i.qty, 0)} total units)
                </span>
                <button
                  onClick={handleCommitExcel}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition"
                >
                  {isSubmitting ? 'Importing...' : 'Confirm & Commit All to Inventory'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">EAN / SKU</th>
                      <th className="p-2.5">Article Name</th>
                      <th className="p-2.5 text-center">Color</th>
                      <th className="p-2.5 text-center">Size</th>
                      <th className="p-2.5 text-center">QTY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-amber-300">{item.sku}</td>
                        <td className="p-2.5 font-bold text-white">{item.articleName}</td>
                        <td className="p-2.5 text-center text-slate-300">{item.color}</td>
                        <td className="p-2.5 text-center font-mono font-black text-white">{item.size}</td>
                        <td className="p-2.5 text-center font-mono font-black text-emerald-400">+{item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- MODE 2: SMART QUICK TEXT ---------------- */}
      {tabMode === 'quicktext' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Category for Quick Entry
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setQuickCategory(cat.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    quickCategory === cat.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>{cat.icon || '📦'}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                Type or Paste Multiple Lines:
              </label>
              <span className="text-[11px] text-slate-400">
                Format: <code>SKU SIZE QTY</code> or <code>SKU-SIZE QTY</code>
              </span>
            </div>
            <textarea
              rows={5}
              value={quickTextInput}
              onChange={(e) => handleQuickTextChange(e.target.value)}
              placeholder={`Examples:\njk-m-01-black m 1\njk-m-01-black-m 1\nSG-F-1940-CHESTNUT 37 2\nSG-F-1940-CHESTNUT-39EU 1\nSGM-21-BLACK 41 2`}
              className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs sm:text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick text preview */}
          {parsedTextItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300">
                  Ready to add {parsedTextItems.length} items ({parsedTextItems.reduce((a, b) => a + b.qty, 0)} units)
                </span>
                <button
                  onClick={handleCommitQuickText}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition"
                >
                  {isSubmitting ? 'Adding...' : 'Receive & Add Stock'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {parsedTextItems.map((item, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                    <strong className="text-amber-300">{item.sku}</strong> &bull; Size {item.size} &bull; <strong className="text-emerald-400">+{item.qty}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- MODE 3: SINGLE ARTICLE INTAKE ---------------- */}
      {tabMode === 'form' && (
        <form onSubmit={handleCommitSingle} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Article to Replenish
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); setSizeQuantities({}); }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {inventory.map(item => (
                <option key={item.id} value={item.id} className="bg-slate-900">
                  [{item.sku}] {item.styleCategory || item.name} - {item.color}
                </option>
              ))}
            </select>
          </div>

          {currentProduct && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Enter Units Received:
                </span>
                <span className="text-xs font-black text-emerald-400">
                  Total To Add: {totalSingleQty} units
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {currentSizes.map((size) => (
                  <div key={size} className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-black text-white">{size}</div>
                    <div className="text-[10px] text-slate-400 mb-1.5">
                      Current: {currentProduct.sizes?.[size] || 0}
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="+0"
                      value={sizeQuantities[size] || ''}
                      onChange={(e) => setSizeQuantities({ ...sizeQuantities, [size]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full text-center py-1 rounded-lg bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-black text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || totalSingleQty <= 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{isSubmitting ? 'Updating...' : `Receive & Add ${totalSingleQty} Units`}</span>
          </button>
        </form>
      )}

      {/* RECENT REPLENISHMENT LOGS */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-white">Recent Replenishment History</h2>
        {replenishments.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-slate-500 text-xs">
            No stock received history yet.
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">DATE</th>
                    <th className="p-3">BILL / INVOICE</th>
                    <th className="p-3">SUPPLIER</th>
                    <th className="p-3">SUMMARY / ARTICLE</th>
                    <th className="p-3 text-center">TOTAL UNITS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {replenishments.slice(0, 10).map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-300">
                        {new Date(rep.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">{rep.invoiceNo || 'N/A'}</td>
                      <td className="p-3 font-semibold text-white">{rep.supplier || 'Supplier'}</td>
                      <td className="p-3 text-slate-300">
                        {rep.productName ? `${rep.productName} (${rep.sku})` : `${rep.items?.length || 0} items`}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-emerald-400">
                        +{rep.totalCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
