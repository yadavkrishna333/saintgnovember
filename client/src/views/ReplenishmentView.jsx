import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { detectCategoryFromSheetOrSku } from '../utils/excelInventoryParser';
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
  FileText,
  Copy,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  RefreshCw,
  X
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
  const [quickCategory, setQuickCategory] = useState('auto');
  const [quickTextInput, setQuickTextInput] = useState('');
  const [parsedTextItems, setParsedTextItems] = useState([]);
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'matched' | 'unmatched'
  const [previewSearch, setPreviewSearch] = useState('');

  // Mode 3: Traditional single-product form
  const [selectedProductId, setSelectedProductId] = useState(preselectedProduct?.id || (inventory[0]?.id || ''));
  const [sizeQuantities, setSizeQuantities] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [importReport, setImportReport] = useState(null);
  const [copiedUnmatched, setCopiedUnmatched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper for category badge visual styling
  const getCategoryBadge = (catId) => {
    switch (catId) {
      case 'men_footwear':
        return { label: 'Mens Footwear', icon: '👞', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
      case 'men_jacket':
        return { label: 'Mens Jacket', icon: '🧥', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' };
      case 'women_jacket':
        return { label: 'Women Jacket', icon: '🧥', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      case 'bags':
        return { label: 'Bags', icon: '👜', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'women_footwear':
      default:
        return { label: 'Women Footwear', icon: '👠', color: 'bg-pink-500/10 text-pink-300 border-pink-500/30' };
    }
  };

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

        const extracted = [];

        rows.forEach((row) => {
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

          if (!rawEan && !articleName) return;

          let cleanSize = sizeVal;
          let cleanSku = rawEan;
          let color = '';

          const parts = rawEan.split('-');
          if (parts.length >= 4) {
            const last = parts[parts.length - 1];
            if (/\d+EU$/i.test(last) || /\d+$/.test(last) || ['S','M','L','XL','XXL'].includes(last.toUpperCase())) {
              cleanSize = cleanSize || last.replace(/EU$/i, '');
              color = parts[parts.length - 2];
              cleanSku = parts.slice(0, parts.length - 1).join('-');
            } else {
              color = last;
            }
          }

          if (articleName.length > 30) {
            articleName = articleName.slice(0, 30) + '...';
          }

          // Use robust category detection (Sheet name + SKU prefix)
          const detectedCategory = detectCategoryFromSheetOrSku(sheetName, cleanSku);

          extracted.push({
            sku: cleanSku || `ART-${Date.now().toString().slice(-4)}`,
            articleName: articleName || `Article ${cleanSku}`,
            color: color || 'Standard',
            size: cleanSize || (detectedCategory === 'men_footwear' ? '41' : '37'),
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

  // ---------------- SMART MULTI-CATEGORY QUICK TEXT PARSER ----------------
  // Supports mixed items in a single paste:
  // Single-size:
  //   SGM-01-BLACK 42 2
  //   JK-M-04-BLACK M 1
  //   SG-F-1940-CHESTNUT 37 3
  //   SG-B-07-BLACK Standard 1
  // Multi-size distributions:
  //   SGM-12-BLACK 1 1 1 1 1 0  (Men Shoes: sizes 40 to 45)
  //   JK-M-01-BLACK 1 2 1 1 1   (Men Jacket: sizes S to XXL)
  //   SG-F-1867-BLACK 1 2 1 1 1 1 (Women Shoes: sizes 36 to 41)
  const parseQuickText = (text, activeCatFallback = 'auto', inventoryList = []) => {
    if (!text || !text.trim()) return [];
    const lines = text.split('\n');
    const parsed = [];

    const invMap = new Map();
    inventoryList.forEach(p => {
      if (p.sku) invMap.set(p.sku.toUpperCase().trim(), p);
    });

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const upperLine = trimmed.toUpperCase();
      if (upperLine.startsWith('SR NO') || upperLine.startsWith('SKU') || upperLine.startsWith('EAN') || upperLine.startsWith('TOTAL') || upperLine.startsWith('STYLE')) {
        return;
      }

      const tokens = trimmed.split(/[\t, ]+/).filter(Boolean);
      if (tokens.length === 0) return;

      let startIdx = 0;
      if (/^\d+\.?$/.test(tokens[0]) && tokens.length > 2 && /^[a-zA-Z]/.test(tokens[1])) {
        startIdx = 1;
      }

      let rawSku = tokens[startIdx].toUpperCase();
      if (!rawSku || rawSku === 'TOTAL' || rawSku === 'SR' || rawSku === 'SKU') return;

      const matched = invMap.get(rawSku);

      // Auto-detect category from SKU prefix, or fallback to selected category
      const detectedCat = detectCategoryFromSheetOrSku('', rawSku);
      let category = matched?.category || (activeCatFallback === 'auto' ? detectedCat : (detectedCat !== 'women_footwear' ? detectedCat : activeCatFallback));

      const restTokens = tokens.slice(startIdx + 1);

      // Case A: Multi-number distribution format
      const numbers = restTokens.map(t => parseInt(t, 10)).filter(n => !isNaN(n));
      if (restTokens.length >= 3 && numbers.length === restTokens.length) {
        let sizeLabels = [];
        if (category === 'men_footwear') {
          sizeLabels = numbers.length === 7 
            ? ['39', '40', '41', '42', '43', '44', '45']
            : ['40', '41', '42', '43', '44', '45'];
        } else if (category === 'men_jacket' || category === 'women_jacket') {
          sizeLabels = ['S', 'M', 'L', 'XL', 'XXL'];
        } else if (category === 'bags') {
          sizeLabels = ['Standard'];
        } else {
          sizeLabels = numbers.length === 7
            ? ['35', '36', '37', '38', '39', '40', '41']
            : ['36', '37', '38', '39', '40', '41'];
        }

        sizeLabels.forEach((sz, idx) => {
          const qty = numbers[idx] || 0;
          if (qty > 0) {
            const currentStock = (matched?.sizes && matched.sizes[sz]) || 0;
            parsed.push({
              id: `${lineIdx}-${rawSku}-${sz}`,
              sku: rawSku,
              size: sz,
              qty,
              category,
              articleName: matched?.styleCategory || matched?.name || `Article ${rawSku}`,
              isMatched: !!matched,
              currentStock,
              newStock: currentStock + qty,
              product: matched || null
            });
          }
        });
        return;
      }

      // Case B: Single size format
      let size = '';
      let qty = 1;

      if (restTokens.length >= 2) {
        size = restTokens[0].toUpperCase().replace(/EU$/i, '');
        qty = parseInt(restTokens[1], 10) || 1;
      } else if (restTokens.length === 1) {
        if (/^\d+$/.test(restTokens[0])) {
          const num = parseInt(restTokens[0], 10);
          if (num >= 35 && num <= 48) {
            size = String(num);
            qty = 1;
          } else {
            qty = num;
            size = category === 'men_footwear' ? '41' : category === 'women_footwear' ? '37' : category.includes('jacket') ? 'M' : 'Standard';
          }
        } else {
          size = restTokens[0].toUpperCase().replace(/EU$/i, '');
          qty = 1;
        }
      } else {
        const parts = rawSku.split('-');
        if (parts.length >= 4) {
          const last = parts[parts.length - 1];
          if (/\d+EU$/i.test(last) || /\d+$/.test(last) || ['S', 'M', 'L', 'XL', 'XXL'].includes(last.toUpperCase())) {
            size = last.replace(/EU$/i, '');
            rawSku = parts.slice(0, parts.length - 1).join('-');
          }
        }
        if (!size) {
          size = category === 'men_footwear' ? '41' : category === 'women_footwear' ? '37' : category.includes('jacket') ? 'M' : 'Standard';
        }
      }

      const currentStock = (matched?.sizes && matched.sizes[size]) || 0;
      parsed.push({
        id: `${lineIdx}-${rawSku}-${size}`,
        sku: rawSku,
        size: size || (category === 'men_footwear' ? '41' : '37'),
        qty: Math.max(1, qty),
        category,
        articleName: matched?.styleCategory || matched?.name || `Article ${rawSku}`,
        isMatched: !!matched,
        currentStock,
        newStock: currentStock + Math.max(1, qty),
        product: matched || null
      });
    });

    return parsed;
  };

  const handleQuickTextChange = (text) => {
    setQuickTextInput(text);
    const parsed = parseQuickText(text, quickCategory, inventory);
    setParsedTextItems(parsed);
  };

  const handleSelectQuickCategory = (newCat) => {
    setQuickCategory(newCat);
    if (quickTextInput) {
      const parsed = parseQuickText(quickTextInput, newCat, inventory);
      setParsedTextItems(parsed);
    }
  };

  // Helper to test if SKU exists in inventory
  const checkSkuMatch = (rawSku) => {
    if (!rawSku) return false;
    const target = rawSku.toLowerCase().trim();
    return inventory.some(p => p.sku && (p.sku.toLowerCase() === target || target.startsWith(p.sku.toLowerCase())));
  };

  // Derived statistics for Quick Text Preview
  const quickTextStats = useMemo(() => {
    const totalUnits = parsedTextItems.reduce((s, i) => s + i.qty, 0);
    const matchedItems = parsedTextItems.filter(i => i.isMatched);
    const unmatchedItems = parsedTextItems.filter(i => !i.isMatched);
    const matchedUnits = matchedItems.reduce((s, i) => s + i.qty, 0);
    const unmatchedUnits = unmatchedItems.reduce((s, i) => s + i.qty, 0);

    const byCategory = {};
    parsedTextItems.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + item.qty;
    });

    const uniqueSkus = new Set(parsedTextItems.map(i => i.sku)).size;

    return {
      totalUnits,
      totalLines: parsedTextItems.length,
      uniqueSkus,
      matchedCount: matchedItems.length,
      matchedUnits,
      unmatchedCount: unmatchedItems.length,
      unmatchedUnits,
      byCategory
    };
  }, [parsedTextItems]);

  const filteredPreviewItems = useMemo(() => {
    return parsedTextItems.filter(item => {
      if (previewFilter === 'matched' && !item.isMatched) return false;
      if (previewFilter === 'unmatched' && item.isMatched) return false;
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase().trim();
        const skuMatch = item.sku.toLowerCase().includes(q);
        const nameMatch = (item.articleName || '').toLowerCase().includes(q);
        const sizeMatch = String(item.size).toLowerCase() === q;
        if (!skuMatch && !nameMatch && !sizeMatch) return false;
      }
      return true;
    });
  }, [parsedTextItems, previewFilter, previewSearch]);

  // ---------------- SUBMIT HANDLERS ----------------
  const handleCommitExcel = async () => {
    if (parsedItems.length === 0) return;
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });
    setImportReport(null);

    try {
      const res = await bulkReplenishStock({
        items: parsedItems,
        billNo: billNo || 'INV-EXCEL',
        supplier: supplier || 'Distributor',
        date: billDate,
        notes: `Excel Import: ${excelFileName} ${notes}`
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setImportReport({
        totalIntakeCount: res.totalIntakeCount || parsedItems.reduce((s, i) => s + i.qty, 0),
        matchedCount: res.matchedCount || 0,
        matchedItems: res.matchedItems || [],
        unmatchedCount: res.unmatchedCount || 0,
        unmatchedItems: res.unmatchedItems || []
      });

      setStatusMsg({
        type: 'success',
        text: `Success! Added ${res.totalIntakeCount || 0} units across ${parsedItems.length} lines into inventory.`
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
    setImportReport(null);

    try {
      const res = await bulkReplenishStock({
        items: parsedTextItems,
        billNo: billNo || 'QUICK-INTAKE',
        supplier: supplier || 'Warehouse Intake',
        date: billDate,
        notes: `Quick Text Entry: ${notes}`
      });

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });

      setImportReport({
        totalIntakeCount: res.totalIntakeCount || parsedTextItems.reduce((s, i) => s + i.qty, 0),
        matchedCount: res.matchedCount || 0,
        matchedItems: res.matchedItems || [],
        unmatchedCount: res.unmatchedCount || 0,
        unmatchedItems: res.unmatchedItems || []
      });

      setStatusMsg({
        type: 'success',
        text: `Success! Received ${res.totalIntakeCount || 0} units into inventory (${res.matchedCount || 0} matched catalog, ${res.unmatchedCount || 0} created as new articles).`
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

      {/* IMPORT REPORT / MATCHED VS UNMATCHED OUTCOME CARD */}
      {importReport && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 space-y-4 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm sm:text-base">
              <Check className="w-5 h-5" />
              <span>Replenishment Intake Report ({importReport.totalIntakeCount} units received)</span>
            </div>
            <button
              type="button"
              onClick={() => setImportReport(null)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Dismiss Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Matched Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span>✅ Matched In Existing Inventory ({importReport.matchedCount} lines):</span>
                <span className="font-mono font-black">{importReport.matchedItems.reduce((s, m) => s + (m.qty || 1), 0)} units</span>
              </div>
              {importReport.matchedItems.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
                  {importReport.matchedItems.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                      <span className="font-bold text-emerald-400">{m.sku} (Sz {m.size})</span>
                      <span className="text-slate-400 truncate max-w-[120px] text-[10px]">{m.articleName}</span>
                      <span className="font-black text-white">+{m.qty}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">None matched existing catalog.</p>
              )}
            </div>

            {/* Unmatched Box */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>⚠️ Not in Catalog / Created As New ({importReport.unmatchedCount} lines):</span>
                {importReport.unmatchedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const txt = importReport.unmatchedItems.map(u => `${u.sku} ${u.size} ${u.qty}`).join('\n');
                      navigator.clipboard.writeText(txt);
                      setCopiedUnmatched(true);
                      setTimeout(() => setCopiedUnmatched(false), 2500);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUnmatched ? '✓ Copied!' : 'Copy Unmatched SKUs'}</span>
                  </button>
                )}
              </div>
              {importReport.unmatchedItems.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
                  {importReport.unmatchedItems.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                      <span className="font-bold text-amber-400">{u.sku} (Sz {u.size})</span>
                      <span className="text-amber-300/70 text-[10px]">New Article Added</span>
                      <span className="font-black text-white">+{u.qty}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-emerald-400 font-bold">✨ All incoming items matched existing inventory articles!</p>
              )}
            </div>
          </div>
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
                      <th className="p-2.5">Match Status</th>
                      <th className="p-2.5">EAN / SKU</th>
                      <th className="p-2.5">Article Name</th>
                      <th className="p-2.5 text-center">Color</th>
                      <th className="p-2.5 text-center">Size</th>
                      <th className="p-2.5 text-center">QTY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {parsedItems.map((item, idx) => {
                      const isMatched = checkSkuMatch(item.sku);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5">
                            {isMatched ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                MATCHED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                NEW / UNMATCHED
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-amber-300">{item.sku}</td>
                          <td className="p-2.5 font-bold text-white">{item.articleName}</td>
                          <td className="p-2.5 text-center text-slate-300">{item.color}</td>
                          <td className="p-2.5 text-center font-mono font-black text-white">{item.size}</td>
                          <td className="p-2.5 text-center font-mono font-black text-emerald-400">+{item.qty}</td>
                        </tr>
                      );
                    })}
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
          
          {/* Category Selector Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Category Routing Mode:
              </label>
              <span className="text-[11px] text-amber-400 font-bold">
                {quickCategory === 'auto' ? '✨ Mixed Items Auto-Routing Active' : `Target: ${categories.find(c => c.id === quickCategory)?.label || quickCategory}`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSelectQuickCategory('auto')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  quickCategory === 'auto'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ Auto-Detect (Mixed Items)</span>
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectQuickCategory(cat.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    quickCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{cat.icon || '📦'}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Paste Area */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Barcode className="w-4 h-4" />
                <span>Type or Paste Received Stock (Mixed Shoes, Jackets, Bags allowed):</span>
              </label>
              
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickTextChange(`SGM-01-BLACK 42 2\nJK-M-04-BLACK M 1\nJK-F-19-BLACK L 1\nSG-F-1852-SILVER 37 3\nSG-B-07-BLACK Standard 1`)}
                  className="text-slate-400 hover:text-amber-300 font-bold underline cursor-pointer"
                >
                  Sample Mixed Items
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => handleQuickTextChange(`SGM-12-BLACK 1 1 1 1 1 0\nJK-M-01-BLACK 1 2 1 1 1\nSG-F-1867-BLACK 1 2 1 1 1 1`)}
                  className="text-slate-400 hover:text-amber-300 font-bold underline cursor-pointer"
                >
                  Sample Size Distributions
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={quickTextInput}
              onChange={(e) => handleQuickTextChange(e.target.value)}
              placeholder={`Supported Mixed Paste Examples:\nSGM-01-BLACK 42 2          (Men Footwear Sz 42, 2 pcs)\nJK-M-04-BLACK M 1           (Men Jacket Sz M, 1 pc)\nJK-F-19-BLACK L 1           (Women Jacket Sz L, 1 pc)\nSG-F-1852-SILVER 37 3       (Women Footwear Sz 37, 3 pcs)\nSG-B-07-BLACK Standard 1    (Bag Standard, 1 pc)\n\nOr Multi-Size Distribution:\nSGM-12-BLACK 1 1 1 1 1 0    (Men Shoes: sizes 40 41 42 43 44 45)\nJK-M-01-BLACK 1 2 1 1 1     (Men Jackets: sizes S M L XL XXL)\nSG-F-1867-BLACK 1 2 1 1 1 1 (Women Shoes: sizes 36 37 38 39 40 41)`}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 focus:border-amber-500 text-emerald-400 font-mono text-xs sm:text-sm focus:outline-none transition leading-relaxed"
            />
          </div>

          {/* CONFIRMATION & MATCH PREVIEW CARD */}
          {parsedTextItems.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border-2 border-amber-500/30 space-y-4 shadow-2xl animate-fade-in">
              
              {/* Header & Commit Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-amber-400" />
                    <span>Intake Confirmation & Match Preview</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Check below: <strong>Kitne catalog me match hue</strong> aur <strong>kitne new add honge</strong> before receiving stock.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setQuickTextInput(''); setParsedTextItems([]); }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Text</span>
                  </button>
                  
                  <button
                    onClick={handleCommitQuickText}
                    disabled={isSubmitting || parsedTextItems.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSubmitting ? 'Receiving...' : `Confirm & Receive ${quickTextStats.totalUnits} Units`}</span>
                  </button>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Total Units */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Pieces</div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">{quickTextStats.totalUnits}</div>
                  <div className="text-[10px] text-slate-500">{quickTextStats.uniqueSkus} Articles ({quickTextStats.totalLines} lines)</div>
                </div>

                {/* Matched Count */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-emerald-300">✅ Kitne Match Hue</div>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">{quickTextStats.matchedUnits} Pcs</div>
                  <div className="text-[10px] text-emerald-300/70">{quickTextStats.matchedCount} lines matched catalog</div>
                </div>

                {/* Unmatched / New Count */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-amber-300">⚠️ Kitne New / Unmatched</div>
                  <div className="text-lg sm:text-xl font-black text-amber-400 font-mono">{quickTextStats.unmatchedUnits} Pcs</div>
                  <div className="text-[10px] text-amber-300/70">{quickTextStats.unmatchedCount} lines auto-create</div>
                </div>

                {/* Categories Breakdown */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Category Breakdown</div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    {Object.entries(quickTextStats.byCategory).map(([catKey, qty]) => {
                      const meta = getCategoryBadge(catKey);
                      return (
                        <span key={catKey} className={`px-1.5 py-0.5 rounded-md border ${meta.color}`}>
                          {meta.icon} {qty} pcs
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      previewFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({parsedTextItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewFilter('matched')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      previewFilter === 'matched'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    <span>✅ Matched ({quickTextStats.matchedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewFilter('unmatched')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      previewFilter === 'unmatched'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    <span>⚠️ New ({quickTextStats.unmatchedCount})</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter by SKU or size..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Review Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 text-slate-400 font-bold uppercase text-[10px] z-10">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">SKU Code</th>
                      <th className="p-2.5">Article / Description</th>
                      <th className="p-2.5 text-center">Size</th>
                      <th className="p-2.5 text-center">Incoming</th>
                      <th className="p-2.5 text-center">Stock Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                    {filteredPreviewItems.map((item, idx) => {
                      const meta = getCategoryBadge(item.category);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5">
                            {item.isMatched ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                ✅ MATCHED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                ⚠️ NEW ARTICLE
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.color} flex items-center gap-1 w-fit`}>
                              <span>{meta.icon}</span>
                              <span>{meta.label}</span>
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-amber-300">{item.sku}</td>
                          <td className="p-2.5 font-sans text-white text-[11px] truncate max-w-[160px]">{item.articleName}</td>
                          <td className="p-2.5 text-center font-bold text-white">{item.size}</td>
                          <td className="p-2.5 text-center font-black text-emerald-400">+{item.qty}</td>
                          <td className="p-2.5 text-center text-[11px] text-slate-300">
                            {item.isMatched ? (
                              <span>
                                <span className="text-slate-400">{item.currentStock}</span>
                                <span className="text-slate-500 mx-1">&rarr;</span>
                                <span className="text-emerald-400 font-bold">{item.newStock}</span>
                              </span>
                            ) : (
                              <span className="text-amber-300">0 &rarr; {item.qty} (New)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Confirm Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCommitQuickText}
                  disabled={isSubmitting || parsedTextItems.length === 0}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>{isSubmitting ? 'Adding Stock...' : `Confirm & Receive ${quickTextStats.totalUnits} Units into Inventory`}</span>
                </button>
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
