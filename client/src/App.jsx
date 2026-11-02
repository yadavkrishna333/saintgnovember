import React, { useState } from 'react';
import { useInventory } from './context/InventoryContext';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { SoldProductsView } from './views/SoldProductsView';
import { ReplenishmentView } from './views/ReplenishmentView';
import { WarehouseSendView } from './views/WarehouseSendView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { ProductModal } from './components/ProductModal';
import { QuickSaleModal } from './components/QuickSaleModal';
import { QrCodeModal } from './components/QrCodeModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { LoginModal } from './components/LoginModal';

export function App() {
  const { activeTab, setActiveTab, currentUser, isLoginModalOpen, setIsLoginModalOpen } = useInventory();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  
  const [saleProduct, setSaleProduct] = useState(null);
  const [saleInitialSize, setSaleInitialSize] = useState(null);

  const [replenishPreselected, setReplenishPreselected] = useState(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGSheetModalOpen, setIsGSheetModalOpen] = useState(false);

  const handleEdit = (product) => {
    setEditProduct(product);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditProduct(null);
  };

  const handleQuickSale = (product, size = null) => {
    setSaleProduct(product);
    setSaleInitialSize(size);
  };

  const handleReplenish = (product) => {
    setReplenishPreselected(product);
    setActiveTab('replenishment');
  };

  const handleProductFoundFromScan = (product) => {
    setSaleProduct(product);
    setSaleInitialSize(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-amber-500 selection:text-slate-950">
      
      {/* Desktop Sidebar */}
      <Sidebar
        onOpenAddModal={() => { setEditProduct(null); setIsAddModalOpen(true); }}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenGSheetModal={() => setIsGSheetModalOpen(true)}
      />

      {/* Mobile Top App Bar & Bottom Tabs */}
      <MobileNav
        onOpenAddModal={() => { setEditProduct(null); setIsAddModalOpen(true); }}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenGSheetModal={() => setIsGSheetModalOpen(true)}
      />

      {/* Main App Content View */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenAddModal={() => { setEditProduct(null); setIsAddModalOpen(true); }}
              onOpenQuickSale={handleQuickSale}
              onOpenReplenish={handleReplenish}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              onOpenAddModal={() => { setEditProduct(null); setIsAddModalOpen(true); }}
              onEditProduct={handleEdit}
              onQuickSale={handleQuickSale}
              onOpenReplenish={handleReplenish}
              onOpenGSheetModal={() => setIsGSheetModalOpen(true)}
            />
          )}

          {activeTab === 'sold' && (
            <SoldProductsView />
          )}

          {activeTab === 'replenishment' && (
            <ReplenishmentView
              preselectedProduct={replenishPreselected}
            />
          )}

          {activeTab === 'warehouse' && (
            <WarehouseSendView />
          )}

          {activeTab === 'history' && (
            <HistoryView />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onOpenQrModal={() => setIsQrModalOpen(true)}
              onOpenGSheetModal={() => setIsGSheetModalOpen(true)}
            />
          )}

        </main>
      </div>

      {/* Global Modals */}
      <ProductModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        editProduct={editProduct}
      />

      <QuickSaleModal
        isOpen={!!saleProduct}
        onClose={() => setSaleProduct(null)}
        product={saleProduct}
        initialSize={saleInitialSize}
      />

      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={handleProductFoundFromScan}
      />

      <GoogleSheetsSyncModal
        isOpen={isGSheetModalOpen}
        onClose={() => setIsGSheetModalOpen(false)}
      />

      <LoginModal
        isOpen={!currentUser || isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

    </div>
  );
}
