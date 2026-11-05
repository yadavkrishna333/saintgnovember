import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from '../../client/node_modules/xlsx/xlsx.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INVENTORY_EXCEL_PATH = path.resolve(__dirname, '../../inventory excel/INVENTORY.xlsx');
const MG_SHOP_EXCEL_PATH = path.resolve(__dirname, '../../MG SHOP STOCK AND PRICE LISTS.xlsx');
const PRODUCTS_DIR = path.resolve(__dirname, '../../client/public/products');
const MG_PHOTOS_DIR = path.resolve(__dirname, '../../MG SHOP PHOTOS');

const USER_INV_PATH = path.resolve(__dirname, '../data/users/usr-krishan/inventory.json');
const SERVER_INV_PATH = path.resolve(__dirname, '../data/inventory.json');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pztpvqxadtjdtbkjdsai.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1KGx3KPNl2FQJ22Q3zH25w_t2_1M8xw';

function clean(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function extractColor(sku) {
  const parts = sku.split('-');
  if (parts.length >= 3) {
    let col = parts.slice(2).join(' ').trim();
    col = col.replace(/-\s*[SMLX]+$/i, '');
    return col.charAt(0).toUpperCase() + col.slice(1).toLowerCase();
  }
  return 'Standard';
}

// 1. Build MG SHOP metadata map
function parseMgShopMetadata() {
  const fileBuf = fs.readFileSync(MG_SHOP_EXCEL_PATH);
  const wb = XLSX.read(fileBuf, { type: 'buffer' });
  const sheet = wb.Sheets['MG SHOP'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const mgMap = new Map();
  let currentHeading = '';

  rows.forEach((r) => {
    const colA = r[0];
    const colB = r[1];
    const colC = r[2];
    const colD = r[3];
    const colG = r[6];

    const isColBHeading = !colA && typeof colB === 'string' && colB.trim() && colB.trim() !== 'IMAGES' && colB.trim() !== 'MG SHOP STOCK AND PRICE LIST';
    const isColAHeading = typeof colA === 'string' && colA.trim() && !colC && isNaN(Number(colA)) && colA.trim() !== 'MG SHOP STOCK AND PRICE LIST';

    if (isColBHeading || isColAHeading) {
      currentHeading = (isColBHeading ? colB : colA).trim();
      return;
    }

    if (colC && typeof colC === 'string' && colC.trim() && !colC.includes('SKU CODE')) {
      const sku = colC.trim();
      const mrp = typeof colD === 'number' ? colD : (parseFloat(String(colD || '').replace(/[^0-9.]/g, '')) || 0);
      const sp = typeof colG === 'number' ? colG : (parseFloat(String(colG || '').replace(/[^0-9.]/g, '')) || 0);

      mgMap.set(clean(sku), {
        sku,
        styleCategory: currentHeading,
        mrp,
        sp
      });
    }
  });

  return mgMap;
}

// 2. Resolve image for SKU
function resolveImage(sku, existingFiles) {
  if (!sku) return '';

  const cSku = clean(sku);
  const safeSku = sku.replace(/[^A-Za-z0-9_-]/g, '_');

  // Exact file extensions
  for (const ext of ['.png', '.PNG', '.jpeg', '.JPEG', '.jpg', '.JPG']) {
    const candidate1 = sku + ext;
    const candidate2 = safeSku + ext;
    if (existingFiles.has(candidate1.toUpperCase())) {
      return `/products/${candidate1}`;
    }
    if (existingFiles.has(candidate2.toUpperCase())) {
      return `/products/${candidate2}`;
    }
  }

  // Normalized matching against files in products directory
  for (const filename of existingFiles) {
    const baseName = filename.replace(/\.[^.]+$/, '');
    if (clean(baseName) === cSku) {
      return `/products/${filename}`;
    }
  }

  // Check if image exists in MG SHOP PHOTOS and copy to products directory
  if (fs.existsSync(MG_PHOTOS_DIR)) {
    const mgFiles = fs.readdirSync(MG_PHOTOS_DIR);
    for (const mgFile of mgFiles) {
      const baseName = mgFile.replace(/\.[^.]+$/, '');
      if (clean(baseName) === cSku || baseName.toUpperCase() === sku.toUpperCase()) {
        const src = path.join(MG_PHOTOS_DIR, mgFile);
        const dest = path.join(PRODUCTS_DIR, mgFile);
        fs.copyFileSync(src, dest);
        existingFiles.add(mgFile.toUpperCase());
        return `/products/${mgFile}`;
      }
    }
  }

  return ''; // Leave empty if no photo exists
}

// 3. Parse all 5 sheets from INVENTORY.xlsx
export function parseInventoryFromExcel() {
  const mgMap = parseMgShopMetadata();

  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }
  const existingFiles = new Set(fs.readdirSync(PRODUCTS_DIR).map(f => f.toUpperCase()));

  const fileBuf = fs.readFileSync(INVENTORY_EXCEL_PATH);
  const wb = XLSX.read(fileBuf, { type: 'buffer' });
  const items = [];

  // Manual known equivalents between INVENTORY.xlsx and MG SHOP
  const manualEquivalents = {
    'SGF1761MARRON': 'SGF1761MAROON',
    'SGF1932SILVERMULTI': 'SGF1932SILVER',
    'SGF1932LIGHTGOLD': 'SGF1932GOLD',
    'SGF1576PORTROYALE': 'SGF1576PROYAL',
    'SGF1928BLUE': 'SGF1928NAVYBLUE',
    'SGF1885BROWN': 'SGF1885DRKBROWN',
    'SGF1863LIGHTBEIGE': 'SGF1863LBEIGE',
    'SGF1853OLDGOLD': 'SGF1853NGOLD',
    'SGF1855OLDGOLD': 'SGF1855NGOLD',
    'SGF1856OLDGOLD': 'SGF1856NGOLD',
    'SGF1931LIGHTGOLD': 'SGF1931GOLD',
    'SGF1905OLDGOLD': 'SGF1905NGOLD',
    'SGF1760LIGHTTAUPE': 'SGF1760TAUPE',
    'SGF1939BRODO': 'SGF1939BORDO',
    'SGF1842OFFWHITE': 'SGF1842OFFWHT',
    'JKM56DARKTAN': 'JKM56DRKTAN',
    'JKM36DARKGREY': 'JKM36DRKGREY',
    'JKM47DARKGREY': 'JKM47DARKGREY'
  };

  const getMgMeta = (sku) => {
    const c = clean(sku);
    return mgMap.get(c) || mgMap.get(manualEquivalents[c]) || null;
  };

  // 1. Stock Room (Women Footwear)
  const wsStock = wb.Sheets['Stock Room'];
  const stockRows = XLSX.utils.sheet_to_json(wsStock, { header: 1 });
  stockRows.forEach((r, idx) => {
    if (idx < 1) return;
    const skuRaw = r[1];
    if (!skuRaw) return;
    const sku = String(skuRaw).trim();
    if (sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

    const sizes = {
      '35': Number(r[2]) || 0,
      '36': Number(r[3]) || 0,
      '37': Number(r[4]) || 0,
      '38': Number(r[5]) || 0,
      '39': Number(r[6]) || 0,
      '40': Number(r[7]) || 0,
      '41': Number(r[8]) || 0
    };
    const displaySize = r[10] ? String(r[10]).trim() : '37';

    const mg = getMgMeta(sku);
    const img = resolveImage(sku, existingFiles);

    items.push({
      id: `prod-w-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: `Article ${sku}`,
      styleCategory: mg?.styleCategory || 'Block Heels',
      category: 'women_footwear',
      color: extractColor(sku),
      brand: 'Saint G',
      costPrice: mg?.mrp || 0,
      sellingPrice: mg?.sp || 0,
      sizes,
      displaySize: displaySize || '37',
      imageUrl: img,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // 2. Mens Footwear
  const wsMf = wb.Sheets['Mens Footwear'];
  const mfRows = XLSX.utils.sheet_to_json(wsMf, { header: 1 });
  mfRows.forEach((r, idx) => {
    if (idx < 3) return;
    const skuRaw = r[0];
    if (!skuRaw) return;
    const sku = String(skuRaw).trim();
    if (sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

    const sizes = {
      '40': Number(r[1]) || 0,
      '41': Number(r[2]) || 0,
      '42': Number(r[3]) || 0,
      '43': Number(r[4]) || 0,
      '44': Number(r[5]) || 0,
      '45': Number(r[6]) || 0
    };

    const mg = getMgMeta(sku);
    const img = resolveImage(sku, existingFiles);

    items.push({
      id: `prod-m-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: `Article ${sku}`,
      styleCategory: mg?.styleCategory || 'Mens Boot',
      category: 'men_footwear',
      color: extractColor(sku),
      brand: 'Saint G',
      costPrice: mg?.mrp || 0,
      sellingPrice: mg?.sp || 0,
      sizes,
      displaySize: '41',
      imageUrl: img,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // 3. BAGS
  const wsBags = wb.Sheets['BAGS'];
  const bagRows = XLSX.utils.sheet_to_json(wsBags, { header: 1 });
  bagRows.forEach((r) => {
    const skuRaw = r[0];
    if (!skuRaw) return;
    const sku = String(skuRaw).trim();
    if (sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

    const qty = Number(r[1]) || 1;
    const mg = getMgMeta(sku);
    const img = resolveImage(sku, existingFiles);

    items.push({
      id: `prod-bag-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: `Handbag ${sku}`,
      styleCategory: mg?.styleCategory || 'Bags',
      category: 'bags',
      color: extractColor(sku),
      brand: 'Saint G',
      costPrice: mg?.mrp || 0,
      sellingPrice: mg?.sp || 0,
      sizes: { 'One Size': qty },
      displaySize: 'One Size',
      imageUrl: img,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // 4. Mens Jackets
  const wsMj = wb.Sheets['Mens Jackets'];
  const mjRows = XLSX.utils.sheet_to_json(wsMj, { header: 1 });
  mjRows.forEach((r, idx) => {
    if (idx < 2) return;
    const skuRaw = r[1];
    if (!skuRaw) return;
    const sku = String(skuRaw).trim();
    if (sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

    const sizes = {
      'S': Number(r[2]) || 0,
      'M': Number(r[3]) || 0,
      'L': Number(r[4]) || 0,
      'XL': Number(r[5]) || 0,
      'XXL': Number(r[6]) || 0
    };

    // If duplicate SKU exists, combine sizes
    const existing = items.find(i => i.category === 'men_jacket' && i.sku === sku);
    if (existing) {
      Object.keys(sizes).forEach(s => {
        existing.sizes[s] = (existing.sizes[s] || 0) + sizes[s];
      });
      return;
    }

    const mg = getMgMeta(sku);
    const img = resolveImage(sku, existingFiles);

    items.push({
      id: `prod-mj-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: `Jacket ${sku}`,
      styleCategory: mg?.styleCategory || 'MENS JACKET',
      category: 'men_jacket',
      color: extractColor(sku),
      brand: 'Saint G',
      costPrice: mg?.mrp || 0,
      sellingPrice: mg?.sp || 0,
      sizes,
      displaySize: 'M',
      imageUrl: img,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // 5. Women Jacket
  const wsWj = wb.Sheets['Women Jacket'];
  const wjRows = XLSX.utils.sheet_to_json(wsWj, { header: 1 });
  wjRows.forEach((r, idx) => {
    if (idx < 2) return;
    const skuRaw = r[1];
    if (!skuRaw) return;
    const sku = String(skuRaw).trim();
    if (sku.toUpperCase() === 'TOTAL' || sku.toUpperCase() === 'SUM') return;

    const sizes = {
      'S': Number(r[2]) || 0,
      'M': Number(r[3]) || 0,
      'L': Number(r[4]) || 0,
      'XL': Number(r[5]) || 0,
      'XXL': Number(r[6]) || 0
    };

    const existing = items.find(i => i.category === 'women_jacket' && i.sku === sku);
    if (existing) {
      Object.keys(sizes).forEach(s => {
        existing.sizes[s] = (existing.sizes[s] || 0) + sizes[s];
      });
      return;
    }

    const mg = getMgMeta(sku);
    const img = resolveImage(sku, existingFiles);

    items.push({
      id: `prod-wj-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: `Jacket ${sku}`,
      styleCategory: mg?.styleCategory || 'WOMENS JACKET',
      category: 'women_jacket',
      color: extractColor(sku),
      brand: 'Saint G',
      costPrice: mg?.mrp || 0,
      sellingPrice: mg?.sp || 0,
      sizes,
      displaySize: 'M',
      imageUrl: img,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  return items;
}

export async function executeResetAndImport() {
  console.log('🔄 Parsing INVENTORY.xlsx with MG SHOP images & metadata...');
  const items = parseInventoryFromExcel();
  console.log(`✅ Parsed ${items.length} items from INVENTORY.xlsx`);

  const withImg = items.filter(i => i.imageUrl).length;
  const withoutImg = items.filter(i => !i.imageUrl).length;
  console.log(`📸 Items with image: ${withImg}, without image: ${withoutImg}`);

  // Backup current data before overwriting
  const backupPath = path.resolve(__dirname, `../data/users/usr-krishan/inventory_pre_reset_${Date.now()}.json`);
  if (fs.existsSync(USER_INV_PATH)) {
    fs.copyFileSync(USER_INV_PATH, backupPath);
    console.log(`📦 Backup saved to ${backupPath}`);
  }

  // Save to local JSON files
  fs.writeFileSync(USER_INV_PATH, JSON.stringify(items, null, 2), 'utf8');
  fs.writeFileSync(SERVER_INV_PATH, JSON.stringify(items, null, 2), 'utf8');
  console.log(`💾 Saved ${items.length} items to local JSON database`);

  // Wipe and sync to Supabase Cloud Database
  console.log('☁️ Wiping and syncing to Supabase Cloud Database...');
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory?user_id=eq.usr-krishan`, {
    method: 'DELETE',
    headers
  });
  console.log('Supabase delete old inventory response status:', delRes.status);

  const BATCH_SIZE = 50;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE).map(item => ({
      id: item.id,
      user_id: 'usr-krishan',
      sku: item.sku,
      name: item.name,
      style_category: item.styleCategory,
      color: item.color,
      category: item.category,
      brand: 'Saint G',
      cost_price: item.costPrice || 0,
      selling_price: item.sellingPrice || 0,
      sizes: item.sizes,
      display_size: item.displaySize,
      image_url: item.imageUrl,
      updated_at: new Date().toISOString()
    }));

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(chunk)
    });
    console.log(`Inserted chunk ${i + 1} to ${Math.min(i + BATCH_SIZE, items.length)}: status ${insRes.status}`);
  }

  console.log('🎉 Fresh inventory reset & import completed successfully!');
  return items;
}

if (process.argv.includes('--run')) {
  executeResetAndImport().catch(console.error);
}
