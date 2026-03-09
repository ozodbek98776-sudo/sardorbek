import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart3, DollarSign, Banknote, CreditCard, Smartphone,
  AlertTriangle, Gift, Truck, Receipt, Users, FileText,
  Calendar, ChevronDown, Loader2
} from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { UniversalPageHeader } from '../../components/common';

type TabType = 'report' | 'employees' | 'receipts';

interface ReportData {
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalClick: number;
  totalDebt: number;
  totalBonus: number;
  totalExpenses: number;
  salesCount: number;
  deliveryCount: number;
  deliveryAmount: number;
}

interface CashierStat {
  _id: string;
  name: string;
  role: string;
  salesCount: number;
  totalAmount: number;
  bonusPercentage: number;
  bonus: number;
}

interface DeliveryStat {
  _id: string;
  name: string;
  deliveryCount: number;
  totalAmount: number;
}

interface ReceiptItem {
  _id: string;
  receiptNumber?: string;
  total: number;
  paymentMethod: string;
  cashAmount: number;
  cardAmount: number;
  clickAmount: number;
  isDelivery?: boolean;
  createdBy?: { name: string };
  customer?: { name: string; phone: string };
  deliveryPerson?: { name: string };
  createdAt: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [activeTab, setActiveTab] = useState<TabType>('report');

  // Date filters
  const today = new Date();
  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(today));

  // Receipts tab: oylik default
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [receiptStartDate, setReceiptStartDate] = useState(formatDate(monthStart));
  const [receiptEndDate, setReceiptEndDate] = useState(formatDate(today));
  const [receiptType, setReceiptType] = useState<'all' | 'sale' | 'delivery'>('all');

  // Data
  const [report, setReport] = useState<ReportData | null>(null);
  const [cashiers, setCashiers] = useState<CashierStat[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryStat[]>([]);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [receiptsTotal, setReceiptsTotal] = useState(0);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [hasMoreReceipts, setHasMoreReceipts] = useState(false);

  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  // Fetch report
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stats/report', { params: { startDate, endDate } });
      if (res.data.success) setReport(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stats/employees', { params: { startDate, endDate } });
      if (res.data.success) {
        setCashiers(res.data.cashiers || []);
        setDeliveryPersons(res.data.deliveryPersons || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Fetch receipts
  const fetchReceipts = useCallback(async (page = 1, append = false) => {
    if (loadingRef.current && append) return;
    loadingRef.current = true;
    if (!append) setLoading(true);
    try {
      const params: Record<string, string | number> = {
        startDate: receiptStartDate,
        endDate: receiptEndDate,
        page,
        limit: 20
      };
      if (receiptType !== 'all') params.type = receiptType;

      const res = await api.get('/stats/receipts-list', { params });
      if (res.data.success) {
        if (append) {
          setReceipts(prev => [...prev, ...res.data.data]);
        } else {
          setReceipts(res.data.data);
        }
        setReceiptsTotal(res.data.total);
        setReceiptsPage(page);
        setHasMoreReceipts(res.data.hasMore);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [receiptStartDate, receiptEndDate, receiptType]);

  // Load data on tab change or date change
  useEffect(() => {
    if (activeTab === 'report') fetchReport();
    else if (activeTab === 'employees') fetchEmployees();
    else if (activeTab === 'receipts') fetchReceipts(1);
  }, [activeTab, fetchReport, fetchEmployees, fetchReceipts]);

  // Receipts infinite scroll
  const handleReceiptsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMoreReceipts && !loadingRef.current) {
      fetchReceipts(receiptsPage + 1, true);
    }
  }, [hasMoreReceipts, receiptsPage, fetchReceipts]);

  const tabs: { key: TabType; label: string; icon: typeof BarChart3 }[] = [
    { key: 'report', label: 'Hisobot', icon: BarChart3 },
    { key: 'employees', label: 'Xodimlar', icon: Users },
    { key: 'receipts', label: 'Cheklar', icon: Receipt }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <UniversalPageHeader title="Statistika" onMenuToggle={onMenuToggle} />

      <div className="p-3 sm:p-4 lg:p-6">
        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date filter — report & employees share same dates */}
        {(activeTab === 'report' || activeTab === 'employees') && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Dan</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Gacha</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              />
            </div>
          </div>
        )}

        {/* Receipts date + type filter */}
        {activeTab === 'receipts' && (
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Dan</label>
                <input
                  type="date"
                  value={receiptStartDate}
                  onChange={e => setReceiptStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Gacha</label>
                <input
                  type="date"
                  value={receiptEndDate}
                  onChange={e => setReceiptEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'sale', 'delivery'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReceiptType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    receiptType === t
                      ? t === 'delivery' ? 'bg-orange-500 text-white' : 'bg-brand-500 text-white'
                      : 'bg-white border text-slate-600'
                  }`}
                >
                  {t === 'all' ? 'Barchasi' : t === 'sale' ? 'Sotuv' : 'Yetkazish'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading && !receipts.length ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Report Tab */}
            {activeTab === 'report' && report && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox icon={DollarSign} label="Jami sotuv" value={report.totalSales} color="emerald" />
                  <StatBox icon={Banknote} label="Naqd" value={report.totalCash} color="green" />
                  <StatBox icon={CreditCard} label="Karta" value={report.totalCard} color="blue" />
                  <StatBox icon={Smartphone} label="Click" value={report.totalClick} color="purple" />
                  <StatBox icon={AlertTriangle} label="Qarz" value={report.totalDebt} color="amber" />
                  <StatBox icon={Gift} label="Bonus" value={report.totalBonus} color="teal" />
                  <StatBox icon={FileText} label="Xarajat" value={report.totalExpenses} color="red" />
                  <StatBox icon={Truck} label="Dastavka" value={report.deliveryAmount} color="orange" count={report.deliveryCount} />
                </div>

                {/* Summary */}
                <div className="bg-white rounded-xl p-4 border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Cheklar soni:</span>
                    <span className="font-bold">{report.salesCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Sof foyda:</span>
                    <span className="font-bold text-emerald-600">
                      {formatNumber(report.totalSales - report.totalExpenses - report.totalBonus)} so'm
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Yetkazishlar:</span>
                    <span className="font-bold text-orange-600">{report.deliveryCount} ta</span>
                  </div>
                </div>
              </div>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div className="space-y-4">
                {/* Cashiers */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Kassirlar ({cashiers.length})
                  </h3>
                  {cashiers.length > 0 ? (
                    <div className="space-y-2">
                      {cashiers.map(c => (
                        <div key={c._id} className="bg-white rounded-xl p-3 border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.salesCount} ta sotuv</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-slate-900">{formatNumber(c.totalAmount)}</p>
                            {c.bonus > 0 && (
                              <p className="text-xs text-emerald-600">+{formatNumber(Math.round(c.bonus))} bonus</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">Ma'lumot yo'q</p>
                  )}
                </div>

                {/* Delivery Persons */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Dostavchilar ({deliveryPersons.length})
                  </h3>
                  {deliveryPersons.length > 0 ? (
                    <div className="space-y-2">
                      {deliveryPersons.map(d => (
                        <div key={d._id} className="bg-white rounded-xl p-3 border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                              {d.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900">{d.name}</p>
                              <p className="text-xs text-slate-500">{d.deliveryCount} ta yetkazish</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-orange-600">{formatNumber(d.totalAmount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">Yetkazishlar yo'q</p>
                  )}
                </div>
              </div>
            )}

            {/* Receipts Tab */}
            {activeTab === 'receipts' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Jami: {receiptsTotal} ta chek</p>
                <div
                  className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto"
                  onScroll={handleReceiptsScroll}
                >
                  {receipts.map(r => (
                    <div key={r._id} className="bg-white rounded-xl p-3 border">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">#{r.receiptNumber || r._id.slice(-6)}</span>
                          {r.isDelivery && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium flex items-center gap-0.5">
                              <Truck className="w-2.5 h-2.5" />
                              Yetkazish
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-sm">{formatNumber(r.total)} so'm</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          {r.createdBy && <span>{r.createdBy.name}</span>}
                          {r.customer && <span>• {r.customer.name}</span>}
                          {r.deliveryPerson && <span>• 🚚 {r.deliveryPerson.name}</span>}
                        </div>
                        <span>{formatDateDisplay(r.createdAt)}</span>
                      </div>
                      <div className="flex gap-2 mt-1.5">
                        {r.cashAmount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                            Naqd: {formatNumber(r.cashAmount)}
                          </span>
                        )}
                        {r.cardAmount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                            Karta: {formatNumber(r.cardAmount)}
                          </span>
                        )}
                        {r.clickAmount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                            Click: {formatNumber(r.clickAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {loadingRef.current && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                    </div>
                  )}
                  {receipts.length === 0 && (
                    <div className="text-center py-12">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm text-slate-400">Cheklar topilmadi</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Stat card component
function StatBox({ icon: Icon, label, value, color, count }: {
  icon: typeof DollarSign;
  label: string;
  value: number;
  color: string;
  count?: number;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <div className={`rounded-xl p-3 border ${colorMap[color] || colorMap.emerald}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold">{formatNumber(value)} <span className="text-xs font-normal">so'm</span></p>
      {count !== undefined && (
        <p className="text-xs opacity-75">{count} ta</p>
      )}
    </div>
  );
}
