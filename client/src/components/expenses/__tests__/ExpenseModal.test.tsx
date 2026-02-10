import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseModal } from '../ExpenseModal';

describe('🧪 ExpenseModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    editingExpense: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('Category Selection', () => {
    it('✅ Shows category selection step initially', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      expect(screen.getByText('Yangi xarajat')).toBeInTheDocument();
      expect(screen.getByText('Xarajat kategoriyasini tanlang:')).toBeInTheDocument();
      expect(screen.getByText('Komunal')).toBeInTheDocument();
      expect(screen.getByText('Soliqlar')).toBeInTheDocument();
      expect(screen.getByText('Ovqatlanish')).toBeInTheDocument();
      expect(screen.getByText('Dostavka')).toBeInTheDocument();
      expect(screen.getByText('Tovar xaridi')).toBeInTheDocument();
    });

    it('✅ Moves to form step when category selected', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const komunalButton = screen.getByText('Komunal').closest('button');
      fireEvent.click(komunalButton!);
      
      expect(screen.getByText('Komunal turi *')).toBeInTheDocument();
      expect(screen.getByText('Summa *')).toBeInTheDocument();
    });

    it('✅ Shows category types for komunal', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const komunalButton = screen.getByText('Komunal').closest('button');
      fireEvent.click(komunalButton!);
      
      expect(screen.getByText('Elektr')).toBeInTheDocument();
      expect(screen.getByText('Gaz')).toBeInTheDocument();
      expect(screen.getByText('Suv')).toBeInTheDocument();
    });

    it('✅ Shows category types for soliqlar', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const soliqlarButton = screen.getByText('Soliqlar').closest('button');
      fireEvent.click(soliqlarButton!);
      
      expect(screen.getByText('NDPI')).toBeInTheDocument();
      expect(screen.getByText('QQS')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('✅ Validates required fields', async () => {
      render(<ExpenseModal {...defaultProps} />);
      
      // Select category
      const komunalButton = screen.getByText('Komunal').closest('button');
      fireEvent.click(komunalButton!);
      
      // Fill amount first to pass amount validation
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '10000' } });
      
      // Try to submit without selecting type
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Komunal turi tanlanishi shart')).toBeInTheDocument();
      });
    });

    it('✅ Validates amount is positive', async () => {
      render(<ExpenseModal {...defaultProps} />);
      
      // Select category without types
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      // Enter invalid amount
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '0' } });
      
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Summa musbat bo\'lishi kerak')).toBeInTheDocument();
      });
    });

    it('✅ Validates amount maximum', async () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '2000000000' } });
      
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Summa juda katta (maksimal 1 milliard)')).toBeInTheDocument();
      });
    });

    it('✅ Validates note length', async () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '10000' } });
      
      const noteInput = screen.getByPlaceholderText('Qo\'shimcha ma\'lumot...');
      fireEvent.change(noteInput, { target: { value: 'a'.repeat(301) } });
      
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Izoh 300 belgidan oshmasligi kerak')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('✅ Submits valid expense', async () => {
      render(<ExpenseModal {...defaultProps} />);
      
      // Select category
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      // Fill form
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '50000' } });
      
      const dateInput = screen.getAllByDisplayValue(/2024-01-15|2026-02-10/)[0];
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
      
      const noteInput = screen.getByPlaceholderText('Qo\'shimcha ma\'lumot...');
      fireEvent.change(noteInput, { target: { value: 'Test note' } });
      
      // Submit
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          category: 'ovqatlanish',
          amount: 50000,
          note: 'Test note',
          date: '2024-01-15',
          type: undefined
        });
      });
    });

    it('✅ Submits expense with type', async () => {
      render(<ExpenseModal {...defaultProps} />);
      
      // Select category with types
      const komunalButton = screen.getByText('Komunal').closest('button');
      fireEvent.click(komunalButton!);
      
      // Select type
      const typeSelect = screen.getByRole('combobox');
      fireEvent.change(typeSelect, { target: { value: 'elektr' } });
      
      // Fill form
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '100000' } });
      
      const dateInput = screen.getAllByDisplayValue(/2024-01-15|2026-02-10/)[0];
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
      
      // Submit
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          category: 'komunal',
          amount: 100000,
          note: undefined,
          date: '2024-01-15',
          type: 'elektr'
        });
      });
    });

    it('✅ Shows loading state during submission', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '50000' } });
      
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Saqlanmoqda...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('✅ Handles submission error', async () => {
      mockOnSave.mockRejectedValue({
        response: { data: { message: 'Server xatosi' } }
      });
      
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const amountInput = screen.getByPlaceholderText('0');
      fireEvent.change(amountInput, { target: { value: '50000' } });
      
      const saveButton = screen.getByText('Saqlash');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Server xatosi')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    const editingExpense = {
      _id: '1',
      category: 'komunal',
      amount: 100000,
      note: 'Test expense',
      date: '2024-01-15',
      type: 'elektr'
    };

    it('✅ Shows edit title', () => {
      render(<ExpenseModal {...defaultProps} editingExpense={editingExpense} />);
      
      expect(screen.getByText('Xarajatni tahrirlash')).toBeInTheDocument();
    });

    it('✅ Pre-fills form with expense data', () => {
      render(<ExpenseModal {...defaultProps} editingExpense={editingExpense} />);
      
      const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement;
      expect(amountInput.value).toBe('100000');
      expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      
      const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(typeSelect.value).toBe('elektr');
    });

    it('✅ Does not show back button in edit mode', () => {
      render(<ExpenseModal {...defaultProps} editingExpense={editingExpense} />);
      
      expect(screen.queryByText('Orqaga')).not.toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('✅ Closes on backdrop click', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const backdrop = document.querySelector('.bg-black\\/60');
      fireEvent.click(backdrop!);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('✅ Closes on X button click', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('✅ Closes on cancel button click', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const cancelButton = screen.getByText('Bekor qilish');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('✅ Does not render when closed', () => {
      render(<ExpenseModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Yangi xarajat')).not.toBeInTheDocument();
    });

    it('✅ Goes back to category selection', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const backButton = screen.getByText('Orqaga');
      fireEvent.click(backButton);
      
      expect(screen.getByText('Xarajat kategoriyasini tanlang:')).toBeInTheDocument();
    });
  });

  describe('Amount Formatting', () => {
    it('✅ Formats amount with dots', () => {
      render(<ExpenseModal {...defaultProps} />);
      
      const ovqatlanishButton = screen.getByText('Ovqatlanish').closest('button');
      fireEvent.click(ovqatlanishButton!);
      
      const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '1000000' } });
      
      expect(amountInput.value).toBe('1.000.000');
    });
  });
});
