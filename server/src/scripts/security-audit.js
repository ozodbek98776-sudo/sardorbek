/**
 * XAVFSIZLIK AUDIT SCRIPTI
 * Loyihadagi barcha xavfsizlik muammolarini tekshiradi
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  // Xatolik qo'shish
  addIssue(category, severity, message, file = null) {
    this.issues.push({
      category,
      severity, // critical, high, medium, low
      message,
      file,
      timestamp: new Date().toISOString()
    });
  }

  // Ogohlantirish qo'shish
  addWarning(category, message, file = null) {
    this.warnings.push({
      category,
      message,
      file,
      timestamp: new Date().toISOString()
    });
  }

  // Muvaffaqiyatli tekshiruv
  addPassed(category, message) {
    this.passed.push({
      category,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Environment variables tekshirish
  checkEnvironmentVariables() {
    console.log('🔍 Environment variables tekshirilmoqda...');

    const requiredVars = [
      'JWT_SECRET',
      'MONGODB_URI',
      'NODE_ENV'
    ];

    const productionVars = [
      'CLIENT_URL_PROD',
      'CLIENT_URL'
    ];

    // Majburiy o'zgaruvchilar
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.addIssue('Environment', 'critical', `${varName} o'rnatilmagan!`);
      } else {
        this.addPassed('Environment', `${varName} o'rnatilgan`);
      }
    }

    // JWT_SECRET uzunligi
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        this.addIssue('Environment', 'high', 'JWT_SECRET juda qisqa! Minimum 32 belgi kerak.');
      } else {
        this.addPassed('Environment', 'JWT_SECRET uzunligi yetarli');
      }

      // Oddiy parollarni tekshirish
      const weakSecrets = ['secret', 'password', '123456', 'qwerty', 'admin'];
      if (weakSecrets.some(weak => process.env.JWT_SECRET.toLowerCase().includes(weak))) {
        this.addIssue('Environment', 'critical', 'JWT_SECRET juda oddiy! Murakkab parol ishlatilsin.');
      }
    }

    // Production sozlamalari
    if (process.env.NODE_ENV === 'production') {
      for (const varName of productionVars) {
        if (!process.env[varName]) {
          this.addIssue('Environment', 'high', `Production da ${varName} o'rnatilmagan!`);
        }
      }
    }
  }

  // Fayl tizimi xavfsizligini tekshirish
  checkFileSystemSecurity() {
    console.log('🔍 Fayl tizimi xavfsizligi tekshirilmoqda...');

    const sensitiveFiles = [
      '.env',
      '.env.production',
      'package-lock.json'
    ];

    const serverPath = path.join(__dirname, '..');

    for (const file of sensitiveFiles) {
      const filePath = path.join(serverPath, '..', file);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const mode = stats.mode & parseInt('777', 8);
          
          if (mode > parseInt('644', 8)) {
            this.addWarning('FileSystem', `${file} fayli juda ochiq ruxsatlarga ega (${mode.toString(8)})`);
          } else {
            this.addPassed('FileSystem', `${file} fayli xavfsiz ruxsatlarga ega`);
          }
        } catch (error) {
          this.addWarning('FileSystem', `${file} faylini tekshirib bo'lmadi: ${error.message}`);
        }
      }
    }
  }

  // Kod xavfsizligini tekshirish
  checkCodeSecurity() {
    console.log('🔍 Kod xavfsizligi tekshirilmoqda...');

    const serverPath = path.join(__dirname, '..');
    
    // Xavfli pattern'lar
    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/g,
        message: 'eval() funksiyasi ishlatilgan - XSS xavfi!',
        severity: 'critical'
      },
      {
        pattern: /innerHTML\s*=/g,
        message: 'innerHTML ishlatilgan - XSS xavfi!',
        severity: 'high'
      },
      {
        pattern: /\$where/g,
        message: '$where operatori ishlatilgan - NoSQL injection xavfi!',
        severity: 'high'
      },
      {
        pattern: /password.*=.*['"][^'"]*['"]/gi,
        message: 'Hardcoded parol topildi!',
        severity: 'critical'
      },
      {
        pattern: /api[_-]?key.*=.*['"][^'"]*['"]/gi,
        message: 'Hardcoded API key topildi!',
        severity: 'high'
      }
    ];

    // Barcha JS fayllarni tekshirish
    this.scanDirectory(serverPath, '.js', (filePath, content) => {
      for (const { pattern, message, severity } of dangerousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.addIssue('CodeSecurity', severity, `${message} (${matches.length} ta topildi)`, filePath);
        }
      }
    });
  }

  // Directory'ni scan qilish
  scanDirectory(dirPath, extension, callback) {
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          this.scanDirectory(filePath, extension, callback);
        } else if (stat.isFile() && file.endsWith(extension)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            callback(filePath, content);
          } catch (error) {
            this.addWarning('CodeSecurity', `Faylni o'qib bo'lmadi: ${filePath}`);
          }
        }
      }
    } catch (error) {
      this.addWarning('CodeSecurity', `Directory'ni scan qilib bo'lmadi: ${dirPath}`);
    }
  }

  // Dependencies xavfsizligini tekshirish
  checkDependencySecurity() {
    console.log('🔍 Dependencies xavfsizligi tekshirilmoqda...');

    const packageJsonPath = path.join(__dirname, '../../package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Eski versiyalar
        const outdatedPackages = {
          'express': '4.18.0',
          'mongoose': '6.0.0',
          'jsonwebtoken': '8.5.0',
          'bcryptjs': '2.4.0'
        };

        for (const [pkg, minVersion] of Object.entries(outdatedPackages)) {
          const currentVersion = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
          if (currentVersion && currentVersion.replace(/[^\d.]/g, '') < minVersion) {
            this.addWarning('Dependencies', `${pkg} eski versiyada (${currentVersion}), yangilash tavsiya etiladi`);
          }
        }

        this.addPassed('Dependencies', 'Package.json muvaffaqiyatli tekshirildi');
      } catch (error) {
        this.addWarning('Dependencies', `Package.json o'qib bo'lmadi: ${error.message}`);
      }
    }
  }

  // Database xavfsizligini tekshirish
  checkDatabaseSecurity() {
    console.log('🔍 Database xavfsizligi tekshirilmoqda...');

    // MongoDB URI tekshirish
    if (process.env.MONGODB_URI) {
      const uri = process.env.MONGODB_URI;
      
      // Parol URI da ochiq ko'rinishda
      if (uri.includes('://') && uri.includes(':') && uri.includes('@')) {
        const parts = uri.split('://')[1];
        if (parts.includes(':') && parts.includes('@')) {
          this.addWarning('Database', 'MongoDB URI da parol ochiq ko\'rinishda');
        }
      }

      // Localhost yoki production
      if (process.env.NODE_ENV === 'production' && uri.includes('localhost')) {
        this.addIssue('Database', 'high', 'Production da localhost MongoDB ishlatilmoqda!');
      }

      this.addPassed('Database', 'MongoDB URI tekshirildi');
    }
  }

  // Hisobot yaratish
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 XAVFSIZLIK AUDIT HISOBOTI');
    console.log('='.repeat(60));

    // Kritik muammolar
    const critical = this.issues.filter(i => i.severity === 'critical');
    const high = this.issues.filter(i => i.severity === 'high');
    const medium = this.issues.filter(i => i.severity === 'medium');
    const low = this.issues.filter(i => i.severity === 'low');

    console.log(`\n❌ KRITIK MUAMMOLAR (${critical.length}):`);
    critical.forEach(issue => {
      console.log(`  🚨 ${issue.category}: ${issue.message}`);
      if (issue.file) console.log(`     📁 ${issue.file}`);
    });

    console.log(`\n⚠️  YUQORI PRIORITET (${high.length}):`);
    high.forEach(issue => {
      console.log(`  🔴 ${issue.category}: ${issue.message}`);
      if (issue.file) console.log(`     📁 ${issue.file}`);
    });

    console.log(`\n🟡 O'RTACHA PRIORITET (${medium.length}):`);
    medium.forEach(issue => {
      console.log(`  🟠 ${issue.category}: ${issue.message}`);
      if (issue.file) console.log(`     📁 ${issue.file}`);
    });

    console.log(`\n🔵 PAST PRIORITET (${low.length}):`);
    low.forEach(issue => {
      console.log(`  🟡 ${issue.category}: ${issue.message}`);
      if (issue.file) console.log(`     📁 ${issue.file}`);
    });

    console.log(`\n⚠️  OGOHLANTIRISHLAR (${this.warnings.length}):`);
    this.warnings.forEach(warning => {
      console.log(`  ⚠️  ${warning.category}: ${warning.message}`);
      if (warning.file) console.log(`     📁 ${warning.file}`);
    });

    console.log(`\n✅ MUVAFFAQIYATLI TEKSHIRUVLAR (${this.passed.length}):`);
    this.passed.forEach(pass => {
      console.log(`  ✅ ${pass.category}: ${pass.message}`);
    });

    // Xulosa
    console.log('\n' + '='.repeat(60));
    console.log('📊 XULOSA:');
    console.log(`  🚨 Kritik: ${critical.length}`);
    console.log(`  🔴 Yuqori: ${high.length}`);
    console.log(`  🟠 O'rtacha: ${medium.length}`);
    console.log(`  🟡 Past: ${low.length}`);
    console.log(`  ⚠️  Ogohlantirishlar: ${this.warnings.length}`);
    console.log(`  ✅ Muvaffaqiyatli: ${this.passed.length}`);

    const totalIssues = this.issues.length;
    if (totalIssues === 0) {
      console.log('\n🎉 AJOYIB! Hech qanday xavfsizlik muammosi topilmadi!');
    } else if (critical.length > 0) {
      console.log('\n🚨 DIQQAT! Kritik xavfsizlik muammolari mavjud!');
      console.log('   Bu muammolarni zudlik bilan hal qiling!');
    } else if (high.length > 0) {
      console.log('\n⚠️  OGOHLANTIRISH! Yuqori prioritetli muammolar mavjud!');
      console.log('   Bu muammolarni tezroq hal qiling!');
    } else {
      console.log('\n👍 YAXSHI! Faqat kichik muammolar mavjud.');
    }

    console.log('='.repeat(60));

    return {
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
      warnings: this.warnings.length,
      passed: this.passed.length,
      total: totalIssues
    };
  }

  // Audit ishga tushirish
  async runAudit() {
    console.log('🚀 Xavfsizlik audit boshlandi...\n');

    this.checkEnvironmentVariables();
    this.checkFileSystemSecurity();
    this.checkCodeSecurity();
    this.checkDependencySecurity();
    this.checkDatabaseSecurity();

    return this.generateReport();
  }
}

// Script ishga tushirish
async function main() {
  const auditor = new SecurityAuditor();
  const results = await auditor.runAudit();
  
  // Exit code - kritik muammolar bo'lsa 1, aks holda 0
  const exitCode = results.critical > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Agar script to'g'ridan-to'g'ri ishga tushirilsa
if (require.main === module) {
  main();
}

module.exports = { SecurityAuditor };