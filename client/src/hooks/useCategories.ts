import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSocket } from './useSocket';

export interface Subcategory {
  _id: string;
  name: string;
  order: number;
}

export interface Category {
  _id: string;
  name: string;
  order: number;
  isActive: boolean;
  subcategories: Subcategory[];
  createdAt: string;
  updatedAt: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      // Ensure we always set an array
      setCategories(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err: any) {
      console.error('Fetch categories error:', err);
      setError(err.response?.data?.message || 'Kategoriyalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    socket.on('category:created', (newCategory: Category) => {
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.order - b.order));
    });

    socket.on('category:updated', (updatedCategory: Category) => {
      setCategories(prev =>
        prev.map(cat => cat._id === updatedCategory._id ? updatedCategory : cat)
          .sort((a, b) => a.order - b.order)
      );
    });

    socket.on('category:deleted', (data: { _id: string }) => {
      setCategories(prev => prev.filter(cat => cat._id !== data._id));
    });

    socket.on('categories:reordered', (reorderedCategories: Category[]) => {
      setCategories(Array.isArray(reorderedCategories) ? reorderedCategories : []);
    });

    return () => {
      socket.off('category:created');
      socket.off('category:updated');
      socket.off('category:deleted');
      socket.off('categories:reordered');
    };
  }, [socket]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
}
