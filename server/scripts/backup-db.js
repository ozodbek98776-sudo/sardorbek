#!/usr/bin/env node

/**
 * MongoDB Backup Script
 * Har kuni avtomatik backup oladi
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_NAME = 'nazorat'; // Database nomi

// Backup papkasini yaratish
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Backup papkasi yaratildi: ${BACKUP_DIR}`);
}

// Backup fayli nomi - sana bilan
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(BACKUP_DIR, `backup-${DB_NAME}-${timestamp}.archive`);

// mongodump command
const command = `mongodump --uri="${MONGODB_URI}" --archive="${backupFile}" --gzip`;

console.log(`🔄 Backup boshlandi: ${new Date().toISOString()}`);
console.log(`📁 Backup fayli: ${backupFile}`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Backup xatosi: ${error.message}`);
    console.error(stderr);
    process.exit(1);
  }

  // Fayl hajmini ko'rsatish
  const stats = fs.statSync(backupFile);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`✅ Backup muvaffaqiyatli yakunlandi!`);
  console.log(`📊 Fayl hajmi: ${sizeInMB} MB`);
  console.log(`⏰ Vaqt: ${new Date().toISOString()}`);

  // Eski backuplarni o'chirish (30 kundan eski)
  cleanOldBackups();
});

/**
 * 30 kundan eski backuplarni o'chirish
 */
function cleanOldBackups() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  fs.readdirSync(BACKUP_DIR).forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.mtimeMs < thirtyDaysAgo) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Eski backup o'chirildi: ${file}`);
    }
  });
}
