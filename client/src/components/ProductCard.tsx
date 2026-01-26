import React from 'react';
import { Package, Edit, Trash2, QrCode, Printer, Ruler, Box, Scale } from 'lucide-react';
import { Product } from '../types';
import { formatNumber } from '../utils/format';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onQR: (product: Product) => void;
  onPrint: (product: Product) => void;
  apiUrl: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onQR,
  onPrint,
  apiUrl
}) => {
  const getProductImage = () => {
    const images = (product as any).images;
    if (images && images.length > 0) {
      return `${apiUrl}${images[0]}`;
    }
    return null;
  };

  const getUnitLabel = (unit?: string) => {
    switch (unit) {
      case 'metr': return 'm';
      case 'rulon': return 'rulon';
      case 'karobka': return 'quti';
      case 'gram': return 'g';
      case 'kg': return 'kg';
      case 'litr': return 'L';
      default: return 'dona';
    }
  };

  const getUnitIcon = (unit?: string) => {
    switch (unit) {
      case 'metr':
      case 'rulon':
        return <Ruler className="w-3.5 h-3.5" />;
      case 'karobka':
        return <Box className="w-3.5 h-3.5" />;
      case 'gram':
      case 'kg':
        return <Scale className="w-3.5 h-3.5" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
    }
  };

  const getStockStatus = () => {
    if (product.quantity === 0) return { color: 'danger', label: 'Tugagan' };
    if (product.quantity <= (product.minStock || 50)) return { color: 'warning', label: 'Kam qoldi' };
    return { color: 'success', label: 'Mavjud' };
  };

  const stockStatus = getStockStatus();
  const unit = product.unit || 'dona';
  const hasConversion = product.unitConversion?.enabled;

  return (
    <div className="group bg-white rounded-2xl border border-surface-200 hover:border-brand-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Image Section */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-surface-100 to-surface-50 overflow-hidden">
        {getProductImage() ? (
          <img 
            src={getProductImage()!} 
            alt={product.name} 
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center">
              <Package className="w-8 h-8 text-brand-500" />
            </div>
          </div>
        )}
        
        {/* Stock Badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold
          ${stockStatus.color === 'danger' ? 'bg-red-500 text-white' : 
            stockStatus.color === 'warning' ? 'bg-amber-500 text-white' : 
            'bg-emerald-500 text-white'}`}>
          {stockStatus.label}
        </div>

        {/* Code Badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-mono text-white">
          #{product.code}
        </div>

        {/* Quick Actions */}
        <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onQR(product)}
            className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-brand-600 hover:bg-white transition-colors shadow-sm"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onPrint(product)}
            className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-blue-600 hover:bg-white transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onEdit(product)}
            className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-amber-600 hover:bg-white transition-colors shadow-sm"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(product._id)}
            className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-red-600 hover:bg-white transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Name */}
        <h3 className="font-semibold text-surface-900 text-base mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Quantity with Unit */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
            ${stockStatus.color === 'danger' ? 'bg-red-50 text-red-700' : 
              stockStatus.color === 'warning' ? 'bg-amber-50 text-amber-700' : 
              'bg-emerald-50 text-emerald-700'}`}>
            {getUnitIcon(unit)}
            <span>{formatNumber(product.quantity)} {getUnitLabel(unit)}</span>
          </div>
          
          {/* Conversion info */}
          {hasConversion && product.unitConversion && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg text-xs text-purple-700">
              <span>= {product.unitConversion.totalBaseUnits} {getUnitLabel(product.unitConversion.baseUnit)}</span>
            </div>
          )}
        </div>

        {/* Prices Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Cost Price */}
          <div className="bg-surface-50 rounded-xl p-2.5">
            <p className="text-[10px] text-surface-500 uppercase tracking-wide mb-0.5">Tan narxi</p>
            <p className="font-bold text-surface-900 text-sm">
              {formatNumber((product as any).costPrice || 0)}
              <span className="text-[10px] text-surface-400 ml-0.5">so'm</span>
            </p>
          </div>
          
          {/* Sell Price */}
          <div className="bg-brand-50 rounded-xl p-2.5">
            <p className="text-[10px] text-brand-600 uppercase tracking-wide mb-0.5">Sotish narxi</p>
            <p className="font-bold text-brand-700 text-sm">
              {formatNumber(product.price)}
              <span className="text-[10px] text-brand-400 ml-0.5">so'm</span>
            </p>
          </div>
        </div>

        {/* Additional Prices */}
        {product.prices && (
          <div className="flex flex-wrap gap-1.5">
            {product.prices.perMeter > 0 && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                {formatNumber(product.prices.perMeter)}/m
              </span>
            )}
            {product.prices.perRoll > 0 && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                {formatNumber(product.prices.perRoll)}/rulon
              </span>
            )}
            {product.prices.perBox > 0 && (
              <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium">
                {formatNumber(product.prices.perBox)}/quti
              </span>
            )}
            {product.prices.perKg > 0 && (
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                {formatNumber(product.prices.perKg)}/kg
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
