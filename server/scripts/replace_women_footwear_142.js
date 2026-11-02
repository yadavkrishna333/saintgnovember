import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pztpvqxadtjdtbkjdsai.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_1KGx3KPNl2FQJ22Q3zH25w_t2_1M8xw';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'resolution=merge-duplicates,return=representation'
};

const colorMap = {
  'SILVER': 'Silver', 'BLACK': 'Black', 'OFFWHITE': 'Off White', 'PLATIN': 'Platin',
  'OLDGOLD': 'Old Gold', 'DARKBROWN': 'Dark Brown', 'STONE': 'Stone', 'CORAL': 'Coral',
  'IVORY': 'Ivory', 'BROWN': 'Brown', 'MULTI': 'Multi', 'GOLD': 'Gold', 'TAN': 'Tan',
  'LIGHTGOLD': 'Light Gold', 'TAUPE': 'Taupe', 'LIGHTBEIGE': 'Light Beige',
  'CHESTNUT': 'Chestnut', 'TURQ': 'Turq', 'WHITE': 'White', 'PORTROYALE': 'Port Royale',
  'BLUE': 'Blue', 'SKYBLUE': 'Sky Blue', 'SILVERMULTI': 'Silver Multi',
  'MAIS': 'Mais', 'BORDO': 'Bordo', 'BRODO': 'Bordo', 'MARRON': 'Marron',
  'LIGHTTAUPE': 'Light Taupe'
};

function extractColor(sku) {
  let cleaned = sku.toUpperCase().replace('_', '-');
  const parts = cleaned.split('-');
  let colorRaw = parts.slice(2).join('');
  if (parts.length >= 4 && isNaN(Number(parts[3]))) {
    colorRaw = parts.slice(3).join('');
  }
  return colorMap[colorRaw] || (colorRaw.charAt(0) + colorRaw.slice(1).toLowerCase());
}

async function runReplacement() {
  const userInvPath = path.resolve(__dirname, '../data/users/usr-krishan/inventory.json');
  const defaultInvPath = path.resolve(__dirname, '../data/inventory.json');
  const rawPath = path.resolve(__dirname, './raw_women_142.txt');

  const currentInventory = JSON.parse(fs.readFileSync(userInvPath, 'utf-8'));
  const rawLines = fs.readFileSync(rawPath, 'utf-8').trim().split('\n');

  console.log(`Current inventory: ${currentInventory.length} items`);
  console.log(`Processing ${rawLines.length} master women footwear lines...`);

  // Map existing images so we don't lose product photos
  const imageMap = {};
  currentInventory.forEach(p => {
    if (p.sku && p.imageUrl) imageMap[p.sku.toUpperCase()] = p.imageUrl;
  });

  // Keep all non-women_footwear products (men_footwear, men_jacket, women_jacket, bags)
  const nonWomenProducts = currentInventory.filter(p => p.category !== 'women_footwear');
  console.log(`Preserving ${nonWomenProducts.length} items from other categories (Men Footwear, Jackets, Bags)...`);

  const newWomenProducts = [];

  rawLines.forEach((line, idx) => {
    const parts = line.split('\t');
    const sr = parts[0]?.trim() || String(idx + 1);
    const sku = parts[1]?.trim().toUpperCase();
    if (!sku) return;

    const sz35 = Number(parts[2]?.trim() || 0);
    const sz36 = Number(parts[3]?.trim() || 0);
    const sz37 = Number(parts[4]?.trim() || 0);
    const sz38 = Number(parts[5]?.trim() || 0);
    const sz39 = Number(parts[6]?.trim() || 0);
    const sz40 = Number(parts[7]?.trim() || 0);
    const sz41 = Number(parts[8]?.trim() || 0);
    const displaySize = parts[9]?.trim() || '37';

    const color = extractColor(sku);
    const existingImg = imageMap[sku] || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=80';

    const product = {
      id: `prod-w-${sr}-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      displaySize: displaySize,
      sku: sku,
      name: `Article ${sku}`,
      brand: 'Zara',
      category: 'women_footwear',
      styleCategory: 'Block Heels',
      color: color,
      costPrice: 2200,
      sellingPrice: 4499,
      barcode: `890123${String(sr).padStart(4, '0')}`,
      sizes: {
        '35': sz35,
        '36': sz36,
        '37': sz37,
        '38': sz38,
        '39': sz39,
        '40': sz40,
        '41': sz41
      },
      imageUrl: existingImg,
      notes: `Master list item #${sr}`,
      createdAt: '2026-11-02T13:16:54.700Z',
      updatedAt: new Date().toISOString()
    };

    newWomenProducts.push(product);
  });

  console.log(`✅ Formatted ${newWomenProducts.length} new women footwear products.`);

  const finalInventory = [...newWomenProducts, ...nonWomenProducts];
  console.log(`📦 New Total Inventory: ${finalInventory.length} products.`);

  // Save to local user JSON
  fs.writeFileSync(userInvPath, JSON.stringify(finalInventory, null, 2), 'utf-8');
  console.log('💾 Saved to', userInvPath);

  // Save to default JSON
  fs.writeFileSync(defaultInvPath, JSON.stringify(finalInventory, null, 2), 'utf-8');
  console.log('💾 Saved to', defaultInvPath);

  // Sync to Supabase
  console.log('🚀 Synchronizing to Supabase Cloud Database...');
  
  // 1. Delete old women_footwear in Supabase
  try {
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory?category=eq.women_footwear`, {
      method: 'DELETE',
      headers
    });
    console.log('🗑️ Deleted old women_footwear from Supabase:', delRes.status);
  } catch (delErr) {
    console.warn('⚠️ Supabase category delete warning:', delErr.message);
  }

  // 2. Insert new 142 women footwear in chunks of 50
  const formattedForSupabase = newWomenProducts.map(p => ({
    id: p.id,
    user_id: 'usr-krishan',
    sku: p.sku,
    name: p.name,
    style_category: p.styleCategory,
    color: p.color,
    category: p.category,
    brand: p.brand,
    cost_price: p.costPrice,
    selling_price: p.sellingPrice,
    sizes: p.sizes,
    display_size: p.displaySize,
    image_url: p.imageUrl,
    created_at: p.createdAt,
    updated_at: p.updatedAt
  }));

  const chunkSize = 50;
  for (let i = 0; i < formattedForSupabase.length; i += chunkSize) {
    const chunk = formattedForSupabase.slice(i, i + chunkSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Chunk error ${i}:`, err);
    } else {
      console.log(`✅ Uploaded to Supabase: items ${i + 1} to ${Math.min(i + chunkSize, formattedForSupabase.length)}`);
    }
  }

  console.log('🎉 142 Master Women Footwear articles successfully replaced in local files and Supabase!');
}

runReplacement().catch(err => {
  console.error('❌ Replacement error:', err);
});
