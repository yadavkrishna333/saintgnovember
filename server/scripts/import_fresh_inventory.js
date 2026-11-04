import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from '../../client/node_modules/xlsx/xlsx.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.resolve(__dirname, '../../inventory excel/INVENTORY.xlsx');
const USER_INV_PATH = path.resolve(__dirname, '../data/users/usr-krishan/inventory.json');
const SERVER_INV_PATH = path.resolve(__dirname, '../data/inventory.json');
const BACKUP_PATH = path.resolve(__dirname, '../data/users/usr-krishan/inventory_backup_20261104.json');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pztpvqxadtjdtbkjdsai.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1KGx3KPNl2FQJ22Q3zH25w_t2_1M8xw';

let masterMap = new Map();
try {
  const backupData = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  backupData.forEach(p => {
    if (p.sku) masterMap.set(p.sku.toUpperCase().trim(), p);
  });
} catch (e) {
  console.warn('Backup not found, proceeding with defaults');
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

export function parseAllSheets() {
  const fileBuf = fs.readFileSync(EXCEL_PATH);
  const wb = XLSX.read(fileBuf, { type: 'buffer' });
  const items = [];

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
    const displaySize = r[10] ? String(r[10]).trim() : '';

    const matched = masterMap.get(sku.toUpperCase());
    const item = {
      id: matched?.id || `prod-w-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: matched?.name || `Article ${sku}`,
      styleCategory: matched?.styleCategory || 'Block Heels',
      category: 'women_footwear',
      color: matched?.color || extractColor(sku),
      brand: 'Saint G',
      costPrice: matched?.costPrice || 0,
      sellingPrice: matched?.sellingPrice || 0,
      sizes,
      displaySize: displaySize || matched?.displaySize || null,
      imageUrl: matched?.imageUrl || `/products/${sku}.png`,
      createdAt: matched?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
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

    const matched = masterMap.get(sku.toUpperCase());
    const item = {
      id: matched?.id || `prod-m-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: matched?.name || `Article ${sku}`,
      styleCategory: matched?.styleCategory || 'Mens Boot',
      category: 'men_footwear',
      color: matched?.color || extractColor(sku),
      brand: 'Saint G',
      costPrice: matched?.costPrice || 0,
      sellingPrice: matched?.sellingPrice || 0,
      sizes,
      displaySize: matched?.displaySize || null,
      imageUrl: matched?.imageUrl || `/products/${sku}.png`,
      createdAt: matched?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
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
    const matched = masterMap.get(sku.toUpperCase());
    const item = {
      id: matched?.id || `prod-bag-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: matched?.name || `Handbag ${sku}`,
      styleCategory: matched?.styleCategory || 'Bags',
      category: 'bags',
      color: matched?.color || extractColor(sku),
      brand: 'Saint G',
      costPrice: matched?.costPrice || 0,
      sellingPrice: matched?.sellingPrice || 0,
      sizes: { 'One Size': qty },
      displaySize: 'One Size',
      imageUrl: matched?.imageUrl || `/products/${sku}.png`,
      createdAt: matched?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
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

    const matched = masterMap.get(sku.toUpperCase());
    const item = {
      id: matched?.id || `prod-mj-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: matched?.name || `Jacket ${sku}`,
      styleCategory: matched?.styleCategory || 'MENS JACKET',
      category: 'men_jacket',
      color: matched?.color || extractColor(sku),
      brand: 'Saint G',
      costPrice: matched?.costPrice || 0,
      sellingPrice: matched?.sellingPrice || 0,
      sizes,
      displaySize: matched?.displaySize || null,
      imageUrl: matched?.imageUrl || `/products/${sku}.png`,
      createdAt: matched?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
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

    const matched = masterMap.get(sku.toUpperCase());
    const item = {
      id: matched?.id || `prod-wj-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku,
      name: matched?.name || `Jacket ${sku}`,
      styleCategory: matched?.styleCategory || 'WOMENS JACKET',
      category: 'women_jacket',
      color: matched?.color || extractColor(sku),
      brand: 'Saint G',
      costPrice: matched?.costPrice || 0,
      sellingPrice: matched?.sellingPrice || 0,
      sizes,
      displaySize: matched?.displaySize || null,
      imageUrl: matched?.imageUrl || `/products/${sku}.png`,
      createdAt: matched?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
  });

  return items;
}

export async function executeImport() {
  console.log('🔄 Parsing INVENTORY.xlsx...');
  const items = parseAllSheets();
  console.log(`✅ Parsed ${items.length} items from INVENTORY.xlsx`);

  fs.writeFileSync(USER_INV_PATH, JSON.stringify(items, null, 2));
  fs.writeFileSync(SERVER_INV_PATH, JSON.stringify(items, null, 2));
  console.log(`💾 Saved ${items.length} items to local JSON database`);

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
  console.log('Supabase delete old inventory status:', delRes.status);

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

  console.log('🎉 Successfully completed fresh inventory import!');
  return items;
}

if (process.argv.includes('--run')) {
  executeImport().catch(console.error);
}
