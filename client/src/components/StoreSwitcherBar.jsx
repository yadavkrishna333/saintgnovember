import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { STORES } from '../utils/stores';
import { 
  Store, 
  ChevronDown, 
  FileSpreadsheet, 
  Sparkles, 
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';

export function StoreSwitcherBar({ onOpenStoreModal, onOpenSyncSalesModal }) {
  const { 
    currentStore, 
    switchStore, 
    inventory, 
    cloneCatalogFromStore, 
    isCloningCatalog,
    setIsStoreSelectorOpen,
    setIsSyncDailySalesOpen
  } = useInventory();

  const handleOpenStore = onOpenStoreModal || (() => setIsStoreSelectorOpen(true));
  const handleOpenSync = onOpenSyncSalesModal || (() => setIsSyncDailySalesOpen(true));

  const isCurrentStoreEmpty = inventory.length === 0;

  return (
    <div className="space-y-3 mb-5">
      {/* Top Multi-Store Navigation Banner */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Active Store Badge & Switcher */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenStore}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition group shrink-0"
            title="Click to Switch Store / स्टोर बदलें"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
              currentStore?.colorKey === 'amber'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : currentStore?.colorKey === 'blue'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              <Store className="w-4 h-4" />
            </div>

            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <span>Active Store:</span>
                <span className="font-mono text-amber-400">[{currentStore?.code}]</span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition flex items-center gap-1">
                <span>{currentStore?.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition" />
              </div>
            </div>
          </button>

          {/* Quick 1-Click Store Switch Pills */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
            {STORES.map((st) => {
              const isActive = currentStore?.id === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => switchStore(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-slate-950' : st.dotClass}`} />
                  <span>{st.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Action: Sync Daily Sales from Google Sheet */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={handleOpenSync}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            title="Google Sheet se daily sell auto-minus karein"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>⚡ Sync Daily Sales (Google Sheet)</span>
          </button>
        </div>

      </div>

      {/* Empty Store Notification Banner (offers 1-click clone catalog) */}
      {isCurrentStoreEmpty && currentStore.id !== 'mg-sultanpur' && (
        <div className="p-4 rounded-3xl bg-blue-950/40 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏬</span>
            <div>
              <strong className="text-white text-sm block">
                {currentStore.name} ka catalog abhi khali hai!
              </strong>
              <span>
                Aap chahein to <strong>MG Sultanpur Store</strong> ke sabhi 143+ master articles ko 1-click me yahan copy kar sakte hain (0 stock ke sath).
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => cloneCatalogFromStore('mg-sultanpur')}
            disabled={isCloningCatalog}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md active:scale-95 transition whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{isCloningCatalog ? 'Copying Catalog...' : 'Clone Catalog from Sultanpur (0 Stock)'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
