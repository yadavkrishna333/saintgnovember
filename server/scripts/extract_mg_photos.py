import zipfile
import os
import re
import shutil
import xml.etree.ElementTree as ET

EXCEL_PATH = r"d:\Inventory\MG SHOP STOCK AND PRICE LISTS.xlsx"
OUTPUT_DIR = r"d:\Inventory\MG SHOP PHOTOS"
CLIENT_PRODUCTS_DIR = r"d:\Inventory\client\public\products"

# 1. Clean OUTPUT_DIR completely to remove any old numbered files like 1.png, 2.png
if os.path.exists(OUTPUT_DIR):
    for f in os.listdir(OUTPUT_DIR):
        p = os.path.join(OUTPUT_DIR, f)
        if os.path.isfile(p):
            os.remove(p)
else:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

os.makedirs(CLIENT_PRODUCTS_DIR, exist_ok=True)

z = zipfile.ZipFile(EXCEL_PATH, 'r')

# 2. Parse shared strings
sst_elem = ET.fromstring(z.read('xl/sharedStrings.xml'))
sst = []
for si in sst_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
    t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
    if t is not None:
        sst.append(t.text or '')
    else:
        sst.append(''.join([t2.text or '' for t2 in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]))

print(f"Loaded {len(sst)} shared strings.")

# 3. Sheet configs with exact column mapping
sheet_configs = [
    {
        'sheet_name': 'MG SHOP',
        'sheet_xml': 'xl/worksheets/sheet1.xml',
        'drawing_xml': 'xl/drawings/drawing1.xml',
        'drawing_rels': 'xl/drawings/_rels/drawing1.xml.rels',
        'sku_col': 'C',
        'type': 'mixed'
    },
    {
        'sheet_name': 'bags',
        'sheet_xml': 'xl/worksheets/sheet2.xml',
        'drawing_xml': 'xl/drawings/drawing2.xml',
        'drawing_rels': 'xl/drawings/_rels/drawing2.xml.rels',
        'sku_col': 'C',
        'type': 'bags'
    },
    {
        'sheet_name': 'Sheet2',
        'sheet_xml': 'xl/worksheets/sheet3.xml',
        'drawing_xml': 'xl/drawings/drawing3.xml',
        'drawing_rels': 'xl/drawings/_rels/drawing3.xml.rels',
        'sku_col': 'C',
        'type': 'footwear'
    },
    {
        'sheet_name': 'Sheet1',
        'sheet_xml': 'xl/worksheets/sheet4.xml',
        'drawing_xml': 'xl/drawings/drawing4.xml',
        'drawing_rels': 'xl/drawings/_rels/drawing4.xml.rels',
        'sku_col': 'D', # In Sheet1, col D is STYLE
        'type': 'footwear'
    }
]

def sanitize_sku(val):
    if not val:
        return ''
    s = str(val).strip()
    s = re.sub(r'[\r\n\t]+', '', s)
    # Filter out header texts or pure digits
    if s.upper() in ['SKU', 'SKU CODE', 'STYLE', 'TOTAL', 'SUM', 'MG SHOP STOCK AND PRICE LIST', 'IMAGES', 'SR.NO.', 'SR. NO.']:
        return ''
    if s.isdigit():
        return ''
    return s.upper()

all_extracted = []
sku_to_files = {}

for cfg in sheet_configs:
    s_name = cfg['sheet_name']
    d_path = cfg['drawing_xml']
    r_path = cfg['drawing_rels']
    
    if d_path not in z.namelist() or r_path not in z.namelist():
        continue
        
    print(f"Reading {s_name}...")
    rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read(r_path))}
    d_root = ET.fromstring(z.read(d_path))
    s_root = ET.fromstring(z.read(cfg['sheet_xml']))
    
    ns_s = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    cells = {}
    for row in s_root.iter(f'{ns_s}row'):
        r_idx = int(row.attrib['r'])
        for c in row.iter(f'{ns_s}c'):
            col = ''.join([ch for ch in c.attrib['r'] if ch.isalpha()])
            t = c.attrib.get('t')
            v = c.find(f'{ns_s}v')
            val = sst[int(v.text)] if t == 's' and v is not None else (v.text if v is not None else '')
            cells[(r_idx, col)] = val.strip()
            
    sheet_count = 0
    ns_xdr = '{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}'
    ns_a = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
    
    for tag in ['twoCellAnchor', 'oneCellAnchor']:
        for anchor in d_root.findall(f'{ns_xdr}{tag}'):
            from_elem = anchor.find(f'{ns_xdr}from')
            if from_elem is None:
                continue
            r_1 = int(from_elem.find(f'{ns_xdr}row').text) + 1
            
            blip = anchor.find(f'.//{ns_a}blip')
            if blip is None:
                continue
            embed = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
            target = rels.get(embed, '')
            if not target:
                continue
            media_path = 'xl/' + target.replace('../', '')
            
            # Lookup SKU
            raw_sku = cells.get((r_1, cfg['sku_col']), '')
            if not raw_sku or raw_sku.isdigit():
                for alt in ['C', 'D', 'B', 'E']:
                    v = cells.get((r_1, alt), '')
                    if v and not v.isdigit() and len(v) > 2:
                        raw_sku = v
                        break
                        
            clean_sku = sanitize_sku(raw_sku)
            if not clean_sku:
                continue
                
            safe_sku = re.sub(r'[\r\n\t\xa0\ufeff]+', '', clean_sku)
            safe_sku = ''.join(ch for ch in safe_sku if ch.isprintable() and ch not in '/\\:*?"<>|').strip()
            
            # Determine filename
            # If jacket and a duplicate exists, append -jacket
            is_jacket = 'JK-' in safe_sku or 'JACKET' in safe_sku
            
            if safe_sku in sku_to_files:
                count = len(sku_to_files[safe_sku]) + 1
                if is_jacket:
                    filename = f"{safe_sku}-jacket.png"
                else:
                    filename = f"{safe_sku}-{count}.png"
                sku_to_files[safe_sku].append(filename)
            else:
                filename = f"{safe_sku}.png"
                sku_to_files[safe_sku] = [filename]
                
            img_data = z.read(media_path)
            
            # 1. Save to MG SHOP PHOTOS
            with open(os.path.join(OUTPUT_DIR, filename), 'wb') as f:
                f.write(img_data)
                
            # 2. Save primary to client/public/products
            with open(os.path.join(CLIENT_PRODUCTS_DIR, f"{safe_sku}.png"), 'wb') as f:
                f.write(img_data)
                
            all_extracted.append({
                'sheet': s_name,
                'row': r_1,
                'sku': safe_sku,
                'filename': filename,
                'bytes': len(img_data)
            })
            sheet_count += 1
            
    print(f"  Extracted {sheet_count} photos from {s_name}")

print(f"\n[SUCCESS] Total {len(all_extracted)} photos successfully saved to '{OUTPUT_DIR}'")
