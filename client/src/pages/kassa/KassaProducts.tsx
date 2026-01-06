import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Product } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';

export default function KassaProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?mainOnly=true');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Tovar qidirish..."
                className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Kod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Nomi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Narx</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Soni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {products.map(product => (
                <tr key={product._id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-surface-600">{product.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-surface-900">{product.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-surface-900">{formatNumber(product.price)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-surface-600">{product.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}