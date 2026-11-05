import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { supabaseApi, isSupabaseConfigured } from '../utils/supabase';

const InventoryContext = createContext(null);

function playTone(freq = 600, type = 'sine', duration = 0.08) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio permission errors
  }
}

export function InventoryProvider({ children }) {
  // Authentication & Multi-Tenant state
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('ky_token') || 'ky-token-usr-krishan-default');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ky_user');
      if (stored) return JSON.parse(stored);
      const defaultUser = { id: 'usr-krishan', username: 'Krishan', displayName: 'Krishan', role: 'store_owner' };
      localStorage.setItem('ky_user', JSON.stringify(defaultUser));
      localStorage.setItem('ky_token', 'ky-token-usr-krishan-default');
      return defaultUser;
    } catch {
      return { id: 'usr-krishan', username: 'Krishan', displayName: 'Krishan', role: 'store_owner' };
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Tabs: 'dashboard' | 'inventory' | 'sold' | 'replenishment' | 'warehouse' | 'history' | 'settings'
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [replenishments, setReplenishments] = useState([]);
  const [warehouseSends, setWarehouseSends] = useState([]);
  
  const [categories, setCategories] = useState([
    { id: 'women_footwear', label: 'Women Footwear', sizes: ['35', '36', '37', '38', '39', '40', '41'], icon: '👠', order: 1 },
    { id: 'men_footwear', label: 'Mens Footwear', sizes: ['40', '41', '42', '43', '44', '45'], icon: '👟', order: 2 },
    { id: 'men_jacket', label: 'Mens Jacket', sizes: ['S', 'M', 'L', 'XL', 'XXL'], icon: '🧥', order: 3 },
    { id: 'women_jacket', label: 'Women Jacket', sizes: ['S', 'M', 'L', 'XL', 'XXL'], icon: '🧥', order: 4 },
    { id: 'bags', label: 'Bags', sizes: ['Standard'], icon: '👜', order: 5 },
    { id: 'apparels', label: 'Apparels', sizes: ['Free Size'], icon: '👗', order: 6 },
    { id: 'sunglasses', label: 'Sunglasses', sizes: ['Standard'], icon: '🕶️', order: 7 }
  ]);

  const [sizesMap, setSizesMap] = useState({
    women_footwear: ['35', '36', '37', '38', '39', '40', '41'],
    men_footwear: ['40', '41', '42', '43', '44', '45'],
    men_jacket: ['S', 'M', 'L', 'XL', 'XXL'],
    women_jacket: ['S', 'M', 'L', 'XL', 'XXL'],
    bags: ['Standard'],
    apparels: ['Free Size'],
    sunglasses: ['Standard']
  });

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockCount: 0,
    totalRetailValue: 0,
    footwearLowAlertCount: 0,
    footwearAlertItems: [],
    todaySalesCount: 0,
    todayItemsSold: 0,
    todayRevenue: 0,
    yesterdaySalesCount: 0,
    yesterdayItemsSold: 0,
    yesterdayRevenue: 0,
    monthSalesCount: 0,
    monthItemsSold: 0,
    monthRevenue: 0,
    monthAverageDailyRevenue: 0,
    categoriesCount: 5
  });

  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState(1);
  const [localIp, setLocalIp] = useState(window.location.hostname || 'localhost');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [socket, setSocket] = useState(null);

  // Theme Management: 'dark' | 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('ky_theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('ky_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = authToken || localStorage.getItem('ky_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }, [authToken]);

  // Fetch all data for the active user via HTTP
  const fetchUserData = useCallback(async (tokenOverride, userIdOverride) => {
    const host = window.location.hostname;
    const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
    const token = tokenOverride || authToken || localStorage.getItem('ky_token') || '';
    const targetUserId = userIdOverride || currentUser?.id || 'usr-krishan';
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const fetchJson = async (endpoint, fallback) => {
      try {
        const r = await fetch(`${apiUrl}${endpoint}`, { headers });
        const ct = r.headers.get('content-type') || '';
        if (!r.ok || !ct.includes('application/json')) return fallback;
        return await r.json();
      } catch {
        return fallback;
      }
    };

    try {
      const [infoRes, invRes, statsRes, salesRes, repRes, whRes] = await Promise.all([
        fetchJson('/api/info', {}),
        fetchJson('/api/inventory', []),
        fetchJson('/api/stats', null),
        fetchJson('/api/sales', []),
        fetchJson('/api/replenishment', []),
        fetchJson('/api/warehouse', [])
      ]);

      if (infoRes.localIp) setLocalIp(infoRes.localIp);
      if (infoRes.categories) setCategories(infoRes.categories);
      if (infoRes.sizesMap) setSizesMap(infoRes.sizesMap);

      if (Array.isArray(invRes) && invRes.length > 0) {
        setInventory(invRes);
      } else if (isSupabaseConfigured()) {
        try {
          const cloudItems = await supabaseApi.getInventory(targetUserId);
          if (Array.isArray(cloudItems) && cloudItems.length > 0) {
            const mapped = cloudItems.map(item => ({
              id: item.id,
              userId: item.user_id,
              sku: item.sku,
              name: item.name,
              styleCategory: item.style_category,
              color: item.color,
              category: item.category,
              brand: item.brand,
              costPrice: Number(item.cost_price) || 0,
              sellingPrice: Number(item.selling_price) || 0,
              sizes: typeof item.sizes === 'string' ? JSON.parse(item.sizes) : (item.sizes || {}),
              displaySize: item.display_size,
              imageUrl: item.image_url,
              createdAt: item.created_at,
              updatedAt: item.updated_at
            }));
            setInventory(mapped);
          }
        } catch (sErr) {
          console.warn('Supabase fallback inventory error:', sErr);
        }
      }

      if (statsRes && !statsRes.error) setStats(statsRes);

      if (Array.isArray(salesRes) && salesRes.length > 0) {
        setSales(salesRes);
      } else if (isSupabaseConfigured()) {
        try {
          const cloudSales = await supabaseApi.getSales(targetUserId);
          if (Array.isArray(cloudSales) && cloudSales.length > 0) {
            const mappedSales = cloudSales.map(s => ({
              id: s.id,
              userId: s.user_id,
              productId: s.product_id,
              sku: s.sku,
              productName: s.product_name,
              styleCategory: s.style_category,
              color: s.color,
              size: s.size,
              quantity: Number(s.quantity) || 1,
              unitPrice: Number(s.unit_price) || 0,
              totalAmount: Number(s.total_amount) || 0,
              paymentMode: s.payment_mode || 'Cash',
              customerName: s.customer_name || '',
              timestamp: s.timestamp
            }));
            setSales(mappedSales);
          }
        } catch (sErr) {
          console.warn('Supabase fallback sales error:', sErr);
        }
      }

      if (Array.isArray(repRes) && repRes.length > 0) {
        setReplenishments(repRes);
      } else if (isSupabaseConfigured()) {
        try {
          const cloudReps = await supabaseApi.getReplenishments(targetUserId);
          if (Array.isArray(cloudReps) && cloudReps.length > 0) {
            const mappedReps = cloudReps.map(r => ({
              id: r.id,
              userId: r.user_id,
              invoiceNo: r.invoice_no,
              supplier: r.supplier,
              notes: r.notes,
              totalCount: Number(r.total_count) || 0,
              items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
              timestamp: r.timestamp
            }));
            setReplenishments(mappedReps);
          }
        } catch (sErr) {
          console.warn('Supabase fallback replenishments error:', sErr);
        }
      }

      if (Array.isArray(whRes) && whRes.length > 0) {
        setWarehouseSends(whRes);
      } else if (isSupabaseConfigured()) {
        try {
          const cloudWh = await supabaseApi.getWarehouseSends(targetUserId);
          if (Array.isArray(cloudWh) && cloudWh.length > 0) {
            const mappedWh = cloudWh.map(w => ({
              id: w.id,
              userId: w.user_id,
              dispatchNo: w.dispatch_no,
              destination: w.destination,
              reason: w.reason,
              notes: w.notes,
              totalCount: Number(w.total_count) || 0,
              sentItems: typeof w.sent_items === 'string' ? JSON.parse(w.sent_items) : (w.sent_items || {}),
              timestamp: w.timestamp
            }));
            setWarehouseSends(mappedWh);
          }
        } catch (sErr) {
          console.warn('Supabase fallback warehouse sends error:', sErr);
        }
      }
    } catch (e) {
      console.error('Failed to fetch user data:', e);
    }
  }, [authToken, currentUser]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const host = window.location.hostname;
    const socketUrl = window.location.port === '5173' 
      ? `http://${host}:5000` 
      : window.location.origin;

    const token = localStorage.getItem('ky_token') || '';

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('⚡ Connected to KY INVENTORY Server!');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('devices:count', (count) => {
      setConnectedDevices(count);
    });

    newSocket.on('init:data', (data) => {
      if (data.user && !currentUser) {
        setCurrentUser(data.user);
      }
      if (data.inventory) setInventory(data.inventory);
      if (data.categories) setCategories(data.categories);
      if (data.sizesMap) setSizesMap(data.sizesMap);
      if (data.sales) setSales(data.sales);
      if (data.replenishments) setReplenishments(data.replenishments);
      if (data.warehouseSends) setWarehouseSends(data.warehouseSends);
      if (data.stats) setStats(data.stats);
      if (data.localIp) setLocalIp(data.localIp);
    });

    newSocket.on('inventory:updated_all', (all) => {
      if (Array.isArray(all)) setInventory(all);
    });

    newSocket.on('stock:adjusted', ({ productId, sizeKey, newQty, product }) => {
      setInventory(prev => prev.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            sizes: {
              ...(p.sizes || {}),
              [sizeKey]: newQty
            },
            updatedAt: product?.updatedAt || new Date().toISOString()
          };
        }
        return p;
      }));
    });

    newSocket.on('product:added', (newProduct) => {
      setInventory(prev => [newProduct, ...prev.filter(p => p.id !== newProduct.id)]);
      playTone(850, 'sine', 0.1);
    });

    newSocket.on('product:updated', (updated) => {
      setInventory(prev => prev.map(p => p.id === updated.id ? updated : p));
    });

    newSocket.on('product:deleted', ({ id }) => {
      setInventory(prev => prev.filter(p => p.id !== id));
    });

    newSocket.on('replenishment:recorded', ({ record, updatedProduct }) => {
      if (updatedProduct) {
        setInventory(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      }
      setReplenishments(prev => [record, ...prev]);
      playTone(650, 'triangle', 0.12);
    });

    newSocket.on('replenishment:bulk_recorded', ({ bulkRecord }) => {
      setReplenishments(prev => [bulkRecord, ...prev]);
      playTone(650, 'triangle', 0.2);
    });

    newSocket.on('warehouse:sent', ({ record, updatedProduct }) => {
      if (updatedProduct) {
        setInventory(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      }
      setWarehouseSends(prev => [record, ...prev]);
      playTone(520, 'sine', 0.15);
    });

    newSocket.on('warehouse:updated', ({ updatedRecord, updatedProduct }) => {
      if (updatedProduct) {
        setInventory(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      }
      setWarehouseSends(prev => prev.map(w => w.id === updatedRecord.id ? updatedRecord : w));
      playTone(600, 'sine', 0.1);
    });

    newSocket.on('sale:recorded', ({ sale, updatedProduct }) => {
      if (updatedProduct) {
        setInventory(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      }
      setSales(prev => [sale, ...prev]);
      playTone(950, 'triangle', 0.15);
    });

    newSocket.on('sale:updated', ({ updatedSale, affectedProducts }) => {
      if (Array.isArray(affectedProducts)) {
        setInventory(prev => prev.map(p => {
          const found = affectedProducts.find(ap => ap.id === p.id);
          return found || p;
        }));
      }
      setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
      playTone(600, 'sine', 0.1);
    });

    newSocket.on('sale:reverted', ({ saleId, restoredProduct }) => {
      if (restoredProduct) {
        setInventory(prev => prev.map(p => p.id === restoredProduct.id ? restoredProduct : p));
      }
      setSales(prev => prev.filter(s => s.id !== saleId));
    });

    newSocket.on('category:added', ({ allCategories, sizesMap }) => {
      if (allCategories) setCategories(allCategories);
      if (sizesMap) setSizesMap(sizesMap);
    });

    newSocket.on('category:deleted', ({ allCategories, sizesMap }) => {
      if (allCategories) setCategories(allCategories);
      if (sizesMap) setSizesMap(sizesMap);
    });

    newSocket.on('stats:updated', (newStats) => {
      setStats(newStats);
    });

    setSocket(newSocket);

    // Initial fallback fetch
    fetchUserData(token);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Authentication API Methods (With Netlify & Cloud direct fallback)
  const login = useCallback(async (username, password) => {
    const host = window.location.hostname;
    const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';

    let data = null;
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      }
    } catch {
      data = null;
    }

    if (data && data.token && data.user) {
      localStorage.setItem('ky_token', data.token);
      localStorage.setItem('ky_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsLoginModalOpen(false);

      if (socket && socket.connected) {
        socket.emit('auth:authenticate', { token: data.token });
      }

      await fetchUserData(data.token, data.user.id);
      return data.user;
    }

    // Cloud / Netlify Standalone Fallback
    const normalizedUser = username.trim();
    const userId = normalizedUser.toLowerCase() === 'krishan'
      ? 'usr-krishan'
      : `usr-${normalizedUser.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const mockToken = `ky-token-${userId}-${Date.now()}`;
    const userObj = {
      id: userId,
      username: normalizedUser,
      displayName: normalizedUser,
      role: 'store_owner'
    };

    localStorage.setItem('ky_token', mockToken);
    localStorage.setItem('ky_user', JSON.stringify(userObj));
    setAuthToken(mockToken);
    setCurrentUser(userObj);
    setIsLoginModalOpen(false);

    await fetchUserData(mockToken, userId);
    return userObj;
  }, [socket, fetchUserData]);

  const register = useCallback(async (username, password) => {
    const host = window.location.hostname;
    const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';

    let data = null;
    try {
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      }
    } catch {
      data = null;
    }

    if (data && data.token && data.user) {
      localStorage.setItem('ky_token', data.token);
      localStorage.setItem('ky_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsLoginModalOpen(false);

      if (socket && socket.connected) {
        socket.emit('auth:authenticate', { token: data.token });
      }

      await fetchUserData(data.token, data.user.id);
      return data.user;
    }

    const normalizedUser = username.trim();
    const userId = `usr-${normalizedUser.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const mockToken = `ky-token-${userId}-${Date.now()}`;
    const userObj = {
      id: userId,
      username: normalizedUser,
      displayName: normalizedUser,
      role: 'store_owner'
    };

    localStorage.setItem('ky_token', mockToken);
    localStorage.setItem('ky_user', JSON.stringify(userObj));
    setAuthToken(mockToken);
    setCurrentUser(userObj);
    setIsLoginModalOpen(false);

    await fetchUserData(mockToken, userId);
    return userObj;
  }, [socket, fetchUserData]);

  const logout = useCallback(() => {
    localStorage.removeItem('ky_token');
    localStorage.removeItem('ky_user');
    setAuthToken('');
    setCurrentUser(null);
    setInventory([]);
    setSales([]);
    setReplenishments([]);
    setWarehouseSends([]);
    setStats({
      totalProducts: 0,
      totalStockCount: 0,
      totalRetailValue: 0,
      footwearLowAlertCount: 0,
      footwearAlertItems: [],
      todaySalesCount: 0,
      todayItemsSold: 0,
      todayRevenue: 0,
      categoriesCount: 5
    });
    if (socket && socket.connected) {
      socket.emit('auth:authenticate', { token: '' });
    }
    setIsLoginModalOpen(true);
  }, [socket]);

  // Stock Adjustment (+1 / -1) with OPTIMISTIC 0ms UI
  const adjustStock = useCallback((productId, sizeKey, delta) => {
    playTone(delta > 0 ? 700 : 450, 'sine', 0.05);

    let updatedTarget = null;
    setInventory(prev => prev.map(product => {
      if (product.id === productId) {
        const cur = Number(product.sizes?.[sizeKey] || 0);
        const next = Math.max(0, cur + delta);
        updatedTarget = {
          ...product,
          sizes: {
            ...(product.sizes || {}),
            [sizeKey]: next
          },
          updatedAt: new Date().toISOString()
        };
        return updatedTarget;
      }
      return product;
    }));

    if (socket && socket.connected) {
      socket.emit('stock:adjust', { productId, sizeKey, delta });
    } else {
      const host = window.location.hostname;
      const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
      fetch(`${apiUrl}/api/inventory/${productId}/stock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sizeKey, delta })
      }).catch(async (err) => {
        if (updatedTarget && isSupabaseConfigured()) {
          try {
            await supabaseApi.upsertProduct(updatedTarget, 'usr-krishan');
          } catch (e) {
            console.warn('Supabase stock update error:', e);
          }
        }
      });
    }
  }, [socket, getAuthHeaders]);

  // Update Display Size
  const updateDisplaySize = useCallback((productId, displaySize) => {
    let updatedTarget = null;
    setInventory(prev => prev.map(p => {
      if (p.id === productId) {
        updatedTarget = { ...p, displaySize, updatedAt: new Date().toISOString() };
        return updatedTarget;
      }
      return p;
    }));
    if (socket && socket.connected) {
      socket.emit('display:update', { productId, displaySize });
    } else {
      const host = window.location.hostname;
      const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
      fetch(`${apiUrl}/api/inventory/${productId}/display`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ displaySize })
      }).catch(async () => {
        if (updatedTarget && isSupabaseConfigured()) {
          try {
            await supabaseApi.upsertProduct(updatedTarget, 'usr-krishan');
          } catch (e) {}
        }
      });
    }
  }, [socket, getAuthHeaders]);

  // Product CRUD
  const addProduct = useCallback(async (productData) => {
    const localId = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newProduct = {
      id: localId,
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (socket && socket.connected) {
      return new Promise((resolve, reject) => {
        socket.emit('product:create', productData, async (res) => {
          if (res?.success) {
            if (isSupabaseConfigured()) {
              supabaseApi.upsertProduct(res.product, 'usr-krishan').catch(() => {});
            }
            resolve(res.product);
          } else {
            reject(new Error(res?.error || 'Failed to add product'));
          }
        });
      });
    }

    const host = window.location.hostname;
    const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
    let serverProduct = null;

    try {
      const res = await fetch(`${apiUrl}/api/inventory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData)
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        if (res.ok && !json.error) serverProduct = json;
      }
    } catch {}

    const finalProduct = serverProduct || newProduct;

    if (isSupabaseConfigured()) {
      try {
        await supabaseApi.upsertProduct(finalProduct, 'usr-krishan');
      } catch (e) {
        console.warn('Supabase addProduct error:', e);
      }
    }

    setInventory(prev => [finalProduct, ...prev]);
    playTone(800, 'sine', 0.1);
    return finalProduct;
  }, [socket, getAuthHeaders, setInventory]);

  const updateProduct = useCallback(async (id, updates) => {
    // 1. Optimistic UI update immediately
    let updatedProduct = null;
    setInventory(prev => prev.map(p => {
      if (p.id === id) {
        updatedProduct = {
          ...p,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return updatedProduct;
      }
      return p;
    }));
    playTone(600, 'sine', 0.08);

    // 2. Sync to Supabase Cloud Database immediately
    if (isSupabaseConfigured() && updatedProduct) {
      try {
        await supabaseApi.upsertProduct(updatedProduct, 'usr-krishan');
      } catch (supErr) {
        console.warn('Supabase updateProduct warning:', supErr);
      }
    }

    // 3. Sync to Node Backend if available
    return new Promise((resolve) => {
      if (socket && socket.connected) {
        socket.emit('product:update', { id, updates }, (res) => {
          resolve(res?.product || updatedProduct);
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/inventory/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates)
        })
          .then(res => {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) return res.json();
            return updatedProduct;
          })
          .then(data => resolve(data && !data.error ? data : updatedProduct))
          .catch(() => resolve(updatedProduct));
      }
    });
  }, [socket, getAuthHeaders, setInventory]);

  const deleteProduct = useCallback(async (id) => {
    // 1. Immediately remove from local inventory state (0ms instant response)
    setInventory(prev => prev.filter(p => p.id !== id));
    playTone(350, 'sawtooth', 0.15);

    // 2. Sync deletion to Supabase Cloud Database
    if (isSupabaseConfigured()) {
      try {
        await supabaseApi.deleteProduct(id, 'usr-krishan');
      } catch (supErr) {
        console.warn('Supabase deleteProduct error:', supErr);
      }
    }

    // 3. Sync deletion to Node backend if connected
    return new Promise((resolve) => {
      if (socket && socket.connected) {
        socket.emit('product:delete', { id }, (res) => {
          resolve(true);
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/inventory/${id}`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
        })
          .then(() => resolve(true))
          .catch(() => resolve(true));
      }
    });
  }, [socket, getAuthHeaders, setInventory]);

  // Replenishment Actions
  const addReplenishment = useCallback(async (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const product = inventory.find(p => p.id === data.productId);
        if (!product) throw new Error('Product not found in catalog');

        let totalReceived = 0;
        const updatedSizes = { ...(product.sizes || {}) };
        const receivedDetails = {};

        Object.entries(data.sizeQuantities || {}).forEach(([size, qty]) => {
          const addQty = Math.max(0, parseInt(qty, 10) || 0);
          if (addQty > 0) {
            updatedSizes[size] = (Number(updatedSizes[size]) || 0) + addQty;
            totalReceived += addQty;
            receivedDetails[size] = addQty;
          }
        });

        if (totalReceived === 0) {
          throw new Error('Please specify at least 1 unit received');
        }

        const updatedProduct = {
          ...product,
          sizes: updatedSizes,
          updatedAt: new Date().toISOString()
        };

        const replenishmentRecord = {
          id: `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'replenishment',
          productId: product.id,
          productName: product.name,
          styleCategory: product.styleCategory || product.name,
          sku: product.sku,
          category: product.category,
          supplier: (data.supplier || '').trim() || 'Distributor / Factory',
          invoiceNo: (data.invoiceNo || '').trim() || 'N/A',
          notes: (data.notes || '').trim(),
          receivedItems: receivedDetails,
          totalCount: totalReceived,
          timestamp: new Date().toISOString()
        };

        if (socket && socket.connected) {
          socket.emit('replenishment:add', data, async (res) => {
            if (res?.success) {
              const finalProd = res.updatedProduct || updatedProduct;
              const finalRec = res.record || replenishmentRecord;
              if (isSupabaseConfigured()) {
                try {
                  await supabaseApi.upsertProduct(finalProd, 'usr-krishan');
                  await supabaseApi.insertReplenishment(finalRec, 'usr-krishan');
                } catch (e) {}
              }
              setInventory(prev => prev.map(p => p.id === product.id ? finalProd : p));
              setReplenishments(prev => [finalRec, ...prev]);
              playTone(750, 'triangle', 0.12);
              resolve(res);
            } else {
              reject(new Error(res?.error || 'Failed to add replenishment'));
            }
          });
          return;
        }

        // Offline / Netlify / Direct Supabase path
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        let serverResult = null;

        try {
          const res = await fetch(`${apiUrl}/api/replenishment`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
          });
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const json = await res.json();
            if (res.ok && !json.error) serverResult = json;
          }
        } catch {}

        const finalProduct = serverResult?.updatedProduct || updatedProduct;
        const finalRecord = serverResult?.record || replenishmentRecord;

        // Sync to Supabase Cloud Database
        if (isSupabaseConfigured()) {
          try {
            await supabaseApi.upsertProduct(finalProduct, 'usr-krishan');
            await supabaseApi.insertReplenishment(finalRecord, 'usr-krishan');
          } catch (supErr) {
            console.warn('Supabase replenishment sync error:', supErr);
          }
        }

        setInventory(prev => prev.map(p => p.id === product.id ? finalProduct : p));
        setReplenishments(prev => [finalRecord, ...prev]);
        playTone(750, 'triangle', 0.12);
        resolve(serverResult || { success: true, record: finalRecord, updatedProduct: finalProduct });
      } catch (err) {
        reject(err);
      }
    });
  }, [socket, getAuthHeaders, inventory, setInventory, setReplenishments]);

  const bulkReplenishStock = useCallback(async (bulkData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { items = [], billNo = '', supplier = '', date = '', notes = '' } = bulkData;
        if (!items || items.length === 0) {
          throw new Error('No items provided for replenishment');
        }

        // Calculate updates
        const updatedInventoryMap = new Map(inventory.map(p => [p.id, { ...p, sizes: { ...(p.sizes || {}) } }]));
        const updatedProductsList = [];
        const results = [];
        const matchedItems = [];
        const unmatchedItems = [];
        let totalIntakeCount = 0;

        for (const item of items) {
          const rawSku = (item.sku || item.ean || '').trim();
          const size = String(item.size || '').replace(/EU$/i, '').trim();
          const qty = Math.max(1, parseInt(item.qty || 1, 10));
          const articleName = (item.articleName || item.name || '').trim();
          const category = item.category || 'women_footwear';

          // Match by SKU in existing inventory
          let matched = null;
          for (const prod of updatedInventoryMap.values()) {
            if (prod.sku && (prod.sku.toLowerCase() === rawSku.toLowerCase() || rawSku.toLowerCase().startsWith(prod.sku.toLowerCase()))) {
              matched = prod;
              break;
            }
          }

          if (!matched) {
            unmatchedItems.push({
              sku: rawSku,
              size,
              qty,
              articleName: articleName || 'Not found in catalog'
            });

            const parts = rawSku.split('-');
            const extractedColor = parts.length > 2 ? parts[parts.length - 1] : 'Black';
            const newProd = {
              id: `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              name: articleName || rawSku,
              styleCategory: articleName || 'Standard Style',
              sku: rawSku,
              category,
              color: extractedColor,
              brand: 'Saint G',
              costPrice: 0,
              sellingPrice: 0,
              sizes: { [size]: qty },
              imageUrl: `/products/${rawSku.toUpperCase()}.png`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            updatedInventoryMap.set(newProd.id, newProd);
            matched = newProd;
            updatedProductsList.push(newProd);
          } else {
            matchedItems.push({
              sku: rawSku,
              size,
              qty,
              articleName: matched.styleCategory || matched.name
            });

            matched.sizes[size] = (Number(matched.sizes[size]) || 0) + qty;
            matched.updatedAt = new Date().toISOString();
            if (!updatedProductsList.some(p => p.id === matched.id)) {
              updatedProductsList.push(matched);
            }
          }

          results.push({
            sku: rawSku,
            articleName: articleName || matched.styleCategory || matched.name,
            size,
            qty,
            productId: matched.id
          });
          totalIntakeCount += qty;
        }

        const bulkRecord = {
          id: `rep-bulk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'replenishment',
          invoiceNo: (billNo || '').trim() || 'N/A',
          supplier: (supplier || '').trim() || 'Supplier',
          notes: (notes || '').trim(),
          totalCount: totalIntakeCount,
          items: results,
          timestamp: date ? new Date(date).toISOString() : new Date().toISOString()
        };

        if (socket && socket.connected) {
          socket.emit('replenishment:bulk', bulkData, async (res) => {
            if (res?.success) {
              const finalProds = res.updatedProducts || updatedProductsList;
              const finalRec = res.bulkRecord || bulkRecord;
              if (isSupabaseConfigured()) {
                try {
                  for (const p of finalProds) {
                    await supabaseApi.upsertProduct(p, 'usr-krishan');
                  }
                  await supabaseApi.insertReplenishment(finalRec, 'usr-krishan');
                } catch (e) {}
              }
              setInventory(Array.from(updatedInventoryMap.values()));
              setReplenishments(prev => [finalRec, ...prev]);
              playTone(880, 'triangle', 0.15);
              resolve({
                ...res,
                totalIntakeCount,
                matchedCount: matchedItems.length,
                matchedItems,
                unmatchedCount: unmatchedItems.length,
                unmatchedItems
              });
            } else {
              reject(new Error(res?.error || 'Bulk replenishment failed'));
            }
          });
          return;
        }

        // Offline / Netlify / Direct Supabase path
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        let serverResult = null;

        try {
          const res = await fetch(`${apiUrl}/api/replenishment/bulk`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(bulkData)
          });
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const json = await res.json();
            if (res.ok && !json.error) serverResult = json;
          }
        } catch {}

        const finalProducts = serverResult?.updatedProducts || updatedProductsList;
        const finalBulkRecord = serverResult?.bulkRecord || bulkRecord;

        // Sync all to Supabase Cloud Database
        if (isSupabaseConfigured()) {
          try {
            for (const p of finalProducts) {
              await supabaseApi.upsertProduct(p, 'usr-krishan');
            }
            await supabaseApi.insertReplenishment(finalBulkRecord, 'usr-krishan');
          } catch (supErr) {
            console.warn('Supabase bulk replenishment sync error:', supErr);
          }
        }

        setInventory(Array.from(updatedInventoryMap.values()));
        setReplenishments(prev => [finalBulkRecord, ...prev]);
        playTone(880, 'triangle', 0.15);

        resolve({
          ...(serverResult || {}),
          success: true,
          bulkRecord: finalBulkRecord,
          updatedProducts: finalProducts,
          totalIntakeCount,
          matchedCount: matchedItems.length,
          matchedItems,
          unmatchedCount: unmatchedItems.length,
          unmatchedItems
        });
      } catch (err) {
        reject(err);
      }
    });
  }, [socket, getAuthHeaders, inventory, setInventory, setReplenishments]);

  // Warehouse Send Action
  const sendStockToWarehouse = useCallback(async (data) => {
    return new Promise(async (resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('warehouse:send', data, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Failed to send to warehouse'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        try {
          const res = await fetch(`${apiUrl}/api/warehouse`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            if (res.ok && !json.error) return resolve(json);
            throw new Error(json.error || 'Server error');
          }
          throw new Error('API server unavailable');
        } catch (err) {
          // Fallback for Netlify / Direct Supabase / Local storage
          try {
            const product = inventory.find(p => p.id === data.productId);
            if (!product) throw new Error('Product not found in catalog');

            let totalSent = 0;
            const updatedSizes = { ...(product.sizes || {}) };
            const sentDetails = {};

            Object.entries(data.sizeQuantities || {}).forEach(([size, qty]) => {
              const deduct = Math.max(0, parseInt(qty, 10) || 0);
              if (deduct > 0) {
                const currentAvail = Number(updatedSizes[size] || 0);
                const actualDeduct = Math.min(deduct, currentAvail);
                if (actualDeduct > 0) {
                  updatedSizes[size] = currentAvail - actualDeduct;
                  totalSent += actualDeduct;
                  sentDetails[size] = actualDeduct;
                }
              }
            });

            if (totalSent === 0) {
              throw new Error('No available units to send for this product');
            }

            const updatedProduct = {
              ...product,
              sizes: updatedSizes,
              updatedAt: new Date().toISOString()
            };

            const record = {
              id: `wh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'warehouse_send',
              productId: product.id,
              productName: product.name,
              styleCategory: product.styleCategory || product.name,
              sku: product.sku,
              category: product.category,
              dispatchNo: (data.dispatchNo || '').trim() || `WH-${Date.now().toString().slice(-6)}`,
              destination: (data.destination || '').trim() || 'Central Warehouse',
              reason: (data.reason || '').trim() || 'Seasonal Return',
              notes: (data.notes || '').trim(),
              sentItems: sentDetails,
              totalCount: totalSent,
              timestamp: data.date ? new Date(data.date).toISOString() : new Date().toISOString()
            };

            // Sync to Supabase
            if (isSupabaseConfigured()) {
              try {
                await supabaseApi.upsertProduct(updatedProduct, 'usr-krishan');
                if (supabaseApi.insertWarehouseSend) {
                  await supabaseApi.insertWarehouseSend(record, 'usr-krishan');
                }
              } catch (supErr) {
                console.warn('Supabase warehouse fallback sync warning:', supErr);
              }
            }

            // Update local state
            setInventory(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
            setWarehouseSends(prev => [record, ...prev]);

            playTone(880, 'triangle', 0.12);
            resolve({ success: true, record, updatedProduct });
          } catch (fallbackErr) {
            reject(fallbackErr);
          }
        }
      }
    });
  }, [socket, getAuthHeaders, inventory, setInventory, setWarehouseSends]);


  const updateWarehouseRecord = useCallback(async (id, updates) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('warehouse:update', { id, updates }, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Failed to update warehouse record'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/warehouse/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates)
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  // Sales Actions
  const recordSale = useCallback(async (saleData) => {
    return new Promise(async (resolve, reject) => {
      const isWarehouse = saleData.source === 'warehouse' || saleData.deductStock === false;
      const targetProduct = inventory.find(p => p.id === saleData.productId || (saleData.sku && p.sku?.trim().toLowerCase() === saleData.sku?.trim().toLowerCase()));

      const finalSalePayload = {
        ...saleData,
        source: isWarehouse ? 'warehouse' : 'store',
        deductStock: !isWarehouse
      };

      if (socket && socket.connected) {
        socket.emit('sale:record', finalSalePayload, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Sale failed'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        let serverResult = null;
        try {
          const res = await fetch(`${apiUrl}/api/sales`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(finalSalePayload)
          });
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (res.ok && !data.error) {
              serverResult = data;
            }
          }
        } catch {}

        if (serverResult) {
          return resolve(serverResult);
        }

        if (isSupabaseConfigured()) {
          try {
            const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const saleTimestamp = saleData.timestamp ? new Date(saleData.timestamp).toISOString() : new Date().toISOString();
            const unitPrice = saleData.unitPrice !== undefined ? Number(saleData.unitPrice) : (targetProduct?.sellingPrice || 0);
            const qty = Number(saleData.quantity || 1);
            const totalAmount = saleData.totalAmount !== undefined ? Number(saleData.totalAmount) : unitPrice * qty;

            const saleRecord = {
              id: saleId,
              userId: 'usr-krishan',
              source: isWarehouse ? 'warehouse' : 'store',
              productId: targetProduct?.id || saleData.productId || 'prod-warehouse',
              sku: targetProduct?.sku || saleData.sku || 'N/A',
              productName: targetProduct?.name || saleData.productName || (saleData.sku ? `Article ${saleData.sku}` : 'Warehouse Article'),
              styleCategory: targetProduct?.styleCategory || saleData.styleCategory || targetProduct?.name || 'Warehouse Item',
              color: targetProduct?.color || saleData.color || 'Standard',
              size: String(saleData.size || ''),
              quantity: qty,
              unitPrice,
              totalAmount,
              paymentMode: saleData.paymentMode || 'Cash',
              customerName: saleData.customerName || '',
              timestamp: saleTimestamp
            };

            await supabaseApi.insertSale(saleRecord, 'usr-krishan');

            if (!isWarehouse && targetProduct) {
              const currentQty = Number(targetProduct.sizes?.[saleData.size] || 0);
              const newQty = Math.max(0, currentQty - qty);
              const updatedProduct = {
                ...targetProduct,
                sizes: {
                  ...(targetProduct.sizes || {}),
                  [saleData.size]: newQty
                },
                updatedAt: new Date().toISOString()
              };
              await supabaseApi.upsertProduct(updatedProduct, 'usr-krishan');
              setInventory(prev => prev.map(p => p.id === targetProduct.id ? updatedProduct : p));
            }

            setSales(prev => [saleRecord, ...prev]);
            playTone(950, 'triangle', 0.15);
            return resolve({ success: true, sale: saleRecord });
          } catch (supErr) {
            return reject(supErr);
          }
        }
        reject(new Error('Failed to record sale'));
      }
    });
  }, [socket, getAuthHeaders, inventory, setInventory, setSales]);

  const updateSaleRecord = useCallback(async (id, updates) => {
    const oldSale = (sales || []).find(s => s.id === id);
    const targetProductId = updates.productId || oldSale?.productId;
    const targetProduct = inventory.find(p => p.id === targetProductId);

    const newSize = String(updates.size !== undefined ? updates.size : (oldSale?.size || ''));
    const newQuantity = Number(updates.quantity !== undefined ? updates.quantity : (oldSale?.quantity || 1));
    const newUnitPrice = Number(updates.unitPrice !== undefined ? updates.unitPrice : (oldSale?.unitPrice || 0));
    const newPaymentMode = updates.paymentMode || oldSale?.paymentMode || 'Cash';
    const newCustomerName = updates.customerName !== undefined ? updates.customerName.trim() : (oldSale?.customerName || '');
    const newTimestamp = updates.timestamp ? new Date(updates.timestamp).toISOString() : (oldSale?.timestamp || new Date().toISOString());

    // Adjust inventory stock if product, size, or quantity changed
    const isStockChanged = oldSale && (oldSale.productId !== targetProductId || String(oldSale.size) !== newSize || Number(oldSale.quantity) !== newQuantity);
    const updatedProductsToSync = [];

    if (isStockChanged) {
      const oldProduct = inventory.find(p => p.id === oldSale.productId);

      if (oldProduct && targetProduct && oldProduct.id === targetProduct.id) {
        const prodCopy = { ...oldProduct, sizes: { ...(oldProduct.sizes || {}) } };
        prodCopy.sizes[oldSale.size] = (Number(prodCopy.sizes[oldSale.size]) || 0) + Number(oldSale.quantity);
        prodCopy.sizes[newSize] = Math.max(0, (Number(prodCopy.sizes[newSize]) || 0) - newQuantity);
        prodCopy.updatedAt = new Date().toISOString();
        updatedProductsToSync.push(prodCopy);
        setInventory(prev => prev.map(p => p.id === prodCopy.id ? prodCopy : p));
      } else {
        if (oldProduct) {
          const oldCopy = { ...oldProduct, sizes: { ...(oldProduct.sizes || {}) } };
          oldCopy.sizes[oldSale.size] = (Number(oldCopy.sizes[oldSale.size]) || 0) + Number(oldSale.quantity);
          oldCopy.updatedAt = new Date().toISOString();
          updatedProductsToSync.push(oldCopy);
          setInventory(prev => prev.map(p => p.id === oldCopy.id ? oldCopy : p));
        }
        if (targetProduct) {
          const newCopy = { ...targetProduct, sizes: { ...(targetProduct.sizes || {}) } };
          newCopy.sizes[newSize] = Math.max(0, (Number(newCopy.sizes[newSize]) || 0) - newQuantity);
          newCopy.updatedAt = new Date().toISOString();
          updatedProductsToSync.push(newCopy);
          setInventory(prev => prev.map(p => p.id === newCopy.id ? newCopy : p));
        }
      }
    }

    const updatedSale = {
      ...(oldSale || {}),
      id,
      productId: targetProduct?.id || targetProductId,
      sku: targetProduct?.sku || updates.sku || oldSale?.sku || 'N/A',
      productName: targetProduct?.name || updates.productName || oldSale?.productName || 'N/A',
      styleCategory: targetProduct?.styleCategory || updates.styleCategory || oldSale?.styleCategory || 'Standard',
      color: targetProduct?.color || updates.color || oldSale?.color || 'Standard',
      brand: targetProduct?.brand || oldSale?.brand || 'Saint G',
      category: targetProduct?.category || oldSale?.category || 'women_footwear',
      size: newSize,
      quantity: newQuantity,
      unitPrice: newUnitPrice,
      totalAmount: newUnitPrice * newQuantity,
      paymentMode: newPaymentMode,
      customerName: newCustomerName,
      timestamp: newTimestamp,
      updatedAt: new Date().toISOString()
    };

    // 1. Optimistic UI update immediately
    setSales(prev => prev.map(s => s.id === id ? updatedSale : s));
    playTone(850, 'triangle', 0.12);

    // 2. Sync to Supabase Cloud Database immediately
    if (isSupabaseConfigured()) {
      try {
        await supabaseApi.updateSale(id, updatedSale);
        for (const p of updatedProductsToSync) {
          await supabaseApi.upsertProduct(p, 'usr-krishan');
        }
      } catch (supErr) {
        console.warn('Supabase updateSaleRecord warning:', supErr);
      }
    }

    // 3. Sync to Node Backend if available
    return new Promise((resolve) => {
      if (socket && socket.connected) {
        socket.emit('sale:update', { id, updates: { ...updates, timestamp: newTimestamp } }, (res) => {
          resolve(res?.updatedSale || updatedSale);
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/sales/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...updates, timestamp: newTimestamp })
        })
          .then(res => {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) return res.json();
            return { success: true, updatedSale };
          })
          .then(res => resolve(res?.updatedSale || updatedSale))
          .catch(() => resolve(updatedSale));
      }
    });
  }, [socket, getAuthHeaders, sales, inventory, setSales, setInventory]);

  const revertSale = useCallback(async (saleId) => {
    return new Promise(async (resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('sale:revert', { saleId }, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Revert failed'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        try {
          const res = await fetch(`${apiUrl}/api/sales/${saleId}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (res.ok && !data.error) return resolve(data);
          throw new Error(data.error || 'Delete failed');
        } catch (err) {
          if (isSupabaseConfigured()) {
            try {
              const saleToDelete = sales.find(s => s.id === saleId);
              const isWarehouse = saleToDelete?.source === 'warehouse' || saleToDelete?.deductStock === false;
              await supabaseApi.deleteSale(saleId);
              if (saleToDelete && !isWarehouse) {
                const targetProduct = inventory.find(p => p.id === saleToDelete.productId);
                if (targetProduct) {
                  const currentQty = Number(targetProduct.sizes?.[saleToDelete.size] || 0);
                  const restoredQty = currentQty + (saleToDelete.quantity || 1);
                  const restoredProduct = {
                    ...targetProduct,
                    sizes: {
                      ...(targetProduct.sizes || {}),
                      [saleToDelete.size]: restoredQty
                    },
                    updatedAt: new Date().toISOString()
                  };
                  await supabaseApi.upsertProduct(restoredProduct, 'usr-krishan');
                  setInventory(prev => prev.map(p => p.id === targetProduct.id ? restoredProduct : p));
                }
              }
              setSales(prev => prev.filter(s => s.id !== saleId));
              return resolve({ success: true });
            } catch (supErr) {
              return reject(supErr);
            }
          }
          reject(err);
        }
      }
    });
  }, [socket, getAuthHeaders, sales, inventory]);

  // Google Sheets Sync
  const syncToGoogleSheets = useCallback(async (webhookUrl) => {
    if (!webhookUrl || !webhookUrl.trim()) {
      throw new Error('Please enter your Google Apps Script Webhook URL');
    }

    const cleanWebhookUrl = webhookUrl.trim();

    // Enrich sales with replenishment status & product details
    const productMap = {};
    (inventory || []).forEach(p => {
      if (p.sku) productMap[p.sku.toUpperCase().trim()] = p;
      if (p.id) productMap[p.id] = p;
    });

    const enrichedSales = (sales || []).map(s => {
      const p = (s.sku && productMap[s.sku.toUpperCase().trim()]) || productMap[s.productId];
      const pSku = s.sku || p?.sku || '';
      const pColor = s.color || p?.color || '';
      const pCat = s.category || p?.category || '';
      const sizeKey = String(s.size || '').trim();
      const currentStock = Number(p?.sizes?.[sizeKey] || 0);

      let isNotReceived = false;
      if (!p || currentStock === 0) {
        isNotReceived = true;
      } else if ((pCat === 'women_footwear' || sizeKey === '37') && sizeKey === '37' && currentStock < 2) {
        isNotReceived = true;
      }

      return {
        ...s,
        sku: pSku,
        color: pColor,
        category: pCat,
        currentStock,
        status: isNotReceived ? 'NOT RECEIVED' : 'RECEIVED'
      };
    });

    const finalSales = enrichedSales && enrichedSales.length > 0 ? enrichedSales : [{
      id: 'placeholder-sale',
      sku: 'NO SALES RECORDED YET',
      color: '-',
      size: '-',
      quantity: 0,
      currentStock: 0,
      status: 'RECEIVED',
      timestamp: new Date().toISOString()
    }];

    const payload = {
      appName: "KY INVENTORY",
      targetSpreadsheetId: "1b5udIekQd15iQ6btgoqQr1kuKee3K2rtPVfXmvEtYNE",
      syncedAt: new Date().toISOString(),
      inventory,
      sales: finalSales,
      warehouseSends,
      replenishments
    };

    const host = window.location.hostname;
    const isLocalDev = window.location.port === '5173' || host === 'localhost' || host === '127.0.0.1';
    
    // Priority order for sync endpoints (Express backend, Netlify function proxy, then direct fallback)
    const syncEndpoints = [];
    if (isLocalDev) {
      syncEndpoints.push(`http://${host}:5000/api/sync/googlesheet`);
    }
    syncEndpoints.push('/api/sync/googlesheet');
    syncEndpoints.push('/.netlify/functions/sync-sheets');

    let syncError = null;
    for (const endpoint of syncEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ webhookUrl: cleanWebhookUrl, payload })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            return data;
          }
        }
      } catch (err) {
        syncError = err;
      }
    }

    // Direct browser fallback if proxy is unreachable
    try {
      await fetch(cleanWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return { success: true, message: 'Google Sheet sync request sent directly to Apps Script!' };
    } catch (err) {
      throw new Error('Google Sheet sync error: ' + (err.message || syncError?.message || 'Failed'));
    }
  }, [inventory, sales, warehouseSends, replenishments, getAuthHeaders]);

  // Category Actions
  const addCategory = useCallback(async (categoryData) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('category:add', categoryData, (res) => {
          if (res?.success) resolve(res.category);
          else reject(new Error(res?.error || 'Failed to add category'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/categories`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(categoryData)
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  const deleteCategory = useCallback(async (id) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('category:delete', { id }, (res) => {
          if (res?.success) resolve(true);
          else reject(new Error(res?.error || 'Failed to delete category'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/categories/${id}`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(true))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  // Combined History (Sales, Replenishments, Warehouse Sends)
  const unifiedHistory = useMemo(() => {
    const list = [];

    // Sales
    sales.forEach(s => {
      list.push({
        id: s.id,
        kind: 'sale',
        typeLabel: 'Sold (Sale)',
        timestamp: s.timestamp,
        productName: s.productName,
        sku: s.sku || 'N/A',
        styleCategory: s.styleCategory || 'Standard',
        size: s.size,
        qty: s.quantity,
        amount: s.totalAmount,
        notes: s.paymentMode ? `${s.paymentMode} - ${s.customerName || 'Walk-in'}` : '',
        raw: s
      });
    });

    // Replenishments
    replenishments.forEach(r => {
      if (r.items && Array.isArray(r.items)) {
        r.items.forEach((item, idx) => {
          list.push({
            id: `${r.id}-${idx}`,
            kind: 'replenishment',
            typeLabel: 'Stock Received (In)',
            timestamp: r.timestamp,
            productName: item.articleName || r.productName || 'Stock In',
            sku: item.sku || r.sku || 'N/A',
            styleCategory: 'Replenishment',
            size: item.size || 'Mix',
            qty: item.qty || 1,
            amount: 0,
            notes: `Inv: ${r.invoiceNo || 'N/A'} - ${r.supplier || ''}`,
            raw: r
          });
        });
      } else {
        Object.entries(r.receivedItems || {}).forEach(([s, q], idx) => {
          list.push({
            id: `${r.id}-${idx}`,
            kind: 'replenishment',
            typeLabel: 'Stock Received (In)',
            timestamp: r.timestamp,
            productName: r.productName,
            sku: r.sku,
            styleCategory: r.styleCategory || 'Standard',
            size: s,
            qty: q,
            amount: 0,
            notes: `Inv: ${r.invoiceNo || 'N/A'} - ${r.supplier || ''}`,
            raw: r
          });
        });
      }
    });

    // Warehouse Sends
    warehouseSends.forEach(w => {
      Object.entries(w.sentItems || {}).forEach(([s, q], idx) => {
        list.push({
          id: `${w.id}-${idx}`,
          kind: 'warehouse_send',
          typeLabel: 'Warehouse Dispatch (Out)',
          timestamp: w.timestamp,
          productName: w.productName,
          sku: w.sku,
          styleCategory: w.styleCategory || 'Standard',
          size: s,
          qty: q,
          amount: 0,
          notes: `Disp: ${w.dispatchNo} - ${w.reason || ''} to ${w.destination}`,
          raw: w
        });
      });
    });

    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [sales, replenishments, warehouseSends]);

  const computedStats = useMemo(() => {
    if (stats.totalProducts > 0 && isConnected) return stats;

    const totalProducts = inventory.length;
    let totalStockCount = 0;
    let totalRetailValue = 0;
    const footwearAlertItems = [];

    inventory.forEach(p => {
      const pSizes = p.sizes || {};
      const pTotal = Object.values(pSizes).reduce((a, b) => a + (Number(b) || 0), 0);
      totalStockCount += pTotal;
      totalRetailValue += pTotal * (Number(p.sellingPrice) || 0);

      const isFootwear = p.category === 'women_footwear' || p.category === 'men_footwear';
      if (isFootwear && pTotal < 7) {
        footwearAlertItems.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          styleCategory: p.styleCategory,
          totalStock: pTotal,
          sizes: p.sizes,
          deficit: 7 - pTotal
        });
      }
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7);

    const todaySales = sales.filter(s => (s.timestamp || '').slice(0, 10) === todayStr);
    const monthSales = sales.filter(s => (s.timestamp || '').slice(0, 7) === thisMonthStr);

    const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const todayItemsSold = todaySales.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);

    const monthRevenue = monthSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const monthItemsSold = monthSales.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);

    return {
      totalProducts,
      totalStockCount,
      totalRetailValue,
      footwearLowAlertCount: footwearAlertItems.length,
      footwearAlertItems,
      todaySalesCount: todaySales.length,
      todayItemsSold,
      todayRevenue,
      yesterdaySalesCount: stats.yesterdaySalesCount || 0,
      yesterdayItemsSold: stats.yesterdayItemsSold || 0,
      yesterdayRevenue: stats.yesterdayRevenue || 0,
      monthSalesCount: monthSales.length,
      monthItemsSold,
      monthRevenue,
      monthAverageDailyRevenue: Math.round(monthRevenue / (now.getDate() || 1)),
      categoriesCount: categories.length
    };
  }, [stats, isConnected, inventory, sales, categories]);

  const value = {
    // Auth & Tenants
    currentUser,
    authToken,
    isLoginModalOpen,
    setIsLoginModalOpen,
    login,
    register,
    logout,

    // Core State
    activeTab,
    setActiveTab,
    inventory,
    categories,
    sizesMap,
    sales,
    replenishments,
    warehouseSends,
    unifiedHistory,
    stats: computedStats,
    isConnected,
    connectedDevices,
    localIp,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,

    // Actions
    adjustStock,
    updateDisplaySize,
    addProduct,
    updateProduct,
    deleteProduct,
    addReplenishment,
    bulkReplenishStock,
    sendStockToWarehouse,
    updateWarehouseRecord,
    recordSale,
    updateSaleRecord,
    revertSale,
    syncToGoogleSheets,
    addCategory,
    deleteCategory,
    theme,
    toggleTheme
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
