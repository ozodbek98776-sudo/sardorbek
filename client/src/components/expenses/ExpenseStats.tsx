import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, PieChart, Calendar } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { StatCard } from '../common';
import { EXPENSE_CATEGORIES } from '../../constants/expenses';

interface CategoryStat {
  _id: string;
  total: number;
  count: number;
}

interface ExpenseStatsProps {
  statistics: {
    total: number;
    average: number;
    count: number;
    byCategory: CategoryStat[];
  };
}

const getCategoryColor = (category: string): 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'gray' => {
  const colors: Record<string, 'blue' | 'red' | 'green' | 'yellow' | 'purple'> = {
    komunal: 'blue',
    soliqlar: 'red',
    ovqatlanish: 'green',
    dostavka: 'yellow',
    tovar_xarid: 'purple'
  };
  return colors[category] || 'gray';
};

export const ExpenseStats = React.memo(function ExpenseStats({ statistics }: ExpenseStatsProps) {
  const topCategory = useMemo(() => statistics.byCategory[0], [statistics.byCategory]);
  const dailyAverage = useMemo(() => 
    statistics.count > 0 ? statistics.total / 30 : 0,
    [statistics.count, statistics.total]
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <StatCard
        title="Jami xarajat"
        value={`${formatNumber(statistics.total)} so'm`}
        subtitle={`${statistics.count} ta xarajat`}
        icon={DollarSign}
        color="blue"
      />

      <StatCard
        title="Eng ko'p"
        value={topCategory ? EXPENSE_CATEGORIES[topCategory._id as keyof typeof EXPENSE_CATEGORIES] : 'Ma\'lumot yo\'q'}
        subtitle={topCategory ? `${formatNumber(topCategory.total)} so'm` : '0 so\'m'}
        icon={PieChart}
        color={topCategory ? getCategoryColor(topCategory._id) : 'gray'}
      />

      <StatCard
        title="Kunlik o'rtacha"
        value={`${formatNumber(Math.round(dailyAverage))} so'm`}
        subtitle="O'rtacha xarajat"
        icon={Calendar}
        color="green"
      />

      <StatCard
        title="O'rtacha summa"
        value={`${formatNumber(Math.round(statistics.average))} so'm`}
        subtitle="Har bir xarajat"
        icon={TrendingUp}
        color="purple"
      />
    </div>
  );
});
