// Store Configurations for KY / Saint G Inventory System

export const STORES = [
  {
    id: 'mg-sultanpur',
    name: 'MG Sultanpur Store',
    shortName: 'MG Sultanpur',
    code: 'MGS',
    city: 'New Delhi',
    address: 'MG Road, Sultanpur, New Delhi',
    tag: 'Main Store / Flagship',
    userId: 'usr-krishan', // Preserves 100% of existing inventory, sales & history
    sheetTabName: 'MG Sultanpur Daily Sales',
    colorKey: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400'
  },
  {
    id: 'khan-market',
    name: 'Khan Market Store',
    shortName: 'Khan Market',
    code: 'KMS',
    city: 'New Delhi',
    address: 'Khan Market, Rabindra Nagar, New Delhi',
    tag: 'Delhi Retail Outlet',
    userId: 'usr-store-khan-market',
    sheetTabName: 'Khan Market Daily Sales',
    colorKey: 'blue',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-400'
  },
  {
    id: 'jaipur',
    name: 'Jaipur Store',
    shortName: 'Jaipur Store',
    code: 'JPR',
    city: 'Jaipur',
    address: 'MI Road / C-Scheme, Jaipur, Rajasthan',
    tag: 'Rajasthan Retail Outlet',
    userId: 'usr-store-jaipur',
    sheetTabName: 'Jaipur Daily Sales',
    colorKey: 'rose',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-400'
  }
];

export const DEFAULT_STORE_ID = 'mg-sultanpur';

export function getStoreById(storeId) {
  return STORES.find(s => s.id === storeId) || STORES[0];
}

export function getStoreByUserId(userId) {
  return STORES.find(s => s.userId === userId) || STORES[0];
}
