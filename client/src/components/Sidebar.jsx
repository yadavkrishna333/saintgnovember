import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  LayoutDashboard, 
  Layers, 
  ShoppingBag, 
  Truck, 
  ArrowUpRight,
  History,
  Settings, 
  Smartphone, 
  ScanLine, 
  Plus, 
  Crown,
  ChevronLeft,
  ChevronRight,
  Pin,
  FileSpreadsheet,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

export function Sidebar({ onOpenAddModal, onOpenQrModal, onOpenScanner, onOpenGSheetModal }) {
  const { activeTab, setActiveTab, isConnected, connectedDevices, stats, currentUser, setIsLoginModalOpen, logout, theme, toggleTheme } = useInventory();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'DashBoard', icon: LayoutDashboard, badge: stats.footwearLowAlertCount > 0 ? `${stats.footwearLowAlertCount} alert` : null, alert: stats.footwearLowAlertCount > 0 },
    { id: 'inventory', label: 'Inventory', icon: Layers, badge: stats.totalStockCount },
    { id: 'sold', label: 'Sold Product', icon: ShoppingBag, badge: stats.todaySalesCount > 0 ? `${stats.todaySalesCount} today` : null },
    { id: 'replenishment', label: 'Replenishment Received', icon: Truck, badge: null },
    { id: 'warehouse', label: 'Stock Send to Warehouse', icon: ArrowUpRight, badge: null },
    { id: 'history', label: 'History (Excel/PDF)', icon: History, badge: null },
    { id: 'settings', label: 'Setting', icon: Settings, badge: null }
  ];

  const isOpen = isPinned || isHovered;

  return (
    <>
      {/* Edge Trigger & Floating Expand Arrow */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-3.5 z-40 hover:w-6 transition-all duration-200 cursor-pointer group"
      >
        <button
          onClick={() => setIsPinned(!isPinned)}
          title="Expand Menu (or Hover)"
          className="absolute left-1 top-20 -translate-y-1/2 w-6 h-12 rounded-r-xl bg-slate-900/90 border-y border-r border-amber-500/60 shadow-xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Main Auto-Hide Sidebar */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col bg-slate-900/98 border-r border-slate-800/90 backdrop-blur-2xl h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-2xl select-none ${
          isOpen ? 'w-64 translate-x-0 opacity-100' : 'w-64 -translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-white">KY</span>
                <span className="font-extrabold text-base bg-gradient-to-r from-amber-300 via-yellow-200 to-white bg-clip-text text-transparent">
                  INVENTORY
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block -mt-0.5">
                Auto-Hide Enabled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition active:scale-90"
              title={theme === 'dark' ? "Switch to Light Mode (दिन का मोड)" : "Switch to Dark Mode (रात का मोड)"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            <button
              onClick={() => setIsPinned(!isPinned)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition active:scale-90"
              title={isPinned ? "Unpin (Auto-Hide on Mouse Leave)" : "Pin Sidebar (Stay Open)"}
            >
              {isPinned ? <Pin className="w-4 h-4 text-amber-400 rotate-45" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="mx-3 mt-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-sync-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-300 font-medium text-[11px]">
              {isConnected ? 'Real-Time Sync' : 'Offline'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
            {connectedDevices} {connectedDevices === 1 ? 'Device' : 'Devices'}
          </span>
        </div>

        {/* 7 Main Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (!isPinned) setIsHovered(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 transition ${isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.alert 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Action Dock */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={onOpenScanner}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition active:scale-95 shadow-sm"
            title="Scan Tag Barcode"
          >
            <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Tag Barcode</span>
          </button>
        </div>

        {/* Active Store User Profile & Switcher */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div 
              onClick={() => {
                setIsLoginModalOpen(true);
                if (!isPinned) setIsHovered(false);
              }}
              className="flex items-center gap-2 min-w-0 cursor-pointer group"
              title="Click to Switch Store Account"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition flex-shrink-0">
                <span className="font-black text-xs">{(currentUser?.username || 'K')[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-200 group-hover:text-amber-300 truncate transition flex items-center gap-1">
                  <span>{currentUser?.username || 'Krishan'}</span>
                  <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded font-bold">Store</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
                  Switch Account ▾
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition active:scale-90"
              title="Logout / Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
