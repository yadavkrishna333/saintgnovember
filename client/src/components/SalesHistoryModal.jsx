import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, TrendingUp, RotateCcw, Calendar, CheckCircle2, DollarSign } from 'lucide-react';

export function SalesHistoryModal({ isOpen, onClose }) {
  const { sales, revertSale, stats } = useInventory();
  const [revertingId, setRevertingId] = useState(null);

  if (!isOpen) return null;

  const handleRevert = async (saleId) => {
    if (window.confirm('Are you sure you want to revert this sale? The item will be returned to stock.')) {
      setRevertingId(saleId);
      try {
        await revertSale(saleId);
      } catch (err) {
        alert(err.message || 'Failed to revert sale');
      } finally {
        setRevertingId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Sales & Profits</h2>
              <p className="text-xs text-slate-400">
                Today: {stats.todayItemsSold || 0} items sold &bull; Revenue: ₹{(stats.todayRevenue || 0).toLocaleString('en-IN')} &bull; Profit: ₹{(stats.todayProfit || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sales List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-400">No sales recorded yet</p>
              <p className="text-xs">When you sell shoes or jackets, transactions will appear here live.</p>
            </div>
          ) : (
            sales.map((sale) => {
              const saleDate = new Date(sale.timestamp);
              const formattedTime = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = saleDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div
                  key={sale.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-600 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-base flex-shrink-0">
                      {sale.category === 'jacket' ? '🧥' : '👟'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {sale.productName}
                        </span>
                        <span className="text-[11px] font-bold bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md">
                          Size {sale.size}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          &times; {sale.quantity}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{formattedDate}, {formattedTime}</span>
                        <span>&bull;</span>
                        <span className="text-slate-300 font-medium">{sale.paymentMode || 'Cash'}</span>
                        {sale.customerName && (
                          <>
                            <span>&bull;</span>
                            <span className="text-indigo-400 font-medium">{sale.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-black text-emerald-400">
                        ₹{(sale.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-emerald-500 font-semibold">
                        +₹{(sale.profit || 0).toLocaleString('en-IN')} profit
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevert(sale.id)}
                      disabled={revertingId === sale.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 active:scale-95 disabled:opacity-50 transition flex items-center gap-1 text-xs"
                      title="Return / Revert to Stock"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Return</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
