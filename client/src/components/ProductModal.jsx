import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Check, AlertCircle, Plus, Minus } from 'lucide-react';

export function ProductModal({ isOpen, onClose, editProduct = null }) {
  const { addProduct, updateProduct, categories, sizesMap } = useInventory();

  const [category, setCategory] = useState(categories[0]?.id || 'women_footwear');
  const [styleCategory, setStyleCategory] = useState('Block Heels');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [sku, setSku] = useState('');
  const [displaySize, setDisplaySize] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [sizes, setSizes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const stylePresets = {
    women_footwear: ['Block Heels', 'Pencil Heel', 'Pumps', 'Flats', 'Stiletto', 'Platform'],
    men_footwear: ['Sneakers', 'Running Shoes', 'Loafers', 'Formal Oxford', 'Boots', 'Slip-on'],
    men_jacket: ['Biker Leather', 'Down Puffer', 'Bomber', 'Varsity', 'Denim Jacket'],
    women_jacket: ['Cropped Trench', 'Teddy Bomber', 'Biker Leather', 'Puffer', 'Blazer'],
    bags: ['Satchel Handbag', 'Tote Bag', 'Backpack', 'Crossbody Bag', 'Duffle']
  };

  useEffect(() => {
    if (editProduct) {
      setCategory(editProduct.category || categories[0]?.id || 'women_footwear');
      setStyleCategory(editProduct.styleCategory || 'Block Heels');
      setName(editProduct.name || '');
      setBrand(editProduct.brand || '');
      setColor(editProduct.color || '');
      setDisplaySize(editProduct.displaySize || '');
      setMaterial(editProduct.material || '');
      setSellingPrice(editProduct.sellingPrice || '');
      setSku(editProduct.sku || '');
      setBarcode(editProduct.barcode || '');
      setImageUrl(editProduct.imageUrl || '');
      setNotes(editProduct.notes || '');
      setSizes(editProduct.sizes || {});
    } else {
      const defaultCat = categories[0]?.id || 'women_footwear';
      setCategory(defaultCat);
      setStyleCategory(stylePresets[defaultCat]?.[0] || 'Block Heels');
      setName('');
      setBrand('Saint G');
      setColor('Tan');
      setDisplaySize('');
      setMaterial('');
      setSellingPrice('');
      setSku('');
      setBarcode('');
      setImageUrl('');
      setNotes('');
      const initialSizes = {};
      (sizesMap[defaultCat] || []).forEach(s => { initialSizes[s] = 0; });
      setSizes(initialSizes);
    }
    setError('');
  }, [editProduct, isOpen, categories, sizesMap]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (!editProduct) {
      setStyleCategory(stylePresets[newCat]?.[0] || 'Standard');
      const newSizes = {};
      (sizesMap[newCat] || []).forEach(s => { newSizes[s] = 0; });
      setSizes(newSizes);
    }
  };

  const handleSizeChange = (sizeKey, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSizes(prev => ({
      ...prev,
      [sizeKey]: num
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // STRICT USER RULES:
    // Only category, color, sku, and at least 1 size are COMPULSORY.
    if (!category) {
      setError('Category is compulsory');
      return;
    }
    if (!color.trim()) {
      setError('Color is compulsory (e.g. Tan, Black, Brown)');
      return;
    }

    const totalStockAdded = Object.values(sizes).reduce((sum, q) => sum + (Number(q) || 0), 0);
    if (totalStockAdded <= 0 && !editProduct) {
      setError('Size quantity is compulsory. Please add at least 1 unit to a size.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const productData = {
        name: name.trim() || `${styleCategory} ${color}`.trim(),
        styleCategory: styleCategory.trim() || 'Block Heels',
        brand: brand.trim() || 'Saint G',
        category,
        color: color.trim(),
        displaySize: displaySize.trim(),
        material: material.trim(),
        sellingPrice: Number(sellingPrice) || 0,
        sku: sku.trim() || undefined,
        barcode: barcode.trim(),
        sizes,
        imageUrl: imageUrl.trim(),
        notes: notes.trim()
      };

      if (editProduct) {
        await updateProduct(editProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentSizes = sizesMap[category] || categories.find(c => c.id === category)?.sizes || ['Standard'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {editProduct ? 'Edit Product' : 'Add New Article to KY INVENTORY'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Only Category, Color, SKU & Sizes are compulsory
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. COMPULSORY: CATEGORY */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1">
              <span>1. Category</span>
              <span className="text-rose-400 font-black">* (Compulsory)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                    category === cat.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base">{cat.icon || '📦'}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. COMPULSORY: COLOR & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                <span>2. Color</span>
                <span className="text-rose-400 font-black">* (Compulsory)</span>
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Tan, Black, Brown, Gold, Red"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                <span>3. SKU Code</span>
                <span className="text-rose-400 font-black">* (Compulsory)</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. SG-F-1560-TAN (or auto-gen)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-black text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* 4. COMPULSORY: SIZES GRID (DIRECT INPUT OR + / - STEPPERS) */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span>4. Size Quantities (Stock Add / Remove)</span>
                <span className="text-rose-400 font-black">* (Compulsory)</span>
              </label>
              <span className="text-xs font-black text-emerald-400">
                Total: {Object.values(sizes).reduce((a, b) => a + (Number(b) || 0), 0)} pairs/pieces
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {currentSizes.map((size) => {
                const qty = Number(sizes[size] ?? 0);
                return (
                  <div key={size} className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col items-center justify-between">
                    <span className="text-xs font-black text-slate-300 mb-1.5">
                      {size}
                    </span>
                    <div className="flex items-center gap-1 w-full justify-center">
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => handleSizeChange(size, Math.max(0, qty - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 disabled:opacity-20 flex items-center justify-center text-slate-300 transition"
                        title={`Decrease size ${size}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={sizes[size] ?? 0}
                        onChange={(e) => handleSizeChange(size, e.target.value)}
                        className="w-12 text-center py-1 rounded-lg bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-black text-xs focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSizeChange(size, qty + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:scale-90 flex items-center justify-center text-slate-300 transition"
                        title={`Increase size ${size}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPTIONAL FIELDS SECTION */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Optional Details (Aapke man par he add karna ya nahi):
            </span>

            {/* Style Category & Display Piece */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Style Category (Optional)
                </label>
                <input
                  type="text"
                  value={styleCategory}
                  onChange={(e) => setStyleCategory(e.target.value)}
                  placeholder="e.g. Block Heels, Pencil Heel"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-400 mb-1">
                  Display Piece Size (Optional)
                </label>
                <select
                  value={displaySize}
                  onChange={(e) => setDisplaySize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 text-xs font-bold focus:outline-none"
                >
                  <option value="">No Display Piece</option>
                  {currentSizes.map(s => (
                    <option key={s} value={s}>Size {s} on Display</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selling Price & Article Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Article Title / Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Italian Strappy Heel"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  Selling Price ₹ (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="e.g. 4499"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Image URL & Barcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Box barcode number"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Saving...' : editProduct ? 'Update Article' : 'Add to Inventory'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
