import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  X, 
  Edit3, 
  Check, 
  AlertCircle, 
  DollarSign, 
  CreditCard, 
  ShoppingBag, 
  Search,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { getColorDetails } from '../utils/colors';

export function EditSaleModal({ isOpen, onClose, saleToEdit }) {
  const { inventory, sizesMap, categories, updateSaleRecord } = useInventory();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [source, setSource] = useState('store'); // 'store' | 'warehouse'

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize modal with existing sale data
  useEffect(() => {
    if (saleToEdit && isOpen) {
      setSelectedProductId(saleToEdit.productId || '');
      setSelectedSize(String(saleToEdit.size || ''));
      setQuantity(Number(saleToEdit.quantity || 1));
      setSellingPrice(Number(saleToEdit.unitPrice || (saleToEdit.totalAmount ? saleToEdit.totalAmount / (saleToEdit.quantity || 1) : 0)));
      setPaymentMode(saleToEdit.paymentMode || 'Cash');
      setCustomerName(saleToEdit.customerName || '');
      setSource(saleToEdit.source || 'store');
      
      const d = saleToEdit.timestamp ? new Date(saleToEdit.timestamp) : new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      setSaleDate(localISOTime);

      setErrorMsg('');
      setSearchTerm('');
    }
  }, [saleToEdit, isOpen]);

  // Selected product
  const currentProduct = useMemo(() => {
    return inventory.find(p => p.id === selectedProductId) || null;
  }, [inventory, selectedProductId]);

  // Available sizes for selected product
  const allowedSizes = useMemo(() => {
    if (!currentProduct) return [];
    return sizesMap[currentProduct.category] || ['Standard'];
  }, [currentProduct, sizesMap]);

  // Filter products for dropdown
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return inventory;
    const q = searchTerm.toLowerCase();
    return inventory.filter(p => 
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.styleCategory && p.styleCategory.toLowerCase().includes(q)) ||
      (p.color && p.color.toLowerCase().includes(q))
    );
  }, [inventory, searchTerm]);

  // Calculate available stock for the selected size
  // Note: If editing the same product and size, we add back the old quantity to what's available
  const availableStockForSize = useMemo(() => {
    if (!currentProduct || !selectedSize) return 0;
    const currentInInventory = Number(currentProduct.sizes?.[selectedSize] || 0);
    const isSameProductAndSize = saleToEdit?.productId === currentProduct.id && String(saleToEdit?.size) === String(selectedSize);
    return isSameProductAndSize ? currentInInventory + Number(saleToEdit?.quantity || 0) : currentInInventory;
  }, [currentProduct, selectedSize, saleToEdit]);

  if (!isOpen || !saleToEdit) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId && !saleToEdit.sku) {
      setErrorMsg('Please select a product');
      return;
    }
    if (!selectedSize) {
      setErrorMsg('Please select a size');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity must be at least 1');
      return;
    }
    if (source !== 'warehouse' && quantity > availableStockForSize) {
      setErrorMsg(`Only ${availableStockForSize} pieces available in stock for Size ${selectedSize}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await updateSaleRecord(saleToEdit.id, {
        productId: selectedProductId,
        size: selectedSize,
        quantity: Number(quantity),
        unitPrice: Number(sellingPrice),
        paymentMode,
        customerName: customerName.trim(),
        source,
        timestamp: saleDate ? new Date(saleDate).toISOString() : saleToEdit.timestamp
      });

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBill = Number(sellingPrice || 0) * Number(quantity || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Edit Sold Article</h2>
              <p className="text-xs text-slate-400">बिक्री सुधारें (Galti se galat enter hua ho to change karein)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* SOURCE SELECTION: STORE VS WAREHOUSE */}
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSource('store')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                source === 'store'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <span>🏬</span>
              <span>Store (Minus Stock)</span>
            </button>

            <button
              type="button"
              onClick={() => setSource('warehouse')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                source === 'warehouse'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <span>🏭</span>
              <span>Warehouse (No Minus)</span>
            </button>
          </div>

          {/* Select Product */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Article / Product (SKU) <span className="text-amber-400">*</span>
            </label>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU or style..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={selectedProductId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedProductId(newId);
                const prod = inventory.find(p => p.id === newId);
                if (prod) {
                  setSellingPrice(prod.sellingPrice || 0);
                  const firstSize = (sizesMap[prod.category] || [])[0] || '';
                  setSelectedSize(firstSize);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
            >
              {filteredProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.styleCategory || p.name} ({p.color}) [₹{p.sellingPrice}]
                </option>
              ))}
            </select>
          </div>

          {/* Product Preview Card */}
          {currentProduct && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-black text-amber-400 text-sm block">{currentProduct.sku}</span>
                <span className="text-slate-300 font-semibold">{currentProduct.styleCategory || currentProduct.name} ({currentProduct.color})</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block font-bold">Standard Price</span>
                <span className="font-black text-emerald-400 text-sm">₹{currentProduct.sellingPrice}</span>
              </div>
            </div>
          )}

          {/* Size Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Sold Size <span className="text-amber-400">*</span>
              </label>
              {selectedSize && (
                <span className="text-[11px] font-bold text-amber-400">
                  Available in Stock: {availableStockForSize} pcs
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {allowedSizes.map(size => {
                const isSelected = String(selectedSize) === String(size);
                const inStock = Number(currentProduct?.sizes?.[size] || 0);
                const isSameOrig = saleToEdit?.productId === currentProduct?.id && String(saleToEdit?.size) === String(size);
                const effectiveStock = isSameOrig ? inStock + Number(saleToEdit?.quantity || 0) : inStock;
                const isOutOfStock = effectiveStock <= 0;

                return (
                  <button
                    type="button"
                    key={size}
                    disabled={isOutOfStock}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 scale-105'
                        : isOutOfStock
                          ? 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{size}</span>
                    <span className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-slate-900 font-bold' : isOutOfStock ? 'text-rose-500' : 'text-slate-500'}`}>
                      {effectiveStock} left
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Quantity (Pieces)
              </label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 font-bold text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={availableStockForSize || 99}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full text-center bg-transparent text-sm font-black text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableStockForSize || 99, quantity + 1))}
                  className="px-3 py-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-emerald-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Sale Date & Time */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Sale Date & Time (बिक्री की तारीख / समय)</span>
            </label>
            <input
              type="datetime-local"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Payment Mode & Customer Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Cash">Cash (नकद)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Card (POS)</option>
                <option value="Mix">Mix / Split</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Customer Name / Note
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Total Bill Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bill Amount</span>
              <span className="text-xl font-black text-emerald-400">₹{totalBill.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {quantity} piece(s) &bull; Size {selectedSize || '—'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedSize || quantity <= 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-40 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Save Changes (अपडेट करें)
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
