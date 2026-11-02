import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import * as XLSX from 'xlsx';
import { 
  X, 
  FileSpreadsheet, 
  CloudUpload, 
  Check, 
  Copy, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  Sparkles,
  Download,
  HelpCircle,
  Database,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Code,
  Play
} from 'lucide-react';

const TARGET_SHEET_URL = "https://docs.google.com/spreadsheets/d/1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE/edit?gid=0#gid=0";
const TARGET_SHEET_ID = "1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE";
const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzh5BnwfJzIhQ9x8upyCOwNN8OTdTaLcfWFCgtk0jXyMtpWwABQRP-T02mAx_He1o3E/exec";

const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ==============================================================
// KY INVENTORY -> GOOGLE SHEETS ULTRA-FAST AUTO-SYNC SCRIPT
// Target Spreadsheet: 1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE
// ==============================================================

// 1. MANUAL RUN: Select 'syncNow' and click 'Run' in Apps Script editor!
function syncNow() {
  var targetSheetId = "1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE";
  var ss;
  try {
    ss = SpreadsheetApp.openById(targetSheetId);
  } catch(errId) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  // Fetch directly from Cloud Database
  var supabaseUrl = "https://pztpvqxadtjdtbkjdsai.supabase.co/rest/v1";
  var supabaseKey = "sb_publishable_1KGx3KPNl2FQJ22Q3zH25w_t2_1M8xw";
  var options = {
    headers: {
      "apikey": supabaseKey,
      "Authorization": "Bearer " + supabaseKey
    },
    muteHttpExceptions: true
  };

  var invRes = UrlFetchApp.fetch(supabaseUrl + "/inventory?select=*&order=sku.asc", options);
  var inventory = JSON.parse(invRes.getContentText()) || [];

  var salesRes = UrlFetchApp.fetch(supabaseUrl + "/sales?select=*&order=timestamp.desc", options);
  var sales = [];
  try {
    sales = JSON.parse(salesRes.getContentText()) || [];
  } catch(e) {}

  return populateSpreadsheet(ss, inventory, sales);
}

// 2. WEB APP / 1-CLICK SYNC FROM APP
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify(syncNow()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(raw);
    var targetSheetId = "1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE";
    var ss;
    try {
      ss = SpreadsheetApp.openById(targetSheetId);
    } catch(errId) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    var inventory = data.inventory || [];
    var sales = data.sales || [];
    
    var res = populateSpreadsheet(ss, inventory, sales);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. MASTER POPULATE FUNCTION (ALL 6 SHEETS IN BATCH - 1 SECOND)
function populateSpreadsheet(ss, inventory, sales) {
  var productMap = {};
  inventory.forEach(function(p) {
    if (p.sku) productMap[p.sku.toUpperCase().trim()] = p;
    if (p.id) productMap[p.id] = p;
  });

  function buildCategorySheet(sheetName, categoryId, headerLabel, sizesList) {
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    
    var items = inventory.filter(function(p) { return p.category === categoryId; });
    var headers = [headerLabel, "SKU"].concat(sizesList).concat(["TOTAL"]);
    var allRows = [headers];
    
    var sizeTotals = {};
    sizesList.forEach(function(s) { sizeTotals[s] = 0; });
    var grandTotal = 0;
    
    items.forEach(function(p, idx) {
      var rowTotal = 0;
      var row = [idx + 1, p.sku];
      sizesList.forEach(function(s) {
        var q = Number((p.sizes && p.sizes[s]) || 0);
        row.push(q);
        rowTotal += q;
        sizeTotals[s] += q;
      });
      row.push(rowTotal);
      grandTotal += rowTotal;
      allRows.push(row);
    });
    
    var totalRow = ["TOTAL", ""];
    sizesList.forEach(function(s) { totalRow.push(sizeTotals[s]); });
    totalRow.push(grandTotal);
    allRows.push(totalRow);
    
    sheet.getRange(1, 1, allRows.length, headers.length).setValues(allRows);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.getRange(allRows.length, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    sheet.getRange(1, 1, allRows.length, headers.length).setHorizontalAlignment("center");
    sheet.getRange(2, 2, allRows.length - 2, 1).setHorizontalAlignment("left");
    sheet.autoResizeColumns(1, headers.length);
  }

  // 1. Women Footwear
  buildCategorySheet("Women Footwear", "women_footwear", "SR NO", [35, 36, 37, 38, 39, 40, 41]);

  // 2. Mens Footwear
  buildCategorySheet("Mens Footwear", "men_footwear", "Sr No.", [40, 41, 42, 43, 44, 45]);

  // 3. Mens Jacket
  buildCategorySheet("Mens Jacket", "men_jacket", "Sr No.", ["S", "M", "L", "XL", "XXL"]);

  // 4. Womens jacket
  buildCategorySheet("Womens jacket", "women_jacket", "Sr No.", ["S", "M", "L", "XL", "XXL"]);

  // 5. Bags
  buildCategorySheet("Bags", "bags", "Sr No.", ["One Size"]);

  // 6. Sales History (Daily Sell & Replenishment Status)
  var salesSheet = ss.getSheetByName("Sales History") || ss.insertSheet("Sales History");
  salesSheet.clear();
  
  var salesHeaders = ["Sell Date", "SKU Code", "Color", "Size", "Status"];
  var salesRows = [salesHeaders];
  var statusColors = [];
  
  sales.forEach(function(s) {
    var p = (s.sku && productMap[s.sku.toUpperCase().trim()]) || productMap[s.productId];
    var pColor = s.color || (p && p.color) || "";
    var pSku = s.sku || (p && p.sku) || "";
    var pCat = s.category || (p && p.category) || "";
    var sizeKey = String(s.size || "").trim();
    var currentStock = Number((p && p.sizes && p.sizes[sizeKey]) || 0);
    
    var isNotReceived = false;
    if (!p || currentStock === 0) {
      isNotReceived = true;
    } else if ((pCat === "women_footwear" || sizeKey === "37") && sizeKey === "37" && currentStock < 2) {
      isNotReceived = true;
    }
    
    var status = isNotReceived ? "NOT RECEIVED" : "RECEIVED";
    var d = s.timestamp ? new Date(s.timestamp) : new Date();
    var dateStr = Utilities.formatDate(d, Session.getScriptTimeZone() || "GMT+5:30", "dd/MM/yyyy HH:mm");
    
    salesRows.push([dateStr, pSku, pColor, sizeKey, status]);
    statusColors.push(isNotReceived ? "#fee2e2" : "#dcfce7");
  });

  if (salesRows.length > 0) {
    salesSheet.getRange(1, 1, salesRows.length, 5).setValues(salesRows);
    salesSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    salesSheet.getRange(1, 1, salesRows.length, 5).setHorizontalAlignment("center");
    salesSheet.getRange(2, 2, salesRows.length - 1, 1).setHorizontalAlignment("left");
    
    for (var i = 0; i < statusColors.length; i++) {
      var rowIdx = i + 2;
      var bg = statusColors[i];
      var fg = bg === "#fee2e2" ? "#b91c1c" : "#15803d";
      salesSheet.getRange(rowIdx, 5).setBackground(bg).setFontColor(fg).setFontWeight("bold");
    }
    salesSheet.autoResizeColumns(1, 5);
  }

  return {
    status: "success",
    message: "Synced to Google Sheet!",
    productsCount: inventory.length,
    salesCount: sales.length,
    timestamp: new Date().toISOString()
  };
}`;

export function GoogleSheetsSyncModal({ isOpen, onClose }) {
  const { 
    inventory, 
    sales, 
    warehouseSends, 
    replenishments, 
    syncToGoogleSheets 
  } = useInventory();

  const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'daily_sales' | 'script'
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('ky_gsheet_webhook') || DEFAULT_WEBHOOK_URL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: '', text: '' });
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('ky_last_gsheet_sync') || '');

  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem('ky_gsheet_webhook', webhookUrl);
    }
  }, [webhookUrl]);

  // Product map for quick lookup
  const productMap = useMemo(() => {
    const map = {};
    (inventory || []).forEach(p => {
      if (p.sku) map[p.sku.toUpperCase().trim()] = p;
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [inventory]);

  // Enriched daily sales list with status & reason
  const enrichedSalesList = useMemo(() => {
    return (sales || []).map(s => {
      const p = (s.sku && productMap[s.sku.toUpperCase().trim()]) || productMap[s.productId];
      const pSku = s.sku || p?.sku || 'Unknown SKU';
      const pColor = s.color || p?.color || '-';
      const pCat = s.category || p?.category || '';
      const sizeKey = String(s.size || '').trim();
      const currentStock = Number(p?.sizes?.[sizeKey] || 0);

      let isNotReceived = false;
      let reason = 'Stock available in store';

      if (!p) {
        isNotReceived = true;
        reason = 'Article not found in inventory';
      } else if (currentStock === 0) {
        isNotReceived = true;
        reason = '0 pieces in store (Restock needed)';
      } else if ((pCat === 'women_footwear' || sizeKey === '37') && sizeKey === '37' && currentStock < 2) {
        isNotReceived = true;
        reason = `Size 37 has only ${currentStock} piece (minimum 2 required)`;
      }

      return {
        ...s,
        sku: pSku,
        color: pColor,
        size: sizeKey,
        currentStock,
        isNotReceived,
        status: isNotReceived ? 'NOT RECEIVED' : 'RECEIVED',
        reason
      };
    });
  }, [sales, productMap]);

  if (!isOpen) return null;

  // 1. SYNC TO GOOGLE SHEETS VIA WEBHOOK
  const handleSyncToGoogleSheets = async () => {
    if (!webhookUrl.trim()) {
      setSyncStatus({ 
        type: 'error', 
        text: 'Please paste your Google Apps Script Web App URL first (see Code & Setup tab).' 
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: '', text: '' });

    try {
      await syncToGoogleSheets(webhookUrl.trim());
      const nowStr = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      localStorage.setItem('ky_last_gsheet_sync', nowStr);
      setLastSyncTime(nowStr);
      setSyncStatus({ 
        type: 'success', 
        text: `Successfully synced ${inventory.length} inventory products across 5 categories + ${sales.length} daily sales to Google Sheet (1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE)!` 
      });
    } catch (err) {
      setSyncStatus({ 
        type: 'error', 
        text: err.message || 'Failed to sync to Google Sheet. Please verify Web App URL and permissions.' 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. DOWNLOAD EXACT 6-TAB EXCEL FILE (.xlsx)
  const handleDownloadExactExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Women Footwear
      const wfItems = inventory.filter(p => p.category === 'women_footwear');
      const wfSizes = [35, 36, 37, 38, 39, 40, 41];
      const wfRows = [['SR NO', 'SKU', 35, 36, 37, 38, 39, 40, 41, 'TOTAL']];
      const wfTotals = { 35: 0, 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0 };
      let wfGrand = 0;
      wfItems.forEach((p, idx) => {
        let rowTotal = 0;
        const row = [idx + 1, p.sku];
        wfSizes.forEach(s => {
          const q = Number(p.sizes?.[s] || 0);
          row.push(q);
          rowTotal += q;
          wfTotals[s] += q;
        });
        row.push(rowTotal);
        wfGrand += rowTotal;
        wfRows.push(row);
      });
      wfRows.push(['TOTAL', '', wfTotals[35], wfTotals[36], wfTotals[37], wfTotals[38], wfTotals[39], wfTotals[40], wfTotals[41], wfGrand]);
      const wsWf = XLSX.utils.aoa_to_sheet(wfRows);
      XLSX.utils.book_append_sheet(wb, wsWf, 'Women Footwear');

      // 2. Mens Footwear
      const mfItems = inventory.filter(p => p.category === 'men_footwear');
      const mfSizes = [40, 41, 42, 43, 44, 45];
      const mfRows = [['Sr No.', 'SKU', 40, 41, 42, 43, 44, 45, 'TOTAL']];
      const mfTotals = { 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 };
      let mfGrand = 0;
      mfItems.forEach((p, idx) => {
        let rowTotal = 0;
        const row = [idx + 1, p.sku];
        mfSizes.forEach(s => {
          const q = Number(p.sizes?.[s] || 0);
          row.push(q);
          rowTotal += q;
          mfTotals[s] += q;
        });
        row.push(rowTotal);
        mfGrand += rowTotal;
        mfRows.push(row);
      });
      mfRows.push(['TOTAL', '', mfTotals[40], mfTotals[41], mfTotals[42], mfTotals[43], mfTotals[44], mfTotals[45], mfGrand]);
      const wsMf = XLSX.utils.aoa_to_sheet(mfRows);
      XLSX.utils.book_append_sheet(wb, wsMf, 'Mens Footwear');

      // 3. Mens Jacket
      const mjItems = inventory.filter(p => p.category === 'men_jacket');
      const jSizes = ['S', 'M', 'L', 'XL', 'XXL'];
      const mjRows = [['Sr No.', 'SKU', 'S', 'M', 'L', 'XL', 'XXL', 'TOTAL']];
      const mjTotals = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
      let mjGrand = 0;
      mjItems.forEach((p, idx) => {
        let rowTotal = 0;
        const row = [idx + 1, p.sku];
        jSizes.forEach(s => {
          const q = Number(p.sizes?.[s] || 0);
          row.push(q);
          rowTotal += q;
          mjTotals[s] += q;
        });
        row.push(rowTotal);
        mjGrand += rowTotal;
        mjRows.push(row);
      });
      mjRows.push(['TOTAL', '', mjTotals.S, mjTotals.M, mjTotals.L, mjTotals.XL, mjTotals.XXL, mjGrand]);
      const wsMj = XLSX.utils.aoa_to_sheet(mjRows);
      XLSX.utils.book_append_sheet(wb, wsMj, 'Mens Jacket');

      // 4. Womens jacket
      const wjItems = inventory.filter(p => p.category === 'women_jacket');
      const wjRows = [['Sr No.', 'SKU', 'S', 'M', 'L', 'XL', 'XXL', 'TOTAL']];
      const wjTotals = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
      let wjGrand = 0;
      wjItems.forEach((p, idx) => {
        let rowTotal = 0;
        const row = [idx + 1, p.sku];
        jSizes.forEach(s => {
          const q = Number(p.sizes?.[s] || 0);
          row.push(q);
          rowTotal += q;
          wjTotals[s] += q;
        });
        row.push(rowTotal);
        wjGrand += rowTotal;
        wjRows.push(row);
      });
      wjRows.push(['TOTAL', '', wjTotals.S, wjTotals.M, wjTotals.L, wjTotals.XL, wjTotals.XXL, wjGrand]);
      const wsWj = XLSX.utils.aoa_to_sheet(wjRows);
      XLSX.utils.book_append_sheet(wb, wsWj, 'Womens jacket');

      // 5. Bags
      const bagItems = inventory.filter(p => p.category === 'bags');
      const bagRows = [['Sr No.', 'SKU', 'One Size', 'TOTAL']];
      let bagGrand = 0;
      bagItems.forEach((p, idx) => {
        const q = Number(p.sizes?.['One Size'] || p.sizes?.['Standard'] || Object.values(p.sizes || {})[0] || 0);
        bagGrand += q;
        bagRows.push([idx + 1, p.sku, q, q]);
      });
      bagRows.push(['TOTAL', '', bagGrand, bagGrand]);
      const wsBag = XLSX.utils.aoa_to_sheet(bagRows);
      XLSX.utils.book_append_sheet(wb, wsBag, 'Bags');

      // 6. Sales History (Daily Sell & Replenishment Status)
      const salesRows = [['Sell Date', 'SKU Code', 'Color', 'Size', 'Status']];
      enrichedSalesList.forEach(s => {
        const d = s.timestamp ? new Date(s.timestamp) : new Date();
        const dateStr = d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        salesRows.push([dateStr, s.sku, s.color, s.size, s.status]);
      });
      const wsSales = XLSX.utils.aoa_to_sheet(salesRows);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales History');

      const todayStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `KY_INVENTORY_MASTER_SHEET_${todayStr}.xlsx`);
    } catch (err) {
      alert("Error exporting Excel: " + err.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Google Sheet Live Sync</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Connected & Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                गूगल शीट ऑटो-अपडेट व दैनिक बिक्री स्टेटस (RECEIVED / NOT RECEIVED)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Sheet Link Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-400 shrink-0">Target Sheet:</span>
            <span className="text-xs font-mono font-bold text-amber-300 truncate max-w-[280px] sm:max-w-[420px]" title={TARGET_SHEET_URL}>
              1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE
            </span>
          </div>

          <a
            href={TARGET_SHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
          >
            <span>Open Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'sync' 
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>1-Click Sync & Download</span>
          </button>

          <button
            onClick={() => setActiveTab('daily_sales')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'daily_sales' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Sales Status ({enrichedSalesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'script' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Apps Script Code</span>
          </button>
        </div>

        {/* Status Message */}
        {syncStatus.text && (
          <div className={`mt-4 p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
            syncStatus.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            {syncStatus.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{syncStatus.text}</span>
          </div>
        )}

        {/* TAB 1: SYNC & DOWNLOAD */}
        {activeTab === 'sync' && (
          <div className="mt-4 space-y-4">
            
            {/* Sheets Generated Summary Badge Strip */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Exact Reference Format Sheets Created (रेफरेंस शीट की तरह 6 टैब्स):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                  👠 Women Footwear ({inventory.filter(p => p.category === 'women_footwear').length})
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                  👞 Mens Footwear ({inventory.filter(p => p.category === 'men_footwear').length})
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                  🧥 Mens Jacket ({inventory.filter(p => p.category === 'men_jacket').length})
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                  🧥 Womens jacket ({inventory.filter(p => p.category === 'women_jacket').length})
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                  👜 Bags ({inventory.filter(p => p.category === 'bags').length})
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                  📊 Sales History (Red/Green Status)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Option 1: Live Google Sheet Sync */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                    <CloudUpload className="w-4 h-4" />
                    <span>Live Google Sheet Update</span>
                  </div>
                  <h3 className="text-sm font-black text-white mb-1">Update Google Sheet on 1 Click</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Clicking below sends all 192 inventory models and daily sales directly to your Google Sheet.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="Paste Apps Script Web App URL..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />

                  <button
                    onClick={handleSyncToGoogleSheets}
                    disabled={isSyncing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition disabled:opacity-40"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Updating Google Sheet...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-3.5 h-3.5" />
                        Update Google Sheet Now
                      </>
                    )}
                  </button>

                  {lastSyncTime && (
                    <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Last updated: {lastSyncTime}
                    </div>
                  )}
                </div>
              </div>

              {/* Option 2: 1-Click Multi-Tab Daily Excel Backup */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                    <Database className="w-4 h-4" />
                    <span>Exact Format Excel (.xlsx)</span>
                  </div>
                  <h3 className="text-sm font-black text-white mb-1">Download All 6 Sheets in 1 File</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Downloads an exact Excel replica of the reference sheet with all 5 category tabs + Sales History.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    onClick={handleDownloadExactExcel}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Master Excel (.xlsx)
                  </button>
                  <span className="block text-[10px] text-slate-500 text-center mt-2">
                    Open in Excel or drag-and-drop into Google Sheets
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: DAILY SALES & REPLENISHMENT STATUS PREVIEW */}
        {activeTab === 'daily_sales' && (
          <div className="mt-4 space-y-3">
            
            {/* Rule Explanation Banner */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs">
              <span className="font-bold text-amber-300 block mb-1">
                📌 Store Replenishment Status Rules (स्टोर नियम):
              </span>
              <ul className="text-slate-400 space-y-1 pl-4 list-disc text-[11px]">
                <li>Agar kisi bikri ka article store inventory me <strong>0 pieces</strong> bacha hai 👉 <span className="text-rose-400 font-bold">NOT RECEIVED (Red)</span>.</li>
                <li>Women footwear me <strong>Size 37</strong> agar store me <strong>2 se kam</strong> bacha hai 👉 <span className="text-rose-400 font-bold">NOT RECEIVED (Red)</span>.</li>
                <li>Agar replenishment/stock store me available hai 👉 <span className="text-emerald-400 font-bold">RECEIVED (Green)</span>.</li>
              </ul>
            </div>

            {/* Sales Table Preview */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 sticky top-0 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">SKU Code</th>
                    <th className="py-2 px-3">Color</th>
                    <th className="py-2 px-2 text-center">Size</th>
                    <th className="py-2 px-2 text-center">Store Stock</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {enrichedSalesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No sales recorded yet. Once an item is sold, status will appear here!
                      </td>
                    </tr>
                  ) : (
                    enrichedSalesList.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-900/50 transition">
                        <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {s.timestamp ? new Date(s.timestamp).toLocaleDateString('en-GB') : 'Today'}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-300">
                          {s.sku}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {s.color}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-white">
                          {s.size}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-300">
                          {s.currentStock} left
                        </td>
                        <td className="py-2 px-3 text-center">
                          {s.isNotReceived ? (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              title={s.reason}
                            >
                              <XCircle className="w-3 h-3" />
                              NOT RECEIVED
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              title={s.reason}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              RECEIVED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: APPS SCRIPT CODE & SETUP */}
        {activeTab === 'script' && (
          <div className="mt-4 space-y-3">
            <div className="text-xs text-slate-400 space-y-2">
              <span className="font-bold text-white block">
                Google Apps Script Setup (गूगल शीट में केवल 1 बार यह कोड पेस्ट करें):
              </span>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 text-[11px]">
                <li>
                  Apni Google Sheet kholein:{" "}
                  <a href={TARGET_SHEET_URL} target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">
                    Open Sheet Link
                  </a>
                </li>
                <li>
                  Menu me <strong>Extensions (विस्तार) &gt; Apps Script</strong> par click karein.
                </li>
                <li>
                  Purana text mita kar neeche diya hua code <strong>Paste</strong> karein aur <strong>Save (Ctrl+S)</strong> karein.
                </li>
                <li>
                  Editor me upar dropdown me <strong>syncNow</strong> select karke <strong>Run (चलाएं)</strong> par click karein.
                </li>
                <li>
                  <strong>Web App Deploy:</strong> Upar right me <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong> &gt; Who has access: <strong>Anyone</strong> select karke <strong>Deploy</strong> karein.
                </li>
              </ol>
            </div>

            <div className="relative mt-2">
              <button
                onClick={handleCopyCode}
                className="absolute right-2 top-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied Code!' : 'Copy Apps Script'}
              </button>
              <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-56">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            KY INVENTORY ⚡ Google Sheets Integration
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
