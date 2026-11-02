import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { supabaseApi } from '../utils/supabase';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Layers, 
  Smartphone, 
  Wifi, 
  ShieldCheck, 
  Sparkles,
  FileSpreadsheet,
  Globe,
  Database,
  CloudUpload,
  Loader2
} from 'lucide-react';

export function SettingsView({ onOpenQrModal, onOpenGSheetModal }) {
  const { categories, addCategory, deleteCategory, inventory, isConnected, localIp } = useInventory();

  const [categoryLabel, setCategoryLabel] = useState('');
  const [sizesInput, setSizesInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📦');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseMsg, setSupabaseMsg] = useState('');

  const handleSyncSupabase = async () => {
    setIsSyncingSupabase(true);
    setSupabaseMsg('');
    try {
      const host = window.location.hostname;
      const apiUrl = window.location.port === '5173' ? `http://${host}:5000` : '';
      const token = localStorage.getItem('ky_token') || '';
      
      let syncedViaApi = false;
      try {
        const res = await fetch(`${apiUrl}/api/sync/supabase`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (res.ok && !data.error) {
            setSupabaseMsg(`✅ ${data.message || 'Successfully synced items to Supabase!'}`);
            syncedViaApi = true;
          }
        }
      } catch {
        syncedViaApi = false;
      }

      if (!syncedViaApi) {
        let count = 0;
        for (const item of inventory) {
          await supabaseApi.upsertProduct(item, 'usr-krishan');
          count++;
        }
        setSupabaseMsg(`✅ Successfully synced ${count} items directly to Supabase Cloud Database!`);
      }
    } catch (err) {
      setSupabaseMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const iconOptions = ['👟', '👠', '🧥', '👜', '🧢', '👔', '🕶️', '⌚', '🧣', '🧦', '🎒', '📦'];

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryLabel.trim()) {
      setMsg({ type: 'error', text: 'Please enter a category name' });
      return;
    }

    // Split sizes by comma or spaces
    const parsedSizes = sizesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (parsedSizes.length === 0) {
      setMsg({ type: 'error', text: 'Please enter at least one size (e.g. S, M, L or 40, 41 or Free Size)' });
      return;
    }

    setIsSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      await addCategory({
        label: categoryLabel.trim(),
        sizes: parsedSizes,
        icon: selectedIcon
      });

      setMsg({ type: 'success', text: `Category "${categoryLabel}" created! It now appears in your inventory.` });
      setCategoryLabel('');
      setSizesInput('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to create category' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (window.confirm(`Are you sure you want to remove category "${cat.label}"?`)) {
      try {
        await deleteCategory(cat.id);
        setMsg({ type: 'success', text: `Category "${cat.label}" removed.` });
      } catch (err) {
        setMsg({ type: 'error', text: err.message || 'Could not delete category' });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>Inventory Settings & Categories</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your product categories, custom sizes, and multi-device connection configurations.
        </p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
          msg.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {msg.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ADD NEW CATEGORY CARD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add New Category</span>
        </h2>

        <form onSubmit={handleCreateCategory} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                placeholder="e.g. Belts, Caps, Kids Shoes, Accessories"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Choose Emoji / Icon
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-base border transition ${
                      selectedIcon === icon 
                        ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500/40' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Available Sizes (Comma Separated) *
            </label>
            <input
              type="text"
              value={sizesInput}
              onChange={(e) => setSizesInput(e.target.value)}
              placeholder="e.g. S, M, L, XL, XXL  or  28, 30, 32, 34  or  Free Size"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Enter the exact size labels separated by comma that will appear in the inventory columns.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isSubmitting ? 'Creating Category...' : 'Create Category'}</span>
          </button>

        </form>
      </div>

      {/* ACTIVE CATEGORIES LIST */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Active Categories ({categories.length})</span>
        </h2>

        <div className="divide-y divide-slate-800">
          {categories.map((cat) => {
            const productCount = inventory.filter(p => p.category === cat.id).length;

            return (
              <div key={cat.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || '📦'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{cat.label}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {productCount} items
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Sizes: {cat.sizes.join(', ')}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition"
                    title={`Remove ${cat.label}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GOOGLE SHEETS & DAILY EXCEL BACKUP */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-3">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Google Sheet & Daily Backup System</span>
        </h2>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-white text-sm mb-0.5">Automated Multi-Tab Excel & Live Sheet Sync</div>
            <p className="text-slate-400 leading-relaxed max-w-xl">
              Sync all current footwear and jacket stock, sales records, and warehouse dispatches directly to your Google Sheet or download a full 4-tab Excel backup file anytime.
            </p>
          </div>

          <button
            onClick={onOpenGSheetModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition active:scale-95 whitespace-nowrap flex-shrink-0"
          >
            Configure Google Sheet Sync
          </button>
        </div>
      </div>

      {/* SUPABASE CLOUD DATABASE & NETLIFY */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Supabase Cloud Database & Netlify Sync</span>
          </h2>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Configured
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="text-slate-400 font-bold mb-0.5">Connected Supabase Project URL:</div>
              <div className="font-mono text-amber-300 font-bold select-all text-xs sm:text-sm">
                https://pztpvqxadtjdtbkjdsai.supabase.co
              </div>
            </div>

            <button
              onClick={handleSyncSupabase}
              disabled={isSyncingSupabase}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
            >
              {isSyncingSupabase ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing to Supabase...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Sync All 143 Items to Supabase</span>
                </>
              )}
            </button>
          </div>

          {supabaseMsg && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium">
              {supabaseMsg}
            </div>
          )}

          <p className="text-slate-400 leading-relaxed">
            Agar aapne Supabase mein abhi tak tables create nahi ki hain, to project ke root mein bani <span className="font-mono text-amber-300">supabase_schema.sql</span> file ka code Supabase Dashboard ke <strong>SQL Editor</strong> mein paste karke <strong>Run</strong> daba dijiye. Uske baad upar diye gaye button se saara data 1-click mein cloud par sync ho jayega.
          </p>
        </div>
      </div>
      {/* PHONE QR CODE ACCESS (MOBILE LIVE SCANNER) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-3">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>Mobile Phone Live Connection (QR Code)</span>
        </h2>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-white text-sm mb-0.5">Connect Mobile / Phone Camera Barcode Scanner</div>
            <p className="text-slate-400 leading-relaxed max-w-xl">
              Scan the QR code with your mobile camera while connected to the same Wi-Fi to use your smartphone as a handheld wireless barcode scanner or view live stock.
            </p>
          </div>

          <button
            onClick={onOpenQrModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 whitespace-nowrap flex-shrink-0 flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Show Phone QR Code</span>
          </button>
        </div>
      </div>

      {/* SYSTEM & CONNECTION INFO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-3">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Device Sync & Network Address</span>
        </h2>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">Local Wi-Fi Network Address:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              http://{localIp}:5173
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-mono">
            Active Store Port: 5173 / 5000
          </div>
        </div>
      </div>

    </div>
  );
}
