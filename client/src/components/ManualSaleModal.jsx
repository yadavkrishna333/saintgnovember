import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  X, 
  CalendarPlus, 
  Check, 
  AlertCircle, 
  DollarSign, 
  CreditCard, 
  ShoppingBag, 
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getColorDetails } from '../utils/colors';

export function ManualSaleModal({ isOpen, onClose, onSaleAdded }) {
  const { inventory, sizesMap, recordSale } = useInventory();

  // Helper date strings (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDayBeforeYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Form states
  const [source, setSource] = useState('store'); // 'store' | 'warehouse'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(() => getYesterdayStr()); // default to yesterday as requested
  const [saleTime, setSaleTime] = useState('14:30');
  const [deductStock, setDeductStock] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSource('store');
      setSearchTerm('');
      setSelectedProduct(null);
      setSelectedSize('');
      setQuantity(1);
      setUnitPrice('');
      setPaymentMode('Cash');
      setCustomerName('');
      setSaleDate(getYesterdayStr());
      setSaleTime('14:30');
      setDeductStock(true);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  // When a product is selected, pre-fill price and first available size
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm('');
    setUnitPrice(product.sellingPrice !== undefined ? String(product.sellingPrice) : '0');

    // Auto-select size with highest stock or default
    const availableSizes = sizesMap[product.category] || ['Standard'];
    let bestSize = availableSizes[0] || '';
    for (const s of availableSizes) {
      if (Number(product.sizes?.[s] || 0) > 0) {
        bestSize = s;
        break;
      }
    }
    setSelectedSize(bestSize);
    setErrorMsg('');
  };

  // When user enters an SKU that is not in inventory
  const handleSelectUnlisted = (sku) => {
    const cleanSku = (sku || searchTerm).toUpperCase().trim();
    if (!cleanSku) return;
    setSelectedProduct({
      id: `prod-wh-${Date.now().toString(36)}`,
      sku: cleanSku,
      name: `Article ${cleanSku}`,
      styleCategory: 'Warehouse Item',
      color: 'Standard',
      category: 'women_footwear',
      sellingPrice: 0,
      sizes: {},
      isWarehouseOnly: true
    });
    setSource('warehouse');
    setSearchTerm('');
    setSelectedSize('37');
    setUnitPrice('');
    setErrorMsg('');
  };

  const handleKeyDownSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        handleSelectProduct(filteredProducts[0]);
      } else if (searchTerm.trim()) {
        handleSelectUnlisted(searchTerm.trim());
      }
    }
  };

  // Filter products for search autocomplete (with alphanumeric normalization)
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    const cleanQ = q.replace(/[^a-z0-9]/g, '');
    return inventory.filter(p => {
      const sku = (p.sku || '').toLowerCase();
      const cleanSku = sku.replace(/[^a-z0-9]/g, '');
      const skuMatch = sku.includes(q) || (cleanQ && cleanSku.includes(cleanQ));
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      const styleMatch = p.styleCategory && p.styleCategory.toLowerCase().includes(q);
      const colorMatch = p.color && p.color.toLowerCase().includes(q);
      return skuMatch || nameMatch || styleMatch || colorMatch;
    }).slice(0, 12); // Top 12 matches
  }, [inventory, searchTerm]);

  // Allowed sizes for selected product
  const allowedSizes = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.isWarehouseOnly) {
      return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Standard'];
    }
    return sizesMap[selectedProduct.category] || ['Standard'];
  }, [selectedProduct, sizesMap]);

  // Current stock for selected size
  const currentStockForSize = useMemo(() => {
    if (!selectedProduct || !selectedSize || selectedProduct.isWarehouseOnly) return 0;
    return Number(selectedProduct.sizes?.[selectedSize] || 0);
  }, [selectedProduct, selectedSize]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setErrorMsg('कृपया कोई आर्टिकल या SKU कोड चुनें (Please select a product)');
      return;
    }
    if (!selectedSize) {
      setErrorMsg('कृपया साइज़ चुनें (Please select a size)');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity कम से कम 1 होनी चाहिए');
      return;
    }
    const numPrice = Number(unitPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('कृपया सही अमाउंट दर्ज करें (Valid selling price)');
      return;
    }
    if (!saleDate) {
      setErrorMsg('कृपया बिक्री की तारीख चुनें (Please select sale date)');
      return;
    }

    // Build timestamp in local timezone
    const [year, month, day] = saleDate.split('-').map(Number);
    const [hours, minutes] = (saleTime || '12:00').split(':').map(Number);
    const targetDateObj = new Date(year, month - 1, day, hours || 12, minutes || 0, 0);

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isWarehouse = source === 'warehouse';
      const salePayload = {
        productId: isWarehouse ? null : selectedProduct.id,
        sku: selectedProduct.sku,
        productName: selectedProduct.name,
        styleCategory: selectedProduct.styleCategory || (isWarehouse ? 'Warehouse Item' : selectedProduct.name),
        color: selectedProduct.color || 'Standard',
        size: selectedSize,
        quantity: Number(quantity),
        unitPrice: numPrice,
        totalAmount: numPrice * Number(quantity),
        paymentMode,
        customerName: customerName.trim(),
        timestamp: targetDateObj.toISOString(),
        source: isWarehouse ? 'warehouse' : 'store',
        deductStock: isWarehouse ? false : deductStock
      };

      const result = await recordSale(salePayload);
      setSuccessMsg(`✓ आर्टिकल ${selectedProduct.sku} (साइज़ ${selectedSize}) की बिक्री [${isWarehouse ? '🏭 WAREHOUSE' : '🏬 STORE'}] दर्ज हुई!`);

      if (typeof onSaleAdded === 'function') {
        onSaleAdded(saleDate, result?.sale);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setErrorMsg(err.message || 'बिक्री दर्ज करने में त्रुटि हुई');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Add Past Sold Article</h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  पिछली सेल
                </span>
              </div>
              <p className="text-xs text-slate-400">
                कोड, साइज़, अमाउंट व पुरानी तारीख डालकर sold रिकॉर्ड जोड़ें
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-2.5 text-xs font-bold">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">

          {/* SOURCE SELECTION: STORE VS WAREHOUSE */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Selling Source (बिक्री कहाँ से हुई)*:
            </label>
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSource('store')}
                className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  source === 'store'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                }`}
              >
                <span>🏬</span>
                <span>Store (दुकान से - Minus Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setSource('warehouse')}
                className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  source === 'warehouse'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                }`}
              >
                <span>🏭</span>
                <span>Warehouse (गोदाम से - No Minus)</span>
              </button>
            </div>
            {source === 'warehouse' && (
              <div className="mt-1.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[11px] flex items-center gap-2 font-medium">
                <span>🏭</span>
                <span>
                  <strong>Warehouse Mode:</strong> Store inventory se stock minus nahi hoga. Sold Products table me <strong>"Sold from Warehouse"</strong> highlight hoga.
                </span>
              </div>
            )}
          </div>
          
          {/* 1. ARTICLE SEARCH / SKU SELECTION */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              1. Article / SKU Code (आर्टिकल कोड सर्च करें)*:
            </label>

            {!selectedProduct ? (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDownSearch}
                    placeholder="Type SKU code (e.g. SG-F-01, 1560, Tan, Black)... Press Enter to select"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    autoFocus
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {searchTerm.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl z-20 divide-y divide-slate-800/80">
                    {filteredProducts.map((p) => {
                      const colorInfo = getColorDetails(p.color);
                      const totalStock = Object.values(p.sizes || {}).reduce((sum, q) => sum + (Number(q) || 0), 0);

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="p-2.5 hover:bg-slate-900 cursor-pointer flex items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span 
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                              style={{ backgroundColor: colorInfo.hex }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-black text-amber-300 truncate">
                                {p.sku}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {p.styleCategory || p.name} &bull; {p.color}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-emerald-400 block font-mono">
                              ₹{Number(p.sellingPrice || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {totalStock} in stock
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Unlisted Article option: ONLY shown when genuinely 0 products match */}
                    {filteredProducts.length === 0 && (
                      <div className="p-3 bg-purple-950/40 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-purple-200 truncate">
                          Store catalog me nahi mila: <strong className="text-white font-mono">{searchTerm}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectUnlisted(searchTerm)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                        >
                          <span>🏭</span>
                          <span>Sell as Warehouse Item</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Product Badge Card */
              <div className="p-3 rounded-2xl bg-slate-950 border-2 border-amber-500/50 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <span 
                    className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: getColorDetails(selectedProduct.color).hex }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        {selectedProduct.sku}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {selectedProduct.category?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-semibold mt-1 truncate">
                      {selectedProduct.styleCategory || selectedProduct.name} &bull; <span className="text-slate-400">{selectedProduct.color}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition shrink-0"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* 2. SIZE SELECTOR */}
          {selectedProduct && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Select Size Sold (बिका हुआ साइज़)*:
                </label>
                {source === 'warehouse' ? (
                  <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                    <span>🏭</span>
                    <span>Warehouse Dispatch (Store stock minus nahi hoga)</span>
                  </span>
                ) : selectedSize ? (
                  <span className={`text-[11px] font-bold ${currentStockForSize > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Store Stock: {currentStockForSize} pieces available
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {allowedSizes.map((size) => {
                  const stock = Number(selectedProduct.sizes?.[size] || 0);
                  const isSelected = selectedSize === size;
                  const isWh = source === 'warehouse';

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-black transition flex flex-col items-center min-w-[54px] border cursor-pointer ${
                        isSelected
                          ? isWh
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 scale-105'
                            : 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 scale-105'
                          : isWh
                            ? 'bg-slate-950 text-slate-200 border-slate-700 hover:border-purple-500'
                            : stock > 0
                              ? 'bg-slate-950 text-slate-200 border-slate-700 hover:border-slate-500'
                              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-amber-500'
                      }`}
                    >
                      <span className="text-sm font-black">{size}</span>
                      {!isWh && (
                        <span className={`text-[9px] font-sans font-semibold ${isSelected ? 'text-slate-900' : stock > 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                          {stock} pcs
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. AMOUNT (SELLING PRICE) & QUANTITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                3. Amount / Price (कुल अमाउंट ₹)*:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-amber-400 text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Selling price (e.g. 2499)"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-black text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Total Bill: ₹{Number(Number(unitPrice || 0) * quantity).toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Quantity (संख्या):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 text-white font-black hover:bg-slate-800 flex items-center justify-center transition"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full py-2.5 text-center rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-black text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 text-white font-black hover:bg-slate-800 flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 4. DATE & TIME (THE CORE PAST-DATE SELECTION) */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>4. Sale Date & Time (बिक्री की तारीख)*:</span>
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSaleDate(getYesterdayStr())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    saleDate === getYesterdayStr()
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Yesterday (कल)
                </button>

                <button
                  type="button"
                  onClick={() => setSaleDate(getTodayStr())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    saleDate === getTodayStr()
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Today (आज)
                </button>

                <button
                  type="button"
                  onClick={() => setSaleDate(getDayBeforeYesterdayStr())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition hidden sm:inline-block ${
                    saleDate === getDayBeforeYesterdayStr()
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  परसों
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Pick Exact Date:</span>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                  required
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Sale Time:</span>
                <input
                  type="time"
                  value={saleTime}
                  onChange={(e) => setSaleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="text-amber-400 font-bold">&bull; Note:</span>
              <span>
                यह सेल चुनी गई तारीख (<strong className="text-amber-300">{saleDate}</strong>) की कुल बिक्री व रिपोर्ट में जुड़ेगी।
              </span>
            </p>
          </div>

          {/* 5. PAYMENT MODE */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              5. Payment Mode (भुगतान माध्यम):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Cash', label: '💵 Cash (नकद)' },
                { id: 'UPI', label: '📱 UPI (GPay/PhonePe)' },
                { id: 'Card', label: '💳 Card (कार्ड)' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center border ${
                    paymentMode === m.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. CUSTOMER NAME & INVENTORY DEDUCTION TOGGLE */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Customer Name / Note (वैकल्पिक):
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name or bill reference..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Inventory Stock Deduction Option (Store Only) */}
            {source === 'store' ? (
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deductStock}
                  onChange={(e) => setDeductStock(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    स्टोर स्टॉक से 1 पीस कम करें (Deduct stock from inventory)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {deductStock 
                      ? `✓ Save karne par is article ke Size ${selectedSize || '..'} ka store stock ${quantity} piece ghat jayega.` 
                      : `⚠️ Stock nahi ghatega (sirf sale transaction record hoga).`}
                  </span>
                </div>
              </label>
            ) : (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-950/20 border border-purple-800/40 text-purple-200">
                <span className="text-base">🏭</span>
                <div className="text-xs">
                  <span className="font-bold text-purple-300 block">Warehouse Direct Dispatch</span>
                  <span className="text-[11px] text-purple-400/80">Store inventory se stock minus nahi hoga (yeh warehouse se dispatch ho raha hai).</span>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel (रद्द करें)
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct || !selectedSize}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving Sale...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Sold Article (बिक्री दर्ज करें)</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
