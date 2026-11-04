import os
import json
import shutil
import re

MG_PHOTOS_DIR = r"d:\Inventory\MG SHOP PHOTOS"
PRODUCTS_DIR = r"d:\Inventory\client\public\products"
USER_INV_PATH = r"d:\Inventory\server\data\users\usr-krishan\inventory.json"
SERVER_INV_PATH = r"d:\Inventory\server\data\inventory.json"

os.makedirs(MG_PHOTOS_DIR, exist_ok=True)
os.makedirs(PRODUCTS_DIR, exist_ok=True)

# 1. First copy all files from MG SHOP PHOTOS to PRODUCTS_DIR
mg_files = os.listdir(MG_PHOTOS_DIR)
print(f"Total files in MG SHOP PHOTOS: {len(mg_files)}")
copied = 0
for f in mg_files:
    src = os.path.join(MG_PHOTOS_DIR, f)
    dst = os.path.join(PRODUCTS_DIR, f)
    if os.path.isfile(src):
        shutil.copy2(src, dst)
        copied += 1
print(f"Copied {copied} files to client/public/products")

# 2. Load inventory items
with open(USER_INV_PATH, 'r', encoding='utf-8') as f:
    inv = json.load(f)

# List of aliases: (inventory_sku, candidate_source_files)
aliases = {
    'SG-F-1847-DARKBROWN': ['SG-F-1847-DRK-BROWN.png', 'SG-F-1847-PLATIN.png'],
    'SG-F-1930-LIGHTGOLD': ['SG-F-1930-GOLD.png'],
    'SG-F-1863-LIGHTBEIGE': ['SG-F-1863-L-BEIGE.png', 'SG-F-1863-BEIGE.png'],
    'SG-F-1576-PORTROYALE': ['SG-F-1576-PORTROYAL.png', 'SG-F-1576-BLACK.png'],
    'SG-F-1932-SILVERMULTI': ['SG-F-1932-SILVER.png', 'SG-F-1932-GOLD.png'],
    'SG-F-1932-LIGHTGOLD': ['SG-F-1932-GOLD.png', 'SG-F-1932-SILVER.png'],
    'SG-F-1931-LIGHTGOLD': ['SG-F-1931-GOLD.png'],
    'SG-F-1885-BROWN': ['SG-F-1885-DARKBROWN.png', 'SG-F-1885-D-BROWN.png'],
    'SG-F-1761-MARRON': ['SG-F-1761-MAROON.png', 'SG-F-1761-BLACK.png'],
    'SG-F-1760-LIGHTTAUPE': ['SG-F-1760-TAUPE.png'],
    'SG-F-1939-BRODO': ['SG-F-1939-BORDO.png'],
    'SG-F-1630-OFFWHITE': ['SG-F-1630-BEIGE.png', 'SG-F-1630-BLACK.png'],
    'SG-F-1839_brown': ['SG-F-1839-BLACK.png', 'SG-F-1839_brown.png'],
    'JK-M-36-DARKGREY': ['JK-M-36-DRKGREY.png'],
    'JK-M-56-DARKTAN': ['JK-M-56-DRKTAN.png'],
    'JK-M-47-DARK-GREY': ['JK-M-47-DARKGREY.png'],
    'JK-F-19-BROWN': ['JK-F-19-TAN.png', 'JK-F-19-BLACK.png']
}

for inv_sku, candidates in aliases.items():
    target_path = os.path.join(PRODUCTS_DIR, f"{inv_sku}.png")
    target_mg_path = os.path.join(MG_PHOTOS_DIR, f"{inv_sku}.png")
    for cand in candidates:
        cand_path = os.path.join(PRODUCTS_DIR, cand)
        if os.path.exists(cand_path):
            shutil.copy2(cand_path, target_path)
            shutil.copy2(cand_path, target_mg_path)
            print(f"Created alias: {inv_sku}.png <- {cand}")
            break

# 3. Verify all inventory items
all_prod_files = set(f.upper() for f in os.listdir(PRODUCTS_DIR))
matched_count = 0
missing = []

for item in inv:
    sku = item['sku'].strip()
    target_filename = f"{sku}.png".upper()
    if target_filename in all_prod_files:
        matched_count += 1
        item['imageUrl'] = f"/products/{sku}.png"
    else:
        # Check if any file contains model code
        model_part = sku.split('-')[0] + '-' + sku.split('-')[1] if len(sku.split('-')) >= 2 else sku
        matched_file = None
        for pf in all_prod_files:
            if model_part in pf:
                matched_file = pf
                break
        if matched_file:
            # Copy to exact sku name
            actual_file = [f for f in os.listdir(PRODUCTS_DIR) if f.upper() == matched_file][0]
            shutil.copy2(os.path.join(PRODUCTS_DIR, actual_file), os.path.join(PRODUCTS_DIR, f"{sku}.png"))
            shutil.copy2(os.path.join(PRODUCTS_DIR, actual_file), os.path.join(MG_PHOTOS_DIR, f"{sku}.png"))
            matched_count += 1
            item['imageUrl'] = f"/products/{sku}.png"
            print(f"Model-matched: {sku} <- {actual_file}")
        else:
            missing.append(sku)
            # Default placeholder image path
            item['imageUrl'] = f"/products/{sku}.png"

print(f"\nInventory Verification:")
print(f"Total articles: {len(inv)}")
print(f"Matched with image on disk: {matched_count}")
print(f"Unmatched: {len(missing)}: {missing}")

# 4. Save updated inventory JSON files
with open(USER_INV_PATH, 'w', encoding='utf-8') as f:
    json.dump(inv, f, indent=2)

with open(SERVER_INV_PATH, 'w', encoding='utf-8') as f:
    json.dump(inv, f, indent=2)

print("\nSaved updated inventory JSON files.")
