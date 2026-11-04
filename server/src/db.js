import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');

// Ensure base directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true });

function safeRead(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function safeWrite(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

export const defaultCategories = [
  {
    id: 'women_footwear',
    label: 'Women Footwear',
    sizes: ['35', '36', '37', '38', '39', '40', '41'],
    icon: '👠',
    order: 1
  },
  {
    id: 'men_footwear',
    label: 'Mens Footwear',
    sizes: ['40', '41', '42', '43', '44', '45'],
    icon: '👟',
    order: 2
  },
  {
    id: 'men_jacket',
    label: 'Mens Jacket',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    icon: '🧥',
    order: 3
  },
  {
    id: 'women_jacket',
    label: 'Women Jacket',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    icon: '🧥',
    order: 4
  },
  {
    id: 'bags',
    label: 'Bags',
    sizes: ['Standard'],
    icon: '👜',
    order: 5
  }
];

export function extractColorCode(colorStr) {
  if (!colorStr) return 'BLK';
  const words = colorStr.trim().toUpperCase().split(/[^A-Z0-9]+/);
  const recognized = ['TAN', 'BLACK', 'BROWN', 'WHITE', 'RED', 'BLUE', 'GOLD', 'BEIGE', 'PINK', 'GREY', 'GRAY', 'NAVY', 'MAROON', 'GREEN', 'CHESTNUT'];
  for (const w of words) {
    if (recognized.includes(w)) return w;
  }
  return words[0] || 'COL';
}

export function generateSkuCode(category, color, existingCount = 10) {
  const colorCode = extractColorCode(color);
  const num = 10 + existingCount;
  switch (category) {
    case 'women_footwear':
      return `SG-F-${1550 + num}-${colorCode}`;
    case 'men_footwear':
      return `SGM-${num}-${colorCode}`;
    case 'women_jacket':
      return `JK-F-${num}-${colorCode}`;
    case 'men_jacket':
      return `JK-M-${num}-${colorCode}`;
    case 'bags':
      return `BG-${num}-${colorCode}`;
    default:
      return `${category.slice(0, 3).toUpperCase()}-${num}-${colorCode}`;
  }
}

export function calculateTotalStock(sizes) {
  if (!sizes || typeof sizes !== 'object') return 0;
  return Object.values(sizes).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
}

// ---------------- Multi-Tenant State Cache ----------------
const tenantCache = new Map();

export function getTenant(userId = 'usr-krishan') {
  const safeUserId = String(userId || 'usr-krishan').trim();
  if (tenantCache.has(safeUserId)) {
    return tenantCache.get(safeUserId);
  }

  const userDir = path.join(USERS_DIR, safeUserId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const catFile = path.join(userDir, 'categories.json');
  const invFile = path.join(userDir, 'inventory.json');
  const salesFile = path.join(userDir, 'sales.json');
  const repFile = path.join(userDir, 'replenishment.json');
  const whFile = path.join(userDir, 'warehouse_send.json');

  // If this is Krishan and files don't exist yet, migrate from original root data files
  if (safeUserId === 'usr-krishan' && !fs.existsSync(invFile)) {
    const rootInv = path.join(DATA_DIR, 'inventory.json');
    const rootCat = path.join(DATA_DIR, 'categories.json');
    const rootSales = path.join(DATA_DIR, 'sales.json');
    const rootRep = path.join(DATA_DIR, 'replenishment.json');
    const rootWh = path.join(DATA_DIR, 'warehouse_send.json');

    if (fs.existsSync(rootInv)) fs.copyFileSync(rootInv, invFile);
    if (fs.existsSync(rootCat)) fs.copyFileSync(rootCat, catFile);
    if (fs.existsSync(rootSales)) fs.copyFileSync(rootSales, salesFile);
    if (fs.existsSync(rootRep)) fs.copyFileSync(rootRep, repFile);
    if (fs.existsSync(rootWh)) fs.copyFileSync(rootWh, whFile);
  }

  const categories = safeRead(catFile, defaultCategories);
  let inventory = safeRead(invFile, []);
  let sales = safeRead(salesFile, []);
  let replenishmentHistory = safeRead(repFile, []);
  let warehouseSends = safeRead(whFile, []);

  // Ensure displaySize and sku exist on records
  inventory = inventory.map(item => ({
    displaySize: item.displaySize || '',
    ...item
  }));

  sales = sales.map(s => {
    if (!s.sku) {
      const prod = inventory.find(p => p.id === s.productId);
      return { ...s, sku: prod?.sku || 'N/A' };
    }
    return s;
  });

  const tenant = {
    userId: safeUserId,
    userDir,
    files: { catFile, invFile, salesFile, repFile, whFile },
    categories,
    inventory,
    sales,
    replenishmentHistory,
    warehouseSends,

    saveCategories() { safeWrite(this.files.catFile, this.categories); },
    saveInventory() { safeWrite(this.files.invFile, this.inventory); },
    saveSales() { safeWrite(this.files.salesFile, this.sales); },
    saveReplenishments() { safeWrite(this.files.repFile, this.replenishmentHistory); },
    saveWarehouse() { safeWrite(this.files.whFile, this.warehouseSends); }
  };

  tenantCache.set(safeUserId, tenant);
  return tenant;
}

// ---------------- Categories Management ----------------
export function getAllCategories(userId) {
  const t = getTenant(userId);
  return t.categories;
}

export function addCategory(userId, { label, sizes, icon }) {
  const t = getTenant(userId);
  if (!label || !label.trim()) throw new Error("Category label is required");
  const id = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const existing = t.categories.find(c => c.id === id);
  if (existing) throw new Error("Category with this name already exists");

  const newCat = {
    id,
    label: label.trim(),
    sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : ['Standard'],
    icon: icon || '📦',
    order: t.categories.length + 1
  };

  t.categories.push(newCat);
  t.saveCategories();
  return newCat;
}

export function deleteCategory(userId, id) {
  const t = getTenant(userId);
  const index = t.categories.findIndex(c => c.id === id);
  if (index === -1) return false;

  const inUse = t.inventory.some(p => p.category === id);
  if (inUse) {
    throw new Error("Cannot delete category because there are products currently assigned to it. Please reassign or delete the products first.");
  }

  t.categories.splice(index, 1);
  t.saveCategories();
  return true;
}

export function getSizesMap(userId) {
  const t = getTenant(userId);
  const map = {};
  t.categories.forEach(c => {
    map[c.id] = c.sizes;
  });
  return map;
}

// ---------------- Inventory CRUD ----------------
export function getAllProducts(userId) {
  const t = getTenant(userId);
  return t.inventory;
}

export function getProductById(userId, id) {
  const t = getTenant(userId);
  return t.inventory.find(p => p.id === id);
}

export function addProduct(userId, data) {
  const t = getTenant(userId);
  const category = data.category || 'women_footwear';
  const sizesMap = getSizesMap(userId);
  const allowedSizes = sizesMap[category] || ['Standard'];
  
  const sanitizedSizes = {};
  allowedSizes.forEach(size => {
    sanitizedSizes[size] = Math.max(0, parseInt(data.sizes?.[size] || 0, 10));
  });

  const color = data.color?.trim() || "Black";
  const categoryItemCount = t.inventory.filter(p => p.category === category).length;
  const sku = data.sku?.trim() || generateSkuCode(category, color, categoryItemCount);

  const newProduct = {
    id: `prod-${crypto.randomUUID().slice(0, 8)}`,
    name: data.name?.trim() || "Untitled Product",
    brand: data.brand?.trim() || "Saint G",
    category,
    styleCategory: data.styleCategory?.trim() || data.name?.trim() || "Block Heels",
    color,
    displaySize: data.displaySize?.trim() || "",
    material: data.material?.trim() || "",
    costPrice: 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    sku,
    barcode: data.barcode?.trim() || "",
    sizes: sanitizedSizes,
    imageUrl: data.imageUrl?.trim() || "",
    notes: data.notes?.trim() || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  t.inventory.unshift(newProduct);
  t.saveInventory();
  return newProduct;
}

export function updateProduct(userId, id, updates) {
  const t = getTenant(userId);
  const index = t.inventory.findIndex(p => p.id === id);
  if (index === -1) return null;

  const current = t.inventory[index];
  const category = updates.category || current.category;
  const sizesMap = getSizesMap(userId);
  const allowedSizes = sizesMap[category] || ['Standard'];

  let finalSizes = current.sizes;
  if (updates.sizes) {
    finalSizes = {};
    allowedSizes.forEach(size => {
      finalSizes[size] = Math.max(0, parseInt(updates.sizes[size] ?? current.sizes[size] ?? 0, 10));
    });
  }

  const updatedProduct = {
    ...current,
    ...updates,
    category,
    styleCategory: updates.styleCategory !== undefined ? updates.styleCategory.trim() : (current.styleCategory || current.name),
    displaySize: updates.displaySize !== undefined ? updates.displaySize.trim() : (current.displaySize || ''),
    sizes: finalSizes,
    sellingPrice: updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : current.sellingPrice,
    color: updates.color !== undefined ? updates.color.trim() : current.color,
    sku: updates.sku !== undefined ? updates.sku.trim() : current.sku,
    updatedAt: new Date().toISOString()
  };

  t.inventory[index] = updatedProduct;
  t.saveInventory();
  return updatedProduct;
}

export function setDisplaySize(userId, id, displaySize) {
  const t = getTenant(userId);
  const product = t.inventory.find(p => p.id === id);
  if (!product) return null;
  product.displaySize = displaySize.trim();
  product.updatedAt = new Date().toISOString();
  t.saveInventory();
  return product;
}

export function deleteProduct(userId, id) {
  const t = getTenant(userId);
  const index = t.inventory.findIndex(p => p.id === id || p.sku === id);
  if (index === -1) return false;

  t.inventory.splice(index, 1);
  t.saveInventory();
  return true;
}

export function adjustStock(userId, id, sizeKey, delta) {
  const t = getTenant(userId);
  const product = t.inventory.find(p => p.id === id);
  if (!product) return null;

  if (!product.sizes) product.sizes = {};
  const currentQty = Number(product.sizes[sizeKey] || 0);
  const newQty = Math.max(0, currentQty + delta);
  product.sizes[sizeKey] = newQty;
  product.updatedAt = new Date().toISOString();

  t.saveInventory();
  return { product, sizeKey, newQty, previousQty: currentQty };
}

// ---------------- Replenishment (Received Stock) ----------------
export function addReplenishment(userId, { productId, supplier = '', invoiceNo = '', notes = '', sizeQuantities = {} }) {
  const t = getTenant(userId);
  const product = t.inventory.find(p => p.id === productId);
  if (!product) throw new Error("Product not found");

  if (!product.sizes) product.sizes = {};
  
  let totalReceivedCount = 0;
  const details = {};

  Object.entries(sizeQuantities).forEach(([size, qty]) => {
    const addQty = Math.max(0, parseInt(qty, 10) || 0);
    if (addQty > 0) {
      product.sizes[size] = (Number(product.sizes[size]) || 0) + addQty;
      totalReceivedCount += addQty;
      details[size] = addQty;
    }
  });

  if (totalReceivedCount === 0) {
    throw new Error("Please specify at least 1 item received");
  }

  product.updatedAt = new Date().toISOString();
  t.saveInventory();

  const replenishmentRecord = {
    id: `rep-${crypto.randomUUID().slice(0, 8)}`,
    type: 'replenishment',
    productId: product.id,
    productName: product.name,
    styleCategory: product.styleCategory || product.name,
    sku: product.sku,
    category: product.category,
    supplier: supplier.trim() || 'Distributor / Factory',
    invoiceNo: invoiceNo.trim() || 'N/A',
    notes: notes.trim(),
    receivedItems: details,
    totalCount: totalReceivedCount,
    timestamp: new Date().toISOString()
  };

  t.replenishmentHistory.unshift(replenishmentRecord);
  if (t.replenishmentHistory.length > 1000) t.replenishmentHistory = t.replenishmentHistory.slice(0, 1000);
  t.saveReplenishments();

  return { record: replenishmentRecord, updatedProduct: product };
}

export function bulkReplenish(userId, { items = [], billNo = '', supplier = '', date = '', notes = '' }) {
  const t = getTenant(userId);
  if (!items || items.length === 0) throw new Error("No items provided for replenishment");

  const results = [];
  const updatedProducts = [];
  let totalIntakeCount = 0;

  for (const item of items) {
    const rawSku = (item.sku || item.ean || '').trim();
    const size = String(item.size || '').replace(/EU$/i, '').trim();
    const qty = Math.max(1, parseInt(item.qty || 1, 10));
    const articleName = (item.articleName || item.name || '').trim();
    const category = item.category || 'women_footwear';

    let matched = t.inventory.find(p => p.sku && (p.sku.toLowerCase() === rawSku.toLowerCase() || rawSku.toLowerCase().startsWith(p.sku.toLowerCase())));

    if (!matched) {
      const parts = rawSku.split('-');
      const extractedColor = parts.length > 2 ? parts[parts.length - 1] : 'Black';
      matched = addProduct(userId, {
        name: articleName || rawSku,
        styleCategory: articleName || 'Standard Style',
        sku: rawSku,
        category,
        color: extractedColor,
        sizes: { [size]: qty }
      });
      updatedProducts.push(matched);
    } else {
      if (!matched.sizes) matched.sizes = {};
      matched.sizes[size] = (Number(matched.sizes[size]) || 0) + qty;
      matched.updatedAt = new Date().toISOString();
      if (!updatedProducts.some(p => p.id === matched.id)) {
        updatedProducts.push(matched);
      }
    }

    results.push({
      sku: rawSku,
      articleName: articleName || matched.styleCategory || matched.name,
      size,
      qty,
      productId: matched.id
    });
    totalIntakeCount += qty;
  }

  t.saveInventory();

  const bulkRecord = {
    id: `rep-bulk-${crypto.randomUUID().slice(0, 8)}`,
    type: 'replenishment',
    invoiceNo: billNo.trim() || 'N/A',
    supplier: supplier.trim() || 'Supplier',
    notes: notes.trim(),
    totalCount: totalIntakeCount,
    items: results,
    timestamp: date ? new Date(date).toISOString() : new Date().toISOString()
  };

  t.replenishmentHistory.unshift(bulkRecord);
  t.saveReplenishments();

  return { bulkRecord, updatedProducts, totalIntakeCount };
}

export function getAllReplenishments(userId) {
  const t = getTenant(userId);
  return t.replenishmentHistory;
}

// ---------------- Stock Send to Warehouse ----------------
export function sendToWarehouse(userId, { productId, sizeQuantities = {}, dispatchNo = '', destination = 'Central Warehouse', reason = '', notes = '', date = '' }) {
  const t = getTenant(userId);
  const product = t.inventory.find(p => p.id === productId);
  if (!product) throw new Error("Product not found");

  let totalSentCount = 0;
  const sentDetails = {};

  Object.entries(sizeQuantities).forEach(([size, qty]) => {
    const deductQty = Math.max(0, parseInt(qty, 10) || 0);
    if (deductQty > 0) {
      const currentAvailable = Number(product.sizes?.[size] || 0);
      if (currentAvailable < deductQty) {
        throw new Error(`Insufficient stock for Size ${size}! Available: ${currentAvailable}, Requested to send: ${deductQty}`);
      }
      product.sizes[size] = currentAvailable - deductQty;
      totalSentCount += deductQty;
      sentDetails[size] = deductQty;
    }
  });

  if (totalSentCount === 0) {
    throw new Error("Please enter at least 1 unit to send to warehouse");
  }

  product.updatedAt = new Date().toISOString();
  t.saveInventory();

  const warehouseRecord = {
    id: `wh-${crypto.randomUUID().slice(0, 8)}`,
    type: 'warehouse_send',
    productId: product.id,
    productName: product.name,
    styleCategory: product.styleCategory || product.name,
    sku: product.sku,
    category: product.category,
    dispatchNo: dispatchNo.trim() || `DISP-${Date.now().toString().slice(-5)}`,
    destination: destination.trim(),
    reason: reason.trim() || 'Stock Transfer',
    notes: notes.trim(),
    sentItems: sentDetails,
    totalCount: totalSentCount,
    timestamp: date ? new Date(date).toISOString() : new Date().toISOString()
  };

  t.warehouseSends.unshift(warehouseRecord);
  if (t.warehouseSends.length > 1000) t.warehouseSends = t.warehouseSends.slice(0, 1000);
  t.saveWarehouse();

  return { record: warehouseRecord, updatedProduct: product };
}

export function updateWarehouseSend(userId, sendId, updates) {
  const t = getTenant(userId);
  const index = t.warehouseSends.findIndex(w => w.id === sendId);
  if (index === -1) throw new Error("Warehouse send record not found");

  const oldRecord = t.warehouseSends[index];
  const product = t.inventory.find(p => p.id === oldRecord.productId);
  if (!product) throw new Error("Product not found in inventory");

  if (!product.sizes) product.sizes = {};

  // Step 1: Temporarily restore old dispatched quantities
  Object.entries(oldRecord.sentItems || {}).forEach(([size, qty]) => {
    product.sizes[size] = (Number(product.sizes[size]) || 0) + Number(qty);
  });

  // Step 2: Validate new quantities
  const newSizeQuantities = updates.sizeQuantities || oldRecord.sentItems || {};
  let totalSentCount = 0;
  const newSentDetails = {};

  for (const [size, qty] of Object.entries(newSizeQuantities)) {
    const deductQty = Math.max(0, parseInt(qty, 10) || 0);
    if (deductQty > 0) {
      const available = Number(product.sizes[size] || 0);
      if (available < deductQty) {
        Object.entries(oldRecord.sentItems || {}).forEach(([s, q]) => {
          product.sizes[s] = Math.max(0, (Number(product.sizes[s]) || 0) - Number(q));
        });
        throw new Error(`Insufficient stock for Size ${size}! Available: ${available}, Requested to send: ${deductQty}`);
      }
    }
  }

  // Step 3: Deduct newly specified quantities
  Object.entries(newSizeQuantities).forEach(([size, qty]) => {
    const deductQty = Math.max(0, parseInt(qty, 10) || 0);
    if (deductQty > 0) {
      product.sizes[size] = (Number(product.sizes[size]) || 0) - deductQty;
      totalSentCount += deductQty;
      newSentDetails[size] = deductQty;
    }
  });

  if (totalSentCount === 0) {
    Object.entries(oldRecord.sentItems || {}).forEach(([s, q]) => {
      product.sizes[s] = Math.max(0, (Number(product.sizes[s]) || 0) - Number(q));
    });
    throw new Error("Please enter at least 1 unit to dispatch");
  }

  product.updatedAt = new Date().toISOString();
  t.saveInventory();

  const updatedRecord = {
    ...oldRecord,
    dispatchNo: updates.dispatchNo !== undefined ? updates.dispatchNo.trim() : oldRecord.dispatchNo,
    destination: updates.destination !== undefined ? updates.destination.trim() : oldRecord.destination,
    reason: updates.reason !== undefined ? updates.reason.trim() : oldRecord.reason,
    notes: updates.notes !== undefined ? updates.notes.trim() : oldRecord.notes,
    sentItems: newSentDetails,
    totalCount: totalSentCount,
    updatedAt: new Date().toISOString()
  };

  t.warehouseSends[index] = updatedRecord;
  t.saveWarehouse();

  return { updatedRecord, updatedProduct: product };
}

export function getAllWarehouseSends(userId) {
  const t = getTenant(userId);
  return t.warehouseSends;
}

// ---------------- Sales & Billing ----------------
export function recordSale(userId, { productId, sku, size, quantity = 1, unitPrice, paymentMode = 'Cash', customerName = '', timestamp, deductStock = true }) {
  const t = getTenant(userId);
  let product = t.inventory.find(p => p.id === productId);
  if (!product && sku) {
    const cleanSku = String(sku).trim().toLowerCase();
    product = t.inventory.find(p => p.sku && p.sku.trim().toLowerCase() === cleanSku);
  }
  if (!product) throw new Error("Product not found in inventory");

  const currentQty = Number(product.sizes?.[size] || 0);
  if (deductStock !== false) {
    if (currentQty < quantity) {
      throw new Error(`Insufficient stock for Size ${size}! Available: ${currentQty}, Requested: ${quantity}`);
    }
    product.sizes[size] = currentQty - quantity;
    product.updatedAt = new Date().toISOString();
    t.saveInventory();
  }

  const price = unitPrice !== undefined ? Number(unitPrice) : product.sellingPrice;
  const totalAmount = price * quantity;

  let saleTimestamp = new Date().toISOString();
  if (timestamp) {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      saleTimestamp = parsed.toISOString();
    }
  }

  const saleRecord = {
    id: `sale-${crypto.randomUUID().slice(0, 8)}`,
    type: 'sale',
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    styleCategory: product.styleCategory || product.name,
    color: product.color || 'Standard',
    brand: product.brand,
    category: product.category,
    size: String(size),
    quantity: Number(quantity),
    unitPrice: price,
    totalAmount,
    paymentMode,
    customerName: customerName.trim(),
    timestamp: saleTimestamp
  };

  t.sales.unshift(saleRecord);
  if (t.sales.length > 2000) t.sales = t.sales.slice(0, 2000);
  t.saveSales();

  return { sale: saleRecord, updatedProduct: product };
}

export function updateSale(userId, saleId, updates) {
  const t = getTenant(userId);
  const saleIndex = t.sales.findIndex(s => s.id === saleId);
  if (saleIndex === -1) throw new Error("Sale record not found");

  const oldSale = t.sales[saleIndex];
  const oldProduct = t.inventory.find(p => p.id === oldSale.productId);
  const newProductId = updates.productId || oldSale.productId;
  const newProduct = t.inventory.find(p => p.id === newProductId);
  if (!newProduct) throw new Error("Product not found in inventory");

  const newSize = String(updates.size || oldSale.size);
  const newQuantity = Number(updates.quantity !== undefined ? updates.quantity : oldSale.quantity);
  const newUnitPrice = updates.unitPrice !== undefined ? Number(updates.unitPrice) : (updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : oldSale.unitPrice);
  const newPaymentMode = updates.paymentMode || oldSale.paymentMode;
  const newCustomerName = updates.customerName !== undefined ? updates.customerName.trim() : oldSale.customerName;

  // Step 1: Temporarily restore old stock
  if (oldProduct && oldProduct.sizes) {
    oldProduct.sizes[oldSale.size] = (Number(oldProduct.sizes[oldSale.size]) || 0) + Number(oldSale.quantity);
  }

  // Step 2: Check availability on new product & size
  const availableInNew = Number(newProduct.sizes?.[newSize] || 0);
  if (availableInNew < newQuantity) {
    if (oldProduct && oldProduct.sizes) {
      oldProduct.sizes[oldSale.size] = Math.max(0, (Number(oldProduct.sizes[oldSale.size]) || 0) - Number(oldSale.quantity));
    }
    throw new Error(`Insufficient stock for Size ${newSize}! Available: ${availableInNew}, Requested: ${newQuantity}`);
  }

  // Step 3: Deduct from new product
  if (!newProduct.sizes) newProduct.sizes = {};
  newProduct.sizes[newSize] = availableInNew - newQuantity;
  newProduct.updatedAt = new Date().toISOString();
  if (oldProduct && oldProduct.id !== newProduct.id) {
    oldProduct.updatedAt = new Date().toISOString();
  }

  t.saveInventory();

  let saleTimestamp = oldSale.timestamp;
  if (updates.timestamp) {
    const parsed = new Date(updates.timestamp);
    if (!isNaN(parsed.getTime())) {
      saleTimestamp = parsed.toISOString();
    }
  }

  // Step 4: Update sale record
  const updatedSale = {
    ...oldSale,
    productId: newProduct.id,
    sku: newProduct.sku,
    productName: newProduct.name,
    styleCategory: newProduct.styleCategory || newProduct.name,
    color: newProduct.color || 'Standard',
    brand: newProduct.brand,
    category: newProduct.category,
    size: newSize,
    quantity: newQuantity,
    unitPrice: newUnitPrice,
    totalAmount: newUnitPrice * newQuantity,
    paymentMode: newPaymentMode,
    customerName: newCustomerName,
    timestamp: saleTimestamp,
    updatedAt: new Date().toISOString()
  };

  t.sales[saleIndex] = updatedSale;
  t.saveSales();

  const affectedProducts = [newProduct];
  if (oldProduct && oldProduct.id !== newProduct.id) {
    affectedProducts.push(oldProduct);
  }

  return { updatedSale, affectedProducts };
}

export function revertSale(userId, saleId) {
  const t = getTenant(userId);
  const saleIndex = t.sales.findIndex(s => s.id === saleId);
  if (saleIndex === -1) throw new Error("Sale record not found");

  const sale = t.sales[saleIndex];
  const product = t.inventory.find(p => p.id === sale.productId);
  if (product && product.sizes) {
    product.sizes[sale.size] = (Number(product.sizes[sale.size] || 0)) + sale.quantity;
    product.updatedAt = new Date().toISOString();
    t.saveInventory();
  }

  t.sales.splice(saleIndex, 1);
  t.saveSales();

  return { saleId, restoredProduct: product };
}

export function getAllSales(userId) {
  const t = getTenant(userId);
  return t.sales.map(s => {
    if (!s.sku) {
      const prod = t.inventory.find(p => p.id === s.productId);
      return { ...s, sku: prod?.sku || 'N/A' };
    }
    return s;
  });
}

// ---------------- Stats ----------------
export function getStats(userId) {
  const t = getTenant(userId);
  let totalStockCount = 0;
  let totalRetailValue = 0;
  let footwearLowAlertCount = 0;
  let footwearAlertItems = [];

  t.inventory.forEach(p => {
    const pStock = calculateTotalStock(p.sizes);
    totalStockCount += pStock;
    totalRetailValue += pStock * (p.sellingPrice || 0);

    const cat = p.category || '';
    let standardSizes = [];
    if (cat === 'women_footwear') {
      standardSizes = ['36', '37', '38', '39', '40', '41'];
      if (Number(p.sizes?.['35'] || 0) > 0) standardSizes.unshift('35');
    } else if (cat === 'men_footwear') {
      standardSizes = ['40', '41', '42', '43', '44', '45'];
    } else if (cat === 'men_jacket' || cat === 'women_jacket') {
      standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    } else if (cat === 'bags') {
      standardSizes = ['One Size'];
    } else {
      standardSizes = Object.keys(p.sizes || {});
    }

    const neededSizes = [];
    standardSizes.forEach(s => {
      const cur = Number(p.sizes?.[s] || 0);
      let req = 1;
      if (cat === 'women_footwear' && s === '37') req = 2;
      else if (cat === 'men_footwear' && s === '41') req = 2;
      else if ((cat === 'men_jacket' || cat === 'women_jacket') && s === 'M') req = 2;

      if (cur < req) {
        neededSizes.push({
          size: s,
          current: cur,
          required: req,
          deficit: req - cur
        });
      }
    });

    if (neededSizes.length > 0) {
      footwearLowAlertCount++;
      footwearAlertItems.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        styleCategory: p.styleCategory || p.name,
        totalStock: pStock,
        color: p.color,
        neededSizes
      });
    }
  });

  function toLocalDateStr(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const now = new Date();
  const todayStr = toLocalDateStr(now);
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayStr = toLocalDateStr(yesterday);
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const todaySales = t.sales.filter(s => toLocalDateStr(s.timestamp) === todayStr);
  const todayRevenue = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  const todayItemsSold = todaySales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

  const yesterdaySales = t.sales.filter(s => toLocalDateStr(s.timestamp) === yesterdayStr);
  const yesterdayRevenue = yesterdaySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  const yesterdayItemsSold = yesterdaySales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

  const monthSales = t.sales.filter(s => toLocalDateStr(s.timestamp).startsWith(monthStr));
  const monthRevenue = monthSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  const monthItemsSold = monthSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

  const currentDay = now.getDate();
  const monthAverageDailyRevenue = currentDay > 0 ? Math.round(monthRevenue / currentDay) : 0;

  return {
    totalProducts: t.inventory.length,
    totalStockCount,
    totalRetailValue,
    footwearLowAlertCount,
    footwearAlertItems,
    todaySalesCount: todaySales.length,
    todayItemsSold,
    todayRevenue,
    yesterdaySalesCount: yesterdaySales.length,
    yesterdayItemsSold,
    yesterdayRevenue,
    monthSalesCount: monthSales.length,
    monthItemsSold,
    monthRevenue,
    monthAverageDailyRevenue,
    categoriesCount: t.categories.length
  };
}
