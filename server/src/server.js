import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import {
  getAllCategories,
  addCategory,
  deleteCategory,
  getSizesMap,
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  setDisplaySize,
  deleteProduct,
  adjustStock,
  recordSale,
  updateSale,
  revertSale,
  getAllSales,
  addReplenishment,
  bulkReplenish,
  getAllReplenishments,
  sendToWarehouse,
  updateWarehouseSend,
  getAllWarehouseSends,
  getStats
} from './db.js';
import { 
  registerUser, 
  loginUser, 
  getUserByToken, 
  getUserById 
} from './auth.js';
import { getLocalIpAddress } from './network.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/products', express.static(path.join(__dirname, '../../client/public/products')));

const PORT = process.env.PORT || 5000;
let connectedDevicesCount = 0;

function extractUserId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = getUserByToken(token);
    if (user) return user.id;
  }
  if (req.headers['x-user-id']) {
    return req.headers['x-user-id'];
  }
  return 'usr-krishan';
}

function broadcastUpdates(eventType, payload, userId = 'usr-krishan') {
  io.to(`user:${userId}`).emit(eventType, payload);
  io.to(`user:${userId}`).emit('stats:updated', getStats(userId));
}

// ---------------- AUTH ROUTES ----------------

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;
    const result = registerUser(username, password);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const result = loginUser(username, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const userId = extractUserId(req);
  const user = getUserById(userId) || { id: 'usr-krishan', username: 'Krishan' };
  res.json({ user });
});

// ---------------- REST API ----------------

// System Info
app.get('/api/info', (req, res) => {
  const localIp = getLocalIpAddress();
  const userId = extractUserId(req);
  res.json({
    appName: "KY INVENTORY",
    localIp,
    port: PORT,
    clientPort: 5173,
    mobileUrl: `http://${localIp}:5173`,
    connectedDevices: connectedDevicesCount,
    categories: getAllCategories(userId),
    sizesMap: getSizesMap(userId)
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  const userId = extractUserId(req);
  res.json(getAllCategories(userId));
});

app.post('/api/categories', (req, res) => {
  const userId = extractUserId(req);
  try {
    const newCategory = addCategory(userId, req.body);
    broadcastUpdates('category:added', {
      category: newCategory,
      allCategories: getAllCategories(userId),
      sizesMap: getSizesMap(userId)
    }, userId);
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const userId = extractUserId(req);
  try {
    const success = deleteCategory(userId, req.params.id);
    if (!success) return res.status(404).json({ error: 'Category not found' });
    broadcastUpdates('category:deleted', {
      id: req.params.id,
      allCategories: getAllCategories(userId),
      sizesMap: getSizesMap(userId)
    }, userId);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Inventory
app.get('/api/inventory', (req, res) => {
  const userId = extractUserId(req);
  res.json(getAllProducts(userId));
});

app.post('/api/inventory', (req, res) => {
  const userId = extractUserId(req);
  try {
    const product = addProduct(userId, req.body);
    broadcastUpdates('product:added', product, userId);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  const userId = extractUserId(req);
  try {
    const updated = updateProduct(userId, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    broadcastUpdates('product:updated', updated, userId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Set Display Piece
app.post('/api/inventory/:id/display', (req, res) => {
  const userId = extractUserId(req);
  try {
    const updated = setDisplaySize(userId, req.params.id, req.body.displaySize || '');
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    broadcastUpdates('product:updated', updated, userId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  const userId = extractUserId(req);
  const success = deleteProduct(userId, req.params.id);
  if (!success) return res.status(404).json({ error: 'Product not found' });
  broadcastUpdates('product:deleted', { id: req.params.id }, userId);
  res.json({ success: true, id: req.params.id });
});

// Stock Adjust
app.post('/api/inventory/:id/stock', (req, res) => {
  const userId = extractUserId(req);
  const { sizeKey, delta } = req.body;
  if (!sizeKey || delta === undefined) {
    return res.status(400).json({ error: 'sizeKey and delta are required' });
  }
  const result = adjustStock(userId, req.params.id, sizeKey, Number(delta));
  if (!result) return res.status(404).json({ error: 'Product not found' });

  broadcastUpdates('stock:adjusted', {
    productId: req.params.id,
    sizeKey,
    newQty: result.newQty,
    product: result.product
  }, userId);
  res.json(result);
});

// Replenishment (Received Stock)
app.get('/api/replenishment', (req, res) => {
  const userId = extractUserId(req);
  res.json(getAllReplenishments(userId));
});

app.post('/api/replenishment', (req, res) => {
  const userId = extractUserId(req);
  try {
    const result = addReplenishment(userId, req.body);
    broadcastUpdates('replenishment:recorded', result, userId);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/replenishment/bulk', (req, res) => {
  const userId = extractUserId(req);
  try {
    const result = bulkReplenish(userId, req.body);
    io.to(`user:${userId}`).emit('inventory:updated_all', getAllProducts(userId));
    broadcastUpdates('replenishment:bulk_recorded', result, userId);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stock Send to Warehouse
app.get('/api/warehouse', (req, res) => {
  const userId = extractUserId(req);
  res.json(getAllWarehouseSends(userId));
});

app.post('/api/warehouse', (req, res) => {
  const userId = extractUserId(req);
  try {
    const result = sendToWarehouse(userId, req.body);
    broadcastUpdates('warehouse:sent', result, userId);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/warehouse/:id', (req, res) => {
  const userId = extractUserId(req);
  try {
    const result = updateWarehouseSend(userId, req.params.id, req.body);
    broadcastUpdates('warehouse:updated', result, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sales & Billing
app.get('/api/sales', (req, res) => {
  const userId = extractUserId(req);
  res.json(getAllSales(userId));
});

app.post('/api/sales', (req, res) => {
  const userId = extractUserId(req);
  try {
    const { sale, updatedProduct } = recordSale(userId, req.body);
    broadcastUpdates('sale:recorded', { sale, updatedProduct }, userId);
    res.status(201).json({ sale, updatedProduct });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/sales/:id', (req, res) => {
  const userId = extractUserId(req);
  try {
    const { updatedSale, affectedProducts } = updateSale(userId, req.params.id, req.body);
    broadcastUpdates('sale:updated', { updatedSale, affectedProducts }, userId);
    res.json({ updatedSale, affectedProducts });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  const userId = extractUserId(req);
  try {
    const result = revertSale(userId, req.params.id);
    broadcastUpdates('sale:reverted', result, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// Supabase Cloud Sync
app.post('/api/sync/supabase', async (req, res) => {
  const userId = extractUserId(req);
  const supabaseUrl = process.env.SUPABASE_URL || 'https://pztpvqxadtjdtbkjdsai.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  try {
    const products = getAllProducts(userId);
    const formatted = products.map(p => ({
      id: p.id,
      user_id: userId,
      sku: p.sku,
      name: p.name,
      style_category: p.styleCategory || null,
      color: p.color || null,
      category: p.category || 'women_footwear',
      brand: p.brand || 'Saint G',
      cost_price: Number(p.costPrice || 0),
      selling_price: Number(p.sellingPrice || 0),
      sizes: p.sizes || {},
      display_size: p.displaySize || null,
      image_url: p.imageUrl || null,
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: p.updatedAt || new Date().toISOString()
    }));

    const chunkSize = 50;
    for (let i = 0; i < formatted.length; i += chunkSize) {
      const chunk = formatted.slice(i, i + chunkSize);
      const r = await fetch(`${supabaseUrl}/rest/v1/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(chunk)
      });
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(errText);
      }
    }

    res.json({ success: true, count: products.length, message: `Successfully synced ${products.length} items to Supabase!` });
  } catch (err) {
    res.status(500).json({ error: 'Supabase sync failed: ' + err.message });
  }
});

// Google Sheets Webhook Sync Proxy
app.post('/api/sync/googlesheet', async (req, res) => {
  const userId = extractUserId(req);
  const { webhookUrl, payload } = req.body;
  if (!webhookUrl || !webhookUrl.trim()) {
    return res.status(400).json({ error: 'webhookUrl is required' });
  }

  try {
    const cleanPayload = payload || {
      appName: 'KY INVENTORY',
      targetSpreadsheetId: '1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE',
      syncedAt: new Date().toISOString(),
      inventory: getAllProducts(userId),
      sales: getAllSales(userId),
      warehouseSends: getAllWarehouseSends(userId),
      replenishments: getAllReplenishments(userId),
      stats: getStats(userId)
    };

    if (!cleanPayload.sales || cleanPayload.sales.length === 0) {
      cleanPayload.sales = [{
        id: 'placeholder-sale',
        sku: 'NO SALES RECORDED YET',
        color: '-',
        size: '-',
        quantity: 0,
        status: 'RECEIVED',
        timestamp: new Date().toISOString()
      }];
    }

    console.log(`[GoogleSheetSync] Sending ${cleanPayload.inventory?.length || 0} products & ${cleanPayload.sales?.length || 0} sales to Google Sheet...`);

    const gRes = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cleanPayload),
      redirect: 'follow'
    });

    const text = await gRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`[GoogleSheetSync] Success! Status: ${gRes.status}, Response:`, JSON.stringify(data).slice(0, 150));
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[GoogleSheetSync] Sync Error:', err);
    res.status(500).json({ error: 'Failed to update Google Sheet: ' + err.message });
  }
});

// Stats
app.get('/api/stats', (req, res) => {
  const userId = extractUserId(req);
  res.json(getStats(userId));
});

// ---------------- Real-time Socket.IO ----------------
io.on('connection', (socket) => {
  connectedDevicesCount++;
  io.emit('devices:count', connectedDevicesCount);

  // Authenticate socket on handshake
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  const user = getUserByToken(token) || { id: 'usr-krishan', username: 'Krishan' };
  socket.userId = user.id;
  socket.join(`user:${socket.userId}`);

  socket.emit('init:data', {
    appName: "KY INVENTORY",
    user: { id: user.id, username: user.username },
    inventory: getAllProducts(socket.userId),
    categories: getAllCategories(socket.userId),
    sizesMap: getSizesMap(socket.userId),
    sales: getAllSales(socket.userId),
    replenishments: getAllReplenishments(socket.userId),
    warehouseSends: getAllWarehouseSends(socket.userId),
    stats: getStats(socket.userId),
    localIp: getLocalIpAddress()
  });

  socket.on('auth:authenticate', ({ token: authToken }, callback) => {
    const authedUser = getUserByToken(authToken);
    if (authedUser) {
      socket.leave(`user:${socket.userId}`);
      socket.userId = authedUser.id;
      socket.join(`user:${socket.userId}`);

      const initData = {
        user: authedUser,
        inventory: getAllProducts(socket.userId),
        categories: getAllCategories(socket.userId),
        sizesMap: getSizesMap(socket.userId),
        sales: getAllSales(socket.userId),
        replenishments: getAllReplenishments(socket.userId),
        warehouseSends: getAllWarehouseSends(socket.userId),
        stats: getStats(socket.userId)
      };

      if (typeof callback === 'function') callback({ success: true, ...initData });
      socket.emit('init:data', {
        appName: "KY INVENTORY",
        ...initData,
        localIp: getLocalIpAddress()
      });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Invalid token' });
    }
  });

  socket.on('stock:adjust', ({ productId, sizeKey, delta }, callback) => {
    const result = adjustStock(socket.userId, productId, sizeKey, delta);
    if (result) {
      broadcastUpdates('stock:adjusted', {
        productId,
        sizeKey,
        newQty: result.newQty,
        product: result.product
      }, socket.userId);
      if (typeof callback === 'function') callback({ success: true, ...result });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Product not found' });
    }
  });

  socket.on('display:update', ({ productId, displaySize }, callback) => {
    const updated = setDisplaySize(socket.userId, productId, displaySize || '');
    if (updated) {
      broadcastUpdates('product:updated', updated, socket.userId);
      if (typeof callback === 'function') callback({ success: true, product: updated });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Product not found' });
    }
  });

  socket.on('product:create', (data, callback) => {
    try {
      const product = addProduct(socket.userId, data);
      broadcastUpdates('product:added', product, socket.userId);
      if (typeof callback === 'function') callback({ success: true, product });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('product:update', ({ id, updates }, callback) => {
    try {
      const updated = updateProduct(socket.userId, id, updates);
      if (!updated) return callback?.({ success: false, error: 'Product not found' });
      broadcastUpdates('product:updated', updated, socket.userId);
      if (typeof callback === 'function') callback({ success: true, product: updated });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('product:delete', ({ id }, callback) => {
    const success = deleteProduct(socket.userId, id);
    if (success) {
      broadcastUpdates('product:deleted', { id }, socket.userId);
      if (typeof callback === 'function') callback({ success: true });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Product not found' });
    }
  });

  socket.on('replenishment:add', (data, callback) => {
    try {
      const result = addReplenishment(socket.userId, data);
      broadcastUpdates('replenishment:recorded', result, socket.userId);
      if (typeof callback === 'function') callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('replenishment:bulk', (data, callback) => {
    try {
      const result = bulkReplenish(socket.userId, data);
      io.to(`user:${socket.userId}`).emit('inventory:updated_all', getAllProducts(socket.userId));
      broadcastUpdates('replenishment:bulk_recorded', result, socket.userId);
      if (typeof callback === 'function') callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('warehouse:send', (data, callback) => {
    try {
      const result = sendToWarehouse(socket.userId, data);
      broadcastUpdates('warehouse:sent', result, socket.userId);
      if (typeof callback === 'function') callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('warehouse:update', ({ id, updates }, callback) => {
    try {
      const result = updateWarehouseSend(socket.userId, id, updates);
      broadcastUpdates('warehouse:updated', result, socket.userId);
      if (typeof callback === 'function') callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('sale:record', (data, callback) => {
    try {
      const { sale, updatedProduct } = recordSale(socket.userId, data);
      broadcastUpdates('sale:recorded', { sale, updatedProduct }, socket.userId);
      if (typeof callback === 'function') callback({ success: true, sale, updatedProduct });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('sale:update', ({ id, updates }, callback) => {
    try {
      const { updatedSale, affectedProducts } = updateSale(socket.userId, id, updates);
      broadcastUpdates('sale:updated', { updatedSale, affectedProducts }, socket.userId);
      if (typeof callback === 'function') callback({ success: true, updatedSale, affectedProducts });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('sale:revert', ({ saleId }, callback) => {
    try {
      const result = revertSale(socket.userId, saleId);
      broadcastUpdates('sale:reverted', result, socket.userId);
      if (typeof callback === 'function') callback({ success: true, result });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('category:add', (data, callback) => {
    try {
      const newCat = addCategory(socket.userId, data);
      broadcastUpdates('category:added', {
        category: newCat,
        allCategories: getAllCategories(socket.userId),
        sizesMap: getSizesMap(socket.userId)
      }, socket.userId);
      if (typeof callback === 'function') callback({ success: true, category: newCat });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('category:delete', ({ id }, callback) => {
    try {
      const success = deleteCategory(socket.userId, id);
      if (success) {
        broadcastUpdates('category:deleted', {
          id,
          allCategories: getAllCategories(socket.userId),
          sizesMap: getSizesMap(socket.userId)
        }, socket.userId);
        if (typeof callback === 'function') callback({ success: true });
      }
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    connectedDevicesCount = Math.max(0, connectedDevicesCount - 1);
    io.emit('devices:count', connectedDevicesCount);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`👑 KY INVENTORY - Multi-Tenant Online!`);
  console.log(`💻 Local (PC):    http://localhost:${PORT}`);
  console.log(`📱 Phone Network: http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);
});
