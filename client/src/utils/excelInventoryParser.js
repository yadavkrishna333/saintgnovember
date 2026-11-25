import * as XLSX from 'xlsx';

function clean(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function extractColor(sku) {
  const parts = String(sku || '').split('-');
  if (parts.length >= 3) {
    let col = parts.slice(2).join(' ').trim();
    col = col.replace(/-\s*[SMLX]+$/i, '');
    return col.charAt(0).toUpperCase() + col.slice(1).toLowerCase();
  }
  return 'Standard';
}

/**
 * Accurately detects product category using both Sheet Name and SKU prefixes.
 * Handles:
 * - Mens Footwear (SGM-*, SG-M-*, SA-M-*, Sheet: Mens Footwear) -> 'men_footwear'
 * - Women Footwear (SG-F-*, SA-F-*, Sheet: Stock Room, Women Footwear) -> 'women_footwear'
 * - Mens Jackets (JK-M-*, Sheet: Mens Jackets) -> 'men_jacket'
 * - Women Jackets (JK-F-*, Sheet: Women Jacket) -> 'women_jacket'
 * - Bags (SG-B-*, Sheet: BAGS) -> 'bags'
 */
export function detectCategoryFromSheetOrSku(sheetName = '', sku = '') {
  const lowerSheet = String(sheetName || '').toLowerCase().trim();
  const upperSku = String(sku || '').toUpperCase().trim();

  // 1. SKU prefix has highest specificity
  if (upperSku.startsWith('JK-M') || upperSku.startsWith('JKM-') || upperSku.startsWith('JKM')) return 'men_jacket';
  if (upperSku.startsWith('JK-F') || upperSku.startsWith('JKF-') || upperSku.startsWith('JKF')) return 'women_jacket';
  if (upperSku.startsWith('SG-B') || upperSku.startsWith('SGB-') || upperSku.startsWith('BAG-') || upperSku.startsWith('BAG')) return 'bags';
  if (upperSku.startsWith('SGM-') || upperSku.startsWith('SGM') || upperSku.startsWith('SG-M-') || upperSku.startsWith('SA-M-') || upperSku.startsWith('SAM-')) return 'men_footwear';
  if (upperSku.startsWith('SG-F-') || upperSku.startsWith('SA-F-') || upperSku.startsWith('SAF-') || upperSku.startsWith('SGF-')) return 'women_footwear';

  // 2. Sheet name keywords
  if (lowerSheet.includes('mens jacket') || lowerSheet.includes('men jacket') || lowerSheet.includes('mens jackets') || lowerSheet.includes('men jackets')) {
    return 'men_jacket';
  }
  if (lowerSheet.includes('women jacket') || lowerSheet.includes('womens jacket') || lowerSheet.includes('ladies jacket') || lowerSheet.includes('women jackets') || lowerSheet.includes('womens jackets')) {
    return 'women_jacket';
  }
  if (lowerSheet.includes('mens footwear') || lowerSheet.includes('men footwear') || lowerSheet.includes('mens shoe') || lowerSheet.includes('men shoe') || lowerSheet.includes('gents footwear') || lowerSheet.includes('mens footwears')) {
    return 'men_footwear';
  }
  if (lowerSheet.includes('stock room') || lowerSheet.includes('women footwear') || lowerSheet.includes('ladies footwear') || lowerSheet.includes('women shoe') || lowerSheet.includes('women footwears')) {
    return 'women_footwear';
  }
  if (lowerSheet.includes('bag') || lowerSheet.includes('bags') || lowerSheet.includes('handbag') || lowerSheet.includes('handbags') || lowerSheet.includes('purse')) {
    return 'bags';
  }

  // 3. Fallback generic jacket
  if (lowerSheet.includes('jacket')) {
    return upperSku.includes('-F-') ? 'women_jacket' : 'men_jacket';
  }

  return 'women_footwear';
}

function isKnownSize(val) {
  if (val === undefined || val === null) return false;
  const s = String(val).trim().toUpperCase();
  // Numeric footwear sizes: 35 to 48
  if (/^(3[4-9]|4[0-8])$/.test(s)) return true;
  // Alpha garment sizes
  if (/^(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|FS|FREE\s*SIZE|STANDARD|ONE\s*SIZE)$/.test(s)) return true;
  return false;
}

function normalizeSizeName(val) {
  const s = String(val).trim().toUpperCase();
  if (s === 'FREE SIZE' || s === 'FS') return 'Free Size';
  if (s === 'ONE SIZE') return 'One Size';
  if (s === 'STANDARD') return 'Standard';
  return s;
}

/**
 * Parses a single 2D sheet array into normalized product items with dynamic column detection.
 */
function parseSheetRows(sheetName, ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rows || rows.length === 0) return [];

  const defaultCategory = detectCategoryFromSheetOrSku(sheetName, '');

  // Special check: Headerless Bags sheet (e.g. Row 0 is [ "SG-B-07-BLACK-S", 1 ])
  const firstRow = rows[0] || [];
  const firstCell = String(firstRow[0] || '').trim().toUpperCase();
  if (firstRow.length >= 2 && firstCell.startsWith('SG-B') && typeof firstRow[1] === 'number') {
    const bagItems = [];
    rows.forEach(r => {
      const sku = String(r[0] || '').trim();
      if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;
      const qty = Number(r[1]) || 1;
      bagItems.push({
        id: `prod-bag-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        sku,
        name: `Article ${sku}`,
        styleCategory: 'Leather Bags',
        category: 'bags',
        color: extractColor(sku),
        brand: 'Saint G',
        sizes: { 'Standard': qty },
        displaySize: 'Standard',
        imageUrl: `/products/${sku}.png`
      });
    });
    return bagItems;
  }

  // Find the header row containing sizes (e.g. 40, 41, 42 for Mens Footwear; 35-41 for Women; S-XXL for Jackets)
  let sizeHeaderRowIdx = -1;
  let sizeCols = [];

  const maxScan = Math.min(6, rows.length);
  for (let r = 0; r < maxScan; r++) {
    const row = rows[r] || [];
    const candidates = [];
    for (let c = 0; c < row.length; c++) {
      if (isKnownSize(row[c])) {
        candidates.push({ colIdx: c, sizeName: normalizeSizeName(row[c]) });
      }
    }
    // A legitimate size header row has at least 2 distinct size labels (e.g. 40, 41 or S, M)
    if (candidates.length >= 2) {
      sizeHeaderRowIdx = r;
      sizeCols = candidates;
      break;
    }
  }

  // Find SKU column and Display Size column in header rows (from row 0 up to sizeHeaderRowIdx)
  let skuColIdx = -1;
  let displaySizeColIdx = -1;

  const headerLimit = sizeHeaderRowIdx !== -1 ? sizeHeaderRowIdx : Math.min(3, rows.length - 1);
  for (let r = 0; r <= headerLimit; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim().toLowerCase();
      if (skuColIdx === -1 && (
        cellVal.includes('sku') || 
        cellVal.includes('article') || 
        cellVal.includes('item code') || 
        cellVal === 'code' ||
        cellVal === 'style'
      )) {
        skuColIdx = c;
      }
      if (displaySizeColIdx === -1 && (cellVal.includes('display') || cellVal.includes('disp'))) {
        displaySizeColIdx = c;
      }
    }
  }

  // Fallback: If SKU column was not found by title, inspect data rows for hyphenated SKU codes
  const startDataRow = sizeHeaderRowIdx !== -1 ? sizeHeaderRowIdx + 1 : 1;
  if (skuColIdx === -1) {
    for (let r = startDataRow; r < Math.min(startDataRow + 4, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < Math.min(4, row.length); c++) {
        const val = String(row[c] || '').trim();
        if (val.includes('-') && val.length >= 4 && !sizeCols.some(sc => sc.colIdx === c)) {
          skuColIdx = c;
          break;
        }
      }
      if (skuColIdx !== -1) break;
    }
    if (skuColIdx === -1) skuColIdx = 0;
  }

  const items = [];

  for (let r = startDataRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawSku = row[skuColIdx];
    if (!rawSku) continue;
    const sku = String(rawSku).trim();
    if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM' || sku.toUpperCase() === 'GRAND TOTAL') continue;

    // Detect category specifically for this item using sheet and SKU
    const category = detectCategoryFromSheetOrSku(sheetName, sku);

    // Extract sizes
    const sizes = {};
    if (sizeCols.length > 0) {
      sizeCols.forEach(({ colIdx, sizeName }) => {
        sizes[sizeName] = Number(row[colIdx]) || 0;
      });
    } else {
      const qty = Number(row[skuColIdx + 1]) || 0;
      sizes[category === 'bags' ? 'Standard' : 'One Size'] = qty;
    }

    // Default display size based on category
    let displaySize = '';
    if (displaySizeColIdx !== -1 && row[displaySizeColIdx]) {
      displaySize = String(row[displaySizeColIdx]).trim();
    }
    if (!displaySize) {
      if (category === 'women_footwear') displaySize = '37';
      else if (category === 'men_footwear') displaySize = '41';
      else if (category === 'men_jacket' || category === 'women_jacket') displaySize = 'M';
      else displaySize = 'Standard';
    }

    // Default style category
    let styleCategory = 'Standard';
    if (category === 'women_footwear') styleCategory = 'Block Heels';
    else if (category === 'men_footwear') styleCategory = 'Mens Shoes';
    else if (category === 'men_jacket') styleCategory = 'Mens Jackets';
    else if (category === 'women_jacket') styleCategory = 'Women Jackets';
    else if (category === 'bags') styleCategory = 'Leather Bags';

    const idPrefix = category === 'men_footwear' ? 'prod-m' 
      : category === 'women_footwear' ? 'prod-w'
      : category === 'men_jacket' ? 'prod-mjk'
      : category === 'women_jacket' ? 'prod-wjk'
      : 'prod-bag';

    items.push({
      id: `${idPrefix}-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: `Article ${sku}`,
      styleCategory,
      category,
      color: extractColor(sku),
      brand: 'Saint G',
      sizes,
      displaySize,
      imageUrl: `/products/${sku}.png`
    });
  }

  return items;
}

/**
 * Parses an Excel file (multi-sheet or single-sheet) into a normalized list of inventory items.
 * @param {ArrayBuffer} buffer - Raw file buffer
 * @returns {Array<Object>} List of parsed items with sku, category, sizes, etc.
 */
export function parseExcelInventoryBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const items = [];
  const sheetNames = wb.SheetNames;

  const isMultiSheetTemplate = sheetNames.some(name => {
    const l = name.toLowerCase();
    return l.includes('stock room') || l.includes('footwear') || l.includes('jacket') || l.includes('bags');
  });

  if (isMultiSheetTemplate) {
    sheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const parsed = parseSheetRows(sheetName, ws);
      items.push(...parsed);
    });
  } else {
    // Single sheet generic table
    const firstSheetName = sheetNames[0];
    const firstSheet = wb.Sheets[firstSheetName];
    
    // First test if it can be parsed with smart sheet parser
    const parsedWithSmartParser = parseSheetRows(firstSheetName, firstSheet);
    if (parsedWithSmartParser.length > 0) {
      return parsedWithSmartParser;
    }

    // Generic JSON rows fallback
    const jsonRows = XLSX.utils.sheet_to_json(firstSheet);
    jsonRows.forEach(row => {
      const sku = row['SKU'] || row['SKU CODE'] || row['Sku'] || row['Article'] || row['Code'];
      if (!sku) return;

      const rawCat = row['Category'] || row['category'] || '';
      const category = rawCat ? rawCat.toLowerCase().replace(/\s+/g, '_') : detectCategoryFromSheetOrSku(firstSheetName, sku);
      const styleCategory = row['Style'] || row['StyleCategory'] || row['Name'] || 'Standard';
      const color = row['Color'] || extractColor(sku);

      // Collect sizes from known size columns
      const potentialSizes = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'S', 'M', 'L', 'XL', 'XXL', 'Standard', 'One Size'];
      const sizes = {};
      potentialSizes.forEach(sz => {
        if (row[sz] !== undefined) {
          sizes[sz] = Number(row[sz]) || 0;
        }
      });

      if (Object.keys(sizes).length === 0 && row['Qty'] !== undefined) {
        sizes[category === 'bags' ? 'Standard' : 'One Size'] = Number(row['Qty']) || 0;
      }

      items.push({
        id: `prod-gen-${String(sku).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        sku: String(sku).trim(),
        name: row['Name'] || `Article ${sku}`,
        styleCategory,
        category,
        color,
        brand: row['Brand'] || 'Saint G',
        sellingPrice: Number(row['SellingPrice'] || row['Price'] || row['SP'] || 0),
        costPrice: Number(row['CostPrice'] || row['MRP'] || 0),
        sizes,
        displaySize: row['DisplaySize'] || (category === 'men_footwear' ? '41' : category === 'women_footwear' ? '37' : 'M'),
        imageUrl: `/products/${String(sku).trim()}.png`
      });
    });
  }

  return items;
}

/**
 * Compares parsed Excel items with current inventory to compute diff:
 * - newItems: items present in Excel but not in current inventory
 * - updatedItems: items present in both with differences in size quantities
 * - unchangedItems: items identical in both
 */
export function computeInventoryDiff(excelItems, currentInventory) {
  const cleanSku = (s) => clean(s);

  // Map current inventory by normalized SKU
  const invMap = new Map();
  currentInventory.forEach(p => {
    invMap.set(cleanSku(p.sku), p);
  });

  const newItems = [];
  const updatedItems = [];
  const unchangedItems = [];

  excelItems.forEach(item => {
    const cSku = cleanSku(item.sku);
    const existing = invMap.get(cSku);

    if (!existing) {
      newItems.push(item);
    } else {
      // Compare size quantities
      const existingSizes = existing.sizes || {};
      const newSizes = item.sizes || {};
      const allSizes = Array.from(new Set([...Object.keys(existingSizes), ...Object.keys(newSizes)]));

      const diffSizes = [];
      allSizes.forEach(sz => {
        const oldQty = Number(existingSizes[sz] || 0);
        const newQty = Number(newSizes[sz] || 0);
        if (oldQty !== newQty) {
          diffSizes.push({ size: sz, oldQty, newQty });
        }
      });

      if (diffSizes.length > 0) {
        updatedItems.push({
          id: existing.id,
          sku: existing.sku,
          name: existing.name,
          styleCategory: existing.styleCategory || item.styleCategory,
          color: existing.color || item.color,
          category: existing.category || item.category,
          imageUrl: existing.imageUrl || item.imageUrl || '',
          displaySize: existing.displaySize || item.displaySize || null,
          oldSizes: existingSizes,
          newSizes,
          diffSizes
        });
      } else {
        unchangedItems.push(existing);
      }
    }
  });

  return {
    newItems,
    updatedItems,
    unchangedItems,
    totalExcelRows: excelItems.length
  };
}
