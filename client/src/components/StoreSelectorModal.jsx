import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { STORES } from '../utils/stores';
import { 
  X, 
  Store, 
  MapPin, 
  Check, 
  ArrowRight, 
  Sparkles,
  Layers,
  ShoppingBag
} from 'lucide-react';

export function StoreSelectorModal({ isOpen, onClose }) {
  const { currentStore, switchStore } = useInventory();

  if (!isOpen) return null;

  const handleSelectStore = (storeId) => {
    switchStore(storeId);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Select Store / स्टोर चुनें</span>
              </h2>
              <p className="text-xs text-slate-400">
                Aap kis store ka inventory stock aur sales dekhna ya manage karna chahte hain?
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Store Cards */}
        <div className="mt-5 space-y-3">
          {STORES.map((st) => {
            const isSelected = currentStore?.id === st.id;

            return (
              <div
                key={st.id}
                onClick={() => handleSelectStore(st.id)}
                className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.01]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-600" />
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${
                      st.colorKey === 'amber'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : st.colorKey === 'blue'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {st.code}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-white group-hover:text-amber-300 transition truncate">
                          {st.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.badgeClass}`}>
                          {st.tag}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{st.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isSelected ? (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 group-hover:text-white group-hover:bg-amber-500 group-hover:text-slate-950 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Select</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            💡 Aap upar navigation bar se kisi bhi waqt store switch kar sakte hain.
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white font-semibold transition"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
