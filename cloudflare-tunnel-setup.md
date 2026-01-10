# Cloudflare Tunnel Setup - Telefondan Kirish

## 1. Cloudflared o'rnatish

### Windows uchun:
```bash
# PowerShell admin sifatida oching va quyidagi buyruqni bajaring:
winget install --id Cloudflare.cloudflared
```

### Yoki manual download:
1. https://github.com/cloudflare/cloudflared/releases saytiga boring
2. Windows versiyasini yuklab oling
3. cloudflared.exe ni PATH ga qo'shing

## 2. Cloudflare account bilan bog'lanish

```bash
cloudflared tunnel login
```

Bu buyruq brauzeringizni ochadi va Cloudflare accountingizga kirishni so'raydi.

## 3. Tunnel yaratish

```bash
cloudflared tunnel create sardor-furnitura
```

## 4. Tunnel konfiguratsiyasi

Quyidagi fayl yaratiladi: `config.yml`
## 5
. DNS sozlamalari

Cloudflare dashboard da quyidagi DNS recordlarni qo'shing:

```
Type: CNAME
Name: sardor-furnitura
Content: sardor-furnitura.cfargotunnel.com
Proxy: Proxied (orange cloud)

Type: CNAME  
Name: api-sardor-furnitura
Content: sardor-furnitura.cfargotunnel.com
Proxy: Proxied (orange cloud)
```

## 6. Tunnel ishga tushirish

### Doimiy tunnel:
```bash
cloudflared tunnel --config config.yml run sardor-furnitura
```

### Yoki bat fayl orqali:
```bash
tunnel-start.bat
```

### Tezkor test uchun:
```bash
cloudflared tunnel --url http://localhost:5173
```

### Yoki tezkor bat fayl:
```bash
quick-tunnel.bat
```

## 7. Client konfiguratsiyasini yangilash

Frontend da API URL ni yangilash kerak:

```javascript
// client/src/config/api.js yoki tegishli fayl
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-sardor-furnitura.your-domain.com/api'
  : 'http://localhost:3003/api';
```

## 8. Server CORS sozlamalari

Server da CORS ni yangilash:

```javascript
// server/src/index.js
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://sardor-furnitura.your-domain.com'
  ], 
  credentials: true 
}));
```

## 9. Tunnel service sifatida o'rnatish (Windows)

```bash
cloudflared service install
```

## Muhim eslatmalar:

1. **Domain nomi**: `your-domain.com` ni o'zingizning Cloudflare domain ingiz bilan almashtiring
2. **Tunnel nomi**: `sardor-furnitura` ni xohlagan nom bilan almashtirish mumkin
3. **Portlar**: Frontend 5173, Backend 3003 portda ishlaydi
4. **HTTPS**: Cloudflare avtomatik HTTPS ta'minlaydi
5. **Xavfsizlik**: Tunnel orqali faqat kerakli portlar ochiladi

## Tezkor ishga tushirish:

1. `cloudflared tunnel login` - login qiling
2. `cloudflared tunnel create sardor-furnitura` - tunnel yarating  
3. DNS recordlarni qo'shing
4. `quick-tunnel.bat` ni ishga tushiring (test uchun)
5. Telefondan kirish uchun berilgan URL dan foydalaning

## Muammo yechish:

- Agar tunnel ishlamasa: `cloudflared tunnel list` bilan tekshiring
- DNS propagation: 5-10 daqiqa kutish kerak bo'lishi mumkin
- Firewall: Windows Defender da cloudflared ga ruxsat bering