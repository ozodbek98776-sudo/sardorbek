import React, { useState, useEffect } from 'react';
import * as QRCode from 'qrcode';
import { X, Printer, Plus, Minus } from 'lucide-react';
import { getUnitPrice } from '../utils/pricing';

interface Product {
  _id: string;
  name: string;
  price: number;
  unit?: string;
  prices?: any[];
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

const LABEL_W = 57;  // mm
const LABEL_H = 40;  // mm
const QR_SIZE = 20;  // mm

const BatchQRPrint: React.FC<BatchQRPrintProps> = ({ products, onClose }) => {
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatPrice = (num: number) => new Intl.NumberFormat('uz-UZ').format(num);

  const generateQRDataUrl = async (text: string): Promise<string> => {
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, text, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' }
      });
      return canvas.toDataURL('image/png');
    } catch {
      try {
        return await (QRCode as any).toDataURL(text, { width: 200, margin: 1 });
      } catch {
        return '';
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const items: PrintItem[] = [];
      // Always use window.location.origin so QR matches current domain
      const baseUrl = window.location.origin;
      for (const product of products) {
        const qrDataUrl = await generateQRDataUrl(`${baseUrl}/product/${product._id}`);
        items.push({ product, copies: 1, qrDataUrl });
      }
      setPrintItems(items);
      setLoading(false);
    };
    load();
  }, [products]);

  const updateCopies = (index: number, delta: number) => {
    setPrintItems(prev => prev.map((item, i) =>
      i === index ? { ...item, copies: Math.max(1, Math.min(100, item.copies + delta)) } : item
    ));
  };

  const setCopies = (index: number, value: number) => {
    setPrintItems(prev => prev.map((item, i) =>
      i === index ? { ...item, copies: Math.max(1, Math.min(100, value)) } : item
    ));
  };

  const removeItem = (index: number) => {
    setPrintItems(prev => prev.filter((_, i) => i !== index));
  };

  const setAllCopies = (value: number) => {
    setPrintItems(prev => prev.map(item => ({ ...item, copies: value })));
  };

  const getTotalLabels = () => printItems.reduce((sum, item) => sum + item.copies, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Popup bloklangan. Iltimos, popup ga ruxsat bering.');
      return;
    }

    let labelsHtml = '';
    printItems.forEach(item => {
      const unitPrice = getUnitPrice(item.product);
      const displayPrice = unitPrice || item.product.price || 0;
      const unit = item.product.unit || 'dona';

      for (let i = 0; i < item.copies; i++) {
        labelsHtml += `
          <div class="label">
            <div class="label-price">${formatPrice(displayPrice)} so'm</div>
            <div class="label-bottom">
              <div class="label-name">${item.product.name}</div>
              <div class="label-qr">
                ${item.qrDataUrl
                  ? `<img src="${item.qrDataUrl}" alt="QR" />`
                  : `<div class="qr-empty">QR</div>`
                }
              </div>
            </div>
          </div>`;
      }
    });

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Label Print</title>
  <style>
    @page { size: ${LABEL_W}mm ${LABEL_H}mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      width: ${LABEL_W}mm;
      height: ${LABEL_H}mm;
      padding: 2mm;
      display: flex;
      flex-direction: column;
      background: white;
      page-break-after: always;
      page-break-inside: avoid;
    }
    .label-price {
      font-size: 18pt;
      font-weight: 900;
      color: #CC0000;
      line-height: 1;
      text-align: center;
      padding-bottom: 1.5mm;
      margin-bottom: 1.5mm;
    }
    .label-bottom {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex: 1;
      gap: 2mm;
      min-height: 0;
    }
    .label-qr {
      flex: 0 0 auto;
    }
    .label-qr img {
      width: ${QR_SIZE}mm;
      height: ${QR_SIZE}mm;
      display: block;
      image-rendering: pixelated;
    }
    .qr-empty {
      width: ${QR_SIZE}mm;
      height: ${QR_SIZE}mm;
      background: #eee;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6pt;
      color: #999;
    }
    .label-name {
      flex: 1;
      font-size: 8pt;
      font-weight: 700;
      color: #000;
      line-height: 1.2;
      word-break: break-word;
      text-align: left;
    }
  </style>
</head>
<body>
  ${labelsHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 400);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">QR kodlar yaratilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Label Chop Etish</h2>
            <p className="text-sm text-slate-500">
              {printItems.length} ta mahsulot · jami {getTotalLabels()} ta label
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick copy actions */}
        <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
          <span className="text-xs text-slate-500">Barchasi:</span>
          {[1, 2, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => setAllCopies(n)}
              className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {n} ta
            </button>
          ))}
        </div>

        {/* Products list */}
        <div className="flex-1 overflow-y-auto p-4">
          {printItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Mahsulotlar yo'q</div>
          ) : (
            <div className="space-y-2">
              {printItems.map((item, index) => {
                const unitPrice = getUnitPrice(item.product);
                const displayPrice = unitPrice || item.product.price || 0;
                return (
                  <div key={item.product._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {/* QR preview */}
                    {item.qrDataUrl ? (
                      <img src={item.qrDataUrl} alt="QR" className="w-12 h-12 rounded border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-400">QR</div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{item.product.name}</div>
                      <div className="text-sm font-bold text-red-600">{formatPrice(displayPrice)} so'm</div>
                    </div>

                    {/* Copies */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCopies(index, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={item.copies}
                        onChange={e => setCopies(index, Number(e.target.value))}
                        className="w-12 text-center px-1 py-1 border border-slate-200 rounded-lg text-sm"
                        min={1}
                        max={100}
                      />
                      <button
                        onClick={() => updateCopies(index, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeItem(index)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Jami: <span className="font-bold text-slate-900">{getTotalLabels()}</span> ta label
          </span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
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
