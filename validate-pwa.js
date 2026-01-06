// PWA Validation Script for Sardorbek.Furnetura
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating PWA Setup for Sardorbek.Furnetura...\n');

// Check manifest.json
const manifestPath = path.join(__dirname, 'client/public/manifest.json');
if (fs.existsSync(manifestPath)) {
    console.log('✅ manifest.json exists');
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(`   - Name: ${manifest.name}`);
        console.log(`   - Short name: ${manifest.short_name}`);
        console.log(`   - Display: ${manifest.display}`);
        console.log(`   - Icons: ${manifest.icons.length} defined`);
        console.log(`   - Shortcuts: ${manifest.shortcuts.length} defined`);
    } catch (error) {
        console.log('❌ manifest.json is invalid JSON');
    }
} else {
    console.log('❌ manifest.json missing');
}

// Check service worker
const swPath = path.join(__dirname, 'client/public/sw.js');
if (fs.existsSync(swPath)) {
    console.log('✅ Service worker (sw.js) exists');
} else {
    console.log('❌ Service worker (sw.js) missing');
}

// Check icons
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
let iconCount = 0;
iconSizes.forEach(size => {
    const iconPath = path.join(__dirname, `client/public/icon-${size}x${size}.svg`);
    if (fs.existsSync(iconPath)) {
        iconCount++;
    }
});

console.log(`✅ Icons: ${iconCount}/${iconSizes.length} SVG icons available`);

// Check main icon
const mainIconPath = path.join(__dirname, 'client/public/icon.svg');
if (fs.existsSync(mainIconPath)) {
    console.log('✅ Main icon (icon.svg) exists');
} else {
    console.log('❌ Main icon (icon.svg) missing');
}

// Check HTML meta tags
const htmlPath = path.join(__dirname, 'client/index.html');
if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const checks = [
        { name: 'Viewport meta tag', pattern: /viewport.*viewport-fit=cover/ },
        { name: 'Theme color', pattern: /theme-color/ },
        { name: 'Apple mobile web app capable', pattern: /apple-mobile-web-app-capable/ },
        { name: 'Apple touch icons', pattern: /apple-touch-icon/ },
        { name: 'Manifest link', pattern: /manifest\.json/ }
    ];
    
    checks.forEach(check => {
        if (check.pattern.test(htmlContent)) {
            console.log(`✅ ${check.name} configured`);
        } else {
            console.log(`❌ ${check.name} missing`);
        }
    });
} else {
    console.log('❌ index.html missing');
}

// Check PWA test page
const testPath = path.join(__dirname, 'client/public/pwa-test.html');
if (fs.existsSync(testPath)) {
    console.log('✅ PWA test page available');
} else {
    console.log('❌ PWA test page missing');
}

console.log('\n🎉 PWA Validation Complete!');
console.log('\n📱 To test your PWA:');
console.log('1. Visit: http://localhost:5173');
console.log('2. Test page: http://localhost:5173/pwa-test.html');
console.log('3. On iOS Safari: Add to Home Screen');
console.log('\n💡 For production: Ensure HTTPS is enabled');