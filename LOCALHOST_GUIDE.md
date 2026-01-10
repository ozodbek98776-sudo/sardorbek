# Localhost da ko'rish yo'riqnomasi

## Tezkor ishga tushirish

### 1-usul: Bat fayl orqali (eng oson)
```bash
start-localhost.bat
```

### 2-usul: Alohida terminallar
```bash
# 1-terminal: Server ishga tushirish
cd server
npm run dev

# 2-terminal: Client ishga tushirish  
cd client
npm run dev
```

### 3-usul: Root papkadan
```bash
# Ikkala serverni bir vaqtda ishga tushirish
npm run dev
```

## URL manzillar

- **Frontend (React)**: http://localhost:5173
- **Backend (API)**: http://localhost:3003
- **API Health Check**: http://localhost:3003/api/health

## Kerakli dasturlar

Agar npm yoki node o'rnatilmagan bo'lsa:

1. **Node.js o'rnatish**: https://nodejs.org/
2. **Dependencies o'rnatish**:
   ```bash
   npm run install:all
   ```

## Muammo yechish

### Port band bo'lsa:
```bash
# 3003 portni tekshirish
netstat -ano | findstr :3003

# 5173 portni tekshirish  
netstat -ano | findstr :5173

# Process ni to'xtatish (PID raqamini topib)
taskkill /PID <PID_RAQAMI> /F
```

### MongoDB ulanish muammosi:
- `.env` faylida `MONGODB_URI` to'g'ri ekanligini tekshiring
- Internet ulanishini tekshiring (MongoDB Atlas ishlatilmoqda)

### Telegram bot muammosi:
- Bot tokenlarini `.env` faylida tekshiring
- Internet ulanishini tekshiring

## Loyiha tuzilishi

```
Sardor_furnitura/
├── client/          # React frontend (Port 5173)
├── server/          # Express backend (Port 3003)  
├── start-localhost.bat  # Tezkor ishga tushirish
└── package.json     # Root package.json
```

## Brauzerda ochish

1. `start-localhost.bat` ni ishga tushiring
2. 3-5 sekund kuting
3. Brauzeringizda http://localhost:5173 ga boring
4. Login sahifasi ochilishi kerak

## Telefondan localhost ko'rish

Agar bir xil Wi-Fi tarmoqda bo'lsangiz:

1. Kompyuteringizning IP manzilini toping:
   ```bash
   ipconfig
   ```
2. Telefondan quyidagi manzilga boring:
   ```
   http://YOUR_IP:5173
   ```
   Masalan: `http://192.168.1.100:5173`

**Eslatma**: Bu faqat bir xil Wi-Fi tarmoqda ishlaydi. Internet orqali kirish uchun Cloudflare tunnel kerak.