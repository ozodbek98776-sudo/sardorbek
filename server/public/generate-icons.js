// Node.js script to generate PWA icons
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon that can be converted to PNG
const createSVGIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" ry="${size * 0.18}" fill="url(#grad)"/>
  
  <!-- Furniture/Sofa Icon -->
  <g fill="white" transform="translate(${size * 0.2}, ${size * 0.2})">
    <!-- Sofa base -->
    <rect x="${size * 0.06}" y="${size * 0.36}" width="${size * 0.48}" height="${size * 0.15}" rx="2"/>
    
    <!-- Sofa back left -->
    <rect x="${size * 0.06}" y="${size * 0.18}" width="${size * 0.09}" height="${size * 0.24}" rx="2"/>
    
    <!-- Sofa back right -->
    <rect x="${size * 0.45}" y="${size * 0.18}" width="${size * 0.09}" height="${size * 0.24}" rx="2"/>
    
    <!-- Sofa back center -->
    <rect x="${size * 0.15}" y="${size * 0.18}" width="${size * 0.3}" height="${size * 0.09}" rx="2"/>
    
    <!-- Sofa arms -->
    <rect x="${size * 0.03}" y="${size * 0.27}" width="${size * 0.12}" height="${size * 0.15}" rx="2"/>
    <rect x="${size * 0.45}" y="${size * 0.27}" width="${size * 0.12}" height="${size * 0.15}" rx="2"/>
  </g>
  
  <!-- Company initial "S" -->
  <text x="${size/2}" y="${size * 0.3}" font-family="Arial, sans-serif" font-size="${size * 0.15}" font-weight="bold" text-anchor="middle" fill="#1d4ed8">S</text>
</svg>`;
};

// Generate SVG icons for different sizes
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(__dirname, filename), svgContent);
  console.log(`Generated ${filename}`);
});

console.log('All SVG icons generated! You can use online converters to convert them to PNG if needed.');
console.log('For now, the SVG icons will work as fallbacks in most browsers.');