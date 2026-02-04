# Biznesjon - Universal Business Management System

Modern, professional POS va biznes boshqaruv tizimi.

## 🚀 Features

- ✅ **POS System** - Professional point of sale
- ✅ **Inventory Management** - Mahsulotlar va omborxona
- ✅ **Customer Management** - Mijozlar va qarzlar
- ✅ **Real-time Updates** - Socket.IO bilan jonli yangilanishlar
- ✅ **Offline Support** - Internet yo'qligida ishlash
- ✅ **Multi-user Roles** - Admin, Cashier, Helper
- ✅ **QR Code** - Mahsulotlar uchun QR kod
- ✅ **Telegram Integration** - Bot orqali xabarlar
- ✅ **PWA Support** - Mobile app sifatida o'rnatish
- ✅ **Responsive Design** - Barcha qurilmalarda ishlaydi

## 📋 Requirements

- Node.js 18+ 
- MongoDB 6+
- npm or yarn

## 🛠️ Installation

### 1. Clone repository
```bash
git clone <repository-url>
cd sardorbek.biznesjon.uz
```

### 2. Install dependencies

#### Server
```bash
cd server
npm install
```

#### Client
```bash
cd client
npm install
```

### 3. Environment Setup

#### Server (.env)
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/biznesjon
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_FRONTEND_URL=http://localhost:5173
```

### 4. Start Development

#### Terminal 1 - Server
```bash
cd server
npm run dev
```

#### Terminal 2 - Client
```bash
cd client
npm run dev
```

Server: http://localhost:8000
Client: http://localhost:5173

## 📦 Production Build

### 1. Build Client
```bash
cd client
npm run build
```

### 2. Copy build to server
```bash
cp -r client/dist/* server/public/
```

### 3. Start Production Server
```bash
cd server
npm run start:prod
```

## 🔒 Security Features

- **Helmet** - HTTP headers security
- **Rate Limiting** - API abuse prevention
- **Input Sanitization** - XSS protection
- **JWT Authentication** - Secure auth
- **CORS** - Cross-origin protection
- **Request Logging** - Audit trail
- **Automatic Backups** - Daily database backups

## 📊 Database Backup

### Automatic
- Daily backups at 02:00 AM
- Keeps last 7 backups
- Location: `server/backups/`

### Manual Backup
```bash
mongodump --uri="mongodb://localhost:27017/biznesjon" --archive="backup.gz" --gzip
```

### Restore
```bash
mongorestore --uri="mongodb://localhost:27017/biznesjon" --archive="backup.gz" --gzip --drop
```

## 👥 Default Users

### First Admin
Register at: http://localhost:5173/register

After first admin is created, registration is closed.

### Kassa Login
Login at: http://localhost:5173/kassa-login
- Username: `kassa`
- Password: `kassa123`

## 📱 Mobile App (PWA)

1. Open site in mobile browser
2. Click "Add to Home Screen"
3. Use as native app

## 🔧 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Socket.IO Client
- React Router
- Lucide Icons

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- Socket.IO
- JWT
- Multer (file upload)
- Sharp (image processing)
- Telegram Bot API

## 📖 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Port Already in Use
```bash
# Kill process on port 8000
npx kill-port 8000

# Kill process on port 5173
npx kill-port 5173
```

### Clear Cache
```bash
# Server
cd server
rm -rf node_modules package-lock.json
npm install

# Client
cd client
rm -rf node_modules package-lock.json
npm install
```

## 📝 License

Private - All rights reserved

## 👨‍💻 Support

For support, contact: [your-email@example.com]

---

Made with ❤️ by Kiro AI
