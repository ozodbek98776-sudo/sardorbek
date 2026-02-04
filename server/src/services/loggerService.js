const fs = require('fs').promises;
const path = require('path');

class LoggerService {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
  }

  async ensureLogDir() {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  async log(level, message, meta = {}) {
    try {
      await this.ensureLogDir();
      
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        ...meta
      };
      
      const logLine = JSON.stringify(logEntry) + '\n';
      const logFile = path.join(this.logDir, `${level}.log`);
      
      await fs.appendFile(logFile, logLine);
      
      // Console da ham ko'rsatish
      const colors = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        debug: '\x1b[90m',
        reset: '\x1b[0m'
      };
      
      console.log(
        `${colors[level] || ''}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`,
        Object.keys(meta).length > 0 ? meta : ''
      );
      
      // Log fayl hajmini tekshirish
      await this.rotateLogIfNeeded(logFile);
    } catch (error) {
      console.error('Logging xatosi:', error);
    }
  }

  async rotateLogIfNeeded(logFile) {
    try {
      const stats = await fs.stat(logFile);
      
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = logFile.replace('.log', `-${timestamp}.log`);
        
        await fs.rename(logFile, archiveName);
        console.log('Log fayl arxivlandi:', path.basename(archiveName));
        
        // Eski log fayllarni o'chirish
        await this.cleanOldLogs();
      }
    } catch (error) {
      // Fayl mavjud emas yoki boshqa xato
    }
  }

  async cleanOldLogs() {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(f => f.endsWith('.log'));
      
      if (logFiles.length > this.maxLogFiles) {
        const filesWithTime = await Promise.all(
          logFiles.map(async f => ({
            name: f,
            path: path.join(this.logDir, f),
            time: (await fs.stat(path.join(this.logDir, f))).mtime
          }))
        );
        
        const sorted = filesWithTime.sort((a, b) => b.time - a.time);
        const toDelete = sorted.slice(this.maxLogFiles);
        
        for (const file of toDelete) {
          await fs.unlink(file.path);
          console.log('Eski log o\'chirildi:', file.name);
        }
      }
    } catch (error) {
      console.error('Eski loglarni o\'chirishda xato:', error);
    }
  }

  error(message, meta) {
    return this.log('error', message, meta);
  }

  warn(message, meta) {
    return this.log('warn', message, meta);
  }

  info(message, meta) {
    return this.log('info', message, meta);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      return this.log('debug', message, meta);
    }
  }

  // Request logger middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'error' : 'info';
        
        this.log(level, `${req.method} ${req.path}`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      });
      
      next();
    };
  }
}

module.exports = new LoggerService();
