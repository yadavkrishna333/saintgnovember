-- ============================================================
-- KY INVENTORY - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase project SQL Editor to create tables!
-- ============================================================

-- 1. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'usr-krishan',
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  style_category TEXT,
  color TEXT,
  category TEXT NOT NULL DEFAULT 'women_footwear',
  brand TEXT DEFAULT 'KY',
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  sizes JSONB DEFAULT '{}'::jsonb,
  display_size TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on SKU and user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_user_sku ON public.inventory (user_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory (user_id, category);

-- 2. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'usr-krishan',
  product_id TEXT REFERENCES public.inventory(id) ON DELETE SET NULL,
  sku TEXT,
  product_name TEXT,
  style_category TEXT,
  color TEXT,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'Cash',
  customer_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales (user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_sku ON public.sales (sku);

-- 3. REPLENISHMENT TABLE
CREATE TABLE IF NOT EXISTS public.replenishments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'usr-krishan',
  invoice_no TEXT,
  supplier TEXT,
  notes TEXT,
  total_count INTEGER DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WAREHOUSE SENDS TABLE
CREATE TABLE IF NOT EXISTS public.warehouse_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'usr-krishan',
  dispatch_no TEXT,
  destination TEXT,
  reason TEXT,
  notes TEXT,
  total_count INTEGER DEFAULT 0,
  sent_items JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - Permissive public access for quick mobile testing
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replenishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to replenishments" ON public.replenishments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to warehouse_sends" ON public.warehouse_sends FOR ALL USING (true) WITH CHECK (true);
