# Quick Tunnel ishga tushirish yo'riqnomasi

## 1-qadam: Cloudflared o'rnatish

### A) Winget orqali (tavsiya etiladi):
1. **PowerShell ni admin sifatida oching**
2. Quyidagi buyruqni bajaring:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```

### B) Manual yuklab olish:
1. https://github.com/cloudflare/cloudflared/releases ga boring
2. Windows versiyasini yuklab oling
3. `cloudflared.exe` ni `C:\Windows\System32\` ga ko'chiring

### C) O'rnatilganligini tekshirish:
```bash
cloudflared --version
```

## 2-qadam: Loyihani ishga tushirish

1. **Avval loyihani ishga tushiring:**
   ```bash
   start-localhost.bat
   ```
   
2. **Localhost ishlaganligini tekshiring:**
   - Brauzerda `http://localhost:5173` ni oching
   - Sahifa ochilishi kerak

## 3-qadam: Quick tunnel ishga tushirish

1. **Yangi terminal oching**
2. **Sardor_furnitura papkasiga o'ting:**
   ```bash
   cd Sardor_furnitura
   ```
3. **Quick tunnel ishga tushiring:**
   ```bash
   quick-tunnel.bat
   ```

## 4-qadam: URL olish

Terminal da quyidagicha URL ko'rsatiladi:
```
2024-01-10T12:00:00Z INF +--------------------------------------------------------------------------------------------+
2024-01-10T12:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2024-01-10T12:00:00Z INF |  https://abc123.trycloudflare.com                                                          |
2024-01-10T12:00:00Z INF +--------------------------------------------------------------------------------------------+
```

## 5-qadam: Telefondan kirish

1. **URL ni nusxalang:** `https://abc123.trycloudflare.com`
2. **Telefondan bu URL ga kiring**
3. **Loyiha ochilishi kerak**

## Muammo yechish

### Cloudflared topilmadi:
```bash
# PATH ga qo'shish
set PATH=%PATH%;C:\path\to\cloudflared
```

### Tunnel ishlamaydi:
- Internet ulanishini tekshiring
- VPN o'chiring
- Firewall sozlamalarini tekshiring

### Localhost ishlamaydi:
- `start-localhost.bat` qayta ishga tushiring
- Port 5173 band emasligini tekshiring

## Qisqacha qadamlar:

1. PowerShell admin: `winget install --id Cloudflare.cloudflared`
2. `start-localhost.bat` - loyihani ishga tushiring
3. `quick-tunnel.bat` - tunnel ochish
4. Berilgan URL ni telefondan oching

**Eslatma:** Quick tunnel vaqtinchalik va bepul. Doimiy tunnel uchun Cloudflare account kerak.