import React from 'react';
import { Edit, Trash2, Calendar, User } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { EmptyState } from '../common';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS, EXPENSE_TYPES } from '../../constants/expenses';

interface Expense {
  _id: string;
  category: string;
  amount: number;
  note?: string;
  date: string;
  type?: string;
  source: string;
  created_by?: {
    name: string;
  };
  employee_name?: string;
  createdAt: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const ExpenseList = React.memo(function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="Xarajatlar topilmadi"
        description="Tanlangan filtrlar bo'yicha xarajatlar mavjud emas"
      />
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Mobile card view */}
      <div className="block lg:hidden divide-y divide-gray-100">
        {expenses.map((expense) => (
          <div key={expense._id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${EXPENSE_CATEGORY_COLORS[expense.category as keyof typeof EXPENSE_CATEGORY_COLORS]} w-fit`}>
                  {EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES]}
                </span>
                {expense.type && (
                  <span className="text-xs text-gray-500">
                    {EXPENSE_TYPES[expense.type as keyof typeof EXPENSE_TYPES] || expense.type}
                  </span>
                )}
                {expense.source === 'inventory' && (
                  <span className="text-xs text-purple-600 font-medium">
                    Avtomatik
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-gray-900">
                {formatNumber(expense.amount)} so'm
              </span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(expense.date)}
              </div>
              {expense.employee_name && (
                <p className="text-xs font-medium text-indigo-600">
                  Xodim: {expense.employee_name}
                </p>
              )}
              {expense.note && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {expense.note}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <User className="w-3.5 h-3.5" />
                {expense.created_by?.name || 'System'}
              </div>
            </div>
            
            {expense.source === 'manual' && (
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onEdit(expense)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Tahrirlash
                </button>
                <button
                  onClick={() => onDelete(expense._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  O'chirish
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Kategoriya
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Summa
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sana
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Izoh
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Kim qo'shgan
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${EXPENSE_CATEGORY_COLORS[expense.category as keyof typeof EXPENSE_CATEGORY_COLORS]} w-fit`}>
                      {EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES]}
                    </span>
                    {expense.type && (
                      <span className="text-xs text-gray-500">
                        {EXPENSE_TYPES[expense.type as keyof typeof EXPENSE_TYPES] || expense.type}
                      </span>
                    )}
                    {expense.source === 'inventory' && (
                      <span className="text-xs text-purple-600 font-medium">
                        Avtomatik
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-lg font-bold text-gray-900">
                    {formatNumber(expense.amount)} so'm
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {formatDate(expense.date)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {expense.employee_name && (
                      <p className="text-sm font-medium text-indigo-600">
                        {expense.employee_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 max-w-xs truncate">
                      {expense.note || '-'}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    {expense.created_by?.name || 'System'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    {expense.source === 'manual' ? (
                      <>
                        <button
                          onClick={() => onEdit(expense)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(expense._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Tahrirlash mumkin emas
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
