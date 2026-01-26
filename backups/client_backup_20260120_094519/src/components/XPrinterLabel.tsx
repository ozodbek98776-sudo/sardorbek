import React, { useRef, useEffect } from 'react';
import QRCode from 'qrcode';

interface XPrinterLabelProps {
  price: number;
  code: string;
  name: string;
  quantity: number;
  date?: string;
}

const XPrinterLabel: React.FC<XPrinterLabelProps> = ({
  price,
  code,
  name,
  quantity,
  date = new Date().toLocaleDateString('uz-UZ')
}) => {
  const qrRef = useRef<HTMLCanvasElement>(null);

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  useEffect(() => {
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, code, {
        width: 100,
        margin: 0,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    }
  }, [code]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrDataUrl = qrRef.current?.toDataURL('image/png') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Yorliq - ${name}</title>
        <style>
          @page { size: 58mm 40mm; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          .label {
            width: 58mm;
            height: 40mm;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            border: 0.2mm solid #000;
          }
          .top-row {
            display: flex;
            align-items: flex-start;
            gap: 2mm;
            margin-bottom: 1.5mm;
          }
          .qr-box {
            width: 15mm;
            height: 15mm;
            flex-shrink: 0;
          }
          .qr-box img {
            width: 15mm;
            height: 15mm;
            display: block;
          }
          .name-box {
            flex: 1;
            display: flex;
            align-items: center;
          }
          .name {
            font-size: 12pt;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .bottom-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .price {
            font-size: 18pt;
            font-weight: 900;
            color: #C41E3A;
            line-height: 1;
            margin-bottom: 1mm;
          }
          .code {
            font-size: 9pt;
            color: #333;
            font-weight: 600;
            margin-bottom: 0.5mm;
          }
          .details {
            font-size: 7pt;
            color: #666;
          }
          @media print {
            .label { border: none; }
            .price { 
              color: #C41E3A !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="top-row">
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="QR" />
            </div>
            <div class="name-box">
              <div class="name">${name.toUpperCase()}</div>
            </div>
          </div>
          <div class="bottom-section">
            <div class="price">${formatPrice(price)} so'm</div>
            <div class="code">Kod: ${code}</div>
            <div class="details">Miqdor: ${quantity.toLocaleString()} | ${date}</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 100);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      {/* Preview */}
      <div
        style={{
          width: '220px',
          height: '151px',
          padding: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #000',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* Yuqori qism: QR (chap) + Nom (o'ng) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <canvas 
            ref={qrRef} 
            style={{ 
              width: '56px', 
              height: '56px', 
              flexShrink: 0,
              imageRendering: 'pixelated'
            }} 
          />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#000',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              wordBreak: 'break-word'
            }}>
              {name}
            </div>
          </div>
        </div>

        {/* Pastki qism: Narx va ma'lumotlar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            color: '#C41E3A',
            lineHeight: 1,
            marginBottom: '4px'
          }}>
            {formatPrice(price)} so'm
          </div>
          <div style={{ fontSize: '11px', color: '#333', fontWeight: 600, marginBottom: '2px' }}>
            Kod: {code}
          </div>
          <div style={{ fontSize: '9px', color: '#666' }}>
            Miqdor: {quantity.toLocaleString()} | {date}
          </div>
        </div>
      </div>

      <button
        onClick={handlePrint}
        style={{
          marginTop: '12px',
          padding: '10px 20px',
          backgroundColor: '#2563EB',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        🖨️ Chop etish
      </button>
    </div>
  );
};

export default XPrinterLabel;
