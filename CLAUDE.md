# Sardorbek Furnitura — Kassa/POS Tizimi

## Loyiha haqida
Mebel furnitura do'koni uchun to'liq kassa tizimi. Admin, kassir va yordamchi rollar bilan ishlaydi. Telegram bot integratsiyasi, QR kod, qarz boshqaruvi va HR moduli mavjud.

## Texnologiyalar
- **Client**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router 6, Axios, Socket.io-client, Lucide React
- **Server**: Node.js, Express, Mongoose (MongoDB), JWT, Socket.io, Multer + Sharp (rasmlar), Helmet, node-telegram-bot-api
- **Test**: Vitest + Testing Library (unit), Playwright (e2e), Jest + Supertest (server)

## Loyiha strukturasi
```
client/src/
  pages/admin/     — Admin panel sahifalari (Dashboard, Products, Kassa, HR...)
  pages/kassa/     — Kassir sahifalari (Receipts, Clients, Debts)
  pages/helper/    — Yordamchi sahifasi (Scanner)
  components/      — Umumiy komponentlar (Modal, Header, QR, Kassa...)
  context/         — AuthContext, LanguageContext
  store/           — Zustand store (helpersStore)
  hooks/           — Custom hooklar (useAlert, useSocket, useCategories...)
  utils/           — API, format, pricing, offline, sync
  layouts/         — AdminLayout, KassaLayout, HelperLayout
  config/api.ts    — API URL konfiguratsiyasi
server/src/
  routes/          — REST API endpointlar
  models/          — Mongoose modellar
  middleware/      — Auth, error, rate limit, validator
  services/        — Business logic, telegram, backup, logger
  config/          — Security config
  scripts/         — Migration va seed skriptlar
```

## Buyruqlar
```bash
npm run dev            # Client + Server bir vaqtda
npm run client         # Faqat client (Vite, port 5173)
npm run server         # Faqat server (Nodemon, port 8000)
npm run build          # Client build
npm run start          # Production server
cd client && npm test  # Vitest unit testlar
cd server && npm test  # Jest server testlar
cd client && npm run test:e2e  # Playwright e2e
```

## Kod qoidalari
- **Client**: TypeScript, functional components, hooks pattern
- **Server**: CommonJS (require/module.exports), plain JavaScript
- **Naming**: camelCase (variables/functions), PascalCase (components/models)
- **State**: Zustand store yoki React Context (Redux YO'Q)
- **Styling**: Tailwind CSS utility classes (inline style YO'Q)
- **Routing**: React Router v6 lazy loading bilan
- **API calls**: Axios instance (`utils/api.ts` orqali)

## API/Data formatlari
```js
// Muvaffaqiyat
{ success: true, data: {...}, message: "..." }
// Xato
{ success: false, message: "Xato tavsifi" }
// Pagination
{ success: true, data: [...], total: 100, page: 1, limit: 20 }
```

## TOKEN TEJASH QOIDALARI (MAJBURIY)
- Ortiqcha tushuntirma BERMA, faqat kod yoz
- Savol BERMA, eng yaxshi variantni o'zing tanla va bajargandan keyin qisqacha ayt
- Faqat o'zgargan fayllarni ko'rsat, o'zgarmagan fayllarni QAYTA YOZMA
- Bir xil kodni takrorlab tushuntirma BERMA
- Import, type, interface — faqat kerak bo'lganda ko'rsat
- Agar 3 tadan kam qator o'zgarsa, faqat o'sha qatorlarni ko'rsat
- Har bir javob MAKSIMUM 50 qator kod bo'lsin, undan ko'p bo'lsa faylga yoz
- "mana bu yerda...", "keling ko'raylik..." kabi bo'sh gaplar YOZMA
- Tasdiq so'rama — bajaver
- Xato bo'lsa o'zing tuzat, menga xabar berma (agar jiddiy bo'lmasa)

## TAQIQLANGAN NARSALAR
- `any` tipi (TypeScript) — doim aniq tip yoz
- `console.log` production kodda (debug uchun `logger` ishlatilsin)
- Inline CSS style — faqat Tailwind class
- `var` — faqat `const` / `let`
- Redux, MobX — faqat Zustand yoki Context
- jQuery yoki boshqa eski kutubxonalar
- `SELECT *` yoki cheksiz MongoDB query (doim limit/pagination)

## Muhim eslatmalar
- `.env` fayllar gitda YO'Q — `.env.example` dan nusxa ol
- Rasmlar `server/uploads/` ga saqlanadi, Sharp orqali optimize qilinadi
- Telegram bot 2 ta: POS (sotuv) va Debt (qarz) — alohida tokenlar
- Socket.io real-time yangilanishlar uchun (stats, orders)
- Rollar: `admin`, `cashier`, `helper` — `middleware/auth.js` da tekshiriladi
- API proxy: client dev da `/api` -> `localhost:8000` (vite.config.ts)
