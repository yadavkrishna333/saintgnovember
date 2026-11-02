import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pztpvqxadtjdtbkjdsai.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'resolution=merge-duplicates,return=representation'
};

async function syncAllToSupabase() {
  console.log('🚀 Connecting to Supabase at:', SUPABASE_URL);

  const inventoryPath = path.resolve(__dirname, '../data/users/usr-krishan/inventory.json');
  if (!fs.existsSync(inventoryPath)) {
    console.error('❌ inventory.json not found at:', inventoryPath);
    return;
  }

  const rawInventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  console.log(`📦 Found ${rawInventory.length} articles to upload to Supabase...`);

  // Transform products to match Supabase snake_case columns
  const formattedProducts = rawInventory.map(p => ({
    id: p.id,
    user_id: 'usr-krishan',
    sku: p.sku,
    name: p.name,
    style_category: p.styleCategory || null,
    color: p.color || null,
    category: p.category || 'women_footwear',
    brand: p.brand || 'Zara',
    cost_price: Number(p.costPrice || 0),
    selling_price: Number(p.sellingPrice || 0),
    sizes: p.sizes || {},
    display_size: p.displaySize || null,
    image_url: p.imageUrl || null,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString()
  }));

  // Batch upload in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < formattedProducts.length; i += chunkSize) {
    const chunk = formattedProducts.slice(i, i + chunkSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to upload chunk ${i / chunkSize + 1}: ${err}`);
    }
    console.log(`✅ Uploaded batch ${i + 1} to ${Math.min(i + chunkSize, formattedProducts.length)}`);
  }

  console.log('🎉 All 143 items successfully synchronized to Supabase Cloud Database!');
}

syncAllToSupabase().catch(err => {
  console.error('❌ Supabase Sync Error:', err.message);
});
