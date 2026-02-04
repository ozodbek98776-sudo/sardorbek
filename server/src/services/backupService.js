const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.maxBackups = 7; // 7 kunlik backup saqlash
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      await this.ensureBackupDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.gz`;
      const filepath = path.join(this.backupDir, filename);
      
      const dbName = process.env.MONGODB_URI?.split('/').pop()?.split('?')[0] || 'biznesjon';
      
      return new Promise((resolve, reject) => {
        const command = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${filepath}" --gzip`;
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error('Backup xatosi:', error);
            reject(error);
            return;
          }
          
          console.log('Backup yaratildi:', filename);
          resolve(filepath);
        });
      });
    } catch (error) {
      console.error('Backup yaratishda xato:', error);
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.gz'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          time: fs.stat(path.join(this.backupDir, f)).then(s => s.mtime)
        }));

      const filesWithTime = await Promise.all(
        backupFiles.map(async f => ({
          ...f,
          time: await f.time
        }))
      );

      // Eng eski fayllarni o'chirish
      if (filesWithTime.length > this.maxBackups) {
        const sorted = filesWithTime.sort((a, b) => b.time - a.time);
        const toDelete = sorted.slice(this.maxBackups);
        
        for (const file of toDelete) {
          await fs.unlink(file.path);
          console.log('Eski backup o\'chirildi:', file.name);
        }
      }
    } catch (error) {
      console.error('Eski backuplarni o\'chirishda xato:', error);
    }
  }

  async scheduleBackup() {
    // Har kuni soat 02:00 da backup yaratish
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      2, 0, 0
    );
    
    const timeUntilBackup = scheduledTime.getTime() - now.getTime();
    
    setTimeout(async () => {
      await this.createBackup();
      await this.cleanOldBackups();
      this.scheduleBackup(); // Keyingi kun uchun rejalashtirish
    }, timeUntilBackup);
    
    console.log('Keyingi backup:', scheduledTime.toLocaleString('uz-UZ'));
  }

  async restoreBackup(filename) {
    try {
      const filepath = path.join(this.backupDir, filename);
      
      // Fayl mavjudligini tekshirish
      await fs.access(filepath);
      
      return new Promise((resolve, reject) => {
        const command = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${filepath}" --gzip --drop`;
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error('Restore xatosi:', error);
            reject(error);
            return;
          }
          
          console.log('Backup qayta tiklandi:', filename);
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Backup qayta tiklashda xato:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      await this.ensureBackupDir();
      const files = await fs.readdir(this.backupDir);
      
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.gz'))
        .map(async f => {
          const filepath = path.join(this.backupDir, f);
          const stats = await fs.stat(filepath);
          return {
            name: f,
            size: stats.size,
            created: stats.mtime,
            sizeInMB: (stats.size / (1024 * 1024)).toFixed(2)
          };
        });
      
      return await Promise.all(backupFiles);
    } catch (error) {
      console.error('Backuplar ro\'yxatini olishda xato:', error);
      return [];
    }
  }
}

module.exports = new BackupService();
