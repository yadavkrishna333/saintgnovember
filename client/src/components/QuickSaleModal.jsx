import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import confetti from 'canvas-confetti';
import { X, ShoppingBag, Check, CreditCard, Banknote, QrCode, Search, Sparkles, AlertCircle } from 'lucide-react';

export function QuickSaleModal({ isOpen, onClose, product, initialSize = null }) {
  const { recordSale, sizesMap, inventory } = useInventory();

  const [selectedProduct, setSelectedProduct] = useState(product || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync selected product when modal opens or product prop changes
  useEffect(() => {
    if (product) {
      setSelectedProduct(product);
      setSearchQuery(`${product.sku} - ${product.styleCategory || product.name}`);
    } else if (inventory && inventory.length > 0) {
      setSelectedProduct(inventory[0]);
      setSearchQuery(`${inventory[0].sku} - ${inventory[0].styleCategory || inventory[0].name}`);
    } else {
      setSelectedProduct(null);
      setSearchQuery('');
    }
  }, [product, isOpen, inventory]);

  // When selectedProduct changes, update size and price
  useEffect(() => {
    if (selectedProduct) {
      const allowedSizes = sizesMap[selectedProduct.category] || Object.keys(selectedProduct.sizes || {});
      const fallbackSize = allowedSizes.find(s => (selectedProduct.sizes?.[s] || 0) > 0) || allowedSizes[0] || '';
      setSelectedSize(initialSize || fallbackSize);
      setSalePrice(selectedProduct.sellingPrice || '');
      setQuantity(1);
      setPaymentMode('Cash');
      setCustomerName('');
      setError('');
    }
  }, [selectedProduct, initialSize]);

  // Autocomplete filter across all inventory
  const matchingProducts = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    if (!searchQuery.trim()) return inventory.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return inventory.filter(p => 
      p.sku?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.styleCategory?.toLowerCase().includes(q) ||
      p.color?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [inventory, searchQuery]);

  if (!isOpen) return null;

  const currentAvailable = Number(selectedProduct?.sizes?.[selectedSize] || 0);
  const totalAmount = (Number(salePrice) || 0) * (Number(quantity) || 0);
  const allowedSizes = selectedProduct ? (sizesMap[selectedProduct.category] || Object.keys(selectedProduct.sizes || {})) : [];

  const handleSale = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Kripya pehle article/SKU select karein');
      return;
    }
    if (!selectedSize) {
      setError('Please select a size to sell');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be at least 1');
      return;
    }
    if (quantity > currentAvailable) {
      setError(`Only ${currentAvailable} pairs/items available for Size ${selectedSize}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await recordSale({
        productId: selectedProduct.id,
        size: selectedSize,
        quantity: Number(quantity),
        unitPrice: Number(salePrice),
        paymentMode,
        customerName
      });

      // Joyful confetti celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Sale failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-emerald-950/30 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Record Quick Sale / Bill</h2>
              <p className="text-xs text-amber-300 font-mono font-bold truncate max-w-[220px]">
                {selectedProduct ? `${selectedProduct.sku} (${selectedProduct.styleCategory || selectedProduct.name})` : 'Select Article'}
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

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSale} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. ARTICLE SEARCH / TYPE FIELD (User types SKU / Article name) */}
          <div className="relative">
            <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-1.5 flex items-center justify-between">
              <span>Kon Sa Article Sold Hua? (Type SKU / Name) *</span>
              {selectedProduct && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Stock: {Object.values(selectedProduct.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0)} pairs
                </span>
              )}
            </label>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Type SKU (e.g. SG-F-1852) or Article / Style name..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-950 border-2 border-amber-500/60 text-amber-300 text-xs sm:text-sm font-black font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400 shadow-md transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsDropdownOpen(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Backdrop to close dropdown when clicking outside */}
            {isDropdownOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
            )}

            {/* Autocomplete Dropdown List */}
            {isDropdownOpen && matchingProducts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto bg-slate-950 border-2 border-slate-700 rounded-2xl shadow-2xl p-1.5 divide-y divide-slate-800/80">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400">
                  Select Matching Article:
                </div>
                {matchingProducts.map((p) => {
                  const totalInStock = Object.values(p.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setSearchQuery(`${p.sku} - ${p.styleCategory || p.name}`);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 ${
                        isSelected ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40' : 'hover:bg-slate-900 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-black text-xs text-amber-300 truncate">{p.sku}</div>
                        <div className="text-[11px] text-slate-400 truncate">{p.styleCategory || p.name} &bull; <span className="text-slate-300 font-bold">{p.color}</span></div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                          totalInStock > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {totalInStock} in stock
                        </span>
                        <div className="text-[11px] text-emerald-400 font-mono font-black mt-0.5">₹{p.sellingPrice}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. SIZE SELECTOR */}
          {selectedProduct && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Choose Size to Sell
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {allowedSizes.map(size => {
                  const stock = Number(selectedProduct.sizes?.[size] || 0);
                  const isSelected = selectedSize === size;
                  const isOutOfStock = stock <= 0;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center ${
                        isSelected
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                          : isOutOfStock
                          ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xs font-black">{size}</span>
                      <span className={`text-[10px] font-bold font-mono ${isOutOfStock ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isOutOfStock ? '0' : `${stock}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. QUANTITY & SALE PRICE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Qty (Available: {currentAvailable})
              </label>
              <input
                type="number"
                min="1"
                max={currentAvailable || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sale Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 4. PAYMENT METHOD */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Cash', label: 'Cash', icon: Banknote },
                { id: 'UPI / QR', label: 'UPI / QR', icon: QrCode },
                { id: 'Card', label: 'Card', icon: CreditCard }
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. CUSTOMER NAME */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Customer Name / Phone (optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul / 9876543210"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 6. TOTAL BILL SUMMARY */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Selling Price / Total Bill</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Units</span>
              <span className="text-sm font-bold text-white font-mono">
                {quantity} {quantity === 1 ? 'pair' : 'pairs'} (Size {selectedSize || 'N/A'})
              </span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting || currentAvailable <= 0 || !selectedProduct}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              {isSubmitting 
                ? 'Recording Sale...' 
                : selectedProduct 
                ? `Confirm Sale (${selectedProduct.sku} - Size ${selectedSize || '?'})`
                : 'Select Article to Sell'}
            </span>
          </button>

        </form>

      </div>
    </div>
  );
}
