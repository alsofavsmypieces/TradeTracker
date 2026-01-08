# Deployment Guide: TradeTracker

เนื่องจาก MT5 ต้องรันบน Windows ดังนั้นเราจะ deploy แบบ hybrid:
- **Frontend** → Vercel (ฟรี)
- **Backend** → รันที่บ้าน + ngrok expose

---

## Step 1: ติดตั้ง ngrok

1. ไปที่ https://ngrok.com/ แล้วสมัคร account (ฟรี)
2. Download ngrok for Windows
3. หลังจาก login แล้ว copy authtoken จาก dashboard
4. เปิด terminal แล้วรัน:
   ```
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

---

## Step 2: รัน Backend + ngrok

1. เปิด Terminal ที่ `backend` folder แล้วรัน:
   ```
   cd c:\Users\p\Desktop\Trade_Tracker\backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. เปิด Terminal อีกตัว แล้วรัน ngrok:
   ```
   ngrok http 8000
   ```

3. จะได้ URL แบบ:
   ```
   Forwarding  https://xxxx-xx-xx-xxx-xx.ngrok-free.app -> http://localhost:8000
   ```
   
4. **Copy URL นี้ไว้** (เช่น `https://xxxx.ngrok-free.app`)

---

## Step 3: Deploy Frontend ไป Vercel

### 3.1 Push code ขึ้น GitHub (ถ้ายังไม่ได้ทำ)

```bash
cd c:\Users\p\Desktop\Trade_Tracker
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 3.2 Deploy to Vercel

1. ไปที่ https://vercel.com/ แล้ว login ด้วย GitHub
2. คลิก **"Add New Project"**
3. เลือก repository `Trade_Tracker`
4. ตั้งค่า:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Environment Variables**: เพิ่ม
     ```
     NEXT_PUBLIC_API_URL = https://xxxx.ngrok-free.app/api
     ```
     (ใส่ ngrok URL ที่ได้จาก Step 2)

5. คลิก **Deploy**!

---

## Step 4: ใช้งาน

1. Vercel จะให้ URL แบบ `https://trade-tracker-xxx.vercel.app`
2. เปิด URL นั้นในมือถือหรือคอมเครื่องอื่น
3. ตราบใดที่ backend + ngrok รันอยู่ที่บ้าน ก็เข้าใช้งานได้!

---

## ⚠️ หมายเหตุสำคัญ

### ngrok Free Tier:
- URL จะเปลี่ยนทุกครั้งที่ restart ngrok
- ต้องอัปเดต Environment Variable บน Vercel เมื่อ URL เปลี่ยน

### วิธีอัปเดต URL บน Vercel:
1. ไป Vercel Dashboard → Project Settings → Environment Variables
2. แก้ไข `NEXT_PUBLIC_API_URL` เป็น URL ใหม่
3. Redeploy (คลิก ... → Redeploy)

### ทางเลือกถ้าต้องการ fixed URL:
- ngrok Pro ($8/เดือน) - ได้ fixed subdomain
- หรือใช้ Cloudflare Tunnel (ฟรี) - แต่ setup ยากกว่า

---

## Quick Commands

```bash
# รัน Backend
cd c:\Users\p\Desktop\Trade_Tracker\backend
uvicorn main:app --host 0.0.0.0 --port 8000

# รัน ngrok (terminal อีกตัว)
ngrok http 8000
```
