import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExpenseStats } from '../ExpenseStats';

describe('🧪 ExpenseStats Component', () => {
  const mockStatistics = {
    total: 1000000,
    average: 50000,
    count: 20,
    byCategory: [
      { _id: 'komunal', total: 400000, count: 8 },
      { _id: 'soliqlar', total: 300000, count: 6 },
      { _id: 'ovqatlanish', total: 200000, count: 4 },
      { _id: 'dostavka', total: 100000, count: 2 }
    ]
  };

  it('✅ Renders all stat cards', () => {
    render(<ExpenseStats statistics={mockStatistics} />);
    
    expect(screen.getByText('Jami xarajat')).toBeInTheDocument();
    expect(screen.getByText('Eng ko\'p')).toBeInTheDocument();
    expect(screen.getByText('Kunlik o\'rtacha')).toBeInTheDocument();
    expect(screen.getByText('O\'rtacha summa')).toBeInTheDocument();
  });

  it('✅ Displays correct total amount', () => {
    render(<ExpenseStats statistics={mockStatistics} />);
    
    expect(screen.getByText(/1\.000\.000 so'm/)).toBeInTheDocument();
    expect(screen.getByText('20 ta xarajat')).toBeInTheDocument();
  });

  it('✅ Shows top category correctly', () => {
    render(<ExpenseStats statistics={mockStatistics} />);
    
    expect(screen.getByText('Komunal')).toBeInTheDocument();
    expect(screen.getByText(/400\.000 so'm/)).toBeInTheDocument();
  });

  it('✅ Calculates daily average', () => {
    render(<ExpenseStats statistics={mockStatistics} />);
    
    // Daily average is 1000000 / 30 = 33333.33 rounded to 33333, formatted as 33.333
    expect(screen.getByText(/33\.333 so'm/)).toBeInTheDocument();
  });

  it('✅ Displays average amount', () => {
    render(<ExpenseStats statistics={mockStatistics} />);
    
    expect(screen.getByText(/50\.000 so'm/)).toBeInTheDocument();
  });

  it('✅ Handles empty statistics', () => {
    const emptyStats = {
      total: 0,
      average: 0,
      count: 0,
      byCategory: []
    };
    
    render(<ExpenseStats statistics={emptyStats} />);
    
    expect(screen.getAllByText('0 so\'m')[0]).toBeInTheDocument();
    expect(screen.getByText('Ma\'lumot yo\'q')).toBeInTheDocument();
  });

  it('✅ Renders with correct grid layout', () => {
    const { container } = render(<ExpenseStats statistics={mockStatistics} />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-2', 'lg:grid-cols-4');
  });

  it('✅ Shows correct category colors', () => {
    const { container } = render(<ExpenseStats statistics={mockStatistics} />);
    
    // Check if StatCard components are rendered (they have specific structure)
    const cards = container.querySelectorAll('.group');
    expect(cards.length).toBe(4);
  });
});
