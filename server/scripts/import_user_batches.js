import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newBatches = [
  // --- BATCH 1: WOMEN FOOTWEAR (8 Articles) ---
  {
    category: 'women_footwear',
    styleCategory: 'Block Heels',
    brand: 'Saint G',
    costPrice: 2200,
    sellingPrice: 4499,
    displaySize: '37',
    items: [
      { sku: 'SG-F-1760-LIGHTTAUPE', color: 'Light Taupe', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } },
      { sku: 'SG-F-1939-BRODO', color: 'Bordo', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } },
      { sku: 'SG-F-1765-BROWN', color: 'Brown', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } },
      { sku: 'SG-F-103-BROWN', color: 'Brown', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 0, '40': 1, '41': 1 } },
      { sku: 'SG-F-1942-BLACK', color: 'Black', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } },
      { sku: 'SG-F-1995-BLACK', color: 'Black', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } },
      { sku: 'SG-F-1001-BROWN', color: 'Brown', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } },
      { sku: 'SG-F-1994-BLACK', color: 'Black', sizes: { '35': 0, '36': 1, '37': 1, '38': 1, '39': 1, '40': 1, '41': 1 } }
    ]
  },

  // --- BATCH 2: MENS FOOTWEAR (10 Articles) ---
  {
    category: 'men_footwear',
    styleCategory: 'Leather Shoes',
    brand: 'Saint G',
    costPrice: 3800,
    sellingPrice: 7499,
    displaySize: '41',
    items: [
      { sku: 'SGM-12-BLACK', color: 'Black', sizes: { '40': 1, '41': 1, '42': 1, '43': 1, '44': 1, '45': 0 } },
      { sku: 'SGM-65-BLACK', color: 'Black', sizes: { '40': 1, '41': 1, '42': 1, '43': 1, '44': 1, '45': 0 } },
      { sku: 'SGM-09-BEIGE', color: 'Beige', sizes: { '40': 1, '41': 1, '42': 1, '43': 1, '44': 0, '45': 0 } },
      { sku: 'SGM-46-BLACK', color: 'Black', sizes: { '40': 1, '41': 1, '42': 1, '43': 1, '44': 1, '45': 0 } },
      { sku: 'SGM-20-BLACK', color: 'Black', sizes: { '40': 0, '41': 1, '42': 1, '43': 1, '44': 0, '45': 0 } },
      { sku: 'SGM-43-NAVY', color: 'Navy', sizes: { '40': 1, '41': 0, '42': 1, '43': 1, '44': 1, '45': 0 } },
      { sku: 'SGM-43-BLACK', color: 'Black', sizes: { '40': 1, '41': 1, '42': 3, '43': 1, '44': 1, '45': 0 } },
      { sku: 'SGM-41-BROWN', color: 'Brown', sizes: { '40': 0, '41': 1, '42': 0, '43': 0, '44': 0, '45': 0 } },
      { sku: 'SGM-09-BROWN', color: 'Brown', sizes: { '40': 0, '41': 2, '42': 2, '43': 1, '44': 0, '45': 0 } },
      { sku: 'SGM-22-BROWN', color: 'Brown', sizes: { '40': 1, '41': 2, '42': 1, '43': 1, '44': 0, '45': 0 } }
    ]
  },

  // --- BATCH 3: MENS JACKET (17 Articles) ---
  {
    category: 'men_jacket',
    styleCategory: 'Leather Jacket',
    brand: 'Saint G',
    costPrice: 4500,
    sellingPrice: 8999,
    displaySize: 'M',
    items: [
      { sku: 'JK-M-04-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-01-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-01-CHOCOLATE', color: 'Chocolate', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 0, 'XXL': 1 } },
      { sku: 'JK-M-29-BLUE', color: 'Blue', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      // JK-M-29-CHOCOLATE appears in both row 5 (1,2,1,1,1) and row 10 (1,2,1,1,1) -> Combined 2, 4, 2, 2, 2
      { sku: 'JK-M-29-CHOCOLATE', color: 'Chocolate', sizes: { 'S': 2, 'M': 4, 'L': 2, 'XL': 2, 'XXL': 2 } },
      { sku: 'JK-M-08-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-34-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-11-BLACKWHITE', color: 'Black White', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-M-07-TAN', color: 'Tan', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-M-76-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-78-BROWN', color: 'Brown', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-81-BROWN', color: 'Brown', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-36-DARKGREY', color: 'Dark Grey', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-56-DARKTAN', color: 'Dark Tan', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-23-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-47-DARK-GREY', color: 'Dark Grey', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 1 } },
      { sku: 'JK-M-55-BLACK', color: 'Black', sizes: { 'S': 0, 'M': 1, 'L': 0, 'XL': 0, 'XXL': 0 } }
    ]
  },

  // --- BATCH 4: WOMEN JACKET (14 Articles) ---
  {
    category: 'women_jacket',
    styleCategory: 'Leather Jacket',
    brand: 'Saint G',
    costPrice: 3800,
    sellingPrice: 7499,
    displaySize: 'M',
    items: [
      { sku: 'JK-F-04-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-19-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-06-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-02-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-06-GREY', color: 'Grey', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-38-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-13-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-58-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-63-OLIVE', color: 'Olive', sizes: { 'S': 1, 'M': 1, 'L': 1, 'XL': 1, 'XXL': 0 } },
      { sku: 'JK-F-39-GREY', color: 'Grey', sizes: { 'S': 1, 'M': 2, 'L': 0, 'XL': 0, 'XXL': 0 } },
      { sku: 'JK-F-52-BLACK', color: 'Black', sizes: { 'S': 0, 'M': 1, 'L': 0, 'XL': 0, 'XXL': 0 } },
      { sku: 'JK-F-51-BLACK', color: 'Black', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 0, 'XXL': 0 } },
      { sku: 'JK-F-06-BROWN', color: 'Brown', sizes: { 'S': 1, 'M': 2, 'L': 1, 'XL': 0, 'XXL': 0 } },
      { sku: 'JK-F-19-BROWN', color: 'Brown', sizes: { 'S': 0, 'M': 2, 'L': 1, 'XL': 0, 'XXL': 0 } }
    ]
  }
];

function runImport() {
  const userInvPath = path.resolve(__dirname, '../data/users/usr-krishan/inventory.json');
  const defaultInvPath = path.resolve(__dirname, '../data/inventory.json');

  let inventory = [];
  if (fs.existsSync(userInvPath)) {
    inventory = JSON.parse(fs.readFileSync(userInvPath, 'utf-8'));
  }

  let addedCount = 0;
  let updatedCount = 0;

  newBatches.forEach(batch => {
    batch.items.forEach(item => {
      const existingIdx = inventory.findIndex(p => p.sku?.toUpperCase() === item.sku.toUpperCase());
      const now = new Date().toISOString();

      if (existingIdx !== -1) {
        // Update existing
        inventory[existingIdx] = {
          ...inventory[existingIdx],
          sizes: item.sizes,
          color: item.color,
          displaySize: batch.displaySize,
          category: batch.category,
          styleCategory: batch.styleCategory,
          brand: batch.brand,
          costPrice: batch.costPrice,
          sellingPrice: batch.sellingPrice,
          updatedAt: now
        };
        updatedCount++;
      } else {
        // Add new
        const newProduct = {
          id: `prod-${batch.category.slice(0, 3)}-${item.sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          sku: item.sku,
          name: `Article ${item.sku}`,
          brand: batch.brand,
          category: batch.category,
          styleCategory: batch.styleCategory,
          color: item.color,
          costPrice: batch.costPrice,
          sellingPrice: batch.sellingPrice,
          sizes: item.sizes,
          displaySize: batch.displaySize,
          imageUrl: '',
          notes: `Batch added ${item.sku}`,
          createdAt: now,
          updatedAt: now
        };
        inventory.push(newProduct);
        addedCount++;
      }
    });
  });

  console.log(`✅ Processed: ${addedCount} new articles added, ${updatedCount} updated.`);
  console.log(`📦 Total inventory count now: ${inventory.length}`);

  // Save to user storage
  fs.writeFileSync(userInvPath, JSON.stringify(inventory, null, 2), 'utf-8');
  console.log('💾 Saved to', userInvPath);

  // Save to default storage
  fs.writeFileSync(defaultInvPath, JSON.stringify(inventory, null, 2), 'utf-8');
  console.log('💾 Saved to', defaultInvPath);
}

runImport();
