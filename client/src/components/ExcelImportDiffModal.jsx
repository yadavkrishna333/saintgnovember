import React, { useState } from 'react';
import { 
  X, 
  Check, 
  FileSpreadsheet, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  ArrowRight
} from 'lucide-react';

export function ExcelImportDiffModal({ 
  isOpen, 
  onClose, 
  filename, 
  diffResult, 
  onConfirm 
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'updated' | 'unchanged'
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen || !diffResult) return null;

  const { newItems = [], updatedItems = [], unchangedItems = [] } = diffResult;

  const totalDiffCount = newItems.length + updatedItems.length;

  const filteredNew = newItems.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.sku?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q) || item.styleCategory?.toLowerCase().includes(q);
  });

  const filteredUpdated = updatedItems.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.sku?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q) || item.styleCategory?.toLowerCase().includes(q);
  });

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onConfirm({ newItems, updatedItems });
      onClose();
    } catch (err) {
      alert(err.message || 'Error applying import');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Excel Inventory Diff & Import Preview
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                File: {filename || 'INVENTORY.xlsx'}
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

        {/* Diff Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`p-3 rounded-2xl border text-left transition ${
              activeTab === 'all'
                ? 'bg-slate-800/90 border-slate-600 ring-2 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total In Excel</span>
            <span className="text-xl font-black text-white font-mono">
              {newItems.length + updatedItems.length + unchangedItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`p-3 rounded-2xl border text-left transition ${
              activeTab === 'new'
                ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <PlusCircle className="w-3 h-3" />
              <span>New Articles</span>
            </span>
            <span className="text-xl font-black text-emerald-300 font-mono">
              +{newItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('updated')}
            className={`p-3 rounded-2xl border text-left transition ${
              activeTab === 'updated'
                ? 'bg-amber-950/40 border-amber-500/60 ring-2 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>Stock Changes</span>
            </span>
            <span className="text-xl font-black text-amber-300 font-mono">
              {updatedItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unchanged')}
            className={`p-3 rounded-2xl border text-left transition ${
              activeTab === 'unchanged'
                ? 'bg-slate-800/90 border-slate-600 ring-2 ring-slate-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">No Change</span>
            <span className="text-xl font-black text-slate-400 font-mono">
              {unchangedItems.length}
            </span>
          </button>
        </div>

        {/* Search Bar inside Modal */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU or article style name in diff..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Diff Content Table / Lists (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* SECTION 1: NEW ARTICLES */}
          {(activeTab === 'all' || activeTab === 'new') && filteredNew.length > 0 && (
            <div className="bg-slate-950 rounded-2xl border border-emerald-900/40 overflow-hidden">
              <div className="bg-emerald-950/40 px-3.5 py-2.5 border-b border-emerald-900/40 flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Naye Articles (Will be added to Inventory): {filteredNew.length}</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80">Brand: Saint G</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                {filteredNew.map((item, idx) => {
                  const totalPcs = Object.values(item.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                  return (
                    <div key={item.sku || idx} className="p-3 hover:bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-300">{item.sku}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-slate-300 font-semibold truncate text-[11px] mt-0.5">
                          {item.styleCategory || item.name} &bull; <span className="text-slate-400">{item.color}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-emerald-400 block text-xs">
                          +{totalPcs} pcs
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          {Object.entries(item.sizes || {})
                            .filter(([, q]) => Number(q) > 0)
                            .map(([sz, q]) => (
                              <span key={sz} className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                                {sz}:{q}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: STOCK UPDATES */}
          {(activeTab === 'all' || activeTab === 'updated') && filteredUpdated.length > 0 && (
            <div className="bg-slate-950 rounded-2xl border border-amber-900/40 overflow-hidden">
              <div className="bg-amber-950/40 px-3.5 py-2.5 border-b border-amber-900/40 flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Existing Articles Stock Changes: {filteredUpdated.length}</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400/80">Old Stock &rarr; New Stock</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                {filteredUpdated.map((item, idx) => {
                  return (
                    <div key={item.id || idx} className="p-3 hover:bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-300">{item.sku}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-slate-300 font-semibold truncate text-[11px] mt-0.5">
                          {item.styleCategory || item.name} &bull; <span className="text-slate-400">{item.color}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] font-mono">
                          {item.diffSizes.map((d) => (
                            <span 
                              key={d.size}
                              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                d.newQty > d.oldQty 
                                  ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300' 
                                  : 'bg-rose-950/60 border-rose-600/50 text-rose-300'
                              }`}
                            >
                              <strong className="text-white">{d.size}:</strong>
                              <span>{d.oldQty}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                              <strong className="font-black">{d.newQty}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: UNCHANGED */}
          {activeTab === 'unchanged' && (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <span>{unchangedItems.length} articles me koi change nahi he (Excel aur Inventory ka stock bilkul same he).</span>
            </div>
          )}

          {totalDiffCount === 0 && (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <div className="text-sm font-black text-white">All Stock Matched!</div>
              <p className="mt-1">Is Excel file me koi naya article ya stock difference nahi mila. Inventory already up to date he.</p>
            </div>
          )}
        </div>

        {/* Confirmation Footer Bar */}
        <div className="pt-4 border-t border-slate-800 shrink-0 space-y-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              <strong className="text-white block">
                Aap agree ho kya in naye articles aur stock changes ko inventory me update karne ke liye?
              </strong>
              <span>
                Confirm karne par {newItems.length} naye articles jud jayenge aur {updatedItems.length} articles ka stock update ho jayega. History me audit record save ho jayega.
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
              Cancel (रद्द करें)
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || totalDiffCount === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isApplying ? 'Applying Updates...' : `Yes, Update Inventory (${totalDiffCount} Changes)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
