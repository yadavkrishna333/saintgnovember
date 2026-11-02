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
  Plus, 
  Smartphone, 
  ScanLine,
  Crown,
  Menu,
  X,
  ChevronRight,
  FileSpreadsheet,
  LogOut,
  User,
  Sun,
  Moon
} from 'lucide-react';

export function MobileNav({ onOpenAddModal, onOpenQrModal, onOpenScanner, onOpenGSheetModal }) {
  const { activeTab, setActiveTab, isConnected, connectedDevices, stats, currentUser, setIsLoginModalOpen, logout, theme, toggleTheme } = useInventory();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const allTabs = [
    { id: 'dashboard', label: 'DashBoard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Layers },
    { id: 'sold', label: 'Sold Product', icon: ShoppingBag },
    { id: 'replenishment', label: 'Replenishment Received', icon: Truck },
    { id: 'warehouse', label: 'Stock Send to Warehouse', icon: ArrowUpRight },
    { id: 'history', label: 'History (Excel/PDF)', icon: History },
    { id: 'settings', label: 'Setting', icon: Settings }
  ];

  // Quick bottom bar primary 5 icons
  const bottomBarTabs = [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'inventory', label: 'Stock', icon: Layers },
    { id: 'sold', label: 'Sold', icon: ShoppingBag },
    { id: 'replenishment', label: 'In', icon: Truck },
    { id: 'warehouse', label: 'Out', icon: ArrowUpRight },
    { id: 'history', label: 'History', icon: History }
  ];

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900/98 backdrop-blur-xl border-b border-slate-800/80 px-3 py-2 flex items-center justify-between shadow-lg">
        
        {/* Left Drawer Menu Button + Brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 rounded-xl bg-slate-800 text-amber-400 border border-slate-700/80 active:scale-90 transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-black text-sm text-white">KY</span>
                <span className="font-extrabold text-sm bg-gradient-to-r from-amber-300 to-white bg-clip-text text-transparent">
                  INVENTORY
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Status & Quick Actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-sync-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-400 font-semibold">{connectedDevices} dev</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 active:scale-90 transition text-slate-300"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            onClick={onOpenScanner}
            className="p-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 text-emerald-400 active:scale-90 transition"
            title="Scan Tag"
          >
            <ScanLine className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Slide-out Mobile Drawer */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 h-full p-4 flex flex-col justify-between shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="font-black text-base text-white">KY INVENTORY</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 space-y-1 overflow-y-auto max-h-[70vh]">
                {allTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition ${
                        isActive 
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-amber-400" />
                        <span>{tab.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              {/* User Account Card */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div 
                  onClick={() => { setIsLoginModalOpen(true); setIsDrawerOpen(false); }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-xs">
                    {(currentUser?.username || 'K')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-black text-amber-300">
                      {currentUser?.username || 'Krishan'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Switch Account ▾
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { logout(); setIsDrawerOpen(false); }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800/60 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-xl border-t border-slate-800/80 px-1 py-1.5 flex items-center justify-around select-none">
        {bottomBarTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all relative ${
                isActive 
                  ? 'text-amber-400 font-black' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-5 h-0.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
              )}
              <Icon className={`w-4 h-4 transition ${isActive ? 'scale-110 text-amber-400' : 'text-slate-400'}`} />
              <span className="text-[9px] mt-0.5 tracking-tight font-bold">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
