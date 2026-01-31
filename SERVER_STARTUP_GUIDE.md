# 🚀 Server Ishga Tushirish Qo'llanmasi

## ❗ Muhim: Server Har Doim Ishlab Turishi Kerak

Client (frontend) ishlashi uchun **server (backend) har doim ishlab turishi kerak**. Aks holda quyidagi xatolar paydo bo'ladi:

```
ERR_CONNECTION_REFUSED
Failed to fetch
Network Error
```

---

## 📋 Server Holatini Tekshirish

### 1. Server Ishlab Turibmi?

**Windows PowerShell:**
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue
```

**Windows CMD:**
```cmd
tasklist | findstr node
```

### 2. Port 8000 Band Bo'lganmi?

**Windows PowerShell:**
```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```

**Windows CMD:**
```cmd
netstat -ano | findstr :8000
```

---

## 🟢 Serverni Ishga Tushirish

### Usul 1: Terminal Orqali (Tavsiya Etiladi)

1. **Server papkasiga o'tish:**
```bash
cd sardorbek.biznesjon.uz/server
```

2. **Serverni ishga tushirish:**
```bash
npm start
```

3. **Muvaffaqiyatli ishga tushganini tekshirish:**
```
Server running on 0.0.0.0:8000
⚡ MongoDB ulandi
🤖 POS Telegram Bot ishga tushdi
✅ Qarz Telegram Bot muvaffaqiyatli ishga tushdi
```

### Usul 2: Development Rejimida (Auto-restart)

```bash
cd sardorbek.biznesjon.uz/server
npm run dev
```

---

## 🔴 Server To'xtatish

### Windows PowerShell:
```powershell
# Barcha node jarayonlarini to'xtatish
Get-Process -Name node | Stop-Process -Force
```

### Windows CMD:
```cmd
# Port 8000 dagi jarayonni topish
netstat -ano | findstr :8000

# Jarayon ID (PID) ni ko'rib, to'xtatish
taskkill /PID <PID> /F
```

---

## 🛠️ Muammolarni Hal Qilish

### Muammo 1: Port 8000 Band

**Xatolik:**
```
Error: listen EADDRINUSE: address already in use :::8000
```

**Yechim:**
```powershell
# Port 8000 dagi jarayonni topish
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess

# Jarayonni to'xtatish
Stop-Process -Id <PID> -Force
```

### Muammo 2: MongoDB Ulanmayapti

**Xatolik:**
```
MongoServerError: Authentication failed
```

**Yechim:**
1. `.env` faylini tekshiring
2. `MONGODB_URI` to'g'ri ekanligini tasdiqlang
3. Internet aloqasini tekshiring (MongoDB Atlas uchun)

### Muammo 3: Telegram Bot Ishlamayapti

**Ogohlantirish:**
```
⚠️ POS Telegram Bot xatolik
```

**Yechim:**
1. `.env` faylida `TELEGRAM_BOT_TOKEN` to'g'ri ekanligini tekshiring
2. Bot tokenini `/start` buyrug'i bilan faollashtiring
3. Internet aloqasini tekshiring

---

## 📊 Server Loglari

### Real-time loglarni ko'rish:

**Terminal ochiq bo'lsa:**
Loglar avtomatik ko'rinadi

**Alohida terminalda:**
```bash
cd sardorbek.biznesjon.uz/server
npm start
```

---

## 🔄 Server Qayta Ishga Tushirish

1. **To'xtatish:**
```powershell
Get-Process -Name node | Stop-Process -Force
```

2. **Ishga tushirish:**
```bash
cd sardorbek.biznesjon.uz/server
npm start
```

---

## ✅ Server To'g'ri Ishlayotganini Tekshirish

### Browser orqali:

1. **Health Check:**
```
http://localhost:8000/api/health
```

2. **Admin Check:**
```
http://localhost:8000/api/auth/check-admin
```

### cURL orqali:

```bash
curl http://localhost:8000/api/health
```

---

## 🎯 Production Deployment

### PM2 bilan (Tavsiya Etiladi):

```bash
# PM2 o'rnatish
npm install -g pm2

# Serverni ishga tushirish
cd sardorbek.biznesjon.uz/server
pm2 start src/index.js --name "sardorbek-server"

# Statusni ko'rish
pm2 status

# Loglarni ko'rish
pm2 logs sardorbek-server

# Qayta ishga tushirish
pm2 restart sardorbek-server

# To'xtatish
pm2 stop sardorbek-server
```

---

## 📝 Eslatma

- Server **har doim** ishlab turishi kerak
- Development da `npm start` yoki `npm run dev` ishlatish
- Production da `pm2` yoki `systemd` ishlatish tavsiya etiladi
- Port 8000 bo'sh bo'lishi kerak
- MongoDB ulanishi faol bo'lishi kerak

---

## 🆘 Yordam

Agar muammo hal bo'lmasa:

1. Server loglarini tekshiring
2. `.env` faylini tekshiring
3. Port 8000 bo'sh ekanligini tasdiqlang
4. MongoDB ulanishini tekshiring
5. Internet aloqasini tekshiring

**Texnik yordam:** Dasturchi bilan bog'laning
