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
 * Parses an Excel file (multi-sheet or single-sheet) into a normalized list of inventory items.
 * @param {ArrayBuffer} buffer - Raw file buffer
 * @returns {Array<Object>} List of parsed items with sku, category, sizes, etc.
 */
export function parseExcelInventoryBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const items = [];
  const sheetNames = wb.SheetNames;

  const isMultiSheetTemplate = sheetNames.some(name => 
    name.toLowerCase().includes('stock room') || 
    name.toLowerCase().includes('footwear') || 
    name.toLowerCase().includes('jacket') || 
    name.toLowerCase().includes('bags')
  );

  if (isMultiSheetTemplate) {
    sheetNames.forEach(sheetName => {
      const lowerName = sheetName.toLowerCase().trim();
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!rows || rows.length < 2) return;

      if (lowerName.includes('stock room') || lowerName.includes('women footwear')) {
        // Women Footwear: Cols: [Sr, SKU, 35, 36, 37, 38, 39, 40, 41, Total, Display Size]
        rows.forEach((r, idx) => {
          if (idx < 1) return;
          const sku = r[1] ? String(r[1]).trim() : '';
          if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

          const sizes = {
            '35': Number(r[2]) || 0,
            '36': Number(r[3]) || 0,
            '37': Number(r[4]) || 0,
            '38': Number(r[5]) || 0,
            '39': Number(r[6]) || 0,
            '40': Number(r[7]) || 0,
            '41': Number(r[8]) || 0
          };

          items.push({
            id: `prod-w-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            sku,
            name: `Article ${sku}`,
            styleCategory: 'Block Heels',
            category: 'women_footwear',
            color: extractColor(sku),
            brand: 'Saint G',
            sizes,
            displaySize: r[10] ? String(r[10]).trim() : '37'
          });
        });
      } else if (lowerName.includes('mens footwear') || lowerName.includes('men footwear')) {
        // Mens Footwear: Cols: [Sr, SKU, 39, 40, 41, 42, 43, 44, 45, Total, Display Size]
        rows.forEach((r, idx) => {
          if (idx < 1) return;
          const sku = r[1] ? String(r[1]).trim() : '';
          if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

          const sizes = {
            '39': Number(r[2]) || 0,
            '40': Number(r[3]) || 0,
            '41': Number(r[4]) || 0,
            '42': Number(r[5]) || 0,
            '43': Number(r[6]) || 0,
            '44': Number(r[7]) || 0,
            '45': Number(r[8]) || 0
          };

          items.push({
            id: `prod-m-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            sku,
            name: `Article ${sku}`,
            styleCategory: 'Mens Shoes',
            category: 'men_footwear',
            color: extractColor(sku),
            brand: 'Saint G',
            sizes,
            displaySize: r[10] ? String(r[10]).trim() : '41'
          });
        });
      } else if (lowerName.includes('bags')) {
        // Bags: Cols: [Sr, SKU, Qty, ...]
        rows.forEach((r, idx) => {
          if (idx < 1) return;
          const sku = r[1] ? String(r[1]).trim() : '';
          if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

          const qty = Number(r[2]) || 0;
          items.push({
            id: `prod-bag-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            sku,
            name: `Article ${sku}`,
            styleCategory: 'Leather Bags',
            category: 'bags',
            color: extractColor(sku),
            brand: 'Saint G',
            sizes: { 'Standard': qty },
            displaySize: 'Standard'
          });
        });
      } else if (lowerName.includes('mens jacket') || lowerName.includes('men jacket')) {
        // Mens Jackets: Cols: [Sr, SKU, S, M, L, XL, XXL, Total, Display Size]
        rows.forEach((r, idx) => {
          if (idx < 1) return;
          const sku = r[1] ? String(r[1]).trim() : '';
          if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

          const sizes = {
            'S': Number(r[2]) || 0,
            'M': Number(r[3]) || 0,
            'L': Number(r[4]) || 0,
            'XL': Number(r[5]) || 0,
            'XXL': Number(r[6]) || 0
          };

          items.push({
            id: `prod-mjk-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            sku,
            name: `Article ${sku}`,
            styleCategory: 'Mens Jackets',
            category: 'men_jacket',
            color: extractColor(sku),
            brand: 'Saint G',
            sizes,
            displaySize: r[8] ? String(r[8]).trim() : 'M'
          });
        });
      } else if (lowerName.includes('women jacket')) {
        // Women Jackets: Cols: [Sr, SKU, S, M, L, XL, XXL, Total, Display Size]
        rows.forEach((r, idx) => {
          if (idx < 1) return;
          const sku = r[1] ? String(r[1]).trim() : '';
          if (!sku || sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

          const sizes = {
            'S': Number(r[2]) || 0,
            'M': Number(r[3]) || 0,
            'L': Number(r[4]) || 0,
            'XL': Number(r[5]) || 0,
            'XXL': Number(r[6]) || 0
          };

          items.push({
            id: `prod-wjk-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            sku,
            name: `Article ${sku}`,
            styleCategory: 'Women Jackets',
            category: 'women_jacket',
            color: extractColor(sku),
            brand: 'Saint G',
            sizes,
            displaySize: r[8] ? String(r[8]).trim() : 'M'
          });
        });
      }
    });
  } else {
    // Single sheet generic table
    const firstSheet = wb.Sheets[sheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json(firstSheet);
    jsonRows.forEach(row => {
      const sku = row['SKU'] || row['SKU CODE'] || row['Sku'] || row['Article'] || row['Code'];
      if (!sku) return;

      const category = (row['Category'] || 'women_footwear').toLowerCase().replace(/\s+/g, '_');
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
        sizes['Standard'] = Number(row['Qty']) || 0;
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
        sizes
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
          category: existing.category,
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
