import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  ShoppingBag, 
  Truck, 
  ArrowRight,
  ExternalLink, 
  CheckCircle2, 
  Search,
  ClipboardPaste,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { 
  DEFAULT_SHEET_URL, 
  DEFAULT_SHEET_ID, 
  fetchGoogleSheetCsv, 
  parseDailySalesRows 
} from '../utils/googleSheetDailySalesParser';
import * as XLSX from 'xlsx';

export function SyncDailySalesGoogleSheetModal({ isOpen, onClose }) {
  const { currentStore, inventory, recordBulkDailySales } = useInventory();

  const [sheetUrl, setSheetUrl] = useState(() => {
    return localStorage.getItem('ky_daily_sales_sheet_url') || DEFAULT_SHEET_URL;
  });
  const [tabName, setTabName] = useState(() => currentStore?.sheetTabName || 'MG Sultanpur Daily Sales');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [diffData, setDiffData] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'store' | 'warehouse' | 'unmatched'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInputMode, setActiveInputMode] = useState('sheet'); // 'sheet' | 'paste'
  const [pastedText, setPastedText] = useState('');

  // Update tabName when currentStore changes
  useEffect(() => {
    if (currentStore) {
      setTabName(currentStore.sheetTabName);
      setDiffData(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [currentStore]);

  if (!isOpen) return null;

  const handleFetchFromSheet = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setDiffData(null);

    try {
      localStorage.setItem('ky_daily_sales_sheet_url', sheetUrl.trim());
      
      // Attempt 1: Fetch specific store tab
      let rows = null;
      try {
        rows = await fetchGoogleSheetCsv(sheetUrl.trim(), tabName.trim());
      } catch (tabErr) {
        // Fallback: If store-specific tab not yet created in user's sheet, try "Sales History" or "Sheet1"
        try {
          rows = await fetchGoogleSheetCsv(sheetUrl.trim(), 'Sales History');
        } catch {
          rows = await fetchGoogleSheetCsv(sheetUrl.trim(), '');
        }
      }

      if (!rows || rows.length < 2) {
        throw new Error(`Google Sheet me koi daily sales rows nahi mili. Kripya sheet me data check karein.`);
      }

      const parsed = parseDailySalesRows(rows, inventory);
      if (parsed.validSales.length === 0 && parsed.alreadyProcessed.length === 0) {
        throw new Error(`Sheet me koi valid sales nahi mili. Columns: SKU Code, Size, Location (Store/Warehouse)`);
      }

      setDiffData(parsed);
    } catch (err) {
      console.error('Fetch error:', err);
      setErrorMsg(err.message || 'Google Sheet se data fetch karne me error aaya');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsePastedData = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Kripya SKU Code, Size, Location ka data paste karein');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Parse CSV or TSV (copied from Excel/Sheets)
      const wb = XLSX.read(pastedText.trim(), { type: 'string' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      const parsed = parseDailySalesRows(rows, inventory);
      if (parsed.validSales.length === 0) {
        throw new Error('Pasted text me koi valid sales row nahi mili. Format: SKU Code, Size, Location');
      }

      setDiffData(parsed);
    } catch (err) {
      setErrorMsg(err.message || 'Pasted data parse karne me error aaya');
    }
  };

  const handleConfirmAndDeduct = async () => {
    if (!diffData || diffData.validSales.length === 0) return;

    setIsApplying(true);
    setErrorMsg('');
    try {
      const result = await recordBulkDailySales(diffData.validSales, {
        sourceName: `Google Sheet (${tabName})`,
        storeId: currentStore.id
      });

      setSuccessMsg(
        `✓ ${currentStore.name}: ${diffData.storeSales.length} items Store inventory se minus ho gaye aur ${diffData.warehouseSales.length} items Warehouse sales me successfully record ho gaye!`
      );

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Sales process karne me error aaya');
    } finally {
      setIsApplying(false);
    }
  };

  // Filtered rows for diff table
  const displayedRows = (diffData?.validSales || []).filter(item => {
    if (filterMode === 'store' && item.isWarehouse) return false;
    if (filterMode === 'warehouse' && !item.isWarehouse) return false;
    if (filterMode === 'unmatched' && item.product) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.sku.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Sync Daily Sales from Google Sheet
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${currentStore.badgeClass}`}>
                  {currentStore.name} ({currentStore.code})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Google Sheet se daily sell ka data laayein aur Store Inventory se stock auto-minus karein.
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

        {/* Input Mode Selector: Live Sheet vs Quick Paste */}
        <div className="flex items-center gap-2 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveInputMode('sheet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeInputMode === 'sheet'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Connect Live Google Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInputMode('paste')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeInputMode === 'paste'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Direct Paste Rows (WhatsApp / Excel)</span>
          </button>
        </div>

        {/* Configuration Bar */}
        {activeInputMode === 'sheet' ? (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shrink-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Google Sheet URL / ID:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition"
                    title="Open Sheet in Browser"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Store Tab Name (शीट का नाम):
                </label>
                <input
                  type="text"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  placeholder="e.g. MG Sultanpur Daily Sales"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Columns Expected in Sheet: <strong className="text-white">SKU Code</strong>, <strong className="text-white">Size</strong>, <strong className="text-white">Location</strong> (Store ya Warehouse)
              </span>

              <button
                type="button"
                onClick={handleFetchFromSheet}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching Sheet...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Fetch Daily Sales (डेटा लाएं)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Direct Paste Box */
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shrink-0 space-y-2.5">
            <label className="block text-[11px] font-bold text-slate-400">
              Paste Rows (Excel se Copy karke ya seedha text paste karein):
            </label>
            <textarea
              rows={3}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="SKU Code&#9;Size&#9;Location&#10;SG-F-02-TAN&#9;37&#9;Store&#10;SG-F-1560-BLACK&#9;38&#9;Warehouse"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParsePastedData}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition active:scale-95"
              >
                Parse & Check Diff
              </button>
            </div>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Diff Result Preview */}
        {diffData && (
          <div className="flex-1 overflow-hidden flex flex-col mt-3 space-y-3">
            
            {/* Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  filterMode === 'all' 
                    ? 'bg-slate-800 border-slate-600 ring-2 ring-emerald-500/30' 
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales</span>
                <span className="text-lg font-black text-white font-mono">{diffData.validSales.length} pcs</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('store')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  filterMode === 'store' 
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />
                  <span>Store Stock Minus</span>
                </span>
                <span className="text-lg font-black text-emerald-300 font-mono">
                  -{diffData.storeSales.reduce((sum, s) => sum + s.quantity, 0)} pcs
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('warehouse')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  filterMode === 'warehouse' 
                    ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  <span>Warehouse Sales</span>
                </span>
                <span className="text-lg font-black text-purple-300 font-mono">
                  {diffData.warehouseSales.reduce((sum, s) => sum + s.quantity, 0)} pcs (No Minus)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('unmatched')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  filterMode === 'unmatched' 
                    ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30' 
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Catalog Unmatched</span>
                <span className="text-lg font-black text-amber-300 font-mono">{diffData.unmatched.length}</span>
              </button>
            </div>

            {/* Search inside preview */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by SKU or size in preview..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/60">
              {displayedRows.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No items match the selected filter.
                </div>
              ) : (
                displayedRows.map((item, idx) => (
                  <div key={idx} className="p-3 hover:bg-slate-900/60 transition flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-300">{item.sku}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          Size: {item.size}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          item.isWarehouse 
                            ? 'bg-purple-950/60 border-purple-600/40 text-purple-300' 
                            : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
                        }`}>
                          {item.locationLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {item.productName} &bull; {item.styleCategory}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {item.isWarehouse ? (
                        <div className="text-[11px] font-bold text-purple-400">
                          🏭 Warehouse Direct (Store Stock Unchanged)
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-400">Stock: {item.currentStock}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {item.newStock} pcs
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Confirmation Box & Actions */}
            <div className="pt-3 border-t border-slate-800 shrink-0 space-y-2.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="text-white block">
                    Kya aap in sales ko confirm karke {currentStore.name} ki inventory se stock auto-minus karna chahte hain?
                  </strong>
                  <span>
                    Store sales ka stock inventory se minus ho jayega aur Warehouse sales bina inventory ghate recorded sales me jud jayengi.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isApplying}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndDeduct}
                  disabled={isApplying || diffData.validSales.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition disabled:opacity-40"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {isApplying 
                      ? 'Processing & Deducting Stock...' 
                      : `Confirm & Deduct Stock (${diffData.validSales.length} Sales)`
                    }
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
