import React, { useRef } from 'react';

interface PrintablePriceLabelProps {
  price: number;
  code: string;
  name: string;
  quantity: number;
  date?: string;
  qrData?: string;
  onPrint?: () => void;
}

const PrintablePriceLabel: React.FC<PrintablePriceLabelProps> = ({
  price,
  code,
  name,
  quantity,
  date = new Date().toLocaleDateString('uz-UZ'),
  qrData
}) => {
  const labelRef = useRef<HTMLDivElement>(null);

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  // Simple QR code SVG generator
  const generateSimpleQR = (data: string) => {
    // This creates a simple placeholder pattern
    // For real QR, use qrcode library
    const size = 64;
    const cellSize = 4;
    const cells = Math.floor(size / cellSize);
    
    let pattern = '';
    const hash = data.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        // Border pattern
        if (x < 2 || x >= cells - 2 || y < 2 || y >= cells - 2) {
          if ((x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7)) {
            // Corner patterns
            const inCorner = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
            if (inCorner) {
              const cx = x < 7 ? x : (x >= cells - 7 ? x - (cells - 7) : x);
              const cy = y < 7 ? y : (y >= cells - 7 ? y - (cells - 7) : y);
              if (cx === 0 || cx === 6 || cy === 0 || cy === 6 || (cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4)) {
                pattern += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
              }
            }
          }
        } else {
          // Data pattern (pseudo-random based on hash)
          const seed = (hash + x * 31 + y * 17) % 100;
          if (seed > 45) {
            pattern += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
    }
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="white"/>${pattern}</svg>`;
  };

  const handlePrint = () => {
    const printContent = labelRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Price Label - ${name}</title>
        <style>
          @page {
            size: 80mm 50mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            background: white;
          }
          .label {
            width: 280px;
            padding: 12px 16px;
            background: white;
            border: 1px solid #000;
          }
          .label-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .info {
            flex: 1;
          }
          .price {
            font-size: 24px;
            font-weight: bold;
            color: #DC2626;
            margin-bottom: 4px;
            line-height: 1.1;
          }
          .code {
            font-size: 13px;
            color: #374151;
            margin-bottom: 6px;
          }
          .name {
            font-size: 15px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .quantity {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 2px;
          }
          .date {
            font-size: 11px;
            color: #9CA3AF;
          }
          .qr {
            margin-left: 12px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .price { color: #DC2626 !important; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="label-content">
            <div class="info">
              <div class="price">${formatPrice(price)} so'm</div>
              <div class="code">Kod: ${code}</div>
              <div class="name">${name}</div>
              <div class="quantity">Miqdor: ${quantity.toLocaleString()}</div>
              <div class="date">${date}</div>
            </div>
            <div class="qr">
              ${generateSimpleQR(qrData || `${code}-${name}`)}
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const qrSvg = generateSimpleQR(qrData || `${code}-${name}`);

  return (
    <div>
      {/* Preview */}
      <div 
        ref={labelRef}
        style={{
          width: '280px',
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          border: '1px solid #000000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626', marginBottom: '4px', lineHeight: 1.1 }}>
              {formatPrice(price)} so'm
            </div>
            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
              Kod: {code}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '6px', textTransform: 'uppercase' }}>
              {name}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
              Miqdor: {quantity.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
              {date}
            </div>
          </div>
          <div style={{ marginLeft: '12px' }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={handlePrint}
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: '#2563EB',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        🖨️ Chop etish
      </button>
    </div>
  );
};

export default PrintablePriceLabel;
