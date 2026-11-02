import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  ShoppingBag, 
  ArrowRight,
  Crown,
  Calendar,
  Banknote,
  Smartphone,
  CreditCard,
  BarChart3,
  Award,
  Clock,
  ChevronDown,
  Flame,
  Filter,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export function DashboardView({ onOpenAddModal, onOpenQuickSale, onOpenReplenish }) {
  const { stats, inventory, categories, sales, setActiveTab } = useInventory();

  // Sales View Tab: 'both' | 'daily' | 'monthly'
  const [salesTab, setSalesTab] = useState('both');
  
  const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');
  
  const getLocalDateStr = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Selected Month for Monthly Analytics (default: current month 'YYYY-MM')
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Hot Selling Controls: timeframe ('all' | 'month') and category ('all' | id)
  const [hotSellingTimeframe, setHotSellingTimeframe] = useState('all');
  const [hotSellingCategory, setHotSellingCategory] = useState('all');
  const [hotSellingView, setHotSellingView] = useState('both'); // 'both' | 'style' | 'size'

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Format month name (e.g. "November 2026")
  const formatMonthTitle = (mStr) => {
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  // Available months list for picker
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentMonthStr);
    sales.forEach(s => {
      const dStr = getLocalDateStr(s.timestamp);
      if (dStr && dStr.length >= 7) {
        monthsSet.add(dStr.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [sales, currentMonthStr]);

  // 1. TODAY'S SALES ANALYTICS
  const todayAnalytics = useMemo(() => {
    const todaySales = sales.filter(s => getLocalDateStr(s.timestamp) === todayStr);
    const revenue = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
    const qty = todaySales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    const orderCount = todaySales.length;
    const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

    const paymentModes = {
      Cash: { amount: 0, count: 0 },
      UPI: { amount: 0, count: 0 },
      Card: { amount: 0, count: 0 },
      Other: { amount: 0, count: 0 }
    };

    todaySales.forEach(s => {
      const mode = s.paymentMode || 'Cash';
      if (paymentModes[mode]) {
        paymentModes[mode].amount += Number(s.totalAmount) || 0;
        paymentModes[mode].count += Number(s.quantity) || 1;
      } else {
        paymentModes.Other.amount += Number(s.totalAmount) || 0;
        paymentModes.Other.count += Number(s.quantity) || 1;
      }
    });

    const productSalesMap = {};
    todaySales.forEach(s => {
      const key = s.sku || s.productName;
      if (!productSalesMap[key]) {
        productSalesMap[key] = {
          sku: s.sku || 'N/A',
          name: s.styleCategory || s.productName,
          color: s.color,
          qty: 0,
          revenue: 0
        };
      }
      productSalesMap[key].qty += Number(s.quantity) || 1;
      productSalesMap[key].revenue += Number(s.totalAmount) || 0;
    });

    const topSellingToday = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);

    return {
      revenue,
      qty,
      orderCount,
      aov,
      todaySales,
      paymentModes,
      topSellingToday
    };
  }, [sales, todayStr]);

  // 2. SELECTED MONTH'S SALES ANALYTICS
  const monthAnalytics = useMemo(() => {
    const [yearStr, monthNumStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthNumStr, 10);

    const monthSales = sales.filter(s => getLocalDateStr(s.timestamp).startsWith(selectedMonth));
    const revenue = monthSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
    const qty = monthSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    const orderCount = monthSales.length;
    const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth = selectedMonth === currentMonthStr;
    const daysElapsed = isCurrentMonth ? Math.min(new Date().getDate(), totalDaysInMonth) : totalDaysInMonth;
    const dailyAverage = daysElapsed > 0 ? Math.round(revenue / daysElapsed) : 0;

    const dailyBuckets = [];
    let maxDayRevenue = 1000;
    let highestDay = { day: 1, revenue: 0, qty: 0 };

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const daySales = monthSales.filter(s => getLocalDateStr(s.timestamp) === dayStr);
      const dayRevenue = daySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
      const dayQty = daySales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

      if (dayRevenue > maxDayRevenue) maxDayRevenue = dayRevenue;
      if (dayRevenue > highestDay.revenue) {
        highestDay = { day, revenue: dayRevenue, qty: dayQty, date: dayStr };
      }

      dailyBuckets.push({
        day,
        dateStr: dayStr,
        revenue: dayRevenue,
        qty: dayQty,
        orders: daySales.length,
        sales: daySales,
        isToday: dayStr === todayStr
      });
    }

    const itemMap = {};
    monthSales.forEach(s => {
      const key = s.sku || s.productName;
      if (!itemMap[key]) {
        itemMap[key] = {
          sku: s.sku || 'N/A',
          name: s.styleCategory || s.productName,
          category: s.category,
          color: s.color,
          qty: 0,
          revenue: 0
        };
      }
      itemMap[key].qty += Number(s.quantity) || 1;
      itemMap[key].revenue += Number(s.totalAmount) || 0;
    });

    const topArticles = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const catRevenueMap = {};
    categories.forEach(c => { catRevenueMap[c.id] = { label: c.label, icon: c.icon, revenue: 0, qty: 0 }; });

    monthSales.forEach(s => {
      const catId = s.category || 'other';
      if (!catRevenueMap[catId]) {
        catRevenueMap[catId] = { label: catId, icon: '📦', revenue: 0, qty: 0 };
      }
      catRevenueMap[catId].revenue += Number(s.totalAmount) || 0;
      catRevenueMap[catId].qty += Number(s.quantity) || 1;
    });

    return {
      revenue,
      qty,
      orderCount,
      aov,
      dailyAverage,
      totalDaysInMonth,
      daysElapsed,
      highestDay,
      dailyBuckets,
      maxDayRevenue,
      topArticles,
      catRevenueMap: Object.values(catRevenueMap)
    };
  }, [sales, selectedMonth, currentMonthStr, todayStr, categories]);

  // 3. TARGET SALES DATA FOR HOT SELLING SECTION
  const targetSales = useMemo(() => {
    let list = sales;
    if (hotSellingTimeframe === 'month') {
      list = list.filter(s => (s.timestamp || '').startsWith(selectedMonth));
    }
    if (hotSellingCategory !== 'all') {
      list = list.filter(s => s.category === hotSellingCategory);
    }
    return list;
  }, [sales, hotSellingTimeframe, selectedMonth, hotSellingCategory]);

  // 3A. STYLE-WISE HOT SELLING
  const styleWiseHotSelling = useMemo(() => {
    const map = {};
    targetSales.forEach(s => {
      const key = s.sku || s.productId || s.productName;
      if (!map[key]) {
        map[key] = {
          sku: s.sku || 'N/A',
          name: s.styleCategory || s.productName,
          category: s.category,
          color: s.color || 'Standard',
          totalQty: 0,
          totalRevenue: 0,
          ordersCount: 0,
          sizesSold: {}
        };
      }
      const q = Number(s.quantity) || 1;
      const amt = Number(s.totalAmount) || 0;
      map[key].totalQty += q;
      map[key].totalRevenue += amt;
      map[key].ordersCount += 1;
      const sKey = String(s.size || 'Standard');
      map[key].sizesSold[sKey] = (map[key].sizesSold[sKey] || 0) + q;
    });

    const list = Object.values(map).sort((a, b) => b.totalQty - a.totalQty || b.totalRevenue - a.totalRevenue);
    const maxQty = list.length > 0 ? list[0].totalQty : 1;
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      percentOfMax: Math.round((item.totalQty / maxQty) * 100)
    }));
  }, [targetSales]);

  // 3B. SIZE-WISE HOT SELLING
  const sizeWiseHotSelling = useMemo(() => {
    const sizeMap = {};
    const catSizeMap = {};

    targetSales.forEach(s => {
      const sizeKey = String(s.size || 'Standard');
      const catKey = s.category || 'other';

      // Overall
      if (!sizeMap[sizeKey]) {
        sizeMap[sizeKey] = { size: sizeKey, totalQty: 0, totalRevenue: 0, count: 0, categories: new Set() };
      }
      sizeMap[sizeKey].totalQty += Number(s.quantity) || 1;
      sizeMap[sizeKey].totalRevenue += Number(s.totalAmount) || 0;
      sizeMap[sizeKey].count += 1;
      sizeMap[sizeKey].categories.add(s.category);

      // By Category
      if (!catSizeMap[catKey]) catSizeMap[catKey] = {};
      if (!catSizeMap[catKey][sizeKey]) {
        catSizeMap[catKey][sizeKey] = { size: sizeKey, totalQty: 0, totalRevenue: 0 };
      }
      catSizeMap[catKey][sizeKey].totalQty += Number(s.quantity) || 1;
      catSizeMap[catKey][sizeKey].totalRevenue += Number(s.totalAmount) || 0;
    });

    const overallList = Object.values(sizeMap).sort((a, b) => b.totalQty - a.totalQty);
    const totalSoldQty = overallList.reduce((sum, item) => sum + item.totalQty, 0);

    const overallWithPct = overallList.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      sharePct: totalSoldQty > 0 ? Math.round((item.totalQty / totalSoldQty) * 100) : 0,
      categoriesList: Array.from(item.categories)
    }));

    return {
      overall: overallWithPct,
      byCategory: catSizeMap,
      totalSoldQty
    };
  }, [targetSales]);

  // Footwear items with less than 7 units
  const footwearAlerts = inventory.filter(p => {
    const isFootwear = p.category === 'women_footwear' || p.category === 'men_footwear';
    if (!isFootwear) return false;
    const total = Object.values(p.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
    return total < 7;
  });

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold mb-2">
              <Crown className="w-3.5 h-3.5" />
              <span>Real-Time Business Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              KY INVENTORY Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Live Daily & Monthly sales tracking, hot selling articles (style & size wise), and inventory valuation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenQuickSale(inventory[0] || null)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span>+ Quick Sell</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <span>View Stock</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 1. TODAY'S SELL & MONTH'S SELL (सबके ऊपर - MOST PROMINENT) 🌟 */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        
        {/* Top 2 Big Hero Cards: Today Sell & Month Sell */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: TODAY'S SELL (आज की बिक्री) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/50 p-5 sm:p-6 shadow-2xl shadow-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Today's Sell (आज की बिक्री)
                </span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  Live Counter
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {formatCurrency(todayAnalytics.revenue)}
                </span>
                <div className="mt-1 flex items-center gap-2.5 text-xs font-bold text-amber-400">
                  <span className="text-white text-sm font-black">{todayAnalytics.qty} pairs/pcs sold</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-400 font-normal">{todayAnalytics.orderCount} bills</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg Order Value</span>
                <span className="text-sm font-black text-amber-300 block">{formatCurrency(todayAnalytics.aov)}</span>
              </div>
            </div>

            {/* Quick Payment Mode Mini Chips */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Payment Share:</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  💵 Cash: <strong className="text-white">{formatCurrency(todayAnalytics.paymentModes.Cash.amount)}</strong>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300">
                  📱 UPI: <strong className="text-white">{formatCurrency(todayAnalytics.paymentModes.UPI.amount)}</strong>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
                  💳 Card: <strong className="text-white">{formatCurrency(todayAnalytics.paymentModes.Card.amount)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: THIS MONTH'S SELL (इस महीने की बिक्री) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/50 p-5 sm:p-6 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Month's Sell (मासिक बिक्री)
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  {formatMonthTitle(selectedMonth)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Calendar className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-emerald-300 tracking-tight">
                  {formatCurrency(monthAnalytics.revenue)}
                </span>
                <div className="mt-1 flex items-center gap-2.5 text-xs font-bold text-emerald-400">
                  <span className="text-white text-sm font-black">{monthAnalytics.qty} units sold</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-400 font-normal">{monthAnalytics.orderCount} bills</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Avg</span>
                <span className="text-sm font-black text-emerald-300 block">{formatCurrency(monthAnalytics.dailyAverage)}/day</span>
              </div>
            </div>

            {/* Peak Day Mini Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Month Peak Day:</span>
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Day {monthAnalytics.highestDay.day} — {formatCurrency(monthAnalytics.highestDay.revenue)}</span>
                <span className="text-slate-400 font-normal">({monthAnalytics.highestDay.qty} sold)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Detailed Sales Command Center (Tabs, Graph & Today's Feed) */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          
          {/* Top Bar Switcher */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Sales & Revenue Intelligence</span>
                  <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                    दैनिक व मासिक बिक्री
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Switcher Tabs */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setSalesTab('both')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    salesTab === 'both' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overview (दोनों)
                </button>
                <button
                  onClick={() => setSalesTab('daily')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    salesTab === 'daily' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daily Sell (दैनिक)
                </button>
                <button
                  onClick={() => setSalesTab('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    salesTab === 'monthly' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Month Sell (मासिक)
                </button>
              </div>

              {/* Month Picker Dropdown */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setSelectedDayDetail(null);
                  }}
                  className="appearance-none bg-slate-950 border border-slate-800 hover:border-slate-700 text-amber-300 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m} className="bg-slate-900 text-white">
                      {formatMonthTitle(m)} {m === currentMonthStr ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => setActiveTab('sold')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition px-2 py-1.5"
              >
                <span>All Sold Records &rarr;</span>
              </button>
            </div>
          </div>

          {/* DAILY SELL FEED */}
          {(salesTab === 'both' || salesTab === 'daily') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Today's Live Sales Feed (आज बिके आर्टिकल्स)</span>
                </h3>
                <span className="text-xs text-slate-400">Total {todayAnalytics.todaySales.length} bills today</span>
              </div>

              {todayAnalytics.todaySales.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">SKU Code</th>
                        <th className="py-2.5 px-3">Article / Style</th>
                        <th className="py-2.5 px-2 text-center">Size</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {todayAnalytics.todaySales.slice(0, 5).map((s) => {
                        const timeStr = s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
                        return (
                          <tr key={s.id} className="hover:bg-slate-900/50 transition">
                            <td className="py-2 px-3 font-mono text-slate-400 text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{timeStr}</span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-amber-300">
                              {s.sku || 'N/A'}
                            </td>
                            <td className="py-2 px-3 font-bold text-white">
                              {s.styleCategory || s.productName}
                              <span className="text-[10px] text-slate-500 ml-1.5 font-normal">({s.color})</span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-amber-400 bg-amber-400/5">
                              {s.size}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-white">
                              {s.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-emerald-400">
                              {formatCurrency(s.totalAmount)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                s.paymentMode === 'UPI' 
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                                  : s.paymentMode === 'Card'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}>
                                {s.paymentMode || 'Cash'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
                  <p className="text-xs font-bold text-slate-400">आज अभी तक कोई सेल रिकॉर्ड नहीं हुई है</p>
                </div>
              )}
            </div>
          )}

          {/* MONTHLY SELL INTERACTIVE BAR GRAPH */}
          {(salesTab === 'both' || salesTab === 'monthly') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Day-by-Day Sales Graph (1 to {monthAnalytics.totalDaysInMonth} {formatMonthTitle(selectedMonth)})</span>
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-amber-500 to-yellow-300" />
                    <span>Sales Day</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
                    <span>No Sale</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm border border-amber-400 bg-amber-400/20" />
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Bar Canvas */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5">
                <div className="h-44 sm:h-52 flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 px-1 overflow-x-auto select-none">
                  {monthAnalytics.dailyBuckets.map((bucket) => {
                    const heightPercent = bucket.revenue > 0 
                      ? Math.max(12, Math.round((bucket.revenue / monthAnalytics.maxDayRevenue) * 100))
                      : 4;

                    const isSelected = selectedDayDetail?.day === bucket.day;

                    return (
                      <div
                        key={bucket.day}
                        onClick={() => setSelectedDayDetail(bucket)}
                        className="flex-1 min-w-[14px] sm:min-w-[18px] flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-30 transition-all transform -translate-y-1 bg-slate-900 border border-amber-500/40 text-white rounded-lg px-2.5 py-1 text-[10px] whitespace-nowrap shadow-xl">
                          <div className="font-bold text-amber-300">Day {bucket.day} ({bucket.dateStr.slice(5)})</div>
                          <div>{formatCurrency(bucket.revenue)} &bull; {bucket.qty} pcs</div>
                        </div>

                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            bucket.revenue > 0
                              ? isSelected
                                ? 'bg-gradient-to-t from-emerald-500 via-amber-400 to-yellow-300 shadow-lg shadow-amber-500/30 scale-105'
                                : 'bg-gradient-to-t from-amber-500/80 to-amber-300 hover:from-amber-400 hover:to-yellow-200'
                              : 'bg-slate-800/60 hover:bg-slate-700/60'
                          } ${
                            bucket.isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950' : ''
                          }`}
                        />

                        <span className={`text-[9px] sm:text-[10px] font-mono mt-1.5 transition ${
                          bucket.isToday 
                            ? 'text-amber-400 font-black' 
                            : bucket.revenue > 0 ? 'text-slate-300 font-bold' : 'text-slate-600'
                        }`}>
                          {bucket.day}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedDayDetail && (
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-black text-sm">
                        {selectedDayDetail.day}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">
                          Sales Details for {selectedDayDetail.dateStr}
                        </div>
                        <div className="text-xs text-amber-300 font-bold mt-0.5">
                          Total: {formatCurrency(selectedDayDetail.revenue)} &bull; {selectedDayDetail.qty} pieces across {selectedDayDetail.orders} orders
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDayDetail(null)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 📦 2. STORE STOCK STATUS & INVENTORY VALUATION (उसके नीचे) 📦 */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        
        {/* 3 Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Total Stock */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Store Stock</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalStockCount || 0}</span>
              <span className="text-xs text-slate-400 ml-1.5 font-bold">units available</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{stats.totalProducts || 0} active models in catalog</p>
          </div>

          {/* Stock Retail Worth */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stock Valuation</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-cyan-300">{formatCurrency(stats.totalRetailValue)}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Live store retail valuation</p>
          </div>

          {/* Footwear Alert */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Footwear Stock Alert</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                footwearAlerts.length > 0 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-300">{footwearAlerts.length}</span>
              <span className="text-xs text-slate-400">models &lt; 7 left</span>
            </div>
            <p className="text-[11px] text-amber-400/80 mt-1 font-medium">Standard set is incomplete</p>
          </div>

        </div>

        {/* Footwear Urgent Replenishment Alert Box (< 7) */}
        {footwearAlerts.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-3xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black text-white">
                  Footwear Requiring Stock Replenishment ({footwearAlerts.length} Models &lt; 7 units)
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Baseline set: 36 (1), 37 (2), 38-41 (1 each)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {footwearAlerts.map(item => {
                const total = Object.values(item.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
                return (
                  <div 
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold text-amber-300 block">{item.sku}</span>
                      <span className="text-xs font-black text-white truncate block">{item.styleCategory || item.name}</span>
                      <span className="text-[11px] text-slate-400">{item.color} &bull; <strong className="text-rose-400">{total} pairs left</strong></span>
                    </div>

                    <button
                      onClick={() => onOpenReplenish(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-xs font-bold border border-amber-500/30 transition active:scale-95 flex-shrink-0"
                    >
                      + Replenish
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Wise Stock Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-white">Category Stock Distribution</h2>
              <p className="text-xs text-slate-400">Current active stock across sections</p>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold transition"
            >
              Manage Categories &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const catItems = inventory.filter(p => p.category === cat.id);
              const totalStock = catItems.reduce((acc, p) => {
                return acc + Object.values(p.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
              }, 0);
              const totalValue = catItems.reduce((acc, p) => {
                const count = Object.values(p.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
                return acc + (count * (p.sellingPrice || 0));
              }, 0);

              return (
                <div 
                  key={cat.id}
                  onClick={() => setActiveTab('inventory')}
                  className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cat.icon || '📦'}</span>
                      <div>
                        <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                          {cat.label}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Sizes: {cat.sizes.join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-white block">{totalStock}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">in stock</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>{catItems.length} products</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🔥 3. HOT SELLING ARTICLES (LAST MEIN - STYLE WISE & SIZE WISE) 🔥 */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
        
        {/* Hot Selling Header & Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 shadow-lg shadow-rose-500/20">
                <Flame className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Hot Selling Performance Intelligence</span>
                  <span className="text-xs bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                    🔥 बेस्ट सेलिंग
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  High demand trends: Style-wise and Size-wise breakdown (सबसे ज्यादा बिकने वाले स्टाइल व साइज़)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Selector: Both / Style / Size */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setHotSellingView('both')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  hotSellingView === 'both' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Both (दोनों)
              </button>
              <button
                onClick={() => setHotSellingView('style')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  hotSellingView === 'style' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Style-Wise (स्टाइल)
              </button>
              <button
                onClick={() => setHotSellingView('size')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  hotSellingView === 'size' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Size-Wise (साइज़)
              </button>
            </div>

            {/* Timeframe Filter */}
            <select
              value={hotSellingTimeframe}
              onChange={(e) => setHotSellingTimeframe(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-amber-300 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All-Time Sales (कुल बिक्री)</option>
              <option value="month" className="bg-slate-900 text-white">{formatMonthTitle(selectedMonth)} (इस महीने)</option>
            </select>

            {/* Category Filter */}
            <select
              value={hotSellingCategory}
              onChange={(e) => setHotSellingCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column or Full Width Grid */}
        <div className={`grid gap-5 ${hotSellingView === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          
          {/* ========================================================= */}
          {/* A. STYLE-WISE HOT SELLING (स्टाइल के अनुसार) */}
          {/* ========================================================= */}
          {(hotSellingView === 'both' || hotSellingView === 'style') && (
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-white">
                    Style-Wise Hot Selling Articles (स्टाइल अनुसार बिक्री)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {styleWiseHotSelling.length} active models
                </span>
              </div>

              {styleWiseHotSelling.length > 0 ? (
                <div className="space-y-3">
                  {styleWiseHotSelling.map((item) => (
                    <div 
                      key={item.sku}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        
                        {/* Rank + SKU + Style Info */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5 ${
                            item.rank === 1 ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20' :
                            item.rank === 2 ? 'bg-slate-300 text-slate-950' :
                            item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            #{item.rank}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                                {item.sku}
                              </span>
                              <span className="text-[11px] font-bold text-slate-300">
                                {item.color}
                              </span>
                            </div>
                            <span className="text-sm font-black text-white block mt-1 truncate">
                              {item.name}
                            </span>
                          </div>
                        </div>

                        {/* Sold Quantity & Revenue */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-black text-emerald-400 block">
                            {formatCurrency(item.totalRevenue)}
                          </span>
                          <span className="text-xs font-bold text-amber-400 block mt-0.5">
                            {item.totalQty} {item.totalQty === 1 ? 'pair/pc' : 'pairs/pcs'} sold
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {item.ordersCount} orders
                          </span>
                        </div>
                      </div>

                      {/* Demand Meter Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                          <div 
                            style={{ width: `${item.percentOfMax}%` }}
                            className="h-full bg-gradient-to-r from-amber-500 to-rose-400 rounded-full"
                          />
                        </div>
                      </div>

                      {/* Sizes Sold in this style */}
                      {Object.keys(item.sizesSold).length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Sizes Sold:</span>
                          {Object.entries(item.sizesSold).map(([sz, qty]) => (
                            <span 
                              key={sz}
                              className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold"
                            >
                              Sz {sz}: <strong className="text-amber-400">{qty}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  इस फ़िल्टर में अभी तक कोई बिक्री रिकॉर्ड नहीं है।
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* B. SIZE-WISE HOT SELLING (साइज़ के अनुसार) */}
          {/* ========================================================= */}
          {(hotSellingView === 'both' || hotSellingView === 'size') && (
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-black text-white">
                    Size-Wise Demand Ranking (साइज़ अनुसार बिक्री)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Total {sizeWiseHotSelling.totalSoldQty} pieces sold
                </span>
              </div>

              {sizeWiseHotSelling.overall.length > 0 ? (
                <div className="space-y-3">
                  {sizeWiseHotSelling.overall.map((szItem) => {
                    const isHot = szItem.rank <= 2;
                    return (
                      <div 
                        key={szItem.size}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/40 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          
                          {/* Size Pill + Rank */}
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-slate-900 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-mono font-black text-base shadow-inner">
                              {szItem.size}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">
                                  Size {szItem.size}
                                </span>
                                {isHot && (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                    <Flame className="w-2.5 h-2.5 fill-rose-400" />
                                    <span>Hot Demand #{szItem.rank}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {szItem.categoriesList.map(cId => {
                                  const found = categories.find(c => c.id === cId);
                                  return found ? found.label : cId;
                                }).join(', ')}
                              </span>
                            </div>
                          </div>

                          {/* Units & Revenue */}
                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-400 block">
                              {formatCurrency(szItem.totalRevenue)}
                            </span>
                            <span className="text-xs font-bold text-white block mt-0.5">
                              {szItem.totalQty} sold ({szItem.sharePct}% share)
                            </span>
                          </div>

                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                            <div 
                              style={{ width: `${szItem.sharePct}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHot ? 'bg-gradient-to-r from-amber-500 to-rose-400' : 'bg-emerald-400'
                              }`}
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {/* Footwear & Jacket Key Size Rule Summary Note */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      <strong>Store Rules:</strong> Women Footwear 37 (2 pcs required), Men Footwear 41 (2 pcs), Jackets M (2 pcs), बाकी सभी साइज़ 1-1 पीस।
                    </span>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  इस फ़िल्टर में अभी तक कोई बिक्री रिकॉर्ड नहीं है।
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
