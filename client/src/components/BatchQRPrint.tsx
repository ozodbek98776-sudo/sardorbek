import React, { useState, useEffect } from 'react';
import * as QRCode from 'qrcode';
import { FRONTEND_URL } from '../config/api';
import { X, Printer, Plus, Minus, Settings } from 'lucide-react';
import { getUnitPrice } from '../utils/pricing';

interface Product {
  _id: string;
  code: string;
  name: string;
  price: number;
  unit?: string;
}

interface BatchQRPrintProps {
  products: Product[];
  onClose: () => void;
}

interface PrintItem {
  product: Product;
  copies: number;
  qrDataUrl: string;
}

const BatchQRPrint: React.FC<BatchQRPrintProps> = ({ products, onClose }) => {
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Label sozlamalari
  const [labelSettings, setLabelSettings] = useState({
    width: 40,    // mm
    height: 30,   // mm
    qrSize: 18,   // mm
    columns: 2,   // Bir qatorda nechta
    showPrice: true,
    showCode: true
  });
  const [showSettings, setShowSettings] = useState(false);

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  useEffect(() => {
    generateAllQRs();
  }, [products]);

  const generateAllQRs = async () => {
    setLoading(true);
    const items: PrintItem[] = [];

    for (const product of products) {
      const productUrl = `${FRONTEND_URL}/product/${product._id}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(productUrl, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' }
        });
        items.push({ product, copies: 1, qrDataUrl });
      } catch (err) {
        console.error('QR error for', product.code, err);
      }
    }

    setPrintItems(items);
    setLoading(false);
  };

  const updateCopies = (index: number, delta: number) => {
    setPrintItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newCopies = Math.max(1, Math.min(100, item.copies + delta));
        return { ...item, copies: newCopies };
      }
      return item;
    }));
  };

  const setCopies = (index: number, value: number) => {
    setPrintItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, copies: Math.max(1, Math.min(100, value)) };
      }
      return item;
    }));
  };

  const removeItem = (index: number) => {
    setPrintItems(prev => prev.filter((_, i) => i !== index));
  };

  const setAllCopies = (value: number) => {
    setPrintItems(prev => prev.map(item => ({ ...item, copies: value })));
  };

  const getTotalLabels = () => {
    return printItems.reduce((sum, item) => sum + item.copies, 0);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Popup bloklangan. Iltimos, popup ga ruxsat bering.');
      return;
    }

    // Barcha labellarni yaratish
    let labelsHtml = '';
    printItems.forEach(item => {
      for (let i = 0; i < item.copies; i++) {
        // YANGI NARX TIZIMI - eng yaxshi narxni hisoblash
        const unitPrice = getUnitPrice(item.product);
        const displayPrice = unitPrice || item.product.price || 0;
        
        labelsHtml += `
          <div class="label">
            <div class="qr-section">
              <img src="${item.qrDataUrl}" alt="QR" class="qr-code" />
            </div>
            <div class="info-section">
              <div class="product-name">${item.product.name.length > 18 ? item.product.name.substring(0, 18) + '...' : item.product.name}</div>
              ${labelSettings.showCode ? `<div class="product-code">Kod: ${item.product.code}</div>` : ''}
              ${labelSettings.showPrice ? `<div class="product-price">${formatPrice(displayPrice)} so'm</div>` : ''}
            </div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Labels - Batch Print</title>
        <style>
          @page {
            size: ${labelSettings.width * labelSettings.columns + 2}mm auto;
            margin: 1mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 1mm;
          }
          .label {
            width: ${labelSettings.width}mm;
            height: ${labelSettings.height}mm;
            padding: 1.5mm;
            display: flex;
            align-items: center;
            gap: 1.5mm;
            background: white;
            border: 0.2mm solid #ddd;
            page-break-inside: avoid;
          }
          .qr-section {
            flex-shrink: 0;
          }
          .qr-code {
            width: ${labelSettings.qrSize}mm;
            height: ${labelSettings.qrSize}mm;
            display: block;
            image-rendering: pixelated;
          }
          .info-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
          }
          .product-name {
            font-size: 6pt;
            font-weight: 700;
            color: #000;
            line-height: 1.1;
            margin-bottom: 0.3mm;
            text-transform: uppercase;
            word-break: break-word;
          }
          .product-code {
            font-size: 5pt;
            color: #333;
            margin-bottom: 0.3mm;
          }
          .product-price {
            font-size: 7pt;
            font-weight: 900;
            color: #000;
          }
          @media print {
            body { background: white; }
            .label { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-surface-600">QR kodlar yaratilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <div>
            <h2 className="text-xl font-bold text-surface-900">QR Label Chop Etish</h2>
            <p className="text-sm text-surface-500">
              {printItems.length} ta mahsulot, jami {getTotalLabels()} ta label
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-brand-100 text-brand-600' : 'hover:bg-surface-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-surface-50 border-b border-surface-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Eni (mm)</label>
                <input
                  type="number"
                  value={labelSettings.width}
                  onChange={e => setLabelSettings(s => ({ ...s, width: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Bo'yi (mm)</label>
                <input
                  type="number"
                  value={labelSettings.height}
                  onChange={e => setLabelSettings(s => ({ ...s, height: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">QR (mm)</label>
                <input
                  type="number"
                  value={labelSettings.qrSize}
                  onChange={e => setLabelSettings(s => ({ ...s, qrSize: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Ustunlar</label>
                <input
                  type="number"
                  value={labelSettings.columns}
                  onChange={e => setLabelSettings(s => ({ ...s, columns: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPrice"
                  checked={labelSettings.showPrice}
                  onChange={e => setLabelSettings(s => ({ ...s, showPrice: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="showPrice" className="text-sm">Narx</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showCode"
                  checked={labelSettings.showCode}
                  onChange={e => setLabelSettings(s => ({ ...s, showCode: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="showCode" className="text-sm">Kod</label>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-3 border-b border-surface-200 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-surface-500">Barchasi uchun:</span>
          {[1, 2, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => setAllCopies(n)}
              className="px-3 py-1 text-sm bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
            >
              {n} ta
            </button>
          ))}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4">
          {printItems.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              Mahsulotlar yo'q
            </div>
          ) : (
            <div className="space-y-2">
              {printItems.map((item, index) => (
                <div 
                  key={item.product._id}
                  className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl"
                >
                  {/* QR Preview */}
                  <img 
                    src={item.qrDataUrl} 
                    alt="QR"
                    className="w-12 h-12 rounded border border-surface-200"
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-sm text-surface-500">
                      Kod: {item.product.code} • {formatPrice(item.product.price)} so'm
                    </div>
                  </div>

                  {/* Copies Control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCopies(index, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={item.copies}
                      onChange={e => setCopies(index, Number(e.target.value))}
                      className="w-14 text-center px-2 py-1 border border-surface-200 rounded-lg"
                      min={1}
                      max={100}
                    />
                    <button
                      onClick={() => updateCopies(index, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-200 flex items-center justify-between">
          <div className="text-sm text-surface-500">
            Jami: <span className="font-bold text-surface-900">{getTotalLabels()}</span> ta label
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handlePrint}
              disabled={printItems.length === 0}
              className="px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Chop etish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchQRPrint;
