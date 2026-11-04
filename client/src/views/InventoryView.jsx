import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getColorDetails, formatColorName } from '../utils/colors';
import { 
  Search, 
  Plus, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Truck, 
  Sparkles, 
  Barcode, 
  LayoutGrid, 
  Table as TableIcon, 
  Eye,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ClipboardPaste,
  FileSpreadsheet
} from 'lucide-react';
import { BulkPasteModal } from '../components/BulkPasteModal';

export function InventoryView({ onOpenAddModal, onEditProduct, onQuickSale, onOpenReplenish, onOpenGSheetModal }) {
  const { 
    inventory, 
    categories, 
    sizesMap, 
    searchQuery, 
    setSearchQuery, 
    updateDisplaySize, 
    deleteProduct 
  } = useInventory();

  const [copiedSku, setCopiedSku] = useState(null);
  const [viewMode, setViewMode] = useState('auto'); // 'auto' | 'table' | 'cards'
  // Default to women_footwear so clicking Inventory renders instantly without processing 5 categories at once
  const [selectedCategory, setSelectedCategory] = useState('women_footwear');
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  
  // Mobile detection for high-performance DOM rendering (eliminates duplicate 143+ cards/rows)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showTable = viewMode === 'table' || (viewMode === 'auto' && !isMobile);
  const showCards = viewMode === 'cards' || (viewMode === 'auto' && isMobile);

  // Table horizontal scroll refs
  const tableRefs = useRef({});
  const scrollCategoryTable = (catId, amount) => {
    tableRefs.current[catId]?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleCopySku = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  const handleDelete = async (product) => {
    if (!product || !product.id) return;
    const confirmDelete = window.confirm(
      `⚠️ Kya aap article "${product.sku || product.name}" ko inventory se DELETE karna chahte hain?\n\nYeh article inventory aur cloud database se permanent delete ho jayega.`
    );
    if (confirmDelete) {
      try {
        await deleteProduct(product.id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const getFilteredCategoryItems = (categoryId) => {
    return inventory.filter(p => {
      if (p.category !== categoryId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.styleCategory?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Mode Switcher Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU (e.g. SG-F-1560-TAN), Style (Block Heels), color..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Card View (Phone Optimized)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>


          <button
            onClick={onOpenGSheetModal}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-bold text-xs transition shadow-md shadow-emerald-500/10 active:scale-95 flex-shrink-0"
            title="Sync & Update Live Google Sheet (गूगल शीट अपडेट करें)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Google Sheet</span>
            <span className="sm:hidden">Sheet</span>
          </button>

          <button
            onClick={() => setIsBulkPasteOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs transition shadow-md active:scale-95 flex-shrink-0"
            title="Bulk Paste / Add Multiple Items at Once (एक साथ कई आर्टिकल्स पेस्ट करके जोड़ें)"
          >
            <ClipboardPaste className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bulk Paste Add</span>
            <span className="sm:hidden">Bulk</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Product</span>
          </button>
        </div>

      </div>

      {/* CATEGORY TABS (INSTANT FILTERING - NO DELAY) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const count = inventory.filter(p => p.category === cat.id).length;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="text-sm">{cat.icon || '📦'}</span>
              <span>{cat.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* All Products Tab */}
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 active:scale-95 ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
              : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="text-sm">🌐</span>
          <span>All Products</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            selectedCategory === 'all' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {inventory.length}
          </span>
        </button>
      </div>

      {/* SECTIONS: Filtered by Active Category */}
      <div className="space-y-10">
        {(selectedCategory === 'all' 
          ? categories 
          : categories.filter(c => c.id === selectedCategory)
        ).map((category) => {
          const items = getFilteredCategoryItems(category.id);
          const categorySizes = sizesMap[category.id] || category.sizes || ['Standard'];

          if (searchQuery.trim() && items.length === 0) return null;

          // Compute size-wise column totals for footer
          const sizeTotals = {};
          categorySizes.forEach(s => { sizeTotals[s] = 0; });
          let grandCategoryTotal = 0;
          let displayPiecesCount = 0;

          items.forEach(p => {
            categorySizes.forEach(s => {
              const qty = Number(p.sizes?.[s] || 0);
              sizeTotals[s] += qty;
              grandCategoryTotal += qty;
            });
            if (p.displaySize) displayPiecesCount++;
          });

          return (
            <div key={category.id} className="space-y-4">
              
              {/* CATEGORY BAR WITH HORIZONTAL SCROLL CONTROLS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 shadow-xl shadow-black/40">
                  <span className="text-xl sm:text-2xl">{category.icon || '📦'}</span>
                  <h2 className="text-sm sm:text-base font-black tracking-wider uppercase bg-gradient-to-r from-amber-300 via-yellow-200 to-white bg-clip-text text-transparent">
                    {category.label}
                  </h2>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    {items.length} {items.length === 1 ? 'model' : 'models'} &bull; {grandCategoryTotal} pairs
                  </span>
                </div>

                {/* Quick horizontal scroll controls */}
                {showTable && items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">Scroll Table:</span>
                    <button
                      onClick={() => scrollCategoryTable(category.id, -260)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                      title="Scroll table horizontally left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Left</span>
                    </button>
                    <button
                      onClick={() => scrollCategoryTable(category.id, 260)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                      title="Scroll table horizontally right"
                    >
                      <span>Right</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 text-slate-500 text-xs">
                  No items in {category.label} yet.
                </div>
              ) : (
                <>
                  {/* ================= DESKTOP FULL-WIDTH TABLE ================= */}
                  {showTable && (
                    <div 
                      ref={el => { if (el) tableRefs.current[category.id] = el; }}
                      className="relative max-h-[calc(100vh-230px)] overflow-x-auto overflow-y-auto border border-slate-800/90 rounded-3xl shadow-2xl bg-slate-900"
                    >
                      <table className="w-full text-left border-collapse text-xs">
                        
                        {/* Table Header with DISPLAY column & STICKY TOP + STICKY LEFT */}
                        <thead className="sticky top-0 z-30 bg-slate-950 shadow-md">
                          <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] select-none">
                            <th className="py-2 px-2 text-center w-12 sticky left-0 z-40 bg-slate-950 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">SR</th>
                            <th className="py-2 px-2 w-[210px] min-w-[210px] text-sky-300 font-black tracking-wider sticky left-[48px] z-40 bg-slate-950 border-r border-slate-800/80 shadow-[3px_0_8px_rgba(0,0,0,0.6)]">
                              <div className="flex items-center gap-1.5">
                                <span>SKU CODE</span>
                                <span className="text-[8px] uppercase px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">MAIN</span>
                              </div>
                            </th>
                            <th className="py-2 px-3 w-[300px] min-w-[300px]">STYLE & PRICE</th>
                            <th className="py-2 px-2 min-w-[120px] max-w-[150px]">COLOR</th>

                            {/* Size Columns */}
                            {categorySizes.map((size) => (
                              <th 
                                key={size} 
                                className="py-2 px-1.5 text-center min-w-[45px] font-mono text-white bg-slate-900/60 border-x border-slate-800/60 text-[10px]"
                              >
                                {size}
                              </th>
                            ))}

                            {/* DISPLAY COLUMN */}
                            <th className="py-2 px-2 text-center w-24 bg-amber-500/10 text-amber-300 border-x border-amber-500/30 text-[10px]">
                              <div className="flex items-center justify-center gap-1 font-black">
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>DISPLAY</span>
                              </div>
                            </th>

                            <th className="py-2 px-2 text-center w-16 text-[10px]">TOTAL</th>
                            <th className="py-2 px-2 text-center min-w-[130px] text-[10px]">ACTIONS</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800/60">
                          {items.map((product, idx) => {
                            const srNo = String(idx + 1).padStart(2, '0');
                            const colorInfo = getColorDetails(product.color);
                            const totalStock = Object.values(product.sizes || {}).reduce((s, v) => s + (Number(v) || 0), 0);

                            return (
                              <tr 
                                key={product.id}
                                className="hover:bg-slate-800/40"
                              >
                                
                                {/* SR NO (STICKY LEFT) */}
                                <td className="py-2 px-2 text-center font-mono font-bold text-slate-500 sticky left-0 z-20 bg-slate-950 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.5)] text-[10px]">
                                  #{srNo}
                                </td>

                                {/* SKU CODE (HIGH VISIBILITY BLUE/SKY BADGE WITH BACKGROUND) */}
                                <td className="py-2 px-2 whitespace-nowrap w-[210px] sticky left-[48px] z-20 bg-slate-950 border-r border-slate-800/80 shadow-[3px_0_8px_rgba(0,0,0,0.6)]">
                                  <div className="w-[195px] h-[34px] px-2.5 flex items-center justify-between rounded-xl bg-slate-900 border-2 border-sky-400/90 font-mono font-black text-[12px] text-sky-200 shadow-md tracking-wider">
                                    <span className="truncate select-all font-black text-white" title={product.sku}>
                                      {product.sku}
                                    </span>
                                    <button
                                      onClick={() => handleCopySku(product.sku)}
                                      title="Copy SKU Code"
                                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex-shrink-0 ml-1.5 transition"
                                    >
                                      {copiedSku === product.sku ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* STYLE CATEGORY (LEFT: WIDE IMAGE SHOWING FULL PRODUCT, RIGHT: STYLE CATEGORY & PRICE) */}
                                <td className="py-2 px-3 w-[300px] min-w-[300px]">
                                  <div className="flex items-center gap-3.5">
                                    {product.imageUrl ? (
                                      <div className="w-28 h-16 rounded-xl bg-slate-950 border border-slate-700/80 p-1 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                                        <img
                                          src={product.imageUrl}
                                          alt={product.styleCategory || product.sku}
                                          loading={idx < 15 ? "eager" : "lazy"}
                                          decoding="async"
                                          className="w-full h-full object-contain transition-opacity duration-150"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.parentElement.innerHTML = '<span class="text-slate-500 text-lg select-none">📦</span>';
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-28 h-16 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 text-lg flex-shrink-0">
                                        📦
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1 leading-snug">
                                      <div className="text-[13px] font-black text-white tracking-wide uppercase truncate" title={product.styleCategory}>
                                        {product.styleCategory || "Footwear"}
                                      </div>
                                      <div className="mt-1.5">
                                        <span className="text-[12px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg inline-block shadow-sm">
                                          ₹{Number(product.sellingPrice || 0).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* COLOR (COMPACT WITH CIRCLE DOT) */}
                                <td className="py-1.5 px-2 whitespace-nowrap min-w-[120px] max-w-[150px]">
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px]">
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0 border ring-1 ring-white/10"
                                      style={{ 
                                        backgroundColor: colorInfo.bg,
                                        borderColor: colorInfo.border || 'rgba(255,255,255,0.3)' 
                                      }}
                                    />
                                    <span className="font-bold text-slate-200 truncate max-w-[95px]" title={formatColorName(product.color)}>
                                      {formatColorName(product.color)}
                                    </span>
                                  </div>
                                </td>

                                {/* SIZES: 0 = RED, >0 = GREEN (CLEAN COMPACT) */}
                                {categorySizes.map((size) => {
                                  const qty = Number(product.sizes?.[size] || 0);
                                  const isZero = qty === 0;

                                  return (
                                    <td 
                                      key={size}
                                      className="py-1.5 px-1 text-center border-x border-slate-800/40 select-none"
                                    >
                                      <span 
                                        className={`inline-block min-w-[28px] px-1.5 py-0.5 rounded-md text-[11px] font-black font-mono leading-tight ${
                                          isZero
                                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        }`}
                                        title={`Size ${size}: ${qty} in stock (Edit via Edit button)`}
                                      >
                                        {qty}
                                      </span>
                                    </td>
                                  );
                                })}

                                {/* DISPLAY COLUMN (COMPACT) */}
                                <td className="py-1 px-1.5 text-center bg-amber-500/5 border-x border-amber-500/30">
                                  <select
                                    value={product.displaySize || ''}
                                    onChange={(e) => updateDisplaySize(product.id, e.target.value)}
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer text-center focus:outline-none ${
                                      product.displaySize 
                                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-mono' 
                                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                                    }`}
                                    title="Choose what size is put on shop display (NOT added to total)"
                                  >
                                    <option value="" className="bg-slate-900 text-slate-400">None</option>
                                    {categorySizes.map(s => (
                                      <option key={s} value={s} className="bg-slate-900 text-white font-bold">
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* TOTAL */}
                                <td className="py-1.5 px-2 text-center">
                                  <span className={`font-mono font-black text-[11px] px-2 py-0.5 rounded-lg border ${
                                    totalStock === 0
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                      : totalStock < 7 && (product.category === 'women_footwear' || product.category === 'men_footwear')
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                                      : 'bg-slate-800 text-white border-slate-700'
                                  }`}>
                                    {totalStock}
                                  </span>
                                </td>

                                {/* ACTIONS (COMPACT BUTTONS) */}
                                <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => onQuickSale(product)}
                                      disabled={totalStock <= 0}
                                      className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                      title="Sell Item"
                                    >
                                      <ShoppingCart className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => onOpenReplenish(product)}
                                      className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 active:scale-95 transition"
                                      title="Receive Stock"
                                    >
                                      <Truck className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => onEditProduct(product)}
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition"
                                      title="Edit Product"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => handleDelete(product)}
                                      className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 active:scale-95 transition"
                                      title="Delete Product"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>

                        {/* CATEGORY TOTAL FOOTER ROW (STICKY BOTTOM + STICKY LEFT) */}
                        <tfoot className="sticky bottom-0 z-30 bg-slate-950/98 backdrop-blur-md border-t-2 border-slate-700 text-[11px] font-black text-white shadow-[-1px_-4px_10px_rgba(0,0,0,0.5)]">
                          <tr>
                            <td className="py-2 px-2 text-center font-mono text-slate-400 sticky left-0 z-40 bg-slate-950 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                              TOTAL
                            </td>
                            <td className="py-2 px-2 font-mono text-sky-300 uppercase tracking-wider sticky left-[48px] z-40 bg-slate-950 border-r border-slate-800 shadow-[3px_0_8px_rgba(0,0,0,0.6)]">
                              {items.length} Models
                            </td>
                            <td className="py-2 px-2 text-slate-400 font-bold uppercase tracking-wide">
                              Category Summary
                            </td>
                            <td className="py-2 px-2 text-slate-500">
                              -
                            </td>

                            {/* Size-wise sum pills across category */}
                            {categorySizes.map((size) => (
                              <td 
                                key={size} 
                                className="py-2 px-1 text-center border-x border-slate-800/80 bg-slate-900/40"
                              >
                                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-mono font-black text-[10px]">
                                  {sizeTotals[size]}
                                </span>
                              </td>
                            ))}

                            {/* Display total */}
                            <td className="py-2 px-1 text-center bg-amber-500/10 border-x border-amber-500/30 text-amber-300 font-mono font-bold text-[10px]">
                              {displayPiecesCount} on display
                            </td>

                            {/* Grand Category Total Quantity */}
                            <td className="py-2 px-2 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] font-mono shadow-sm">
                                {grandCategoryTotal}
                              </span>
                            </td>

                            <td className="py-2 px-2 text-center text-slate-500">
                              -
                            </td>
                          </tr>
                        </tfoot>

                      </table>
                    </div>
                  )}

                  {/* ================= PHONE / MOBILE SNAP CARD VIEW ================= */}
                  {showCards && (
                    <div className="space-y-4">
                      {items.map((product, idx) => {
                        const colorInfo = getColorDetails(product.color);
                        const totalStock = Object.values(product.sizes || {}).reduce((s, v) => s + (Number(v) || 0), 0);

                        return (
                          <div
                            key={product.id}
                            className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 relative overflow-hidden"
                          >
                            {/* TOP PROMINENT SKU BANNER (PRIMARY FOCUS - HIGH VISIBILITY) */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-950 border-2 border-sky-400 shadow-lg shadow-sky-500/10">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-400 text-slate-950">SKU</span>
                                <span className="font-mono text-sm sm:text-base font-black text-white tracking-wider select-all">{product.sku}</span>
                              </div>
                              <button
                                onClick={() => handleCopySku(product.sku)}
                                className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white active:scale-95 transition"
                                title="Copy SKU"
                              >
                                {copiedSku === product.sku ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* IMAGE ON LEFT (WIDE RECTANGLE SHOWING FULL ARTICLE), STYLE CATEGORY & PRICE SHIFTED RIGHT */}
                            <div className="flex gap-4 items-center">
                              {product.imageUrl ? (
                                <div className="w-36 sm:w-40 h-24 rounded-2xl bg-slate-950 border-2 border-slate-700/80 p-1.5 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.styleCategory || product.sku}
                                    loading={idx < 10 ? "eager" : "lazy"}
                                    decoding="async"
                                    className="w-full h-full object-contain transition-opacity duration-150"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.parentElement.innerHTML = '<span class="text-slate-500 text-xl select-none">📦</span>';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-36 sm:w-40 h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500 text-2xl flex-shrink-0">
                                  📦
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                                  {product.styleCategory || "Footwear"}
                                </div>
                                <div className="mt-2.5">
                                  <span className="text-sm sm:text-base font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl inline-block shadow-sm">
                                    ₹{Number(product.sellingPrice || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </div>

                          {/* COLOR & DISPLAY ROW */}
                          <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span 
                                  className="w-3.5 h-3.5 rounded-full border shadow-sm"
                                  style={{ 
                                    backgroundColor: colorInfo.bg,
                                    borderColor: colorInfo.border || 'rgba(255,255,255,0.3)' 
                                  }}
                                />
                                <span className="text-xs font-bold text-slate-300">{formatColorName(product.color)}</span>
                              </div>

                              <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                                totalStock === 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-white'
                              }`}>
                                Total Stock: {totalStock}
                              </span>
                            </div>

                            {/* Mobile Display Piece Selector */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Eye className="w-3 h-3" /> Display Piece:
                              </span>
                              <select
                                value={product.displaySize || ''}
                                onChange={(e) => updateDisplaySize(product.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold rounded-lg px-2 py-0.5"
                              >
                                <option value="">No Display</option>
                                {categorySizes.map(s => (
                                  <option key={s} value={s}>Size {s}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* SIZES BREAKDOWN */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                              <span>Stock by Size:</span>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                              {categorySizes.map((size) => {
                                const qty = Number(product.sizes?.[size] || 0);
                                const isZero = qty === 0;

                                return (
                                  <div 
                                    key={size}
                                    className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex flex-col items-center justify-center"
                                  >
                                    <span className="text-[10px] font-bold text-slate-400">{size}</span>
                                    
                                    <span className={`mt-0.5 text-xs font-black font-mono px-2 py-0.5 rounded-md min-w-[24px] text-center ${
                                      isZero 
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    }`}>
                                      {qty}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick Actions Footer */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                            <button
                              onClick={() => onQuickSale(product)}
                              disabled={totalStock <= 0}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 transition shadow-md shadow-emerald-600/20"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Sell Item</span>
                            </button>

                            <button
                              onClick={() => onOpenReplenish(product)}
                              className="py-2 px-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Stock In</span>
                            </button>

                            <button
                              onClick={() => onEditProduct(product)}
                              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      );
                    })}

                    {/* Mobile Category Summary Banner */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-between text-xs font-black">
                      <span className="text-amber-400">{category.label} Total:</span>
                      <span className="text-white bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl">
                        {grandCategoryTotal} total pairs ({displayPiecesCount} on display)
                      </span>
                    </div>
                  </div>
                )}
                </>
              )}

            </div>
          );
        })}
      </div>

      {/* Bulk Paste Modal */}
      <BulkPasteModal 
        isOpen={isBulkPasteOpen} 
        onClose={() => setIsBulkPasteOpen(false)} 
      />

    </div>
  );
}

