import { useState, useEffect, useRef, useMemo } from 'react';
import { Package2 } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  selectedCategory: string;
  selectedSection?: string; // Bo'lim filtri
  onProductClick: (product: Product) => void;
  onCategoryClick: (product: Product) => void;
  onQRPrint: (product: Product) => void;
  loadMoreRef?: React.RefObject<HTMLDivElement>; // Infinite scroll ref
  loadingMore?: boolean; // Loading state
  hasMore?: boolean; // Yana tovarlar bormi
}

export function ProductGrid({ 
  products, 
  selectedCategory,
  selectedSection = '',
  onProductClick,
  onCategoryClick,
  onQRPrint,
  loadMoreRef,
  loadingMore = false,
  hasMore = false
}: ProductGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Kategoriya va bo'lim bo'yicha filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Kategoriya filtri
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Bo'lim filtri
    if (selectedSection) {
      filtered = filtered.filter(p => (p as any).section === selectedSection);
    }
    
    return filtered;
  }, [products, selectedCategory, selectedSection]);
  
  if (!selectedCategory) {
    // Barchasi - oddiy vertical grid (kategoriyasiz)
    return (
      <div 
        ref={containerRef}
        data-testid="products-grid"
        className="max-h-[calc(100vh-250px)] overflow-y-auto scroll-smooth-instagram momentum-scroll thin-scrollbar pb-32"
      >
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4">
              <Package2 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">
              Mahsulot yo'q
            </h3>
            <p className="text-sm text-slate-500 text-center">
              Hozircha mahsulot mavjud emas
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onClick={() => onProductClick(product)}
                  onCategoryClick={() => onCategoryClick(product)}
                  onQRPrint={() => onQRPrint(product)}
                />
              ))}
            </div>
            
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 flex items-center justify-center">
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
                    <p className="text-slate-600 text-sm font-medium">Yuklanmoqda...</p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Scroll qiling...</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  // Bitta kategoriya tanlangan - vertical grid
  return (
    <div 
      ref={containerRef}
      data-testid="products-grid"
      className="max-h-[calc(100vh-250px)] overflow-y-auto scroll-smooth-instagram momentum-scroll thin-scrollbar pb-32"
    >
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4">
            <Package2 className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            Bu kategoriyada mahsulot yo'q
          </h3>
          <p className="text-sm text-slate-500 text-center mb-4">
            "{selectedCategory}" kategoriyasida hozircha mahsulot mavjud emas
          </p>
          <button
            onClick={() => onCategoryClick(products[0])}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors"
          >
            Barcha mahsulotlar
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
            {filteredProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                onClick={() => onProductClick(product)}
                onCategoryClick={() => onCategoryClick(product)}
                onQRPrint={() => onQRPrint(product)}
              />
            ))}
          </div>
          
          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 flex items-center justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
                  <p className="text-slate-600 text-sm font-medium">Yuklanmoqda...</p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Scroll qiling...</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
