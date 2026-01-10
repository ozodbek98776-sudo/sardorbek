# Telefondan kirish yo'riqnomasi

## 1-usul: Bir xil Wi-Fi (eng oson)

### Qadamlar:
1. Kompyuter va telefon bir xil Wi-Fi ga ulangan bo'lishi kerak
2. Kompyuterda loyihani ishga tushiring:
   ```bash
   start-localhost.bat
   ```
3. Kompyuterning IP manzilini toping:
   ```bash
   ipconfig
   ```
4. Telefondan quyidagi manzilga kiring:
   ```
   http://YOUR_IP:5173
   ```

### Misol:
- Agar IP: `192.168.1.100` bo'lsa
- Telefondan: `http://192.168.1.100:5173`

## 2-usul: Cloudflare Tunnel (internet orqali)

### Tezkor test:
1. Kompyuterda:
   ```bash
   quick-tunnel.bat
   ```
2. Terminal da URL ko'rsatiladi:
   ```
   https://abc123.trycloudflare.com
   ```
3. Bu URL ni telefondan oching

### Doimiy tunnel:
1. Cloudflare account yarating
2. Domain qo'shing
3. `tunnel-start.bat` ni ishga tushiring
4. `https://sardor-furnitura.your-domain.com` dan kiring

## 3-usul: Ngrok (alternativ)

### Ngrok o'rnatish:
1. https://ngrok.com/ dan ro'yxatdan o'ting
2. Ngrok yuklab oling
3. Authtoken o'rnating

### Ishlatish:
1. Loyihani ishga tushiring:
   ```bash
   start-localhost.bat
   ```
2. Ngrok tunnel ochish:
   ```bash
   ngrok-setup.bat
   ```
3. Berilgan URL ni telefondan oching

## Qaysi usulni tanlash?

| Usul | Osonlik | Internet kerak | Tezlik |
|------|---------|----------------|---------|
| Wi-Fi | ⭐⭐⭐ | Yo'q | Tez |
| Cloudflare | ⭐⭐ | Ha | O'rta |
| Ngrok | ⭐⭐ | Ha | O'rta |

## Muammo yechish

### Wi-Fi ishlamasa:
- Firewall sozlamalarini tekshiring
- Windows Defender da ruxsat bering
- Antivirus dasturini vaqtincha o'chiring

### Tunnel ishlamasa:
- Internet ulanishini tekshiring
- VPN o'chiring
- Proxy sozlamalarini tekshiring

### Server ishlamasa:
- `start-localhost.bat` qayta ishga tushiring
- Port 3003 va 5173 band emasligini tekshiring

## Xavfsizlik

- Wi-Fi usuli faqat mahalliy tarmoqda ishlaydi
- Tunnel usullari internet orqali ochiq bo'ladi
- Production da autentifikatsiya qo'shing
- HTTPS ishlatishni tavsiya qilamiz