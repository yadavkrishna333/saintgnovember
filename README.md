# 👟🧥 Real-Time Footwear & Jacket Inventory System

A high-speed, instant-sync inventory management application built specifically for **Shoes** and **Jackets**. Any changes made on your PC appear immediately (<100ms) on your mobile phone without refreshing, and vice versa!

---

## ⚡ Key Highlights
1. **Instant Real-Time Sync (PC ⚡ Mobile)**: Powered by WebSockets (Socket.IO). Click `+` or `-` to adjust stock on PC and watch the phone screen update at the exact same millisecond.
2. **0ms Optimistic UI**: No lag or waiting spinners on clicks.
3. **Exact Sizing Matrices**:
   - **Men's Footwear**: Sizes **40, 41, 42, 43, 44, 45**
   - **Women's Footwear**: Sizes **35, 36, 37, 38, 39, 40, 41**
   - **Jackets**: Sizes **S, M, L, XL, XXL**
4. **QR Code Phone Connection**: Click the "Open on Phone" button on your PC to reveal a QR code. Scan with your phone camera to launch the app instantly.
5. **Camera Barcode Scanner**: Scan shoe box barcodes or garment price tags directly with your smartphone camera.
6. **Billing / POS & Profit Analytics**: Record sales in 1 click, track daily revenue, items sold, and gross margins.

---

## 🚀 How to Run

### Step 1: Start Server & Client
In the project root folder (`d:\Inventory`), open terminal and run:
```bash
npm run dev
```

### Step 2: Open on PC
Open your browser and visit:
```
http://localhost:5173
```

### Step 3: Open on Mobile Phone
1. Ensure your PC and Phone are connected to the same Wi-Fi / Hotspot.
2. Click **"Open on Phone"** on the PC screen.
3. Scan the displayed QR Code with your phone camera or Google Lens.
4. That's it! Both devices are now live and synced in real-time.

---

## 🌐 Remote Access from Anywhere (4G / 5G Mobile Data)
If you are outside the shop or home and want to open it on your phone without Wi-Fi:
Run Cloudflare Tunnel:
```bash
npx cloudflared tunnel --url http://localhost:5173
```
This generates a secure, free `https://xxxx.trycloudflare.com` URL that works anywhere in the world on any cellular network!

---

## 📁 Project Architecture
- `server/`: Node.js + Express + Socket.IO real-time engine with atomic JSON persistence.
- `client/`: React + Vite + Tailwind CSS + Lucide Icons + PWA responsive layout.
