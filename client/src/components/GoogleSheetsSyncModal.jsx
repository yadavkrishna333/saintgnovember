import React, { useState, useEffect } from 'react';
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
  Database
} from 'lucide-react';

const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. INVENTORY SHEET
    var invSheet = ss.getSheetByName("Current Inventory") || ss.insertSheet("Current Inventory");
    invSheet.clear();
    invSheet.appendRow(["SR NO", "SKU CODE", "STYLE CATEGORY", "COLOR", "CATEGORY", "SIZES & STOCK", "DISPLAY PIECE", "TOTAL STOCK", "SELLING PRICE (INR)", "UPDATED AT"]);
    invSheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f3f4f6");
    
    (data.inventory || []).forEach(function(p, i) {
      var sizesStr = Object.entries(p.sizes || {}).map(function(s) { return s[0] + ": " + s[1]; }).join(", ");
      var total = Object.values(p.sizes || {}).reduce(function(a, b) { return a + Number(b || 0); }, 0);
      invSheet.appendRow([i + 1, p.sku, p.styleCategory || p.name, p.color, p.category, sizesStr, p.displaySize || "", total, p.sellingPrice || 0, p.updatedAt || new Date().toISOString()]);
    });
    invSheet.autoResizeColumns(1, 10);
    
    // 2. SOLD PRODUCTS SHEET
    var soldSheet = ss.getSheetByName("Sold Products") || ss.insertSheet("Sold Products");
    soldSheet.clear();
    soldSheet.appendRow(["SR NO", "DATE", "SKU CODE", "STYLE / NAME", "SIZE", "QUANTITY", "BILL AMOUNT (INR)", "PAYMENT MODE", "CUSTOMER"]);
    soldSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#fee2e2");
    
    (data.sales || []).forEach(function(s, i) {
      soldSheet.appendRow([i + 1, s.timestamp, s.sku || "", s.styleCategory || s.productName, s.size, s.quantity, s.totalAmount, s.paymentMode || "Cash", s.customerName || ""]);
    });
    soldSheet.autoResizeColumns(1, 9);

    // 3. WAREHOUSE DISPATCHES SHEET
    var whSheet = ss.getSheetByName("Warehouse Dispatches") || ss.insertSheet("Warehouse Dispatches");
    whSheet.clear();
    whSheet.appendRow(["SR NO", "DATE", "CHALLAN NO", "SKU CODE", "DESTINATION", "REASON", "SIZES SENT", "TOTAL PIECES"]);
    whSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#fef3c7");
    
    (data.warehouseSends || []).forEach(function(w, i) {
      var sizesStr = Object.entries(w.sentItems || {}).map(function(s) { return s[0] + ": " + s[1]; }).join(", ");
      whSheet.appendRow([i + 1, w.timestamp, w.dispatchNo, w.sku, w.destination, w.reason, sizesStr, w.totalCount]);
    });
    whSheet.autoResizeColumns(1, 8);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Synced " + (data.inventory || []).length + " products to Google Sheets!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function GoogleSheetsSyncModal({ isOpen, onClose }) {
  const { 
    inventory, 
    sales, 
    warehouseSends, 
    replenishments, 
    syncToGoogleSheets 
  } = useInventory();

  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('ky_gsheet_webhook') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: '', text: '' });
  const [copiedCode, setCopiedCode] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('ky_last_gsheet_sync') || '');

  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem('ky_gsheet_webhook', webhookUrl);
    }
  }, [webhookUrl]);

  if (!isOpen) return null;

  // 1. SYNC TO GOOGLE SHEETS VIA WEBHOOK
  const handleSyncToGoogleSheets = async () => {
    if (!webhookUrl.trim()) {
      setSyncStatus({ type: 'error', text: 'Please enter your Google Apps Script Web App URL first.' });
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
        text: `Successfully synced ${inventory.length} inventory products, ${sales.length} sales, and ${warehouseSends.length} warehouse dispatches to Google Sheet!` 
      });
    } catch (err) {
      setSyncStatus({ type: 'error', text: err.message || 'Failed to sync to Google Sheet. Check Webhook URL and permissions.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. DOWNLOAD MULTI-TAB DAILY EXCEL BACKUP (.xlsx)
  const handleDownloadDailyExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Tab 1: Current Inventory
      const invRows = inventory.map((p, idx) => {
        const sizesStr = Object.entries(p.sizes || {}).map(([s, q]) => `${s}: ${q}`).join(', ');
        const totalStock = Object.values(p.sizes || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        return {
          "SR NO": idx + 1,
          "SKU CODE": p.sku,
          "STYLE CATEGORY": p.styleCategory || p.name,
          "COLOR": p.color,
          "CATEGORY": p.category,
          "SIZES STOCK": sizesStr,
          "DISPLAY PIECE": p.displaySize || 'None',
          "TOTAL PIECES": totalStock,
          "SELLING PRICE (₹)": p.sellingPrice || 0,
          "UPDATED AT": p.updatedAt ? new Date(p.updatedAt).toLocaleString('en-IN') : 'N/A'
        };
      });
      const wsInv = XLSX.utils.json_to_sheet(invRows);
      XLSX.utils.book_append_sheet(wb, wsInv, "Current Inventory");

      // Tab 2: Sold Products
      const soldRows = sales.map((s, idx) => ({
        "SR NO": idx + 1,
        "DATE & TIME": s.timestamp ? new Date(s.timestamp).toLocaleString('en-IN') : 'N/A',
        "SKU CODE": s.sku || 'N/A',
        "STYLE / PRODUCT": s.styleCategory || s.productName,
        "SIZE": s.size,
        "QUANTITY": s.quantity,
        "BILL AMOUNT (₹)": s.totalAmount,
        "PAYMENT": s.paymentMode || 'Cash',
        "CUSTOMER": s.customerName || 'Walk-in'
      }));
      const wsSold = XLSX.utils.json_to_sheet(soldRows);
      XLSX.utils.book_append_sheet(wb, wsSold, "Sold Products");

      // Tab 3: Warehouse Dispatches
      const whRows = warehouseSends.map((w, idx) => {
        const sizesStr = Object.entries(w.sentItems || {}).map(([s, q]) => `${s}: ${q}`).join(', ');
        return {
          "SR NO": idx + 1,
          "DATE & TIME": w.timestamp ? new Date(w.timestamp).toLocaleString('en-IN') : 'N/A',
          "CHALLAN NO": w.dispatchNo,
          "SKU CODE": w.sku,
          "DESTINATION": w.destination,
          "REASON": w.reason,
          "SIZES DISPATCHED": sizesStr,
          "TOTAL PIECES": w.totalCount
        };
      });
      const wsWh = XLSX.utils.json_to_sheet(whRows);
      XLSX.utils.book_append_sheet(wb, wsWh, "Warehouse Dispatches");

      // Tab 4: Replenishments
      const repRows = replenishments.map((r, idx) => ({
        "SR NO": idx + 1,
        "DATE & TIME": r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN') : 'N/A',
        "INVOICE NO": r.invoiceNo || 'N/A',
        "SUPPLIER": r.supplier || 'N/A',
        "TOTAL PIECES": r.totalCount,
        "NOTES": r.notes || ''
      }));
      const wsRep = XLSX.utils.json_to_sheet(repRows);
      XLSX.utils.book_append_sheet(wb, wsRep, "Replenishments");

      const todayStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `KY_INVENTORY_DAILY_BACKUP_${todayStr}.xlsx`);
    } catch (err) {
      alert("Error exporting daily Excel: " + err.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Google Sheet & Daily Excel Sync</h2>
              <p className="text-xs text-slate-400">गूगल शीट व दैनिक बैकअप सिस्टम (Auto-Sync & 1-Click Excel)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
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

        {/* 2 Primary Action Cards */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Option 1: Live Google Sheet Sync */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                <CloudUpload className="w-4 h-4" />
                <span>Google Sheet Live Sync</span>
              </div>
              <h3 className="text-sm font-black text-white mb-1">Send Directly to Google Sheet</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Updates your live Google Sheet with all inventory, sales, and warehouse challans instantly.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="Paste Google Apps Script Web App URL..."
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
                    Syncing to Google Sheet...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    Sync to Google Sheet Now
                  </>
                )}
              </button>

              {lastSyncTime && (
                <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Last synced: {lastSyncTime}
                </div>
              )}
            </div>
          </div>

          {/* Option 2: 1-Click Multi-Tab Daily Excel Backup */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Database className="w-4 h-4" />
                <span>Daily Excel (.xlsx) Backup</span>
              </div>
              <h3 className="text-sm font-black text-white mb-1">Download Complete Excel File</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Generates a multi-sheet spreadsheet: Current Stock, Sold Products, Dispatches, and Replenishment.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={handleDownloadDailyExcel}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Today's Excel Backup
              </button>
              <span className="block text-[10px] text-slate-500 text-center mt-2">
                Ready to import into Google Sheets or open in Microsoft Excel
              </span>
            </div>
          </div>

        </div>

        {/* Google Apps Script Setup Guide Accordion */}
        <div className="mt-5 border border-slate-800 rounded-2xl p-4 bg-slate-950/60">
          <button
            onClick={() => setShowScriptGuide(!showScriptGuide)}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-300 hover:text-white"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>How to connect your Google Sheet (4 Simple Steps)</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">{showScriptGuide ? 'Hide Guide' : 'Show Instructions'}</span>
          </button>

          {showScriptGuide && (
            <div className="mt-3 text-xs text-slate-400 space-y-3 pt-3 border-t border-slate-800">
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                <li>Create a new blank sheet on <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">sheets.new</a></li>
                <li>In Google Sheets menu, click <strong>Extensions &gt; Apps Script</strong></li>
                <li>Delete existing code, paste the script below, and click <strong>Save</strong> (Ctrl+S)</li>
                <li>Click <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong> &gt; Who has access: <strong>Anyone</strong> &gt; Deploy!</li>
                <li>Copy the provided Web App URL and paste it in the box above!</li>
              </ol>

              <div className="relative mt-2">
                <button
                  onClick={handleCopyCode}
                  className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCode ? 'Copied Script!' : 'Copy Script'}
                </button>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-40">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
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
