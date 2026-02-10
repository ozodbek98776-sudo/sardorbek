import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ExpenseStats } from '../../components/expenses/ExpenseStats';
import { ExpenseFilters } from '../../components/expenses/ExpenseFilters';
import { ExpenseList } from '../../components/expenses/ExpenseList';
import { ExpenseModal } from '../../components/expenses/ExpenseModal';
import { useAlert } from '../../hooks/useAlert';
import api from '../../utils/api';
import { ActionButton, UniversalPageHeader, Pagination, LoadingSpinner } from '../../components/common';

interface Expense {
  _id: string;
  category: string;
  amount: number;
  note?: string;
  date: string;
  type?: string;
  source: string;
  created_by: {
    name: string;
  };
  createdAt: string;
}

interface Statistics {
  total: number;
  average: number;
  count: number;
  byCategory: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
}

export default function Expenses() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { showAlert, AlertComponent } = useAlert();
  
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    average: 0,
    count: 0,
    byCategory: []
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Ma'lumotlarni yuklash
  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate, category, page]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (category) params.append('category', category);
      
      const response = await api.get(`/expenses?${params.toString()}`);
      
      if (response.data.success) {
        setExpenses(response.data.expenses);
        setStatistics(response.data.statistics);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error: any) {
      console.error('Xarajatlarni yuklashda xatolik:', error);
      showAlert('danger', 'Xatolik', error.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, '_id' | 'created_by' | 'createdAt' | 'source'>) => {
    try {
      if (editingExpense) {
        // Tahrirlash
        const response = await api.put(`/expenses/${editingExpense._id}`, expenseData);
        
        if (response.data.success) {
          await showAlert('Xarajat yangilandi', 'Muvaffaqiyatli', 'success');
          fetchExpenses();
        }
      } else {
        // Yangi qo'shish
        const response = await api.post('/expenses', expenseData);
        
        if (response.data.success) {
          await showAlert('Xarajat saqlandi', 'Muvaffaqiyatli', 'success');
          fetchExpenses();
        }
      }
    } catch (error: any) {
      throw error; // Modal ichida handle qilinadi
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleDeleteExpense = async (id: string) => {
    const confirmed = window.confirm('Xarajatni o\'chirmoqchimisiz?');
    if (!confirmed) return;

    try {
      const response = await api.delete(`/expenses/${id}`);
      
      if (response.data.success) {
        await showAlert('Xarajat o\'chirildi', 'Muvaffaqiyatli', 'success');
        fetchExpenses();
      }
    } catch (error: any) {
      console.error('Xarajatni o\'chirishda xatolik:', error);
      await showAlert(error.response?.data?.message || 'Xarajatni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const handleResetFilters = () => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    setCategory('');
    setPage(1);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <UniversalPageHeader 
        title="Xarajatlar"
        onMenuToggle={onMenuToggle}
        actions={
          <ActionButton icon={Plus} onClick={() => setShowModal(true)}>
            Xarajat qo'shish
          </ActionButton>
        }
      />
      
      <div className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1600px] mx-auto">
        {/* Statistics */}
        <ExpenseStats statistics={statistics} />

        {/* Filters */}
        <ExpenseFilters
          startDate={startDate}
          endDate={endDate}
          category={category}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCategoryChange={setCategory}
          onReset={handleResetFilters}
        />

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner text="Yuklanmoqda..." />
          </div>
        ) : (
          <>
            {/* Expense List */}
            <ExpenseList
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
      />

      {/* Alert */}
      {AlertComponent}
    </div>
  );
}
