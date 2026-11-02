import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

export function StatsBar() {
  const { stats } = useInventory();

  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Stock */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Total In Stock</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-white">{stats.totalStockCount || 0}</span>
            <span className="text-xs text-slate-400">items</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* Retail Worth */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Stock Retail Worth</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-white">{formatCurrency(stats.totalRetailValue)}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      {/* Today's Sales & Profit */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Today's Sales</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{formatCurrency(stats.todayRevenue)}</span>
            <span className="text-xs text-slate-400">({stats.todayItemsSold || 0} sold)</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Low Stock Sizes</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-xl sm:text-2xl font-black ${stats.lowStockAlertCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {stats.lowStockAlertCount || 0}
            </span>
            <span className="text-xs text-slate-400">sizes &le; 2 left</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          stats.lowStockAlertCount > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-slate-700/30 text-slate-500'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
