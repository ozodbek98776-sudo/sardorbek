import React from 'react';
import { TrendingUp, DollarSign, PieChart, Calendar } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { StatCard } from '../common';

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

const categoryNames: Record<string, string> = {
  komunal: 'Komunal',
  soliqlar: 'Soliqlar',
  ovqatlanish: 'Ovqatlanish',
  dostavka: 'Dostavka',
  tovar_xarid: 'Tovar xaridi'
};

export function ExpenseStats({ statistics }: ExpenseStatsProps) {
  const topCategory = statistics.byCategory[0];
  const dailyAverage = statistics.count > 0 ? statistics.total / 30 : 0;

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
        value={topCategory ? categoryNames[topCategory._id] : 'Ma\'lumot yo\'q'}
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
}

function getCategoryColor(category: string): 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'gray' {
  const colors: Record<string, 'blue' | 'red' | 'green' | 'yellow' | 'purple'> = {
    komunal: 'blue',
    soliqlar: 'red',
    ovqatlanish: 'green',
    dostavka: 'yellow',
    tovar_xarid: 'purple'
  };
  return colors[category] || 'gray';
}
