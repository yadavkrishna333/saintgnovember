// Google Apps Script Generator for KY / Saint G Multi-Store Inventory
// Staff / Owner can paste this code into Google Sheets (Extensions -> Apps Script)
// and click "Update Inventory" to deduct stock directly from Google Sheets!

export function generateGoogleAppsScript(store) {
  const storeId = store?.id || 'mg-sultanpur';
  const storeName = store?.name || 'MG Sultanpur Store';
  const storeUserId = store?.userId || 'usr-krishan';
  const supabaseUrl = 'https://pztpvqxadtjdtbkjdsai.supabase.co';
  const supabaseAnonKey = 'sb_publishable_1KGx3KPNl2FQJ22Q3zH25w_t2_1M8xw';

  return `/**
 * =======================================================================
 * ⚡ SAINT G / KY INVENTORY AUTO-SYNC SCRIPT
 * Store: ${storeName}
 * Store User ID: ${storeUserId}
 * =======================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Google Sheet me jayein: Extensions -> Apps Script
 * 2. Purana code hata kar ye sara code paste karein aur Save (Ctrl + S) karein.
 * 3. Sheet ko refresh karein -> Upar "⚡ Saint G Inventory" menu aa jayega!
 * 4. Ya Insert -> Drawing -> Ek button banayein "🔄 Update Inventory",
 *    right-click karke "Assign script" me likhein: updateInventoryFromSheet
 * 
 * COLUMNS FORMAT IN SHEET:
 * Col A (1): SR NO
 * Col B (2): DATE
 * Col C (3): SKU CODE
 * Col D (4): SIZE
 * Col E (5): LOCATION (Store ya Warehouse)
 * Col F (6): STATUS (Script yahan DEDUCTED mark karega)
 */

var CONFIG = {
  STORE_NAME: ${JSON.stringify(storeName)},
  STORE_USER_ID: ${JSON.stringify(storeUserId)},
  SUPABASE_URL: ${JSON.stringify(supabaseUrl)},
  SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)}
};

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Saint G Inventory')
    .addItem('🔄 Update Inventory (Auto Deduct Stock)', 'updateInventoryFromSheet')
    .addSeparator()
    .addItem('ℹ️ Check Sheet Status', 'checkSheetStatus')
    .addToUi();
}

function updateInventoryFromSheet() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 6);

  if (lastRow < 2) {
    ui.alert('⚠️ Koi data nahi mila! Sheet me SR NO, DATE, SKU CODE, SIZE, LOCATION likhein.');
    return;
  }

  // Ensure Column F header is "STATUS"
  var headerF = sheet.getRange(1, 6).getValue();
  if (!headerF || String(headerF).trim() === '') {
    sheet.getRange(1, 6).setValue('STATUS').setFontWeight('bold').setBackground('#f1f5f9');
  }

  // Read all rows
  var dataRange = sheet.getRange(1, 1, lastRow, lastCol);
  var values = dataRange.getValues();
  var headers = values[0].map(function(h) { return String(h || '').toLowerCase().trim(); });

  // Map column indices
  var colMap = {
    srNo: 0,
    date: 1,
    sku: 2,
    size: 3,
    location: 4,
    status: 5
  };

  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (h.indexOf('sku') !== -1 || h.indexOf('code') !== -1 || h.indexOf('article') !== -1) colMap.sku = c;
    else if (h.indexOf('size') !== -1 || h.indexOf('sz') !== -1) colMap.size = c;
    else if (h.indexOf('date') !== -1 || h.indexOf('time') !== -1 || h.indexOf('tarikh') !== -1) colMap.date = c;
    else if (h.indexOf('location') !== -1 || h.indexOf('source') !== -1 || h.indexOf('from') !== -1) colMap.location = c;
    else if (h.indexOf('status') !== -1 || h.indexOf('deducted') !== -1) colMap.status = c;
    else if (h.indexOf('sr') !== -1 || h.indexOf('no') !== -1 || h.indexOf('serial') !== -1) colMap.srNo = c;
  }

  // Collect un-deducted rows
  var pendingRows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var sku = String(row[colMap.sku] || '').trim();
    if (!sku || sku.toUpperCase() === 'TOTAL') continue;

    var status = String(row[colMap.status] || '').toUpperCase().trim();
    if (status.indexOf('DEDUCTED') !== -1 || status.indexOf('PROCESSED') !== -1) {
      continue; // Skip already deducted rows!
    }

    var size = String(row[colMap.size] || '').trim();
    var loc = String(row[colMap.location] || '').toLowerCase().trim();
    var dateVal = row[colMap.date];
    var dateStr = dateVal instanceof Date ? Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(dateVal || '');
    var srNo = String(row[colMap.srNo] || (r));

    var isWarehouse = loc.indexOf('warehouse') !== -1 || loc.indexOf('wh') !== -1 || loc.indexOf('godown') !== -1;

    pendingRows.push({
      rowIndex: r + 1, // 1-based sheet row
      srNo: srNo,
      date: dateStr,
      sku: sku,
      cleanSku: sku.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      size: size || 'Standard',
      location: isWarehouse ? 'warehouse' : 'store',
      isWarehouse: isWarehouse
    });
  }

  if (pendingRows.length === 0) {
    ui.alert('ℹ️ Sabhi rows already DEDUCTED hain! Koi naya un-deducted sale row nahi mila.');
    return;
  }

  // Confirm with user
  var promptMsg = 'Store: ' + CONFIG.STORE_NAME + '\\n' +
    'Total New Sales to Deduct: ' + pendingRows.length + ' pcs\\n' +
    'Store Stock Minus: ' + pendingRows.filter(function(p) { return !p.isWarehouse; }).length + ' pcs\\n' +
    'Warehouse Sales: ' + pendingRows.filter(function(p) { return p.isWarehouse; }).length + ' pcs (No Stock Minus)\\n\\n' +
    'Kya aap website inventory update karna chahte hain?';

  var response = ui.alert('Confirm Inventory Update', promptMsg, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    return;
  }

  // Fetch current store inventory from Supabase
  var supabaseHeaders = {
    'apikey': CONFIG.SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

  var fetchUrl = CONFIG.SUPABASE_URL + '/rest/v1/inventory?user_id=eq.' + encodeURIComponent(CONFIG.STORE_USER_ID) + '&select=*';
  var invRes = UrlFetchApp.fetch(fetchUrl, {
    method: 'GET',
    headers: supabaseHeaders,
    muteHttpExceptions: true
  });

  if (invRes.getResponseCode() >= 400) {
    ui.alert('❌ Error fetching inventory from Supabase: ' + invRes.getContentText());
    return;
  }

  var inventoryList = JSON.parse(invRes.getContentText());
  var invMap = {};
  for (var i = 0; i < inventoryList.length; i++) {
    var p = inventoryList[i];
    if (p.sku) {
      invMap[p.sku.toUpperCase().replace(/[^A-Z0-9]/g, '')] = p;
    }
  }

  var modifiedProductsMap = {};
  var salesToInsert = [];
  var storeDeductedCount = 0;
  var warehouseCount = 0;
  var nowTimestamp = new Date();
  var dateDeductedText = Utilities.formatDate(nowTimestamp, Session.getScriptTimeZone(), 'dd-MMM HH:mm');

  for (var k = 0; k < pendingRows.length; k++) {
    var item = pendingRows[k];
    var matchedProduct = invMap[item.cleanSku];

    var saleRecord = {
      id: 'sale-gsheet-' + Date.now() + '-' + k,
      user_id: CONFIG.STORE_USER_ID,
      source: item.isWarehouse ? 'warehouse' : 'store',
      product_id: matchedProduct ? matchedProduct.id : null,
      sku: matchedProduct ? matchedProduct.sku : item.sku,
      size: item.size,
      quantity: 1,
      unit_price: matchedProduct ? Number(matchedProduct.selling_price || 0) : 0,
      total_amount: matchedProduct ? Number(matchedProduct.selling_price || 0) : 0,
      payment_mode: 'Google Sheet Daily Sales',
      customer_name: 'Daily Sales (' + CONFIG.STORE_NAME + ')',
      created_at: nowTimestamp.toISOString()
    };
    salesToInsert.push(saleRecord);

    if (item.isWarehouse) {
      warehouseCount++;
    } else {
      storeDeductedCount++;
      if (matchedProduct) {
        var sizes = matchedProduct.sizes || {};
        var curStock = Number(sizes[item.size] || 0);
        sizes[item.size] = Math.max(0, curStock - 1);
        matchedProduct.sizes = sizes;
        matchedProduct.updated_at = nowTimestamp.toISOString();
        modifiedProductsMap[matchedProduct.id] = matchedProduct;
      }
    }

    // Mark row as DEDUCTED in Google Sheet
    sheet.getRange(item.rowIndex, colMap.status + 1).setValue('DEDUCTED (' + dateDeductedText + ')');
    sheet.getRange(item.rowIndex, 1, 1, 6).setBackground('#dcfce7'); // Light green
  }

  // Upsert modified products to Supabase
  var modifiedList = [];
  for (var pid in modifiedProductsMap) {
    var m = modifiedProductsMap[pid];
    modifiedList.push({
      id: m.id,
      user_id: CONFIG.STORE_USER_ID,
      sku: m.sku,
      name: m.name || m.sku || 'Article',
      sizes: m.sizes,
      cost_price: Number(m.cost_price || 0),
      selling_price: Number(m.selling_price || 0),
      category: m.category || 'women_footwear',
      brand: m.brand || 'Saint G',
      color: m.color || 'Standard',
      style_category: m.style_category || '',
      updated_at: m.updated_at
    });
  }

  if (modifiedList.length > 0) {
    var upsertRes = UrlFetchApp.fetch(CONFIG.SUPABASE_URL + '/rest/v1/inventory', {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      payload: JSON.stringify(modifiedList),
      muteHttpExceptions: true
    });
    if (upsertRes.getResponseCode() >= 400) {
      Logger.log('Supabase inventory upsert warning: ' + upsertRes.getContentText());
    }
  }

  // Insert sales records
  if (salesToInsert.length > 0) {
    UrlFetchApp.fetch(CONFIG.SUPABASE_URL + '/rest/v1/sales', {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(salesToInsert),
      muteHttpExceptions: true
    });
  }

  SpreadsheetApp.flush();

  ui.alert(
    '✅ Success / अपडेट सफल!',
    'Store: ' + CONFIG.STORE_NAME + '\\n\\n' +
    '✓ Store Sales: ' + storeDeductedCount + ' items inventory se minus ho gaye.\\n' +
    '✓ Warehouse Sales: ' + warehouseCount + ' items recorded (Inventory unchanged).\\n' +
    '✓ Google Sheet rows me "DEDUCTED" status mark kar diya gaya hai.',
    ui.ButtonSet.OK
  );
}

function checkSheetStatus() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Sheet me koi data rows nahi hain.');
    return;
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var deducted = 0;
  var pending = 0;
  for (var i = 0; i < values.length; i++) {
    var sku = String(values[i][2] || '').trim();
    if (!sku) continue;
    var st = String(values[i][5] || '').toUpperCase();
    if (st.indexOf('DEDUCTED') !== -1) deducted++;
    else pending++;
  }
  ui.alert(
    'Sheet Status (' + CONFIG.STORE_NAME + '):\\n' +
    '- Total Sales Rows: ' + (deducted + pending) + '\\n' +
    '- Already Deducted: ' + deducted + '\\n' +
    '- Pending (Un-deducted): ' + pending
  );
}
`;
}
