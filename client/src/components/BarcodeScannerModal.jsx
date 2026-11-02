import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useInventory } from '../context/InventoryContext';
import { X, ScanLine, AlertCircle, CheckCircle2 } from 'lucide-react';

export function BarcodeScannerModal({ isOpen, onClose, onProductFound }) {
  const { inventory } = useInventory();
  const [error, setError] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;

    if (isOpen) {
      setError('');
      setScannedCode('');

      // Wait for DOM element to mount
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode('camera-reader');
          html5QrCodeRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: 'environment' }, // Rear camera on mobile
            {
              fps: 10,
              qrbox: { width: 250, height: 180 }
            },
            (decodedText) => {
              // Scanned successfully!
              setScannedCode(decodedText);
              // Find product by barcode or SKU
              const matched = inventory.find(
                p => (p.barcode && p.barcode === decodedText) || 
                     (p.sku && p.sku.toLowerCase() === decodedText.toLowerCase())
              );

              if (matched) {
                // Stop camera and pass matched product
                html5QrCode.stop().then(() => {
                  onProductFound(matched);
                  onClose();
                }).catch(() => {
                  onProductFound(matched);
                  onClose();
                });
              } else {
                setError(`Scanned "${decodedText}", but no matching product was found in inventory.`);
              }
            },
            (errorMessage) => {
              // Frame parse failure (normal when searching for barcode)
            }
          ).catch(err => {
            console.error('Camera start error:', err);
            setError('Could not access camera. Please make sure camera permissions are allowed in your browser.');
          });
        } catch (e) {
          setError('Failed to initialize camera scanner.');
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current) {
          html5QrCodeRef.current.stop().catch(() => {}).then(() => {
            html5QrCodeRef.current.clear();
          });
        }
      };
    }
  }, [isOpen, inventory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Scan Shoe / Jacket Tag</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
          <div id="camera-reader" className="w-full h-full"></div>
        </div>

        {error ? (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <p className="text-xs text-center text-slate-400 mt-3">
            Point camera at shoe box barcode or jacket price tag
          </p>
        )}

      </div>
    </div>
  );
}
