import { useState, useMemo } from 'react';
import { X, DollarSign, Save } from 'lucide-react';
import { Product } from '../types';
import { formatNumber, formatInputNumber, parseNumber } from '../utils/format';
import { convertUsdToUzs } from '../utils/exchangeRate';
import ImageUploadManager from './ImageUploadManager';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editingProduct: Product | null;
  categories: any[];
  isSubmitting: boolean;
  formData: {
    name: string;
    description: string;
    unitPrice: string;
    costPrice: string;
    costPriceUsd: string;
    boxPrice: string;
    quantity: string;
    category: string;
    subcategory: string;
    unit: 'dona' | 'kg' | 'metr' | 'litr' | 'karobka';
    boxInfo: {
      unitsPerBox: string;
      boxWeight: string;
    };
    metrInfo: {
      metersPerOram: string;
    };
    discount1: { minQuantity: string; percent: string };
    discount2: { minQuantity: string; percent: string };
    discount3: { minQuantity: string; percent: string };
  };
  onFormChange: (updates: any) => void;
  uploadedImages: string[];
  onImagesChange: (images: string[]) => void;
}

export default function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  categories,
  isSubmitting,
  formData,
  onFormChange,
  uploadedImages,
  onImagesChange,
}: ProductModalProps) {
  if (!isOpen) return null;

  // Tanlangan kategoriyaga tegishli bo'limlar
  const selectedCategorySubcategories = useMemo(() => {
    if (!formData.category) return [];
    const category = categories.find(c => c.name === formData.category);
    return category?.subcategories || [];
  }, [formData.category, categories]);

  const handleFormChange = (updates: any) => {
    onFormChange({ ...formData, ...updates });
  };

  const handleNestedChange = (field: string, updates: any) => {
    const currentValue = formData[field as keyof typeof formData];
    onFormChange({
      ...formData,
      [field]: { ...(typeof currentValue === 'object' ? currentValue : {}), ...updates },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative bg-white rounded-lg w-full max-w-md p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
          <h3 className="text-lg font-semibold">
            {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
          </h3>
          <button type="button" onClick={onClose} className="hover:bg-gray-100 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birlik</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.unit}
              onChange={(e) => handleFormChange({ unit: e.target.value as any })}
            >
              <option value="dona">Dona</option>
              <option value="kg">Kilogram</option>
              <option value="metr">Metr</option>
              <option value="litr">Litr</option>
              <option value="karobka">Karobka</option>
            </select>
          </div>
        </div>

        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.name}
            onChange={(e) => handleFormChange({ name: e.target.value })}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            value={formData.description}
            onChange={(e) => handleFormChange({ description: e.target.value })}
          />
        </div>

        {/* Category and Subcategory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.category}
              onChange={(e) => handleFormChange({ category: e.target.value, subcategory: '' })}
            >
              <option value="">Kategoriya tanlang</option>
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.subcategory}
              onChange={(e) => handleFormChange({ subcategory: e.target.value })}
              disabled={!formData.category || selectedCategorySubcategories.length === 0}
            >
              <option value="">Bo'lim tanlanmagan</option>
              {selectedCategorySubcategories.map((sub) => (
                <option key={sub._id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
            {formData.category && selectedCategorySubcategories.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">Bu kategoriyada bo'limlar yo'q</p>
            )}
          </div>
        </div>

        {/* Cost Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tan narxi (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.costPriceUsd || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  if (value) {
                    const uzsValue = convertUsdToUzs(Number(value));
                    handleFormChange({ costPriceUsd: String(value), costPrice: String(uzsValue) });
                  } else {
                    handleFormChange({ costPriceUsd: '', costPrice: '' });
                  }
                }}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tan narxi (UZS)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              value={formData.costPrice ? formatInputNumber(formData.costPrice) : ''}
              onChange={(e) => {
                const value = parseNumber(e.target.value);
                handleFormChange({ costPrice: value });
              }}
              placeholder="0"
              title="USD dan avtomatik hisoblanadi yoki to'g'ridan-to'g'ri kiritish mumkin"
            />
            {formData.costPriceUsd && (
              <p className="text-xs text-blue-600 mt-1">
                {Number(formData.costPriceUsd).toFixed(2)} USD = {formatNumber(Number(formData.costPrice))} UZS
              </p>
            )}
          </div>
        </div>

        {/* Selling Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sotish narxi</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.unitPrice ? formatInputNumber(formData.unitPrice) : ''}
              onChange={(e) => {
                const value = parseNumber(e.target.value);
                handleFormChange({ unitPrice: value });
              }}
              placeholder="0"
            />
          </div>
        </div>

        {/* Box Information */}
        {formData.unit === 'karobka' && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Karobka ma'lumotlari</label>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Karobka narxi</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.boxPrice ? formatInputNumber(formData.boxPrice) : ''}
                  onChange={(e) => {
                    const value = parseNumber(e.target.value);
                    handleFormChange({ boxPrice: value });
                  }}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Karobkada nechta</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.boxInfo.unitsPerBox}
                  onChange={(e) => handleNestedChange('boxInfo', { unitsPerBox: e.target.value })}
                  placeholder="24"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Og'irligi (kg)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.boxInfo.boxWeight}
                  onChange={(e) => handleNestedChange('boxInfo', { boxWeight: e.target.value })}
                  placeholder="10"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Masalan: 1 karobkada 24 dona, og'irligi 10 kg</p>
          </div>
        )}

        {/* Metr O'ram Information */}
        {formData.unit === 'metr' && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">O'ram ma'lumotlari</label>
            <div>
              <label className="block text-xs text-gray-600 mb-1">O'ramda necha metr</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.metrInfo.metersPerOram}
                onChange={(e) => handleNestedChange('metrInfo', { metersPerOram: e.target.value })}
                placeholder="15"
                min="0"
                step="0.1"
              />
            </div>
            {formData.metrInfo.metersPerOram && Number(formData.metrInfo.metersPerOram) > 0 &&
             formData.quantity && Number(parseNumber(formData.quantity)) > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                = {(Number(parseNumber(formData.quantity)) / Number(formData.metrInfo.metersPerOram)).toFixed(1)} o'ram
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Masalan: 1 o'ramda 15 metr mato</p>
          </div>
        )}

        {/* Discounts */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Chegirma sozlamalari (ixtiyoriy)</label>

          {/* Discount 1 */}
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-green-900 mb-2">1-chegirma</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Minimal miqdor</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                  value={formData.discount1.minQuantity}
                  onChange={(e) => handleNestedChange('discount1', { minQuantity: e.target.value })}
                  placeholder="10"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Chegirma %</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                  value={formData.discount1.percent}
                  onChange={(e) => handleNestedChange('discount1', { percent: e.target.value })}
                  placeholder="5"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Discount 2 */}
          <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-2">2-chegirma</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Minimal miqdor</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  value={formData.discount2.minQuantity}
                  onChange={(e) => handleNestedChange('discount2', { minQuantity: e.target.value })}
                  placeholder="50"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Chegirma %</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  value={formData.discount2.percent}
                  onChange={(e) => handleNestedChange('discount2', { percent: e.target.value })}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Discount 3 */}
          <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs font-medium text-purple-900 mb-2">3-chegirma</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Minimal miqdor</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                  value={formData.discount3.minQuantity}
                  onChange={(e) => handleNestedChange('discount3', { minQuantity: e.target.value })}
                  placeholder="100"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Chegirma %</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                  value={formData.discount3.percent}
                  onChange={(e) => handleNestedChange('discount3', { percent: e.target.value })}
                  placeholder="15"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Masalan: 10 dona olsa 5% chegirma, 50 dona olsa 10% chegirma
          </p>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Miqdor</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.quantity ? formatInputNumber(formData.quantity) : ''}
            onChange={(e) => {
              const value = parseNumber(e.target.value);
              handleFormChange({ quantity: value });
            }}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rasmlar (maksimal 8 ta)</label>
          <ImageUploadManager maxImages={8} initialImages={uploadedImages} onImagesChange={onImagesChange} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saqlanmoqda...' : editingProduct ? 'Yangilash' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
