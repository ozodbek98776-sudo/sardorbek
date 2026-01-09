import { CartItem, Customer } from '../types';
import { formatNumber } from './format';

export interface ReceiptData {
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card';
  customer?: Customer | null;
  receiptNumber?: string;
  cashier?: string;
  date?: Date;
}

// Chek ma'lumotlarini formatlash - SODDA VA ANIQ
export const formatReceiptData = (data: ReceiptData): string => {
  const date = data.date || new Date();
  const receiptNumber = data.receiptNumber || `CHK-${Date.now()}`;
  const cashier = data.cashier || 'Kassa';

  let receipt = '';
  
  // Header - Sodda va aniq
  receipt += '╔══════════════════════════════════╗\n';
  receipt += '║         SARDOR FURNITURA         ║\n';
  receipt += '║       Mebel va aksessuarlar      ║\n';
  receipt += '╚══════════════════════════════════╝\n';
  receipt += '\n';
  
  // Chek ma'lumotlari - Strukturali
  receipt += '┌─ CHEK MA\'LUMOTLARI ─────────────┐\n';
  receipt += `│ Raqam: ${receiptNumber.padEnd(21)} │\n`;
  receipt += `│ Sana:  ${date.toLocaleDateString('uz-UZ').padEnd(21)} │\n`;
  receipt += `│ Vaqt:  ${date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }).padEnd(21)} │\n`;
  receipt += `│ Kassir: ${cashier.padEnd(20)} │\n`;
  
  if (data.customer) {
    receipt += `│ Mijoz: ${data.customer.name.substring(0, 20).padEnd(20)} │\n`;
    receipt += `│ Tel:   ${data.customer.phone.padEnd(20)} │\n`;
  }
  
  receipt += '└─────────────────────────────────┘\n';
  receipt += '\n';
  
  // Mahsulotlar ro'yxati - Jadval ko'rinishida
  receipt += '┌─ XARID QILINGAN MAHSULOTLAR ────┐\n';
  receipt += '│                                 │\n';
  
  data.items.forEach((item, index) => {
    // Mahsulot nomi (maksimal 28 belgi)
    const itemName = item.name.length > 28 ? item.name.substring(0, 25) + '...' : item.name;
    receipt += `│ ${(index + 1).toString().padStart(2)}. ${itemName.padEnd(28)} │\n`;
    
    // Kod va miqdor
    receipt += `│     Kod: ${item.code.padEnd(19)} │\n`;
    
    // Narx va hisoblash
    const priceText = `${item.cartQuantity} x ${formatNumber(item.price)}`;
    const totalText = `${formatNumber(item.price * item.cartQuantity)} so'm`;
    receipt += `│     ${priceText.padEnd(25)} │\n`;
    receipt += `│     = ${totalText.padEnd(23)} │\n`;
    receipt += '│                                 │\n';
  });
  
  receipt += '└─────────────────────────────────┘\n';
  receipt += '\n';
  
  // Jami hisob - Katta va aniq
  receipt += '╔═══════════════════════════════════╗\n';
  receipt += '║              HISOB                ║\n';
  receipt += '╠═══════════════════════════════════╣\n';
  receipt += `║ Mahsulotlar soni: ${data.items.length.toString().padStart(11)} ta ║\n`;
  receipt += `║ JAMI SUMMA:      ${formatNumber(data.total).padStart(12)} so'm ║\n`;
  receipt += `║ TO'LOV TURI:     ${(data.paymentMethod === 'cash' ? 'NAQD PUL' : 'PLASTIK').padStart(12)} ║\n`;
  receipt += '╚═══════════════════════════════════╝\n';
  receipt += '\n';
  
  // Footer - Faqat rahmat
  receipt += '┌─────────────────────────────────┐\n';
  receipt += '│     XARIDINGIZ UCHUN RAHMAT!     │\n';
  receipt += '└─────────────────────────────────┘\n';
  
  return receipt;
};

// Print modal oyna yuborish - PRINT TUGAGANDAN KEYIN CALLBACK
export const printReceipt = async (
  data: ReceiptData, 
  onPrintComplete?: () => void,
  onPrintCancel?: () => void
): Promise<boolean> => {
  try {
    const receiptText = formatReceiptData(data);
    
    // Yashirin iframe yaratish - hech qanday oyna ko'rinmaydi
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
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SARDOR FURNITURA - KASSA CHEKI</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', 'Consolas', monospace;
              font-size: 13px;
              font-weight: 600;
              line-height: 1.2;
              color: #1a1a1a;
              background: #ffffff;
              padding: 15px;
              max-width: 400px;
              margin: 0 auto;
            }
            
            .receipt-text {
              white-space: pre-line;
              font-family: inherit;
              font-weight: 600;
              word-break: break-word;
              letter-spacing: 0.3px;
              text-align: left;
            }
            
            /* Print uchun - Professional va chiroyli */
            @media print {
              @page {
                size: 80mm auto;
                margin: 2mm;
              }
              
              body {
                background: white;
                font-size: 11px;
                font-weight: 700;
                padding: 3mm;
                margin: 0;
                color: #000;
                max-width: none;
                width: 100%;
              }
              
              .receipt-text {
                width: 100%;
                font-weight: 700;
                letter-spacing: 0.2px;
                line-height: 1.1;
              }
            }
            
            /* Mobil uchun */
            @media screen and (max-width: 480px) {
              body {
                font-size: 12px;
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-text">${receiptText}</div>
          
          <script>
            let printStarted = false;
            let printCompleted = false;
            
            // Print boshlanishini kuzatish
            window.addEventListener('beforeprint', function() {
              console.log('Print dialog ochildi');
              printStarted = true;
              printCompleted = false;
            });
            
            // Print tugagandan keyin callback chaqirish
            window.addEventListener('afterprint', function() {
              console.log('Print dialog yopildi, printStarted:', printStarted);
              
              // Faqat print haqiqatan boshlanganida callback chaqirish
              if (printStarted && !printCompleted) {
                printCompleted = true;
                console.log('Print muvaffaqiyatli tugadi, callback chaqirilmoqda');
                
                // Parent window'ga xabar yuborish
                if (window.parent && window.parent.printCompleted) {
                  window.parent.printCompleted();
                }
              } else {
                console.log('Print bekor qilindi yoki allaqachon tugagan');
                // Print bekor qilinganda callback chaqirilmasin
                if (window.parent && window.parent.printCancelled) {
                  window.parent.printCancelled();
                }
              }
            });
            
            // Avtomatik print (ixtiyoriy)
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.focus();
              }, 100);
            });
          </script>
        </body>
      </html>
    `;
    
    // HTML yozish
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // Global callback funksiyasini o'rnatish
    if (onPrintComplete || onPrintCancel) {
      (window as any).printCompleted = () => {
        if (onPrintComplete) {
          onPrintComplete();
        }
        // Iframe'ni o'chirish
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
        // Global funksiyani tozalash
        delete (window as any).printCompleted;
        delete (window as any).printCancelled;
      };
      
      (window as any).printCancelled = () => {
        if (onPrintCancel) {
          onPrintCancel();
        }
        // Iframe'ni o'chirish
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
        // Global funksiyani tozalash
        delete (window as any).printCompleted;
        delete (window as any).printCancelled;
      };
    }
    
    // Print qilish
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Agar callback yo'q bo'lsa, oddiy tarzda iframe'ni o'chirish
        if (!onPrintComplete && !onPrintCancel) {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
        
      } catch (printError) {
        console.error('Print xatosi:', printError);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        throw printError;
      }
    }, 500);
    
    return true;
  } catch (error) {
    console.error('Chek chiqarishda xatolik:', error);
    
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

// Printer holatini tekshirish
export const checkPrinterStatus = async (): Promise<{
  available: boolean;
  printers: string[];
  defaultPrinter?: string;
}> => {
  try {
    // @ts-ignore - Navigator printing API
    if (navigator.printing && navigator.printing.getPrinters) {
      // @ts-ignore
      const printers = await navigator.printing.getPrinters();
      return {
        available: printers.length > 0,
        printers: printers.map((p: any) => p.name || p.id),
        defaultPrinter: printers.find((p: any) => p.isDefault)?.name
      };
    }
    
    // Fallback - browser print mavjudligini tekshirish
    return {
      available: 'print' in window,
      printers: ['Browser Default Printer'],
      defaultPrinter: 'Browser Default Printer'
    };
  } catch (error) {
    console.error('Printer holatini tekshirishda xatolik:', error);
    return {
      available: false,
      printers: [],
      defaultPrinter: undefined
    };
  }
};

// Printer test sahifasi chiqarish
export const printTestPage = async (): Promise<boolean> => {
  const testData: ReceiptData = {
    items: [
      {
        _id: 'test-1',
        name: 'Test mahsulot',
        code: 'TEST001',
        price: 10000,
        cartQuantity: 1,
        quantity: 100,
        warehouse: 'test-warehouse'
      } as CartItem
    ],
    total: 10000,
    paymentMethod: 'cash',
    receiptNumber: `TEST-${Date.now()}`,
    cashier: 'Test Kassir',
    date: new Date()
  };
  
  return await printReceipt(testData);
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

// Print preview ochish - Zamonaviy dizayn
export const openPrintPreview = (data: ReceiptData): void => {
  const receiptText = formatReceiptData(data);
  
  const previewWindow = window.open('', '_blank', 'width=700,height=900,scrollbars=yes,resizable=yes');
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          
          .preview-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 0 auto;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 25px;
            text-align: center;
          }
          
          .header h2 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .header p {
            opacity: 0.9;
            font-size: 14px;
          }
          
          .receipt-preview {
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.3;
            white-space: pre-wrap;
            background: #f8f9fa;
            padding: 25px;
            border: none;
            font-weight: 600;
            color: #2c3e50;
            max-height: 500px;
            overflow-y: auto;
          }
          
          .actions {
            padding: 25px;
            background: #f8f9fa;
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 140px;
            justify-content: center;
          }
          
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          }
          
          .btn:active {
            transform: translateY(0);
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          .btn-secondary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
          }
          
          .btn-success {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
          }
          
          .stats {
            display: flex;
            justify-content: space-around;
            padding: 20px;
            background: white;
            border-top: 1px solid #e9ecef;
          }
          
          .stat {
            text-align: center;
          }
          
          .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
          }
          
          .stat-label {
            font-size: 12px;
            color: #6c757d;
            margin-top: 4px;
          }
          
          /* Mobil uchun */
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .preview-container {
              border-radius: 15px;
            }
            
            .header {
              padding: 20px;
            }
            
            .header h2 {
              font-size: 20px;
            }
            
            .receipt-preview {
              padding: 20px;
              font-size: 12px;
            }
            
            .actions {
              padding: 20px;
              flex-direction: column;
            }
            
            .btn {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="header">
            <h2>Chek Preview</h2>
            <p>Chek raqami: ${data.receiptNumber}</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${data.items.length}</div>
              <div class="stat-label">Mahsulotlar</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatNumber(data.total)}</div>
              <div class="stat-label">Jami summa</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.paymentMethod === 'cash' ? 'NAQD' : 'KARTA'}</div>
              <div class="stat-label">To'lov turi</div>
            </div>
          </div>
          
          <div class="receipt-preview">${receiptText}</div>
          
          <div class="actions">
            <button class="btn btn-primary" onclick="window.print()">
              Print qilish
            </button>
            <button class="btn btn-success" onclick="downloadReceipt()">
              Saqlash
            </button>
            <button class="btn btn-secondary" onclick="window.close()">
              Yopish
            </button>
          </div>
        </div>
        
        <script>
          function downloadReceipt() {
            const receiptText = \`${receiptText}\`;
            const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'chek-${data.receiptNumber || Date.now()}.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
          }
        </script>
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