import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseFilters } from '../ExpenseFilters';

describe('🧪 ExpenseFilters Component', () => {
  const mockProps = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    category: '',
    onStartDateChange: jest.fn(),
    onEndDateChange: jest.fn(),
    onCategoryChange: jest.fn(),
    onReset: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('✅ Renders all filter inputs', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    expect(screen.getByText('Filterlar')).toBeInTheDocument();
    expect(screen.getByText('Boshlanish')).toBeInTheDocument();
    expect(screen.getByText('Tugash')).toBeInTheDocument();
    expect(screen.getByText('Kategoriya')).toBeInTheDocument();
    expect(screen.getByText('Tozalash')).toBeInTheDocument();
  });

  it('✅ Displays current filter values', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    const startDateInput = screen.getAllByDisplayValue('2024-01-01')[0] as HTMLInputElement;
    const endDateInput = screen.getAllByDisplayValue('2024-01-31')[0] as HTMLInputElement;
    
    expect(startDateInput.value).toBe('2024-01-01');
    expect(endDateInput.value).toBe('2024-01-31');
  });

  it('✅ Calls onStartDateChange when start date changes', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    const startDateInput = screen.getAllByDisplayValue('2024-01-01')[0];
    fireEvent.change(startDateInput, { target: { value: '2024-02-01' } });
    
    expect(mockProps.onStartDateChange).toHaveBeenCalledWith('2024-02-01');
  });

  it('✅ Calls onEndDateChange when end date changes', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    const endDateInput = screen.getAllByDisplayValue('2024-01-31')[0];
    fireEvent.change(endDateInput, { target: { value: '2024-02-28' } });
    
    expect(mockProps.onEndDateChange).toHaveBeenCalledWith('2024-02-28');
  });

  it('✅ Calls onCategoryChange when category changes', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'komunal' } });
    
    expect(mockProps.onCategoryChange).toHaveBeenCalledWith('komunal');
  });

  it('✅ Calls onReset when reset button clicked', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    const resetButton = screen.getByText('Tozalash');
    fireEvent.click(resetButton);
    
    expect(mockProps.onReset).toHaveBeenCalled();
  });

  it('✅ Shows all category options', () => {
    render(<ExpenseFilters {...mockProps} />);
    
    expect(screen.getByText('Barcha kategoriyalar')).toBeInTheDocument();
    expect(screen.getByText('Komunal')).toBeInTheDocument();
    expect(screen.getByText('Soliqlar')).toBeInTheDocument();
    expect(screen.getByText('Ovqatlanish')).toBeInTheDocument();
    expect(screen.getByText('Dostavka')).toBeInTheDocument();
    expect(screen.getByText('Tovar xaridi')).toBeInTheDocument();
  });

  it('✅ Renders with correct responsive classes', () => {
    const { container } = render(<ExpenseFilters {...mockProps} />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
  });

  it('✅ Selected category is displayed', () => {
    const propsWithCategory = { ...mockProps, category: 'komunal' };
    render(<ExpenseFilters {...propsWithCategory} />);
    
    const categorySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(categorySelect.value).toBe('komunal');
  });
});
