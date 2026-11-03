const fs = require('fs');
const path = require('path');
const XLSX = require('../../client/node_modules/xlsx');

// 0. Ensure target folders exist
const productsDir = path.resolve('D:/Inventory/client/public/products');
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// 1. Read Excel workbook & MG SHOP sheet
const wbPath = 'D:/Inventory/MG SHOP STOCK AND PRICE LISTS.xlsx';
const wb = XLSX.readFile(wbPath);
const sheet = wb.Sheets['MG SHOP'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total rows in MG SHOP:', rawData.length);

// 2. Parse drawing1.xml and drawing1.xml.rels for exact 1:1 image row anchors
const drawingPath = 'D:/Inventory/temp_xlsx/xl/drawings/drawing1.xml';
const relsPath = 'D:/Inventory/temp_xlsx/xl/drawings/_rels/drawing1.xml.rels';
const mediaDir = 'D:/Inventory/temp_xlsx/xl/media';

const drawingXml = fs.readFileSync(drawingPath, 'utf8');
const relsXml = fs.readFileSync(relsPath, 'utf8');

const rels = {};
const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
let rm;
while ((rm = relRegex.exec(relsXml)) !== null) {
  rels[rm[1]] = rm[2];
}

const rowToImage = {};
const anchorRegex = /<xdr:(twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:\1>/g;
let am;
while ((am = anchorRegex.exec(drawingXml)) !== null) {
  const content = am[2];
  const fromColMatch = /<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(content);
  const blipMatch = /r:embed="([^"]+)"/.exec(content);
  if (fromColMatch && blipMatch) {
    const col = parseInt(fromColMatch[1], 10);
    const row = parseInt(fromColMatch[2], 10);
    const rId = blipMatch[1];
    rowToImage[row] = { col, rId, target: rels[rId] };
  }
}

console.log('Loaded drawing image anchors:', Object.keys(rowToImage).length);

// 3. Extract items from MG SHOP
let currentHeading = '';
const excelItems = [];

for (let r = 0; r < rawData.length; r++) {
  const row = rawData[r] || [];
  const colA = row[0];
  const colB = row[1];
  const colC = row[2];
  const colD = row[3];
  const colF = row[5];
  const colG = row[6];

  const isColBHeading = !colA && typeof colB === 'string' && colB.trim() && colB.trim() !== 'IMAGES' && colB.trim() !== 'MG SHOP STOCK AND PRICE LIST';
  const isColAHeading = typeof colA === 'string' && colA.trim() && !colC && isNaN(Number(colA)) && colA.trim() !== 'MG SHOP STOCK AND PRICE LIST';

  if (isColBHeading || isColAHeading) {
    currentHeading = (isColBHeading ? colB : colA).trim();
    continue;
  }
  if (typeof colC === 'string' && (colC.includes('SKU CODE') || colC.includes('CODE'))) continue;

  if (colC && typeof colC === 'string' && colC.trim()) {
    const sku = colC.trim();
    const mrp = typeof colD === 'number' ? colD : (parseFloat(String(colD || '').replace(/[^0-9.]/g, '')) || 0);
    const sp = typeof colG === 'number' ? colG : (parseFloat(String(colG || '').replace(/[^0-9.]/g, '')) || 0);
    const dis = typeof colF === 'number' ? colF : (parseFloat(String(colF || '').replace(/[^0-9.]/g, '')) || 0);
    const imgInfo = rowToImage[r];

    let imageFile = null;
    if (imgInfo && imgInfo.target) {
      imageFile = imgInfo.target.replace('../media/', '');
    }

    excelItems.push({
      excelRow: r + 1,
      styleCategory: currentHeading,
      sku,
      mrp,
      sp,
      dis,
      imageFile
    });
  }
}

console.log('Parsed Excel items:', excelItems.length);

// 4. Copy images to client/public/products/<sanitized-sku>.<ext>
let copiedImagesCount = 0;
excelItems.forEach(item => {
  if (item.imageFile) {
    const srcPath = path.join(mediaDir, item.imageFile);
    if (fs.existsSync(srcPath)) {
      const ext = item.imageFile.split('.').pop().toLowerCase();
      // Safe sanitized filename
      const safeSku = item.sku.replace(/[^A-Za-z0-9_-]/g, '_');
      const filename = `${safeSku}.${ext}`;
      const destPath = path.join(productsDir, filename);
      fs.copyFileSync(srcPath, destPath);
      item.savedImageUrl = `/products/${filename}`;
      copiedImagesCount++;
    } else {
      console.warn(`Source image missing for row ${item.excelRow}: ${item.imageFile}`);
    }
  } else {
    item.savedImageUrl = '';
  }
});

console.log(`Copied ${copiedImagesCount} images to ${productsDir}`);

// 5. Update Inventory
const activeInvPath = 'D:/Inventory/server/data/users/usr-krishan/inventory.json';
const backupInvPath = 'D:/Inventory/server/data/inventory.json';

const inventory = JSON.parse(fs.readFileSync(activeInvPath, 'utf8'));
console.log('Existing inventory count:', inventory.length);

function clean(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const manualEquivalents = {
  'SGF1761MARRON': 'SGF1761MAROON',
  'SGF1932SILVERMULTI': 'SGF1932SILVER',
  'SGF1932LIGHTGOLD': 'SGF1932GOLD',
  'SGF1576PORTROYALE': 'SGF1576PROYAL',
  'SGF1928BLUE': 'SGF1928NAVYBLUE',
  'SGF1885BROWN': 'SGF1885DRKBROWN',
  'SGF1863LIGHTBEIGE': 'SGF1863LBEIGE',
  'SGF1853OLDGOLD': 'SGF1853NGOLD',
  'SGF1855OLDGOLD': 'SGF1855NGOLD',
  'SGF1856OLDGOLD': 'SGF1856NGOLD',
  'SGF1931LIGHTGOLD': 'SGF1931GOLD',
  'SGF1905OLDGOLD': 'SGF1905NGOLD',
  'SGF1760LIGHTTAUPE': 'SGF1760TAUPE',
  'SGF1939BRODO': 'SGF1939BORDO',
  'SGF1842OFFWHITE': 'SGF1842OFFWHT',
  'JKM56DARKTAN': 'JKM56DRKTAN',
  'JKM36DARKGREY': 'JKM36DRKGREY',
  'JKM47DARKGREY': 'JKM47DARKGREY'
};

const matchedInvIds = new Set();
let updatedCount = 0;
let newlyAddedCount = 0;

excelItems.forEach(e => {
  const eClean = clean(e.sku);

  // Find in existing inventory
  let target = inventory.find(p => !matchedInvIds.has(p.id) && clean(p.sku) === eClean);

  if (!target) {
    target = inventory.find(p => !matchedInvIds.has(p.id) && manualEquivalents[clean(p.sku)] === eClean);
  }

  if (!target) {
    const normE = eClean
      .replace(/DRK/g, 'DARK')
      .replace(/WHT/g, 'WHITE')
      .replace(/BLK/g, 'BLACK')
      .replace(/BRN/g, 'BROWN')
      .replace(/LBEIGE/g, 'LIGHTBEIGE');

    target = inventory.find(p => {
      if (matchedInvIds.has(p.id)) return false;
      const normP = clean(p.sku)
        .replace(/DRK/g, 'DARK')
        .replace(/WHT/g, 'WHITE')
        .replace(/BLK/g, 'BLACK')
        .replace(/BRN/g, 'BROWN')
        .replace(/LBEIGE/g, 'LIGHTBEIGE');
      return normE === normP;
    });
  }

  if (target) {
    // UPDATE MATCHED PRODUCT
    matchedInvIds.add(target.id);
    if (e.savedImageUrl) target.imageUrl = e.savedImageUrl;
    if (e.mrp > 0) target.costPrice = e.mrp;
    if (e.sp > 0) target.sellingPrice = e.sp;
    if (e.styleCategory) target.styleCategory = e.styleCategory;
    target.brand = 'Saint G';
    target.updatedAt = new Date().toISOString();
    updatedCount++;
  } else {
    // ADD NEW PRODUCT FROM MG SHOP
    // Determine category from style heading
    let category = 'women_footwear';
    let defaultSizes = { '35': 0, '36': 0, '37': 0, '38': 0, '39': 0, '40': 0, '41': 0 };

    const style = e.styleCategory;
    if (style === 'Mens Boot') {
      category = 'men_footwear';
      defaultSizes = { '40': 0, '41': 0, '42': 0, '43': 0, '44': 0, '45': 0 };
    } else if (style === 'MENS JACKET') {
      category = 'men_jacket';
      defaultSizes = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    } else if (style === 'WOMENS JACKET') {
      category = 'women_jacket';
      defaultSizes = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    } else if (style === 'Apparels') {
      category = 'apparels';
      defaultSizes = { 'Free Size': 0 };
    } else if (style === 'Sunglasses') {
      category = 'sunglasses';
      defaultSizes = { 'Standard': 0 };
    }

    // Extract color from SKU if available
    const parts = e.sku.split('-');
    const color = parts.length > 2 ? parts[parts.length - 1] : '';

    const newProduct = {
      id: `prod-mg-${e.sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sku: e.sku,
      name: `Article ${e.sku}`,
      brand: 'Saint G',
      category,
      styleCategory: e.styleCategory,
      color,
      costPrice: e.mrp || 0,
      sellingPrice: e.sp || 0,
      sizes: defaultSizes,
      imageUrl: e.savedImageUrl || '',
      displaySize: null,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inventory.push(newProduct);
    matchedInvIds.add(newProduct.id);
    newlyAddedCount++;
  }
});

// Ensure all remaining products in inventory also have brand = "Saint G"
inventory.forEach(p => {
  p.brand = 'Saint G';
});

console.log(`Updated existing items: ${updatedCount}`);
console.log(`Newly added items from MG SHOP: ${newlyAddedCount}`);
console.log(`Total final inventory count: ${inventory.length}`);

// Save to disk
fs.writeFileSync(activeInvPath, JSON.stringify(inventory, null, 2), 'utf8');
fs.writeFileSync(backupInvPath, JSON.stringify(inventory, null, 2), 'utf8');
console.log('Saved updated inventory to local JSON files.');
