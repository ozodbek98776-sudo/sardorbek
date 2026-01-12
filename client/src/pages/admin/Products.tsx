import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { Plus, Minus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Upload, Printer, Ruler, Box, Scale, RotateCcw } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export default function Products() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    code: '', name: '', costPrice: '', wholesalePrice: '', quantity: '',
    unit: 'dona' as 'dona' | 'metr' | 'rulon' | 'karobka' | 'gram' | 'kg' | 'litr',
    conversionEnabled: false,
    baseUnit: 'dona' as 'dona' | 'metr' | 'gram' | 'kg' | 'litr',
    conversionRate: '',
    packageCount: '',
    pricePerMeter: '',
    pricePerRoll: '',
    pricePerBox: '',
    pricePerKg: '',
    pricePerGram: ''
  });
  const [packageData, setPackageData] = useState({
    packageCount: '', unitsPerPackage: '', totalCost: ''
  });
  const [images, setImages] = useState<string[]>([]);
  const [codeError, setCodeError] = useState('');
  const [showPackageInput, setShowPackageInput] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityMode, setQuantityMode] = useState<'add' | 'subtract'>('add');
  const [quantityInput, setQuantityInput] = useState('');
  const [printSettings, setPrintSettings] = useState({
    printer: '',
    copies: 1,
    size: 'card',
    layout: 'standard',
    customWidth: '',
    customHeight: ''
  });
  const [availablePrinters] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMainWarehouse();
  }, []);

  useEffect(() => {
    if (mainWarehouse) {
      fetchProducts();
    }
  }, [mainWarehouse]);

  const fetchMainWarehouse = async () => {
    try {
      const res = await api.get('/warehouses');
      const main = res.data.find((w: Warehouse) => w.name === 'Asosiy ombor');
      if (main) {
        setMainWarehouse(main);
      } else {
        const newMain = await api.post('/warehouses', { name: 'Asosiy ombor', address: '' });
        setMainWarehouse(newMain.data);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?mainOnly=true');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = 8 - images.length;
    if (remainingSlots <= 0) {
      showAlert('Maksimum 8 ta rasm yuklash mumkin', 'Ogohlantirish', 'warning');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const formData = new FormData();
    filesToUpload.forEach(file => formData.append('images', file));

    setUploading(true);
    try {
      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImages([...images, ...res.data.images]);
    } catch (err) {
      console.error('Error uploading images:', err);
      showAlert('Rasmlarni yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = async (imagePath: string) => {
    try {
      await api.delete('/products/delete-image', { data: { imagePath } });
      setImages(images.filter(img => img !== imagePath));
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeError) {
      showAlert(codeError, 'Xatolik', 'danger');
      return;
    }
    
    let finalQuantity = Number(formData.quantity);
    let finalCostPrice = Number(formData.costPrice);
    let packageInfo = null;
    
    // If package data is provided, calculate totals
    if (showPackageInput && packageData.packageCount && packageData.unitsPerPackage) {
      const totalUnits = Number(packageData.packageCount) * Number(packageData.unitsPerPackage);
      
      finalQuantity = editingProduct ? Number(formData.quantity) + totalUnits : totalUnits;
      
      packageInfo = {
        packageCount: Number(packageData.packageCount),
        unitsPerPackage: Number(packageData.unitsPerPackage),
        totalUnits: totalUnits
      };
    }

    // Konversiya hisoblash
    let totalBaseUnits = finalQuantity;
    if (formData.conversionEnabled && formData.conversionRate) {
      totalBaseUnits = finalQuantity * Number(formData.conversionRate);
    }
    
    try {
      const data = {
        code: formData.code,
        name: formData.name,
        costPrice: finalCostPrice,
        price: Number(formData.wholesalePrice),
        quantity: finalQuantity,
        warehouse: mainWarehouse?._id,
        images,
        packageInfo,
        // Yangi fieldlar
        unit: formData.unit,
        unitConversion: {
          enabled: formData.conversionEnabled,
          baseUnit: formData.baseUnit,
          conversionRate: Number(formData.conversionRate) || 1,
          packageCount: finalQuantity,
          totalBaseUnits: totalBaseUnits
        },
        prices: {
          perUnit: Number(formData.wholesalePrice),
          perMeter: Number(formData.pricePerMeter) || 0,
          perRoll: Number(formData.pricePerRoll) || 0,
          perBox: Number(formData.pricePerBox) || 0,
          perKg: Number(formData.pricePerKg) || 0,
          perGram: Number(formData.pricePerGram) || 0
        }
      };
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, data);
      } else {
        await api.post('/products', data);
      }
      fetchProducts();
      closeModal();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Tovarni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      costPrice: String((product as any).costPrice || 0),
      wholesalePrice: String(product.price),
      quantity: String(product.quantity),
      unit: product.unit || 'dona',
      conversionEnabled: product.unitConversion?.enabled || false,
      baseUnit: product.unitConversion?.baseUnit || 'dona',
      conversionRate: String(product.unitConversion?.conversionRate || ''),
      packageCount: String(product.unitConversion?.packageCount || ''),
      pricePerMeter: String(product.prices?.perMeter || ''),
      pricePerRoll: String(product.prices?.perRoll || ''),
      pricePerBox: String(product.prices?.perBox || ''),
      pricePerKg: String(product.prices?.perKg || ''),
      pricePerGram: String(product.prices?.perGram || '')
    });
    setImages((product as any).images || []);
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
  };

  // Print funksiyalari hozircha ishlatilmaydi, keyin qo'shilishi mumkin

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ 
      code: '', name: '', costPrice: '', wholesalePrice: '', quantity: '',
      unit: 'dona',
      conversionEnabled: false,
      baseUnit: 'dona',
      conversionRate: '',
      packageCount: '',
      pricePerMeter: '',
      pricePerRoll: '',
      pricePerBox: '',
      pricePerKg: '',
      pricePerGram: ''
    });
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
  };

  const openQuantityModal = (mode: 'add' | 'subtract') => {
    setQuantityMode(mode);
    setQuantityInput('');
    setShowQuantityModal(true);
  };

  const applyQuantityChange = () => {
    const change = Number(quantityInput) || 0;
    if (change <= 0) return;
    
    const currentQty = Number(formData.quantity) || 0;
    let newQty = quantityMode === 'add' ? currentQty + change : currentQty - change;
    if (newQty < 0) newQty = 0;
    
    setFormData({ ...formData, quantity: String(newQty) });
    setShowQuantityModal(false);
    setQuantityInput('');
  };

  const openAddModal = async () => {
    try {
      const res = await api.get('/products/next-code');
      setFormData({ 
        code: res.data.code, name: '', costPrice: '', wholesalePrice: '', quantity: '',
        unit: 'dona',
        conversionEnabled: false,
        baseUnit: 'dona',
        conversionRate: '',
        packageCount: '',
        pricePerMeter: '',
        pricePerRoll: '',
        pricePerBox: '',
        pricePerKg: '',
        pricePerGram: ''
      });
    } catch (err) {
      console.error('Error getting next code:', err);
    }
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const checkCodeExists = async (code: string) => {
    if (!code) return;
    try {
      const excludeId = editingProduct?._id || '';
      const res = await api.get(`/products/check-code/${code}${excludeId ? `?excludeId=${excludeId}` : ''}`);
      if (res.data.exists) {
        setCodeError(`Kod "${code}" allaqachon mavjud`);
      } else {
        setCodeError('');
      }
    } catch (err) {
      console.error('Error checking code:', err);
    }
  };

  const downloadQR = () => {
    if (!selectedProduct) return;
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${selectedProduct.code}-${selectedProduct.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Xprinter uchun optimallashtirilgan print funksiyasi
  const printXprinterLabel = async (product: Product) => {
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) {
      showAlert('Pop-up bloklangan. Iltimos, pop-up ga ruxsat bering.', 'Xatolik', 'danger');
      return;
    }

    // QR code URL yaratish
    const productUrl = `${window.location.origin}/product/${product._id}`;
    
    try {
      const qrDataURL = await QRCode.toDataURL(productUrl, {
        width: 400,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Xprinter Label - ${product.name}</title>
          <style>
            /* Xprinter 58mm x 40mm label */
            @page {
              size: 58mm 40mm;
              margin: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              background: #f0f0f0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            
            .label-container {
              width: 58mm;
              height: 40mm;
              background: white;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              border: 1px solid #ccc;
            }
            
            /* Yuqorida - NARX */
            .price-section {
              text-align: center;
              padding: 1mm 0;
            }
            
            .product-price {
              font-size: 20pt;
              font-weight: 900;
              color: #000;
              line-height: 1;
            }
            
            /* Pastda - QR (chap) va NOM (o'ng) */
            .bottom-section {
              flex: 1;
              display: flex;
              align-items: flex-end;
              gap: 8mm;
            }
            
            .qr-code {
              width: 20mm;
              height: 20mm;
              flex-shrink: 0;
            }
            
            .qr-code img {
              width: 100%;
              height: 100%;
              display: block;
            }
            
            .product-name {
              flex: 1;
              font-size: 11pt;
              font-weight: 700;
              color: #000;
              line-height: 1.1;
              word-break: break-word;
              text-transform: uppercase;
              display: flex;
              align-items: flex-end;
            }
            
            /* Print styles */
            @media print {
              body {
                background: white;
                min-height: auto;
              }
              
              .label-container {
                border: none;
                box-shadow: none;
              }
              
              /* Hide everything except label */
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="price-section">
              <div class="product-price">${formatNumber(product.price)}</div>
            </div>
            <div class="bottom-section">
              <div class="qr-code">
                <img src="${qrDataURL}" alt="QR Code" />
              </div>
              <div class="product-name">${product.name}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 300);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('QR code generation error:', error);
      showAlert('QR kod yaratishda xatolik', 'Xatolik', 'danger');
      printWindow.close();
    }
  };

  const generateQRCodeDataURL = async (product: Product, size: number): Promise<string> => {
    try {
      // Create QR data exactly like in preview
      const qrData = JSON.stringify({
        id: product._id,
        code: product.code,
        name: product.name,
        price: product.price
      });
      
      // Generate real QR code using qrcode library
      const qrDataURL = await QRCode.toDataURL(qrData, {
        width: size * 10, // Higher resolution for better print quality
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H', // High error correction
        type: 'image/png'
      });
      
      return qrDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };
  
  const handlePrint = async () => {
    if (!selectedProduct) return;
    
    try {
      // Maxsus o'lchamni tekshirish
      const hasCustomSize = printSettings.customWidth && printSettings.customHeight;
      const customWidth = hasCustomSize ? `${printSettings.customWidth}mm` : null;
      const customHeight = hasCustomSize ? `${printSettings.customHeight}mm` : null;
      
      // Generate QR code as high-quality data URL
      const qrSize = printSettings.size === 'card' ? 52 : printSettings.size === 'thermal' ? 102 : 122;
      const qrDataUrl = await generateQRCodeDataURL(selectedProduct, qrSize);
      
      // Create print-ready HTML with single page layout
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Label - ${selectedProduct.name}</title>
          <style>
            @page {
              size: ${hasCustomSize ? `${customWidth} ${customHeight}` : (printSettings.size === 'card' ? '28mm 18mm' : printSettings.size === 'A4' ? 'A4' : printSettings.size === 'A5' ? 'A5' : '50mm 45mm')};
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              height: 100%;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              overflow: hidden;
            }
            .page-container {
              width: 100%;
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              page-break-after: avoid;
            }
            .label-container {
              border: 2px solid #333;
              padding: ${printSettings.size === 'card' ? '1mm' : printSettings.size === 'thermal' ? '6px' : '12px'};
              background: white;
              width: ${hasCustomSize ? customWidth : (printSettings.size === 'card' ? '26mm' : printSettings.size === 'thermal' ? '44mm' : printSettings.size === 'A4' ? '80mm' : printSettings.size === 'A5' ? '120mm' : '120mm')};
              height: ${hasCustomSize ? customHeight : (printSettings.size === 'card' ? '16mm' : printSettings.size === 'thermal' ? '60mm' : printSettings.size === 'A4' ? '100mm' : printSettings.size === 'A5' ? '140mm' : '140mm')};
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 2px;
              overflow: hidden;
              border-radius: 2px;
              page-break-inside: avoid;
            }
            .product-info {
              flex: 1;
              width: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              height: auto;
            }
            .product-name {
              font-size: ${printSettings.size === 'card' ? '8px' : printSettings.size === 'thermal' ? '16px' : '20px'};
              font-weight: 600;
              color: #1a1a1a;
              line-height: 1.1;
              margin-bottom: ${printSettings.size === 'card' ? '1px' : '2px'};
              word-wrap: break-word;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: ${printSettings.size === 'card' ? '1' : '2'};
              -webkit-box-orient: vertical;
            }
            .product-code {
              font-size: ${printSettings.size === 'card' ? '7px' : printSettings.size === 'thermal' ? '14px' : '18px'};
              color: #666;
              line-height: 1.0;
              margin-bottom: ${printSettings.size === 'card' ? '1px' : '2px'};
              font-weight: 500;
            }
            .product-price {
              font-size: ${printSettings.size === 'card' ? '12px' : printSettings.size === 'thermal' ? '20px' : '24px'};
              font-weight: 800;
              color: #d32f2f;
              line-height: 1.0;
              margin-bottom: ${printSettings.size === 'card' ? '0px' : '1px'};
            }
            .qr-code-section {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              max-width: 42%;
              width: 42%;
              height: 100%;
              padding-left: 1px;
              overflow: hidden;
              box-sizing: border-box;
            }
            .qr-code-img {
              width: ${printSettings.size === 'card' ? '52px' : printSettings.size === 'thermal' ? '102px' : '122px'};
              height: ${printSettings.size === 'card' ? '52px' : printSettings.size === 'thermal' ? '102px' : '122px'};
              max-width: 100%;
              max-height: 100%;
              border: 1px solid #e0e0e0;
              border-radius: 2px;
              background: white;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              image-rendering: pixelated;
            }
            .additional-info {
              margin: 0;
              font-size: ${printSettings.size === 'card' ? '4px' : printSettings.size === 'thermal' ? '10px' : '12px'};
              color: #888;
              line-height: 1.0;
              font-weight: 400;
            }
            ${printSettings.layout === 'minimal' ? '.additional-info { display: none; }' : ''}
            
            @media print {
              html, body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .page-container {
                height: 100vh !important;
                page-break-after: avoid !important;
              }
              .label-container {
                page-break-inside: avoid !important;
                width: ${hasCustomSize ? customWidth : (printSettings.size === 'card' ? '28mm' : printSettings.size === 'thermal' ? '48mm' : printSettings.size === 'A4' ? '85mm' : printSettings.size === 'A5' ? '130mm' : '130mm')} !important;
                height: ${hasCustomSize ? customHeight : (printSettings.size === 'card' ? '18mm' : printSettings.size === 'thermal' ? '45mm' : printSettings.size === 'A4' ? '65mm' : printSettings.size === 'A5' ? '100mm' : '100mm')} !important;
                padding: ${printSettings.size === 'card' ? '1.5mm' : printSettings.size === 'thermal' ? '8px' : '15px'} !important;
              }
              .qr-code-section {
                max-width: 42% !important;
                width: 42% !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
              }
              .qr-code-img {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                width: ${printSettings.size === 'card' ? '62px' : printSettings.size === 'thermal' ? '122px' : '152px'} !important;
                height: ${printSettings.size === 'card' ? '62px' : printSettings.size === 'thermal' ? '122px' : '152px'} !important;
                max-width: 100% !important;
                max-height: 100% !important;
                object-fit: contain !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="label-container">
              <div class="product-info">
                <div class="product-price">${formatNumber(selectedProduct.price)} so'm</div>
                <div class="product-code">Kod: ${selectedProduct.code}</div>
                <div class="product-name">${selectedProduct.name}</div>
                
                ${printSettings.layout === 'standard' ? `
                  <div class="additional-info">
                    Miqdor: ${selectedProduct.quantity} | ${new Date().toLocaleDateString('uz-UZ')}
                  </div>
                ` : ''}
              </div>
              
              <div class="qr-code-section">
                <img src="${qrDataUrl}" alt="QR Code" class="qr-code-img" />
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Create new window and print directly
      const printWindow = window.open('', '_blank', 'width=1024,height=768');
      
      if (!printWindow) {
        alert('Popup blocker tomonidan to\'sib qo\'yildi. Popup\'larni yoqing.');
        return;
      }
      
      // Write content and print
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          // Close window after printing
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
      
      // Close the print modal
      setShowPrintModal(false);
      
    } catch (error) {
      console.error('Error generating print content:', error);
      alert('Chop uchun tayyorlashda xatolik yuz berdi');
    }
  };

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.quantity <= (p.minStock || 50) && p.quantity > 0).length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && p.quantity <= (p.minStock || 50) && p.quantity > 0) ||
                        (stockFilter === 'out' && p.quantity === 0);
    return matchesSearch && matchesStock;
  });

  const statItems = [
    { label: 'Jami tovarlar', value: stats.total, icon: Package, color: 'brand', filter: 'all' },
    { label: 'Kam qolgan', value: stats.lowStock, icon: AlertTriangle, color: 'warning', filter: 'low' },
    { label: 'Tugagan', value: stats.outOfStock, icon: X, color: 'danger', filter: 'out' },
    { label: 'Jami qiymat', value: `${formatNumber(stats.totalValue)} so'm`, icon: DollarSign, color: 'success', filter: null },
  ];

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      return `${API_URL}${product.images[0]}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Tovarlar (Asosiy ombor)"
        showSearch 
        onSearch={setSearchQuery}
        actions={
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi tovar</span>
          </button>
        }
      />

      <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`stat-card p-2 sm:p-3 md:p-4 lg:p-6 ${stat.filter ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${
                stockFilter === stat.filter ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1 sm:mb-2 md:mb-3">
                <div className={`stat-icon w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-${stat.color}-50`}>
                  <stat.icon className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-${stat.color}-600`} />
                </div>
              </div>
              <p className="stat-value text-sm sm:text-base md:text-xl lg:text-3xl">{stat.value}</p>
              <p className="stat-label text-[10px] sm:text-xs md:text-sm lg:text-base">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8 mb-4" />
              <p className="text-surface-500">Yuklanmoqda...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Tovarlar topilmadi</h3>
              <p className="text-surface-500 text-center max-w-md mb-6">
                {searchQuery ? 'Qidiruv bo\'yicha tovarlar topilmadi' : 'Birinchi tovarni qo\'shing'}
              </p>
              <button onClick={openAddModal} className="btn-primary">Tovar qo'shish</button>
            </div>
          ) : (
            <>
              {/* Pro Design Cards - barcha ekranlar uchun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 p-3 sm:p-4 md:p-5">
                {filteredProducts.map(product => {
                  const unit = product.unit || 'dona';
                  const hasConversion = product.unitConversion?.enabled;
                  const getUnitLabel = (u?: string) => {
                    switch (u) {
                      case 'metr': return 'm';
                      case 'rulon': return 'rulon';
                      case 'karobka': return 'quti';
                      case 'gram': return 'g';
                      case 'kg': return 'kg';
                      case 'litr': return 'L';
                      default: return 'dona';
                    }
                  };
                  const stockStatus = product.quantity === 0 ? 'danger' : product.quantity <= (product.minStock || 50) ? 'warning' : 'success';
                  
                  return (
                    <div key={product._id} className="bg-white rounded-xl sm:rounded-2xl border border-surface-200 hover:border-brand-300 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      {/* Image Section */}
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-surface-100 to-surface-50 overflow-hidden">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)!} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-50">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/80 backdrop-blur rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-brand-500" />
                            </div>
                          </div>
                        )}
                        
                        {/* Stock Badge */}
                        <div className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 md:top-3 md:left-3 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg ${
                          stockStatus === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' : 
                          stockStatus === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' : 
                          'bg-gradient-to-r from-emerald-400 to-green-500 text-white'
                        }`}>
                          <span className="hidden sm:inline">{stockStatus === 'danger' ? '❌ Tugagan' : stockStatus === 'warning' ? '⚠️ Kam' : '✓ Mavjud'}</span>
                          <span className="sm:hidden">{stockStatus === 'danger' ? '❌' : stockStatus === 'warning' ? '⚠️' : '✓'}</span>
                        </div>

                        {/* Code Badge */}
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-3 md:right-3 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 bg-black/70 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-mono text-white font-bold shadow-lg">
                          #{product.code}
                        </div>

                        {/* Quick Actions - Hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 md:p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2">
                            <button onClick={() => openQRModal(product)} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-brand-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => openEditModal(product)} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-amber-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => handleDelete(product._id)} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-red-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-2 sm:p-3 md:p-4">
                        {/* Name */}
                        <h3 className="font-bold text-surface-900 text-xs sm:text-sm md:text-base mb-1.5 sm:mb-2 md:mb-3 line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem] md:min-h-[2.5rem] group-hover:text-brand-700 transition-colors">
                          {product.name}
                        </h3>

                        {/* Quantity with Unit */}
                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3 flex-wrap">
                          <div className={`flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-semibold ${
                            stockStatus === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' : 
                            stockStatus === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {unit === 'metr' || unit === 'rulon' ? <Ruler className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> :
                             unit === 'karobka' ? <Box className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> :
                             unit === 'gram' || unit === 'kg' ? <Scale className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> :
                             <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />}
                            <span>{product.quantity} {getUnitLabel(unit)}</span>
                          </div>
                          
                          {/* Conversion info */}
                          {hasConversion && product.unitConversion && (
                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 md:py-1.5 bg-purple-50 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs text-purple-700 font-semibold border border-purple-200">
                              <RotateCcw className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                              <span>= {product.unitConversion.totalBaseUnits} {getUnitLabel(product.unitConversion.baseUnit)}</span>
                            </div>
                          )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3">
                          <div className="bg-gradient-to-br from-surface-50 to-surface-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 border border-surface-200">
                            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-surface-500 uppercase tracking-wider font-semibold mb-0.5">Tan narxi</p>
                            <p className="font-bold text-surface-900 text-[10px] sm:text-xs md:text-sm">
                              {formatNumber((product as any).costPrice || 0)}
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] text-surface-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-brand-50 to-indigo-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 border border-brand-200">
                            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-brand-600 uppercase tracking-wider font-semibold mb-0.5">Sotish</p>
                            <p className="font-bold text-brand-700 text-[10px] sm:text-xs md:text-sm">
                              {formatNumber(product.price)}
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] text-brand-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                        </div>

                        {/* Additional Prices */}
                        {product.prices && (product.prices.perMeter > 0 || product.prices.perRoll > 0 || product.prices.perBox > 0 || product.prices.perKg > 0) && (
                          <div className="flex flex-wrap gap-1 pt-1.5 sm:pt-2 border-t border-surface-100">
                            {product.prices.perMeter > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-blue-200">
                                📏 {formatNumber(product.prices.perMeter)}/m
                              </span>
                            )}
                            {product.prices.perRoll > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-purple-200">
                                🎞️ {formatNumber(product.prices.perRoll)}/rulon
                              </span>
                            )}
                            {product.prices.perBox > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-orange-50 text-orange-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-orange-200">
                                📦 {formatNumber(product.prices.perBox)}/quti
                              </span>
                            )}
                            {product.prices.perKg > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-green-50 text-green-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-green-200">
                                ⚖️ {formatNumber(product.prices.perKg)}/kg
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-lg p-6 relative z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">{editingProduct ? 'Tovarni tahrirlash' : 'Yangi tovar'}</h3>
              <button onClick={closeModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Rasmlar (max 8)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={`${API_URL}${img}`} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 8 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square border-2 border-dashed border-surface-300 rounded-lg flex flex-col items-center justify-center hover:border-brand-500 hover:bg-brand-50 transition-colors"
                    >
                      {uploading ? (
                        <div className="spinner w-5 h-5 text-brand-600" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-surface-400 mb-1" />
                          <span className="text-xs text-surface-500">Yuklash</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Kod</label>
                  <input 
                    type="text" 
                    className={`input ${codeError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}`}
                    placeholder="1" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    onBlur={e => checkCodeExists(e.target.value)}
                    required 
                  />
                  {codeError && <p className="text-sm text-danger-600 mt-1">{codeError}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Miqdori</label>
                  {editingProduct ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 bg-surface-100 rounded-xl text-center font-semibold text-surface-900">
                        {formatNumber(formData.quantity || 0)}
                      </div>
                      <button type="button" onClick={() => openQuantityModal('add')} className="btn-icon bg-success-100 text-success-600 hover:bg-success-200">
                        <Plus className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => openQuantityModal('subtract')} className="btn-icon bg-danger-100 text-danger-600 hover:bg-danger-200">
                        <Minus className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.quantity)} onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})} required />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Nomi</label>
                <input type="text" className="input" placeholder="Tovar nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Tan narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.costPrice)} onChange={e => setFormData({...formData, costPrice: parseNumber(e.target.value)})} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Optom narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.wholesalePrice)} onChange={e => setFormData({...formData, wholesalePrice: parseNumber(e.target.value)})} required />
                </div>
              </div>

              {/* O'lchov birligi */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-600" />
                  O'lchov birligi
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-surface-700 mb-2 block">Birlik</label>
                    <select 
                      className="input"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                    >
                      <option value="dona">Dona</option>
                      <option value="metr">Metr</option>
                      <option value="rulon">Rulon</option>
                      <option value="karobka">Karobka/Quti</option>
                      <option value="gram">Gram</option>
                      <option value="kg">Kilogram</option>
                      <option value="litr">Litr</option>
                    </select>
                  </div>
                  
                  {/* Konversiya */}
                  {(formData.unit === 'rulon' || formData.unit === 'karobka') && (
                    <div>
                      <label className="text-sm font-medium text-surface-700 mb-2 block">
                        1 {formData.unit === 'rulon' ? 'rulon' : 'karobka'} = ? 
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="input flex-1" 
                          placeholder="30"
                          value={formData.conversionRate}
                          onChange={e => setFormData({
                            ...formData, 
                            conversionRate: parseNumber(e.target.value),
                            conversionEnabled: true
                          })}
                        />
                        <select 
                          className="input w-24"
                          value={formData.baseUnit}
                          onChange={e => setFormData({...formData, baseUnit: e.target.value as any})}
                        >
                          <option value="metr">metr</option>
                          <option value="dona">dona</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Konversiya natijasi */}
                {formData.conversionEnabled && formData.conversionRate && formData.quantity && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">{formData.quantity}</span> {formData.unit === 'rulon' ? 'rulon' : 'karobka'} = 
                      <span className="font-semibold ml-1">{Number(formData.quantity) * Number(formData.conversionRate)}</span> {formData.baseUnit}
                    </p>
                  </div>
                )}
              </div>

              {/* Qo'shimcha narxlar */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Qo'shimcha narxlar (ixtiyoriy)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Metr narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerMeter)}
                      onChange={e => setFormData({...formData, pricePerMeter: parseNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Rulon narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerRoll)}
                      onChange={e => setFormData({...formData, pricePerRoll: parseNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Karobka narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerBox)}
                      onChange={e => setFormData({...formData, pricePerBox: parseNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Kg narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerKg)}
                      onChange={e => setFormData({...formData, pricePerKg: parseNumber(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1" disabled={!!codeError}>Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowQRModal(false)} />
          <div className="modal w-full max-w-sm p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">QR Kod - Xprinter</h3>
              <button onClick={() => setShowQRModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col items-center">
              {/* QR Code Preview */}
              <div className="bg-white p-4 rounded-xl border border-surface-200 mb-4" id="qr-print-area">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={`${window.location.origin}/product/${selectedProduct._id}`}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
              
              {/* Product Info */}
              <div className="text-center mb-4 w-full">
                <p className="font-bold text-lg text-surface-900 mb-1">{selectedProduct.name}</p>
                <p className="text-sm text-surface-600 font-mono bg-surface-100 px-3 py-1 rounded-lg inline-block mb-2">
                  ID: {selectedProduct.code}
                </p>
                <p className="text-xl font-bold text-brand-600">{formatNumber(selectedProduct.price)} so'm</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button onClick={downloadQR} className="btn-secondary flex-1">
                  <Download className="w-4 h-4" />
                  Yuklab olish
                </button>
                <button 
                  onClick={() => printXprinterLabel(selectedProduct)}
                  className="btn-primary flex-1"
                >
                  <Printer className="w-4 h-4" />
                  Print (Xprinter)
                </button>
              </div>
              
              {/* Xprinter Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 w-full">
                <p className="font-medium mb-1">📋 Xprinter sozlamalari:</p>
                <ul className="space-y-0.5">
                  <li>• Qog'oz: 58mm x 40mm</li>
                  <li>• Margins: None</li>
                  <li>• Scale: 100%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowPrintModal(false)} />
          <div className="modal w-full max-w-4xl p-6 relative z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Print sozlamalari</h3>
              <button onClick={() => setShowPrintModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings Panel */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Printer tanlash</label>
                  <select 
                    className="input"
                    value={printSettings.printer}
                    onChange={e => setPrintSettings({...printSettings, printer: e.target.value})}
                  >
                    <option value="">Printer tanlang</option>
                    {availablePrinters.map(printer => (
                      <option key={printer} value={printer}>{printer}</option>
                    ))}
                  </select>
                  <p className="text-xs text-surface-500 mt-1">
                    Print tugmasini bosganda Windows print dialog ochiladi va barcha mavjud printerlarni ko'rsatadi
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Qog'oz o'lchami</label>
                  <select 
                    className="input"
                    value={printSettings.size}
                    onChange={e => setPrintSettings({...printSettings, size: e.target.value})}
                  >
                    <option value="card">Kichik yorliq (50×25mm)</option>
                    <option value="A4">A4 (210×297mm)</option>
                    <option value="A5">A5 (148×210mm)</option>
                    <option value="thermal">Thermal (80×120mm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Nusxalar soni</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="input"
                    value={printSettings.copies}
                    onChange={e => setPrintSettings({...printSettings, copies: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div className="border-t border-surface-200 pt-4">
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Maxsus o'lcham (ixtiyoriy)</label>
                  <p className="text-xs text-surface-500 mb-3">Agar maxsus o'lcham belgilasangiz, u qog'oz o'lchamidan ustun bo'ladi</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-surface-600 mb-1 block">Eni (mm)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="input"
                        placeholder="Masalan: 50"
                        value={printSettings.customWidth}
                        onChange={e => setPrintSettings({...printSettings, customWidth: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-surface-600 mb-1 block">Bo'yi (mm)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="input"
                        placeholder="Masalan: 25"
                        value={printSettings.customHeight}
                        onChange={e => setPrintSettings({...printSettings, customHeight: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="bg-surface-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-surface-700 mb-3">Ko'rinish</h4>
                <div className="bg-white shadow-md rounded-xl p-6 flex justify-center items-start min-h-[420px]">
                  <div 
                    className="bg-white border border-gray-200 shadow-lg rounded-xl"
                    style={{
                      width: (printSettings.customWidth && printSettings.customHeight) ? `${printSettings.customWidth}mm` : (printSettings.size === 'card' ? '26mm' : printSettings.size === 'thermal' ? '48mm' : printSettings.size === 'A4' ? '80mm' : printSettings.size === 'A5' ? '140mm' : '120mm'),
                      height: (printSettings.customWidth && printSettings.customHeight) ? `${printSettings.customHeight}mm` : (printSettings.size === 'card' ? '17mm' : printSettings.size === 'thermal' ? '42mm' : printSettings.size === 'A4' ? '60mm' : printSettings.size === 'A5' ? '115mm' : '92mm'),
                      fontSize: printSettings.size === 'card' ? '5px' : printSettings.size === 'thermal' ? '9px' : '11px',
                      transform: printSettings.size === 'card' ? 'scale(4.2)' : printSettings.size === 'thermal' ? 'scale(2.1)' : 'scale(1.8)',
                      transformOrigin: 'center center',
                      overflow: 'hidden',
                      padding: printSettings.size === 'card' ? '1.2mm' : printSettings.size === 'thermal' ? '7px' : '12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      marginTop: '80px'
                    }}
                  >
                    {/* Main content - horizontal layout */}
                    <div className="flex items-center h-full" style={{gap: printSettings.size === 'card' ? '2px' : '6px'}}>
                      {/* Left side - Product info */}
                      <div className="flex-1 flex flex-col justify-center h-full" style={{maxWidth: '58%', paddingRight: '6px'}}>
                        {/* Price */}
                        <div 
                          className="font-bold"
                          style={{
                            fontSize: printSettings.size === 'card' ? '10px' : printSettings.size === 'thermal' ? '18px' : '22px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '0px' : '1px',
                            fontWeight: '800',
                            color: '#d32f2f'
                          }}
                        >
                          {formatNumber(selectedProduct.price)} so'm
                        </div>

                        <div 
                          className="text-gray-600"
                          style={{
                            fontSize: printSettings.size === 'card' ? '6px' : printSettings.size === 'thermal' ? '12px' : '16px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '0.5px' : '1px',
                            fontWeight: '500',
                            color: '#666'
                          }}
                        >
                          Kod: {selectedProduct.code}
                        </div>

                        <div 
                          className="font-bold text-black"
                          style={{
                          fontSize: printSettings.size === 'card' ? '7px' : printSettings.size === 'thermal' ? '14px' : '18px',
                          lineHeight: '1.1',
                            marginBottom: printSettings.size === 'card' ? '0.5px' : '1px',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: printSettings.size === 'card' ? 1 : 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {selectedProduct.name}
                        </div>

                        {/* Additional info only in standard layout */}
                        {printSettings.layout === 'standard' && (
                          <div 
                            className="text-gray-500" 
                            style={{
                              fontSize: printSettings.size === 'card' ? '4px' : printSettings.size === 'thermal' ? '10px' : '12px',
                              lineHeight: '1.0',
                              margin: 0,
                              color: '#888',
                              fontWeight: '400'
                            }}
                          >
                            Miqdor: {selectedProduct.quantity} | {new Date().toLocaleDateString('uz-UZ')}
                          </div>
                        )}
                      </div>

                      {/* Right side - QR Code */}
                      <div className="flex-shrink-0 flex items-center justify-center" style={{
                        maxWidth: '38%', 
                        width: '38%',
                        height: '100%', 
                        paddingLeft: '6px', 
                        borderLeft: '1px solid #e5e7eb',
                        overflow: 'hidden',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: '#ffffff',
                          padding: '3px',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          maxWidth: '100%',
                          maxHeight: '100%'
                        }}>
                          <QRCodeSVG
                            value={JSON.stringify({
                              id: selectedProduct._id,
                              code: selectedProduct.code,
                              name: selectedProduct.name,
                              price: selectedProduct.price
                            })}
                            size={printSettings.size === 'card' ? 73 : printSettings.size === 'thermal' ? 123 : 143}
                            level="H"
                            includeMargin={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {printSettings.copies > 1 && (
                  <p className="text-xs text-surface-500 mt-2 text-center">
                    {printSettings.copies} nusxa chop etiladi
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button 
                type="button" 
                onClick={() => setShowPrintModal(false)} 
                className="btn-secondary flex-1"
              >
                Bekor qilish
              </button>
              <button 
                type="button" 
                onClick={handlePrint} 
                className="btn-primary flex-1"
                disabled={!printSettings.printer}
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Adjustment Modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowQuantityModal(false)} />
          <div className="modal w-full max-w-sm p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">
                {quantityMode === 'add' ? "Miqdor qo'shish" : "Miqdor ayirish"}
              </h3>
              <button onClick={() => setShowQuantityModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className={`rounded-xl p-4 mb-6 ${quantityMode === 'add' ? 'bg-success-50' : 'bg-danger-50'}`}>
              <p className="text-sm text-surface-600 mb-1">Hozirgi miqdor</p>
              <p className={`text-2xl font-bold ${quantityMode === 'add' ? 'text-success-600' : 'text-danger-600'}`}>
                {formatNumber(formData.quantity || 0)} dona
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  {quantityMode === 'add' ? "Qo'shiladigan miqdor" : "Ayiriladigan miqdor"}
                </label>
                <input 
                  type="text" 
                  className="input text-center text-lg font-semibold" 
                  placeholder="0" 
                  value={formatInputNumber(quantityInput)}
                  onChange={e => setQuantityInput(parseNumber(e.target.value))}
                  autoFocus
                />
              </div>

              {quantityInput && Number(quantityInput) > 0 && (
                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-sm text-surface-600 mb-1">Yangi miqdor</p>
                  <p className="text-xl font-bold text-surface-900">
                    {formatNumber(
                      quantityMode === 'add' 
                        ? (Number(formData.quantity) || 0) + Number(quantityInput)
                        : Math.max(0, (Number(formData.quantity) || 0) - Number(quantityInput))
                    )} dona
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuantityModal(false)} className="btn-secondary flex-1">
                  Bekor qilish
                </button>
                <button 
                  type="button" 
                  onClick={applyQuantityChange} 
                  className={`flex-1 ${quantityMode === 'add' ? 'btn-success' : 'btn-danger'}`}
                  disabled={!quantityInput || Number(quantityInput) <= 0}
                >
                  {quantityMode === 'add' ? "Qo'shish" : "Ayirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
