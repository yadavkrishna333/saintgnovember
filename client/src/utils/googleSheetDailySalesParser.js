import * as XLSX from 'xlsx';

export const DEFAULT_SHEET_ID = '1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE';
export const DEFAULT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit`;

export function extractSheetId(urlOrId) {
  if (!urlOrId) return DEFAULT_SHEET_ID;
  const match = String(urlOrId).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return urlOrId.trim();
}

export function cleanSku(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Fetches CSV rows for a given Google Sheet ID and Sheet/Tab Name
 * Supports both /gviz/tq and /export?format=csv endpoints with tab support.
 */
export async function fetchGoogleSheetCsv(sheetIdOrUrl, tabName) {
  const sheetId = extractSheetId(sheetIdOrUrl);
  const tabParamGviz = tabName ? `&sheet=${encodeURIComponent(tabName)}` : '';
  const tabParamExport = tabName ? `&gid=${encodeURIComponent(tabName)}` : '';

  let csvText = '';
  let lastStatus = 0;

  // Try 1: gviz/tq endpoint (standard for public sheets)
  try {
    const url1 = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${tabParamGviz}`;
    const res1 = await fetch(url1);
    lastStatus = res1.status;
    if (res1.ok) {
      const txt = await res1.text();
      if (txt && txt.trim().length > 0) {
        csvText = txt;
      }
    }
  } catch (e) {
    console.warn('gviz endpoint error:', e);
  }

  // Try 2: export?format=csv fallback if empty or failed
  if (!csvText || csvText.trim().length === 0) {
    try {
      const url2 = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${tabParamExport}`;
      const res2 = await fetch(url2);
      lastStatus = res2.status;
      if (res2.ok) {
        const txt2 = await res2.text();
        if (txt2 && txt2.trim().length > 0) {
          csvText = txt2;
        }
      }
    } catch (e2) {
      console.warn('export?format=csv error:', e2);
    }
  }

  if (!csvText || csvText.trim().length === 0) {
    if (lastStatus === 404) {
      throw new Error(`Google Sheet nahi mili (404 Not Found). Kripya Sheet ID/URL check karein.`);
    }
    if (lastStatus === 403 || lastStatus === 401) {
      throw new Error(`Google Sheet private hai. Kripya Sheet me "Share" -> "Anyone with the link can view" karein.`);
    }
    throw new Error(
      `Google Sheet me abhi koi data nahi mila (Sheet blank hai). Kripya Google Sheet me columns: SR NO, DATE, SKU CODE, SIZE, LOCATION fill karein.`
    );
  }

  // Parse CSV into 2D array using XLSX
  const wb = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return rows;
}

/**
 * Parses 2D rows into daily sales items and matches against inventory.
 * 
 * Supports user column structure:
 * Col A: SR NO
 * Col B: DATE
 * Col C: SKU CODE
 * Col D: SIZE
 * Col E: LOCATION (Store ya Warehouse)
 * Col F: STATUS (DEDUCTED mark)
 * 
 * Deduplication:
 * - Checks status column: if marked "DEDUCTED" / "PROCESSED", skips deduction.
 * - Checks deductedRowSignatures Set: if date + sku + size + srNo was already deducted, skips deduction.
 * - Crucially allows same SKU sold on different dates or in separate transactions!
 */
export function parseDailySalesRows(rows, inventory = [], deductedRowSignatures = new Set()) {
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

  // Map inventory by normalized clean SKU
  const invMap = new Map();
  inventory.forEach(p => {
    if (p.sku) {
      invMap.set(cleanSku(p.sku), p);
    }
  });

  // Find column indices from header row (row 0 or 1)
  let headerIndex = 0;
  let headers = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());

  // Check if first row is a title rather than headers
  const isHeaderRow = (arr) => arr.some(h => 
    h.includes('sku') || h.includes('code') || h.includes('size') || h.includes('location') || h.includes('sr') || h.includes('date')
  );

  if (!isHeaderRow(headers) && rows.length > 1) {
    const candidate2 = (rows[1] || []).map(h => String(h || '').trim().toLowerCase());
    if (isHeaderRow(candidate2)) {
      headers = candidate2;
      headerIndex = 1;
    }
  }

  const findCol = (keywords) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  let srNoCol = findCol(['sr no', 'sr.no', 'sr.', 'serial', 's.no', 'sr_no', 'sno', 'no']);
  let dateCol = findCol(['date', 'time', 'timestamp', 'sell date', 'tarikh', 'dt']);
  let skuCol = findCol(['sku code', 'sku', 'code', 'article', 'style code', 'item code', 'product code']);
  let sizeCol = findCol(['size', 'sz', 'uk size', 'eu size']);
  let locationCol = findCol(['location', 'sold from', 'source', 'warehouse', 'store / warehouse', 'from', 'store/wh']);
  let qtyCol = findCol(['qty', 'quantity', 'units', 'count', 'pcs']);
  let statusCol = findCol(['status', 'processed', 'sync', 'synced', 'deducted', 'state', 'remarks']);
  let priceCol = findCol(['price', 'amount', 'sp', 'selling price', 'rate']);

  // Positional Fallback if header keywords not found:
  // User standard layout: Col 0: SR NO, Col 1: DATE, Col 2: SKU CODE, Col 3: SIZE, Col 4: LOCATION, Col 5: STATUS
  if (skuCol === -1) {
    if (headers.length >= 5) {
      srNoCol = 0;
      dateCol = 1;
      skuCol = 2;
      sizeCol = 3;
      locationCol = 4;
      if (statusCol === -1) statusCol = 5;
    } else {
      // Shorter layout fallback: Col 0: SKU, Col 1: SIZE, Col 2: LOCATION
      skuCol = 0;
      sizeCol = 1;
      locationCol = 2;
    }
  }

  const validSales = [];
  const storeSales = [];
  const warehouseSales = [];
  const alreadyProcessed = [];
  const unmatched = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawSku = skuCol !== -1 && row[skuCol] !== undefined 
      ? String(row[skuCol] || '').trim() 
      : String(row[2] || row[0] || '').trim();

    if (!rawSku || rawSku.toUpperCase() === 'TOTAL' || rawSku.toUpperCase() === 'SUM') continue;

    const rawSrNo = srNoCol !== -1 && row[srNoCol] !== undefined ? String(row[srNoCol] || '').trim() : String(i);
    const rawDate = dateCol !== -1 && row[dateCol] !== undefined ? String(row[dateCol] || '').trim() : '';
    const rawSize = sizeCol !== -1 && row[sizeCol] !== undefined ? String(row[sizeCol] || '').trim() : String(row[3] || '').trim();
    const rawLocation = locationCol !== -1 && row[locationCol] !== undefined ? String(row[locationCol] || '').trim() : '';
    const rawQty = qtyCol !== -1 && row[qtyCol] !== undefined ? (parseInt(row[qtyCol], 10) || 1) : 1;
    const rawStatus = statusCol !== -1 && row[statusCol] !== undefined ? String(row[statusCol] || '').trim().toUpperCase() : '';
    const rawPrice = priceCol !== -1 && row[priceCol] !== undefined ? (Number(row[priceCol]) || 0) : 0;

    // Determine location: store vs warehouse
    const locLower = rawLocation.toLowerCase();
    const isWarehouse = locLower.includes('warehouse') || locLower.includes('wh') || locLower.includes('godown') || locLower.includes('गोदाम');

    // Generate unique row signature based on Date + Clean SKU + Size + Location + SR NO / Row Index
    const cSku = cleanSku(rawSku);
    const rowSig = rawSrNo
      ? `${rawDate || 'nodate'}_${cSku}_${rawSize}_${isWarehouse ? 'wh' : 'st'}_sr${rawSrNo}`
      : `${rawDate || 'nodate'}_${cSku}_${rawSize}_${isWarehouse ? 'wh' : 'st'}_row${i}`;

    // Check if row is already processed / deducted
    const isMarkedDeductedInSheet = rawStatus.includes('DEDUCTED') || rawStatus.includes('PROCESSED') || rawStatus.includes('SYNCED');
    const isAlreadyDeductedInApp = deductedRowSignatures && (
      deductedRowSignatures.has(rowSig) ||
      (rawSrNo && deductedRowSignatures.has(`${rawDate || 'nodate'}_${cSku}_${rawSize}_sr${rawSrNo}`))
    );

    if (isMarkedDeductedInSheet || isAlreadyDeductedInApp) {
      alreadyProcessed.push({
        rowIndex: i + 1,
        srNo: rawSrNo,
        date: rawDate,
        sku: rawSku,
        size: rawSize,
        location: isWarehouse ? 'Warehouse' : 'Store',
        status: rawStatus || 'DEDUCTED',
        signature: rowSig
      });
      continue;
    }

    // Match against inventory
    const matchedProduct = invMap.get(cSku);

    const saleItem = {
      rowIndex: i + 1,
      srNo: rawSrNo,
      rowSignature: rowSig,
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
