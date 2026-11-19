import * as XLSX from 'xlsx';

export const DEFAULT_SHEET_ID = '1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE';
export const DEFAULT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit`;

export function extractSheetId(urlOrId) {
  if (!urlOrId) return DEFAULT_SHEET_ID;
  const match = String(urlOrId).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return urlOrId.trim();
}

function clean(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Fetches CSV rows for a given Google Sheet ID and Sheet/Tab Name
 */
export async function fetchGoogleSheetCsv(sheetIdOrUrl, tabName) {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const tabParam = tabName ? `&sheet=${encodeURIComponent(tabName)}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${tabParam}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Sheet fetch failed (Status ${res.status}). Tab "${tabName || 'Sheet1'}" check karein.`);
  }

  const csvText = await res.text();
  if (!csvText || csvText.trim().length === 0) {
    throw new Error(`Google Sheet tab "${tabName}" is empty.`);
  }

  // Parse CSV into 2D array using XLSX
  const wb = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return rows;
}

/**
 * Parses 2D rows into daily sales items and matches against inventory
 */
export function parseDailySalesRows(rows, inventory = []) {
  if (!rows || rows.length < 2) {
    return {
      validSales: [],
      storeSales: [],
      warehouseSales: [],
      alreadyProcessed: [],
      unmatched: [],
      totalRows: 0
    };
  }

  // Map inventory by normalized SKU
  const invMap = new Map();
  inventory.forEach(p => {
    if (p.sku) {
      invMap.set(clean(p.sku), p);
    }
  });

  // Find column indices from header row (row 0 or 1)
  let headerIndex = 0;
  let headers = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());

  // Check if first row is a title rather than headers
  const isHeader = (arr) => arr.some(h => 
    h.includes('sku') || h.includes('code') || h.includes('size') || h.includes('location') || h.includes('sell')
  );

  if (!isHeader(headers) && rows.length > 1) {
    headers = (rows[1] || []).map(h => String(h || '').trim().toLowerCase());
    headerIndex = 1;
  }

  const findCol = (keywords) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const skuCol = findCol(['sku code', 'sku', 'code', 'article']);
  const sizeCol = findCol(['size', 'sz']);
  const locationCol = findCol(['location', 'sold from', 'source', 'warehouse', 'store / warehouse', 'from']);
  const qtyCol = findCol(['qty', 'quantity', 'units', 'count', 'pcs']);
  const dateCol = findCol(['date', 'time', 'timestamp', 'sell date', 'tarikh']);
  const statusCol = findCol(['status', 'processed', 'sync', 'synced', 'deducted']);
  const priceCol = findCol(['price', 'amount', 'sp', 'selling price', 'rate']);

  const validSales = [];
  const storeSales = [];
  const warehouseSales = [];
  const alreadyProcessed = [];
  const unmatched = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawSku = skuCol !== -1 ? String(row[skuCol] || '').trim() : String(row[0] || '').trim();
    if (!rawSku || rawSku.toUpperCase() === 'TOTAL' || rawSku.toUpperCase() === 'SUM') continue;

    const rawSize = sizeCol !== -1 ? String(row[sizeCol] || '').trim() : String(row[1] || '').trim();
    const rawLocation = locationCol !== -1 ? String(row[locationCol] || '').trim().toLowerCase() : '';
    const rawQty = qtyCol !== -1 ? (parseInt(row[qtyCol], 10) || 1) : 1;
    const rawDate = dateCol !== -1 ? String(row[dateCol] || '').trim() : '';
    const rawStatus = statusCol !== -1 ? String(row[statusCol] || '').trim().toUpperCase() : '';
    const rawPrice = priceCol !== -1 ? (Number(row[priceCol]) || 0) : 0;

    // Check if row is already processed / deducted
    if (rawStatus.includes('PROCESSED') || rawStatus.includes('DEDUCTED') || rawStatus.includes('DONE') || rawStatus.includes('SYNCED')) {
      alreadyProcessed.push({
        rowIndex: i + 1,
        sku: rawSku,
        size: rawSize,
        status: rawStatus
      });
      continue;
    }

    // Determine location: store vs warehouse
    const isWarehouse = rawLocation.includes('warehouse') || rawLocation.includes('wh') || rawLocation.includes('godown');

    // Find in inventory
    const matchedProduct = invMap.get(clean(rawSku));

    const saleItem = {
      rowIndex: i + 1,
      sku: rawSku,
      size: rawSize || (matchedProduct?.category === 'bags' ? 'One Size' : 'Standard'),
      quantity: Math.max(1, rawQty),
      isWarehouse,
      source: isWarehouse ? 'warehouse' : 'store',
      locationLabel: isWarehouse ? 'Warehouse (गोदाम)' : 'Store (स्टोर)',
      unitPrice: rawPrice > 0 ? rawPrice : (matchedProduct?.sellingPrice || 0),
      dateStr: rawDate || new Date().toISOString().slice(0, 10),
      product: matchedProduct || null,
      productName: matchedProduct?.name || `Article ${rawSku}`,
      styleCategory: matchedProduct?.styleCategory || (isWarehouse ? 'Warehouse Article' : 'Standard'),
      color: matchedProduct?.color || 'Standard',
      category: matchedProduct?.category || 'women_footwear',
      currentStock: matchedProduct ? Number(matchedProduct.sizes?.[rawSize] || 0) : 0,
      newStock: matchedProduct 
        ? (isWarehouse 
            ? Number(matchedProduct.sizes?.[rawSize] || 0) 
            : Math.max(0, Number(matchedProduct.sizes?.[rawSize] || 0) - rawQty))
        : 0
    };

    validSales.push(saleItem);

    if (isWarehouse) {
      warehouseSales.push(saleItem);
    } else {
      storeSales.push(saleItem);
    }

    if (!matchedProduct) {
      unmatched.push(saleItem);
    }
  }

  return {
    validSales,
    storeSales,
    warehouseSales,
    alreadyProcessed,
    unmatched,
    totalRows: rows.length - (headerIndex + 1)
  };
}
