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
    { id: 'bags', label: 'Bags', sizes: ['Standard'], icon: '👜', order: 5 }
  ]);

  const [sizesMap, setSizesMap] = useState({
    women_footwear: ['35', '36', '37', '38', '39', '40', '41'],
    men_footwear: ['40', '41', '42', '43', '44', '45'],
    men_jacket: ['S', 'M', 'L', 'XL', 'XXL'],
    women_jacket: ['S', 'M', 'L', 'XL', 'XXL'],
    bags: ['Standard']
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

      if (Array.isArray(repRes)) setReplenishments(repRes);
      if (Array.isArray(whRes)) setWarehouseSends(whRes);
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
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('product:create', productData, (res) => {
          if (res?.success) resolve(res.product);
          else reject(new Error(res?.error || 'Failed to add product'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/inventory`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(productData)
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  const updateProduct = useCallback(async (id, updates) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('product:update', { id, updates }, (res) => {
          if (res?.success) resolve(res.product);
          else reject(new Error(res?.error || 'Failed to update'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/inventory/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates)
        })
          .then(res => res.json())
          .then(resolve)
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  const deleteProduct = useCallback(async (id) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('product:delete', { id }, (res) => {
          if (res?.success) resolve(true);
          else reject(new Error('Delete failed'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/inventory/${id}`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
        })
          .then(() => resolve(true))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  // Replenishment Actions
  const addReplenishment = useCallback(async (data) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('replenishment:add', data, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Failed to add replenishment'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/replenishment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data)
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  const bulkReplenishStock = useCallback(async (bulkData) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('replenishment:bulk', bulkData, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Bulk replenishment failed'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/replenishment/bulk`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(bulkData)
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

  // Warehouse Send Action
  const sendStockToWarehouse = useCallback(async (data) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('warehouse:send', data, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Failed to send to warehouse'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/warehouse`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data)
        })
          .then(res => res.json())
          .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
          .catch(reject);
      }
    });
  }, [socket, getAuthHeaders]);

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
      if (socket && socket.connected) {
        socket.emit('sale:record', saleData, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Sale failed'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        try {
          const res = await fetch(`${apiUrl}/api/sales`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(saleData)
          });
          const data = await res.json();
          if (res.ok && !data.error) {
            return resolve(data);
          }
          throw new Error(data.error || 'API failed');
        } catch (err) {
          if (isSupabaseConfigured()) {
            try {
              const targetProduct = inventory.find(p => p.id === saleData.productId);
              const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const saleRecord = {
                id: saleId,
                userId: 'usr-krishan',
                productId: saleData.productId,
                sku: targetProduct?.sku || 'N/A',
                productName: targetProduct?.name || 'N/A',
                styleCategory: targetProduct?.styleCategory || 'N/A',
                color: targetProduct?.color || 'N/A',
                size: saleData.size,
                quantity: saleData.quantity || 1,
                unitPrice: saleData.unitPrice || targetProduct?.sellingPrice || 0,
                totalAmount: (saleData.quantity || 1) * (saleData.unitPrice || targetProduct?.sellingPrice || 0),
                paymentMode: saleData.paymentMode || 'Cash',
                customerName: saleData.customerName || '',
                timestamp: new Date().toISOString()
              };

              await supabaseApi.insertSale(saleRecord, 'usr-krishan');

              if (targetProduct) {
                const currentQty = Number(targetProduct.sizes?.[saleData.size] || 0);
                const newQty = Math.max(0, currentQty - (saleData.quantity || 1));
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
          reject(err);
        }
      }
    });
  }, [socket, getAuthHeaders, inventory]);

  const updateSaleRecord = useCallback(async (id, updates) => {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) {
        socket.emit('sale:update', { id, updates }, (res) => {
          if (res?.success) resolve(res);
          else reject(new Error(res?.error || 'Failed to update sale'));
        });
      } else {
        const host = window.location.hostname;
        const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
        fetch(`${apiUrl}/api/sales/${id}`, {
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
              await supabaseApi.deleteSale(saleId);
              if (saleToDelete) {
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
    const host = window.location.hostname;
    const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
    const res = await fetch(`${apiUrl}/api/sync/googlesheet`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ webhookUrl })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Sync failed');
    return data;
  }, [getAuthHeaders]);

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
    deleteCategory
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
