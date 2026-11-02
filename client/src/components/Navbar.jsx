import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Plus, 
  QrCode, 
  ScanLine, 
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';

export function Navbar({ onOpenAddModal, onOpenQrModal, onOpenScanner, onOpenSalesModal }) {
  const { isConnected, connectedDevices } = useInventory();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Real-time status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
              👟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Footwear & Jacket
                </span>
                <span className="hidden sm:inline-block text-xs uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                  Real-Time
                </span>
              </div>
              
              {/* Sync Status Badge */}
              <div className="flex items-center gap-1.5 text-xs">
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-sync-pulse"></span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      Live Synced
                      <span className="text-slate-500 font-normal">
                        ({connectedDevices} {connectedDevices === 1 ? 'device' : 'devices'})
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-rose-400 font-medium">Reconnecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Phone QR Connect */}
            <button
              onClick={onOpenQrModal}
              title="Open on Phone via QR"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-200 text-xs sm:text-sm font-semibold transition"
            >
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Open on Phone</span>
              <QrCode className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {/* Barcode Scanner */}
            <button
              onClick={onOpenScanner}
              title="Scan Barcode / QR with Camera"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-200 text-xs sm:text-sm font-semibold transition"
            >
              <ScanLine className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Scan Tag</span>
            </button>

            {/* Sales & Profit */}
            <button
              onClick={onOpenSalesModal}
              title="View Daily Sales & Profit"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-200 text-xs sm:text-sm font-semibold transition"
            >
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Sales & Profit</span>
            </button>

            {/* Add Item Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Item</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
