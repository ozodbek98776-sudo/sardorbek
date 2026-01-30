import { CartItem, Customer } from '../types';
import { formatNumber } from './format';

export interface ReceiptData {
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'click';
  customer?: Customer | null;
  receiptNumber?: string;
  cashier?: string;
  date?: Date;
}

// Chek ma'lumotlarini formatlash - HAQIQIY KASSA CHEKI KABI
export const formatReceiptData = (data: ReceiptData): string => {
  const date = data.date || new Date();
  const receiptNumber = data.receiptNumber || `CHK-${Date.now()}`;
  const cashier = data.cashier || 'Kassa';

  let receipt = '';
  
  // Header - Professional kassa cheki kabi (58mm uchun qisqa)
  receipt += '========================\n';
  receipt += '   SARDOR FURNITURA    \n';
  receipt += '========================\n';
  receipt += '\n';
  receipt += `CHK: ${receiptNumber}\n`;
  receipt += `${date.toLocaleDateString('uz-UZ')} ${date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}\n`;
  receipt += `KASSIR: ${cashier}\n`;
  
  if (data.customer) {
    receipt += `MIJOZ: ${data.customer.name}\n`;
    receipt += `TEL: ${data.customer.phone}\n`;
  }
  
  receipt += '------------------------\n';
  
  // Umumiy chegirma hisoblash
  let totalOriginalPrice = 0;
  let totalCurrentPrice = 0;
  
  // Items - Oddiy va tushunarli
  data.items.forEach((item, index) => {
    receipt += `${index + 1}. ${item.name}\n`;
    receipt += `    ${item.code}\n`;
    
    // Oldingi va hozirgi narxlarni ko'rsatish
    const previousPrice = (item as any).previousPrice;
    const currentPrice = (item as any).currentPrice || item.price;
    
    // Umumiy narxlarni yig'ish
    totalOriginalPrice += (previousPrice && previousPrice > 0 ? previousPrice : currentPrice) * item.cartQuantity;
    totalCurrentPrice += currentPrice * item.cartQuantity;
    
    if (previousPrice && previousPrice > 0 && previousPrice !== currentPrice) {
      const discountPercent = Math.round(((previousPrice - currentPrice) / previousPrice) * 100);
      receipt += `    OLDINGI: ${formatNumber(previousPrice)} so'm\n`;
      receipt += `    HOZIRGI: ${formatNumber(currentPrice)} so'm`;
      if (discountPercent > 0) {
        receipt += ` (-${discountPercent}%)\n`;
      } else if (discountPercent < 0) {
        receipt += ` (+${Math.abs(discountPercent)}%)\n`;
      } else {
        receipt += '\n';
      }
    } else {
      receipt += `    NARXI: ${formatNumber(item.price)} so'm\n`;
    }
    
    receipt += `    ${item.cartQuantity} x ${formatNumber(currentPrice)}\n`;
    receipt += `    = ${formatNumber(currentPrice * item.cartQuantity)} so'm\n`;
    receipt += '\n';
  });
  
  receipt += '------------------------\n';
  
  // Total - Katta va aniq (58mm uchun qisqa)
  receipt += `JAMI: ${formatNumber(data.total)} SO'M\n`;
  
  // Umumiy chegirma foizini ko'rsatish (58mm uchun qisqa)
  if (totalOriginalPrice > totalCurrentPrice) {
    const totalDiscount = totalOriginalPrice - totalCurrentPrice;
    const totalDiscountPercent = Math.round((totalDiscount / totalOriginalPrice) * 100);
    receipt += `CHEGIRMA: ${formatNumber(totalDiscount)} SO'M (${totalDiscountPercent}%)\n`;
  }
  
  // To'lov turlari bo'yicha breakdown (58mm uchun qisqa)
  const totalCash = data.items.reduce((sum, item) => sum + (item.paymentBreakdown?.cash || 0), 0);
  const totalClick = data.items.reduce((sum, item) => sum + (item.paymentBreakdown?.click || 0), 0);
  const totalCard = data.items.reduce((sum, item) => sum + (item.paymentBreakdown?.card || 0), 0);
  
  if (totalCash > 0) receipt += `NAQT: ${formatNumber(totalCash)} SO'M\n`;
  if (totalClick > 0) receipt += `CLICK: ${formatNumber(totalClick)} SO'M\n`;
  if (totalCard > 0) receipt += `KARTA: ${formatNumber(totalCard)} SO'M\n`;
  
  receipt += `TO'LOV: ${data.paymentMethod === 'cash' ? 'NAQD' : data.paymentMethod === 'click' ? 'CLICK' : 'KARTA'}\n`;
  
  // Ball tizimi - har 1,000,000 so'm = 1 ball (58mm uchun qisqa)
  const earnedBalls = Math.floor(data.total / 1000000);
  if (earnedBalls > 0) {
    receipt += '------------------------\n';
    receipt += `BALL: +${earnedBalls} BALL!\n`;
  }
  
  // Mijoz umumiy balli (agar mavjud bo'lsa)
  if (data.customer && (data.customer as any).totalBalls) {
    receipt += `JAMI: ${(data.customer as any).totalBalls} BALL\n`;
  }
  
  receipt += '========================\n';
  receipt += '  XARIDINGIZ UCHUN     \n';
  receipt += '      RAHMAT!          \n';
  receipt += '========================\n';
  receipt += '\n';
  receipt += '⚠️ VAZVRAT CHEKSIZ ⚠️\n';
  receipt += '  QABUL QILINMAYDI  \n';
  receipt += '========================\n';
  
  return receipt;
};

// X Printer uchun maxsus chek chiqarish funksiyasi
export const printToXPrinter = async (data: ReceiptData, onPrintComplete?: () => void): Promise<boolean> => {
  try {
    const receiptText = formatReceiptData(data);
    
    // X Printer uchun maxsus iframe yaratish
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.visibility = 'hidden';
    iframe.style.opacity = '0';
    
    document.body.appendChild(iframe);
    
    // Iframe'ga content yozish
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Iframe document topilmadi');
    }
    
    // X Printer uchun optimallashtirilgan HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>X PRINTER CHEK</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              font-weight: bold;
              line-height: 1.2;
              color: #000;
              background: white;
              padding: 0;
              margin: 0;
            }
            
            .receipt-text {
              white-space: pre-line;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              font-weight: bold;
              word-break: break-word;
              padding: 5px;
            }
            
            /* X Printer uchun maxsus print sozlamalari */
            @media print {
              @page {
                size: 58mm auto;
                margin: 0;
                padding: 0;
              }
              
              body {
                background: white;
                font-size: 10px;
                font-weight: bold;
                padding: 0;
                margin: 0;
                width: 58mm;
              }
              
              .receipt-text {
                width: 100%;
                font-weight: bold;
                font-size: 10px;
                padding: 2mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-text">${receiptText}</div>
          
          <script>
            // X Printer uchun print tugagandan keyin callback
            window.addEventListener('afterprint', function() {
              console.log('X Printer: Print tugadi');
              if (window.parent && window.parent.xPrinterCompleted) {
                window.parent.xPrinterCompleted();
              }
            });
            
            // X Printer uchun avtomatik print
            window.addEventListener('load', function() {
              setTimeout(function() {
                console.log('X Printer: Print boshlanmoqda...');
                window.print();
              }, 300);
            });
          </script>
        </body>
      </html>
    `;
    
    // HTML yozish
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // X Printer uchun global callback funksiyasini o'rnatish
    if (onPrintComplete) {
      (window as any).xPrinterCompleted = () => {
        console.log('X Printer: Callback chaqirildi');
        onPrintComplete();
        // Iframe'ni o'chirish
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
        // Global funksiyani tozalash
        delete (window as any).xPrinterCompleted;
      };
    }
    
    // Agar callback yo'q bo'lsa, oddiy tarzda iframe'ni o'chirish
    if (!onPrintComplete) {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
    
    console.log('X Printer: Chek tayyorlandi va yuborildi');
    return true;
    
  } catch (error) {
    console.error('X Printer xatosi:', error);
    
    // Fallback - faylni yuklab olish
    try {
      downloadReceiptAsPDF(data);
      return false;
    } catch (downloadError) {
      console.error('Faylni yuklashda xatolik:', downloadError);
      return false;
    }
  }
};

// Chekni printerga yuborish - X PRINTER BILAN ISHLASH
export const printReceipt = async (data: ReceiptData, onPrintComplete?: () => void): Promise<boolean> => {
  // X Printer funksiyasini chaqirish
  return await printToXPrinter(data, onPrintComplete);
};

// Chekni PDF sifatida saqlash (ixtiyoriy)
export const downloadReceiptAsPDF = (data: ReceiptData): void => {
  const receiptText = formatReceiptData(data);
  const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `chek-${data.receiptNumber || Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Thermal printer uchun ESC/POS komandalar (agar kerak bo'lsa)
export const generateESCPOSCommands = (data: ReceiptData): Uint8Array => {
  const receiptText = formatReceiptData(data);
  
  // ESC/POS komandalar
  const ESC = 0x1B;
  const GS = 0x1D;
  
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(ESC, 0x40);
  
  // Set character set to UTF-8
  commands.push(ESC, 0x74, 0x06);
  
  // Center align
  commands.push(ESC, 0x61, 0x01);
  
  // Add text
  const textBytes = new TextEncoder().encode(receiptText);
  commands.push(...Array.from(textBytes));
  
  // Cut paper
  commands.push(GS, 0x56, 0x00);
  
  return new Uint8Array(commands);
};

// X Printer holatini tekshirish
export const checkPrinterStatus = async (): Promise<{
  available: boolean;
  printers: string[];
  defaultPrinter?: string;
  xPrinterFound?: boolean;
}> => {
  try {
    // @ts-ignore - Navigator printing API
    if (navigator.printing && navigator.printing.getPrinters) {
      // @ts-ignore
      const printers = await navigator.printing.getPrinters();
      const printerNames = printers.map((p: any) => p.name || p.id);
      
      // X Printer mavjudligini tekshirish
      const xPrinterFound = printerNames.some((name: string) => 
        name.toLowerCase().includes('x printer') || 
        name.toLowerCase().includes('xprinter') ||
        name.toLowerCase().includes('x-printer')
      );
      
      return {
        available: printers.length > 0,
        printers: printerNames,
        defaultPrinter: printers.find((p: any) => p.isDefault)?.name,
        xPrinterFound
      };
    }
    
    // Fallback - browser print mavjudligini tekshirish
    return {
      available: 'print' in window,
      printers: ['Browser Default Printer', 'X Printer (Auto-detect)'],
      defaultPrinter: 'X Printer (Auto-detect)',
      xPrinterFound: true // Optimistik yondashuv
    };
  } catch (error) {
    console.error('Printer holatini tekshirishda xatolik:', error);
    return {
      available: false,
      printers: [],
      defaultPrinter: undefined,
      xPrinterFound: false
    };
  }
};

// X Printer test sahifasi chiqarish
export const printXPrinterTestPage = async (): Promise<boolean> => {
  const testData: ReceiptData = {
    items: [
      {
        _id: 'test-x-1',
        name: '🖨️ X PRINTER TEST',
        code: 'XTEST001',
        price: 5000,
        cartQuantity: 1,
        quantity: 100,
        warehouse: 'test-x'
      } as CartItem
    ],
    total: 5000,
    paymentMethod: 'cash',
    receiptNumber: `X-PRINTER-TEST-${Date.now()}`,
    cashier: 'X Printer Test',
    date: new Date()
  };
  
  console.log('X Printer test sahifasi chiqarilmoqda...');
  return await printToXPrinter(testData, () => {
    console.log('X Printer test tugadi!');
  });
};

// Printer sozlamalarini saqlash
export const savePrinterSettings = (settings: {
  preferredPrinter?: string;
  paperSize: '80mm' | '58mm' | 'A4';
  fontSize: 'small' | 'medium' | 'large';
  autoPrint: boolean;
}) => {
  localStorage.setItem('printerSettings', JSON.stringify(settings));
};

// Printer sozlamalarini olish
export const getPrinterSettings = () => {
  const saved = localStorage.getItem('printerSettings');
  if (saved) {
    return JSON.parse(saved);
  }
  
  // Default sozlamalar
  return {
    paperSize: '80mm',
    fontSize: 'medium',
    autoPrint: true
  };
};

// Windows printer ro'yxatini olish (faqat ma'lumot uchun)
export const getWindowsPrinters = (): string[] => {
  // Bu browser orqali to'liq Windows printer ro'yxatini olish mumkin emas
  // Lekin print dialog ochilganda barcha printerlar ko'rinadi
  const commonPrinters = [
    'Microsoft Print to PDF',
    'Microsoft XPS Document Writer',
    'Fax',
    // Thermal printerlar
    'POS-80',
    'POS-58',
    'Thermal Receipt Printer',
    'EPSON TM-T20',
    'EPSON TM-T82',
    'Star TSP100',
    // Oddiy printerlar
    'HP LaserJet',
    'Canon PIXMA',
    'Epson L3150',
    'Brother HL'
  ];
  
  return commonPrinters;
};

// Print preview ochish
export const openPrintPreview = (data: ReceiptData): void => {
  const receiptText = formatReceiptData(data);
  
  const previewWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
  if (!previewWindow) {
    alert('Popup blocker tomonidan bloklandi. Popup ruxsatini yoqing.');
    return;
  }
  
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Chek Preview - ${data.receiptNumber}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
          }
          .receipt-preview {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            background: #fafafa;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .actions {
            margin-top: 20px;
            text-align: center;
          }
          .btn {
            padding: 10px 20px;
            margin: 0 5px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-primary {
            background: #007bff;
            color: white;
          }
          .btn-secondary {
            background: #6c757d;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3>📋 Chek Preview</h3>
          <div class="receipt-preview">${receiptText}</div>
          <div class="actions">
            <button class="btn btn-primary" onclick="window.print()">🖨️ Print qilish</button>
            <button class="btn btn-secondary" onclick="window.close()">❌ Yopish</button>
          </div>
        </div>
      </body>
    </html>
  `);
  
  previewWindow.document.close();
  previewWindow.focus();
};

// Printer test sahifasi (Windows printer dialog bilan)
export const printWindowsTestPage = async (): Promise<boolean> => {
  const testData: ReceiptData = {
    items: [
      {
        _id: 'test-1',
        name: '🧪 PRINTER TEST',
        code: 'TEST001',
        price: 1000,
        cartQuantity: 1,
        quantity: 100,
        warehouse: 'test'
      } as CartItem
    ],
    total: 1000,
    paymentMethod: 'cash',
    receiptNumber: `WINDOWS-TEST-${Date.now()}`,
    cashier: 'Windows Test',
    date: new Date()
  };
  
  return await printReceipt(testData);
};