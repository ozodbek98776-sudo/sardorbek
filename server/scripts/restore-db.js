#!/usr/bin/env node

/**
 * MongoDB Restore Script
 * Backup dan ma'lumotlarni qaytarish
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Backup fayli argumentdan olinadi
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Xatolik: Backup fayli ko\'rsatilmagan');
  console.error('Foydalanish: node restore-db.js <backup-file>');
  console.error(`\nMavjud backuplar:`);
  
  if (fs.existsSync(BACKUP_DIR)) {
    fs.readdirSync(BACKUP_DIR).forEach(file => {
      console.log(`  - ${file}`);
    });
  }
  
  process.exit(1);
}

const fullPath = path.isAbsolute(backupFile) 
  ? backupFile 
  : path.join(BACKUP_DIR, backupFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Backup fayli topilmadi: ${fullPath}`);
  process.exit(1);
}

// mongorestore command
const command = `mongorestore --uri="${MONGODB_URI}" --archive="${fullPath}" --gzip --drop`;

console.log(`🔄 Restore boshlandi: ${new Date().toISOString()}`);
console.log(`📁 Backup fayli: ${fullPath}`);
console.log(`⚠️  DIQQAT: Mavjud ma'lumotlar o'chiriladi!`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Restore xatosi: ${error.message}`);
    console.error(stderr);
    process.exit(1);
  }

  console.log(`✅ Restore muvaffaqiyatli yakunlandi!`);
  console.log(`⏰ Vaqt: ${new Date().toISOString()}`);
});
