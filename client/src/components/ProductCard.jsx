import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  Tag, 
  Barcode, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function ProductCard({ product, onEdit, onQuickSale }) {
  const { adjustStock, deleteProduct, sizesConfig } = useInventory();
  const [activeSize, setActiveSize] = useState(() => {
    // Default selected size to the first available size in stock or first size
    const availableSizes = sizesConfig[product.category] || Object.keys(product.sizes || {});
    const inStock = availableSizes.find(s => (product.sizes?.[s] || 0) > 0);
    return inStock || availableSizes[0] || '40';
  });

  const categorySizes = sizesConfig[product.category] || Object.keys(product.sizes || {});
  
  // Total stock for this product
  const totalStock = Object.values(product.sizes || {}).reduce((acc, qty) => acc + (Number(qty) || 0), 0);

  // Profit calculations
  const profitPerItem = (product.sellingPrice || 0) - (product.costPrice || 0);
  const profitMargin = product.sellingPrice ? Math.round((profitPerItem / product.sellingPrice) * 100) : 0;

  const categoryIcons = {
    men_footwear: '👟 Men',
    women_footwear: '👠 Women',
    jacket: '🧥 Jacket'
  };

  const categoryBadgeColors = {
    men_footwear: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    women_footwear: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    jacket: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${product.name}" from inventory?`)) {
      deleteProduct(product.id);
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 hover:border-slate-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between">
      
      {/* Top Section */}
      <div className="p-4">
        {/* Brand, Category Badge & Stock status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {product.brand || 'Brand'}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${categoryBadgeColors[product.category] || 'bg-slate-700 text-slate-300'}`}>
              {categoryIcons[product.category] || product.category}
            </span>
          </div>

          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
            totalStock === 0 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
              : totalStock <= 3 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          }`}>
            {totalStock === 0 ? 'Out of Stock' : `${totalStock} in stock`}
          </span>
        </div>

        {/* Product Name & Details */}
        <div className="flex gap-3 items-start">
          {product.imageUrl && (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-16 h-16 rounded-xl object-cover border border-slate-700/80 bg-slate-900 flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base leading-snug truncate" title={product.name}>
              {product.name}
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {product.color && <span>{product.color}</span>}
              {product.material && <span> &bull; {product.material}</span>}
            </p>
            {product.sku && (
              <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                <Barcode className="w-3 h-3" /> {product.sku}
              </p>
            )}
          </div>
        </div>

        {/* Pricing & Margin */}
        <div className="mt-3.5 pt-3 border-t border-slate-700/50 flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-white">
              ₹{Number(product.sellingPrice || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Cost: ₹{Number(product.costPrice || 0).toLocaleString('en-IN')}</span>
              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                +{profitMargin}% profit
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(product)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 active:scale-95 transition"
              title="Edit Details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition"
              title="Delete Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SIZES MATRIX & INSTANT STOCK ADJUSTMENT */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
            <span>Size Breakdown ({categorySizes.join(', ')}):</span>
            <span className="text-slate-400 font-normal text-[11px]">Click + / - for instant 0ms update</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {categorySizes.map((size) => {
              const qty = Number(product.sizes?.[size] || 0);
              const isSelected = activeSize === size;

              return (
                <div 
                  key={size}
                  onClick={() => setActiveSize(size)}
                  className={`relative flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected 
                      ? 'bg-indigo-600/20 border-indigo-500/60 ring-1 ring-indigo-500/40' 
                      : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* Size Label */}
                  <span className="text-xs font-extrabold text-slate-200">
                    {size}
                  </span>

                  {/* Stock Count Badge */}
                  <span className={`my-1 text-xs font-black px-1.5 py-0.5 rounded-md min-w-[24px] text-center ${
                    qty === 0 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : qty <= 2 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {qty}
                  </span>

                  {/* Touch buttons (+ / -) */}
                  <div className="flex items-center gap-1 w-full justify-center">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustStock(product.id, size, -1);
                      }}
                      className="w-5 h-5 rounded-md bg-slate-800 hover:bg-slate-700 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-300 transition"
                      title={`Reduce Size ${size} by 1`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustStock(product.id, size, 1);
                      }}
                      className="w-5 h-5 rounded-md bg-slate-800 hover:bg-indigo-600 active:scale-90 flex items-center justify-center text-slate-300 hover:text-white transition"
                      title={`Add Size ${size} by 1`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Quick Sell Action Bar */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          Selected Size: <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">{activeSize}</span>
          <span className="ml-1 text-[11px] text-slate-500">
            ({Number(product.sizes?.[activeSize] || 0)} left)
          </span>
        </div>

        <button
          onClick={() => onQuickSale(product, activeSize)}
          disabled={Number(product.sizes?.[activeSize] || 0) <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-md shadow-emerald-600/20"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Sell Size {activeSize}</span>
        </button>
      </div>

    </div>
  );
}
