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

  async deleteProduct(productId, userId = 'usr-krishan') {
    if (!isSupabaseConfigured()) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory?id=eq.${productId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) {
        console.warn('Supabase deleteProduct error:', await res.text());
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase deleteProduct exception:', e);
      return false;
    }
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

  async updateSale(saleId, updates) {
    if (!isSupabaseConfigured()) return null;
    const body = {};
    if (updates.quantity !== undefined) body.quantity = Number(updates.quantity) || 1;
    if (updates.unitPrice !== undefined) body.unit_price = Number(updates.unitPrice) || 0;
    if (updates.totalAmount !== undefined) body.total_amount = Number(updates.totalAmount) || 0;
    if (updates.paymentMode !== undefined) body.payment_mode = updates.paymentMode;
    if (updates.customerName !== undefined) body.customer_name = updates.customerName;
    if (updates.timestamp !== undefined) body.timestamp = updates.timestamp;
    if (updates.size !== undefined) body.size = String(updates.size);
    if (updates.color !== undefined) body.color = updates.color;
    if (updates.sku !== undefined) body.sku = updates.sku;
    if (updates.productName !== undefined) body.product_name = updates.productName;
    if (updates.styleCategory !== undefined) body.style_category = updates.styleCategory;
    if (updates.productId !== undefined) body.product_id = updates.productId;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sales?id=eq.${saleId}`, {
        method: 'PATCH',
        headers: {
          ...getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        console.warn('Supabase updateSale warning:', await res.text());
        return null;
      }
      return res.json();
    } catch (e) {
      console.warn('Supabase updateSale exception:', e);
      return null;
    }
  },

  async deleteSale(saleId) {
    if (!isSupabaseConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales?id=eq.${saleId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  async insertWarehouseSend(record, userId = 'usr-krishan') {
    if (!isSupabaseConfigured()) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/warehouse_sends`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: record.id,
          user_id: userId,
          product_id: record.productId,
          sku: record.sku,
          product_name: record.productName,
          style_category: record.styleCategory,
          dispatch_no: record.dispatchNo,
          destination: record.destination,
          reason: record.reason,
          notes: record.notes,
          sent_items: record.sentItems,
          total_count: record.totalCount,
          timestamp: record.timestamp || new Date().toISOString()
        })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Optional logging table in Supabase
    }
    return null;
  }
};

