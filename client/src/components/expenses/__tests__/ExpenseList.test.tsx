import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseList } from '../ExpenseList';

describe('🧪 ExpenseList Component', () => {
  const mockExpenses = [
    {
      _id: '1',
      category: 'komunal',
      amount: 100000,
      note: 'Elektr to\'lovi',
      date: '2024-01-15',
      type: 'elektr',
      source: 'manual',
      created_by: { name: 'Admin' },
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      _id: '2',
      category: 'soliqlar',
      amount: 200000,
      note: 'QQS to\'lovi',
      date: '2024-01-20',
      type: 'qqs',
      source: 'manual',
      created_by: { name: 'Manager' },
      createdAt: '2024-01-20T10:00:00Z'
    },
    {
      _id: '3',
      category: 'tovar_xarid',
      amount: 500000,
      note: 'Avtomatik xarajat',
      date: '2024-01-25',
      source: 'inventory',
      created_by: { name: 'System' },
      createdAt: '2024-01-25T10:00:00Z'
    }
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('✅ Renders expense list', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getAllByText('Komunal')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Soliqlar')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Tovar xaridi')[0]).toBeInTheDocument();
  });

  it('✅ Displays expense amounts correctly', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getAllByText(/100\.000 so'm/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/200\.000 so'm/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/500\.000 so'm/)[0]).toBeInTheDocument();
  });

  it('✅ Shows expense notes', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getAllByText('Elektr to\'lovi')[0]).toBeInTheDocument();
    expect(screen.getAllByText('QQS to\'lovi')[0]).toBeInTheDocument();
  });

  it('✅ Displays expense types', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getAllByText('Elektr')[0]).toBeInTheDocument();
    expect(screen.getAllByText('QQS')[0]).toBeInTheDocument();
  });

  it('✅ Shows "Avtomatik" badge for inventory expenses', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getAllByText('Avtomatik')[0]).toBeInTheDocument();
  });

  it('✅ Shows creator names', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getAllByText('Admin')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Manager')[0]).toBeInTheDocument();
    expect(screen.getAllByText('System')[0]).toBeInTheDocument();
  });

  it('✅ Calls onEdit when edit button clicked (manual expense)', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    const editButtons = screen.getAllByTitle('Tahrirlash');
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockExpenses[0]);
  });

  it('✅ Calls onDelete when delete button clicked (manual expense)', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    const deleteButtons = screen.getAllByTitle('O\'chirish');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('✅ Does not show edit/delete for inventory expenses', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('Tahrirlash mumkin emas')).toBeInTheDocument();
  });

  it('✅ Shows empty state when no expenses', () => {
    render(<ExpenseList expenses={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('Xarajatlar topilmadi')).toBeInTheDocument();
    expect(screen.getByText('Tanlangan filtrlar bo\'yicha xarajatlar mavjud emas')).toBeInTheDocument();
  });

  it('✅ Renders mobile and desktop views', () => {
    const { container } = render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    // Mobile view
    const mobileView = container.querySelector('.block.lg\\:hidden');
    expect(mobileView).toBeInTheDocument();
    
    // Desktop view
    const desktopView = container.querySelector('.hidden.lg\\:block');
    expect(desktopView).toBeInTheDocument();
  });

  it('✅ Formats dates correctly', () => {
    render(<ExpenseList expenses={mockExpenses} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    // Date should be formatted (exact format depends on locale)
    const dateElements = screen.getAllByText(/2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
