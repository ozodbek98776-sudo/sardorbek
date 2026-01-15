import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FRONTEND_URL } from '../config/api';

interface QRPrintLabelProps {
  productId: string;
  code: string;
  name: string;
  price: number;
  unit?: string;
  dimensions?: string;
  labelWidth?: number;
  labelHeight?: number;
  copies?: number;
  onPrint?: () => void;
}

const QRPrintLabel: React.FC<QRPrintLabelProps> = ({
  productId,
  code,
  name,
  price,
  unit = 'dona',
  dimensions = '',
  labelWidth = 60,
  labelHeight = 40,
  copies = 1,
  onPrint
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [printCopies, setPrintCopies] = useState(copies);

  const productUrl = `${FRONTEND_URL}/product/${productId}`;

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  useEffect(() => {
    generateQR();
  }, [productId, code]);

  const generateQR = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(productUrl, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
      alert('Popup bloklangan. Iltimos, popup ga ruxsat bering.');
      return;
    }

    let labelsHtml = '';
    for (let i = 0; i < printCopies; i++) {
      labelsHtml += `
        <div class="label">
          <div class="top-section">
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="QR" class="qr-code" />
            </div>
            <div class="info-box">
              <div class="product-code">Kod: ${code}</div>
              <div class="product-name">${name}</div>
              ${dimensions ? `<div class="product-dimensions">${dimensions}</div>` : ''}
            </div>
          </div>
          <div class="bottom-section">
            <div class="price-box">
              <span class="price-value">${formatPrice(price)}</span>
              <span class="price-currency">so'm</span>
            </div>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Label - ${name}</title>
        <style>
          @page {
            size: ${labelWidth}mm ${labelHeight}mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            padding: 2mm;
            background: white;
            display: flex;
            flex-direction: column;
            page-break-after: always;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .top-section {
            display: flex;
            gap: 2mm;
            flex: 1;
          }
          .qr-box {
            width: 22mm;
            height: 22mm;
            flex-shrink: 0;
          }
          .qr-code {
            width: 22mm;
            height: 22mm;
            display: block;
            image-rendering: pixelated;
          }
          .info-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .product-code {
            font-size: 7pt;
            font-weight: 600;
            color: #666;
            margin-bottom: 1mm;
          }
          .product-name {
            font-size: 9pt;
            font-weight: 700;
            color: #000;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
          }
          .product-dimensions {
            font-size: 7pt;
            color: #666;
            margin-top: 1mm;
          }
          .bottom-section {
            margin-top: 1.5mm;
          }
          .price-box {
            padding: 1.5mm;
            text-align: center;
            background: #f0f0f0;
            border-radius: 1mm;
          }
          .price-value {
            font-size: 14pt;
            font-weight: 900;
            color: #000;
            letter-spacing: -0.5px;
          }
          .price-currency {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            margin-left: 1mm;
          }
          @media print {
            body { background: white; }
          }
          @media screen {
            body { background: #e5e7eb; padding: 10mm; }
            .label { 
              margin-bottom: 5mm;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 200);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    onPrint?.();
  };

  return (
    <div className="qr-print-label w-full">
      {/* Preview */}
      <div 
        className="bg-white rounded-lg overflow-hidden mx-auto shadow-md border border-gray-200"
        style={{ width: '280px', padding: '12px' }}
      >
        {/* Top Section - QR + Info */}
        <div className="flex gap-3">
          {/* QR Code */}
          <div className="flex-shrink-0">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code"
                className="w-24 h-24"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">QR</span>
              </div>
            )}
          </div>

          {/* Info Box - Kod va Nom */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-sm font-semibold text-gray-500 mb-1">
              Kod: {code}
            </div>
            <div className="text-base font-bold text-gray-900 uppercase leading-tight">
              {name}
            </div>
            {dimensions && (
              <div className="text-sm text-gray-500 mt-1">
                {dimensions}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section - Price */}
        <div className="mt-3 bg-gray-100 rounded-lg p-2 text-center">
          <span className="text-2xl font-black text-gray-900">
            {formatPrice(price)}
          </span>
          <span className="text-lg font-bold text-gray-900 ml-1">
            so'm
          </span>
        </div>
      </div>

      {/* Copies Input */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <label className="text-sm text-gray-600">Nusxa soni:</label>
        <input
          type="number"
          min={1}
          max={100}
          value={printCopies}
          onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
        />
      </div>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        🖨️ Chop etish {printCopies > 1 ? `(${printCopies} ta)` : ''}
      </button>
    </div>
  );
};

export default QRPrintLabel;
