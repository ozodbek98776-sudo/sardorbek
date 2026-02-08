import { create } from 'zustand';
import api from '../utils/api';

export interface Helper {
  _id: string;
  name: string;
  login?: string;
  phone: string;
  role: 'cashier' | 'helper';
  bonusPercentage: number;
  receiptCount: number;
  totalAmount: number;
  totalEarnings: number;
  totalBonus: number;
  createdAt: string;
}

export interface HelperReceipt {
  _id: string;
  receiptNumber: string;
  items: Array<{
    name: string;
    code: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  paymentMethod: string;
  isPaid: boolean;
  status: string;
  createdAt: string;
}

interface HelpersState {
  // State
  helpers: Helper[];
  selectedHelper: Helper | null;
  selectedHelperReceipts: HelperReceipt[];
  loading: boolean;
  receiptsLoading: boolean;
  error: string | null;
  searchQuery: string;
  roleFilter: 'all' | 'cashier' | 'helper';
  sortBy: 'name' | 'receipts' | 'amount';
  sortOrder: 'asc' | 'desc';
  
  // Pagination
  currentPage: number;
  totalPages: number;
  receiptsPerPage: number;
  
  // Cache
  lastFetchTime: number | null;
  cacheTimeout: number; // 5 minutes
  
  // Actions
  fetchHelpers: (forceRefresh?: boolean) => Promise<void>;
  fetchHelperReceipts: (helperId: string, page?: number) => Promise<void>;
  addHelper: (helper: Omit<Helper, '_id' | 'receiptCount' | 'totalAmount' | 'totalEarnings' | 'totalBonus' | 'createdAt'>) => Promise<void>;
  updateHelper: (id: string, helper: Partial<Helper>) => Promise<void>;
  deleteHelper: (id: string) => Promise<void>;
  setSelectedHelper: (helper: Helper | null) => void;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: 'all' | 'cashier' | 'helper') => void;
  setSortBy: (sortBy: 'name' | 'receipts' | 'amount') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  clearError: () => void;
  
  // Computed
  getFilteredHelpers: () => Helper[];
}

export const useHelpersStore = create<HelpersState>((set, get) => ({
  // Initial state
  helpers: [],
  selectedHelper: null,
  selectedHelperReceipts: [],
  loading: false,
  receiptsLoading: false,
  error: null,
  searchQuery: '',
  roleFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  currentPage: 1,
  totalPages: 1,
  receiptsPerPage: 20,
  lastFetchTime: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes

  // Fetch helpers with caching
  fetchHelpers: async (forceRefresh = false) => {
    const { lastFetchTime, cacheTimeout, helpers } = get();
    const now = Date.now();
    
    // Check cache
    if (!forceRefresh && lastFetchTime && helpers.length > 0 && (now - lastFetchTime) < cacheTimeout) {
      console.log('📦 Using cached helpers data');
      return;
    }

    console.log('🔄 Fetching helpers from API...');
    set({ loading: true, error: null });
    try {
      const response = await api.get('/receipts/helpers-stats');
      console.log('✅ API Response:', response.data);
      console.log('✅ Helpers count:', Array.isArray(response.data) ? response.data.length : 'Not an array');
      
      set({ 
        helpers: Array.isArray(response.data) ? response.data : [],
        loading: false,
        lastFetchTime: now,
        error: null
      });
      console.log('✅ Helpers fetched successfully');
    } catch (error: any) {
      console.error('❌ Error fetching helpers:', error);
      console.error('❌ Error response:', error.response?.data);
      set({ 
        error: error.response?.data?.message || 'Xatolik yuz berdi',
        loading: false 
      });
    }
  },

  // Fetch helper receipts with pagination
  fetchHelperReceipts: async (helperId: string, page = 1) => {
    set({ receiptsLoading: true, error: null });
    try {
      const { receiptsPerPage } = get();
      const response = await api.get(`/receipts/helper/${helperId}/receipts`, {
        params: { page, limit: receiptsPerPage }
      });
      
      set({ 
        selectedHelperReceipts: response.data.receipts || [],
        currentPage: response.data.pagination?.currentPage || 1,
        totalPages: response.data.pagination?.totalPages || 1,
        receiptsLoading: false,
        error: null
      });
      console.log('✅ Helper receipts fetched successfully');
    } catch (error: any) {
      console.error('❌ Error fetching helper receipts:', error);
      set({ 
        error: error.response?.data?.message || 'Cheklar yuklanmadi',
        receiptsLoading: false 
      });
    }
  },

  // Add helper with optimistic update
  addHelper: async (helperData) => {
    console.log('📤 Sending helper data to API:', helperData);
    
    const tempId = `temp-${Date.now()}`;
    const tempHelper: Helper = {
      _id: tempId,
      ...helperData,
      receiptCount: 0,
      totalAmount: 0,
      totalEarnings: 0,
      totalBonus: 0,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    set(state => ({ 
      helpers: [...state.helpers, tempHelper],
      error: null
    }));

    try {
      console.log('🔄 Making POST request to /users...');
      const response = await api.post('/users', helperData);
      console.log('✅ Response received:', response.data);
      
      // Replace temp with real data
      set(state => ({
        helpers: state.helpers.map(h => 
          h._id === tempId ? { ...response.data, receiptCount: 0, totalAmount: 0, totalEarnings: 0, totalBonus: 0 } : h
        )
      }));
      
      console.log('✅ Helper added successfully');
    } catch (error: any) {
      console.error('❌ Error adding helper:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Rollback optimistic update
      set(state => ({
        helpers: state.helpers.filter(h => h._id !== tempId),
        error: error.response?.data?.message || 'Hodim qo\'shilmadi'
      }));
      
      throw error;
    }
  },

  // Update helper with optimistic update
  updateHelper: async (id: string, helperData: Partial<Helper>) => {
    const { helpers } = get();
    const oldHelper = helpers.find(h => h._id === id);
    
    if (!oldHelper) return;

    // Optimistic update
    set(state => ({
      helpers: state.helpers.map(h => 
        h._id === id ? { ...h, ...helperData } : h
      ),
      error: null
    }));

    try {
      const response = await api.put(`/users/${id}`, helperData);
      
      // Update with server data
      set(state => ({
        helpers: state.helpers.map(h => 
          h._id === id ? { ...h, ...response.data } : h
        )
      }));
      
      console.log('✅ Helper updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating helper:', error);
      
      // Rollback optimistic update
      set(state => ({
        helpers: state.helpers.map(h => 
          h._id === id ? oldHelper : h
        ),
        error: error.response?.data?.message || 'Hodim yangilanmadi'
      }));
      
      throw error;
    }
  },

  // Delete helper with optimistic update
  deleteHelper: async (id: string) => {
    const { helpers } = get();
    const deletedHelper = helpers.find(h => h._id === id);
    
    if (!deletedHelper) return;

    // Optimistic update
    set(state => ({
      helpers: state.helpers.filter(h => h._id !== id),
      error: null
    }));

    try {
      await api.delete(`/users/${id}`);
      console.log('✅ Helper deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting helper:', error);
      
      // Rollback optimistic update
      set(state => ({
        helpers: [...state.helpers, deletedHelper],
        error: error.response?.data?.message || 'Hodim o\'chirilmadi'
      }));
      
      throw error;
    }
  },

  // Set selected helper
  setSelectedHelper: (helper: Helper | null) => {
    set({ 
      selectedHelper: helper,
      selectedHelperReceipts: [],
      currentPage: 1
    });
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Set role filter
  setRoleFilter: (role: 'all' | 'cashier' | 'helper') => {
    set({ roleFilter: role });
  },

  // Set sort by
  setSortBy: (sortBy: 'name' | 'receipts' | 'amount') => {
    set({ sortBy });
  },

  // Set sort order
  setSortOrder: (order: 'asc' | 'desc') => {
    set({ sortOrder: order });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Get filtered and sorted helpers
  getFilteredHelpers: () => {
    const { helpers, searchQuery, roleFilter, sortBy, sortOrder } = get();
    
    let filtered = [...helpers];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(query) ||
        h.phone.includes(query) ||
        h.login?.toLowerCase().includes(query)
      );
    }
    
    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(h => h.role === roleFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'receipts':
          comparison = a.receiptCount - b.receiptCount;
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }
}));
