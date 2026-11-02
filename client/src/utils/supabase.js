// Supabase Cloud Database Client Helper for KY INVENTORY
// Configure these in client/.env or Netlify Environment Variables:
// VITE_SUPABASE_URL = "https://your-project.supabase.co"
// VITE_SUPABASE_ANON_KEY = "your-anon-key"

const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://pztpvqxadtjdtbkjdsai.supabase.co';

const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_1KGx3KPNl2FQJ22Q3zH25w_t2_1M8xw';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
});

export const supabaseApi = {
  // Inventory
  async getInventory(userId = 'usr-krishan') {
    if (!isSupabaseConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory?user_id=eq.${userId}&select=*`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async upsertProduct(product, userId = 'usr-krishan') {
    if (!isSupabaseConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({
        id: product.id,
        user_id: userId,
        sku: product.sku,
        name: product.name,
        style_category: product.styleCategory,
        color: product.color,
        category: product.category,
        brand: product.brand,
        cost_price: product.costPrice || 0,
        selling_price: product.sellingPrice || 0,
        sizes: product.sizes || {},
        display_size: product.displaySize || null,
        image_url: product.imageUrl || null,
        updated_at: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Sales
  async getSales(userId = 'usr-krishan') {
    if (!isSupabaseConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales?user_id=eq.${userId}&order=timestamp.desc&select=*`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async insertSale(sale, userId = 'usr-krishan') {
    if (!isSupabaseConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id: sale.id,
        user_id: userId,
        product_id: sale.productId,
        sku: sale.sku,
        product_name: sale.productName,
        style_category: sale.styleCategory,
        color: sale.color,
        size: sale.size,
        quantity: sale.quantity || 1,
        unit_price: sale.unitPrice || 0,
        total_amount: sale.totalAmount || 0,
        payment_mode: sale.paymentMode || 'Cash',
        customer_name: sale.customerName || '',
        timestamp: sale.timestamp || new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteSale(saleId) {
    if (!isSupabaseConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales?id=eq.${saleId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  }
};
