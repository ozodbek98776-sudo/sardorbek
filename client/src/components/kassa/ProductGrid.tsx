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
  const [displayCount, setDisplayCount] = useState(20); // Birinchi 20 ta
  
  // Mahsulotlarni kategoriya bo'yicha guruhlash
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    
    products.forEach(product => {
      const category = product.category || 'Boshqa';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    
    return grouped;
  }, [products]);
  
  // Kategoriya va bo'lim bo'yicha filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Kategoriya filtri
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Bo'lim filtri (section field mahsulotda bo'lishi kerak)
    if (selectedSection) {
      filtered = filtered.filter(p => (p as any).section === selectedSection);
    }
    
    return filtered;
  }, [products, selectedCategory, selectedSection]);
  
  const displayedProducts = filteredProducts.slice(0, displayCount);
  
  // Infinite scroll - 10 tadan yuklash
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && displayCount < filteredProducts.length) {
        setDisplayCount(prev => Math.min(prev + 10, filteredProducts.length)); // +10 ta
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [displayCount, filteredProducts.length]);
  
  // Kategoriya o'zgarganda display count ni reset qilish
  useEffect(() => {
    setDisplayCount(20);
  }, [selectedCategory]);
  
  if (!selectedCategory) {
    // Barchasi - oddiy vertical grid (kategoriyasiz)
    return (
      <div 
        ref={containerRef}
        className="max-h-[calc(100vh-250px)] overflow-y-auto thin-scrollbar pb-32"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 pb-16">
            {displayedProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                onClick={() => onProductClick(product)}
                onCategoryClick={() => onCategoryClick(product)}
                onQRPrint={() => onQRPrint(product)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Bitta kategoriya tanlangan - vertical grid
  return (
    <div 
      ref={containerRef}
      className="max-h-[calc(100vh-250px)] overflow-y-auto thin-scrollbar pb-32"
    >
      {displayedProducts.length === 0 ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 pb-16">
          {displayedProducts.map(product => (
            <ProductCard
              key={product._id}
              product={product}
              onClick={() => onProductClick(product)}
              onCategoryClick={() => onCategoryClick(product)}
              onQRPrint={() => onQRPrint(product)}
            />
          ))}
          
          {/* Loading more indicator */}
          {loadingMore && (
            <div className="col-span-full flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          )}
        </div>
      )}
      
      {/* Infinite scroll trigger */}
      {hasMore && !loadingMore && loadMoreRef && (
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Scroll qiling...</p>
        </div>
      )}
    </div>
  );
}
