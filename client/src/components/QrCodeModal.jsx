import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useInventory } from '../context/InventoryContext';
import { X, Smartphone, Copy, Check, Wifi, Globe, ExternalLink } from 'lucide-react';

export function QrCodeModal({ isOpen, onClose }) {
  const { localIp } = useInventory();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Determine mobile URL:
  // If we are currently on localhost, use local IP. If already on a domain/tunnel, use current origin.
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const targetHost = isLocalhost ? (localIp || 'localhost') : window.location.hostname;
  const targetPort = window.location.port ? `:${window.location.port}` : '';
  const mobileUrl = `${window.location.protocol}//${targetHost}${targetPort}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-white">Connect Phone (Mobile Sync)</h2>
        <p className="text-xs text-slate-400 mt-1 max-y">
          Phone se scan karein aur dono screen par real-time update payein
        </p>

        {/* QR Code Container */}
        <div className="my-5 p-4 bg-white rounded-2xl inline-block shadow-xl shadow-indigo-500/10 border-4 border-indigo-500/20">
          <QRCodeSVG 
            value={mobileUrl} 
            size={200}
            level="M"
            includeMargin={true}
          />
        </div>

        {/* Mobile URL & Copy */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-left mb-4">
          <div className="min-w-0 flex-1 px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile URL</span>
            <span className="font-mono text-xs sm:text-sm text-indigo-300 font-bold truncate block">
              {mobileUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="text-left bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
            <span>Apne phone ka Camera ya Google Lens kholiye aur upar diye QR code ko scan kijiye.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
            <span>Dono devices (PC aur Phone) ek hi Wi-Fi / Hotspot se connected hone chahiye.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">✓</span>
            <span>Connect hote hi PC ya Phone kisi par bhi click karenge toh turant same time update hoga!</span>
          </div>
        </div>

      </div>
    </div>
  );
}
