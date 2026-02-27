import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, RefreshCw, CheckCircle, XCircle, Clock, Users, Calculator } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import { UniversalPageHeader } from '../../../components/common';
import AlertModal from '../../../components/AlertModal';
import { formatNumber } from '../../../utils/format';

interface Payroll {
  _id: string;
  employee: { _id: string; name: string; role: string; position?: string };
  period: string;
  year: number;
  month: number;
  baseSalary: number;
  totalBonus: number;
  allowances: number;
  deductions: number;
  advancePayments: number;
  grossSalary: number;
  netSalary: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paymentDate?: string;
  approvedBy?: { name: string };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Kutilmoqda', cls: 'bg-yellow-100 text-yellow-800' },
  approved:  { label: 'Tasdiqlandi', cls: 'bg-blue-100 text-blue-800' },
  paid:      { label: "To'landi", cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Bekor qilindi', cls: 'bg-red-100 text-red-800' },
};

export default function HRPayroll() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, type: 'success' as 'success' | 'danger' | 'warning' | 'info', title: '', message: '' });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/hr/payroll`, {
        params: { year, month },
        headers
      });
      setPayrolls(res.data.payrolls || []);
    } catch {
      showAlert('Maoshlarni yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayrolls(); }, [year, month]);

  const showAlert = (message: string, title: string, type: 'success' | 'danger' | 'warning' | 'info') => {
    setAlert({ isOpen: true, type, title, message });
  };

  const handleCalculateAll = async () => {
    if (!window.confirm(`${year}-yil ${month}-oy uchun barcha xodimlar maoshini hisoblash?`)) return;
    try {
      setCalculating(true);
      const res = await axios.post(`${API_BASE_URL}/hr/payroll/calculate-all`, { year, month }, { headers });
      showAlert(
        `${res.data.result?.success?.length || 0} ta xodim hisoblandi${res.data.result?.failed?.length ? `, ${res.data.result.failed.length} ta xatolik` : ''}`,
        'Hisoblandi', 'success'
      );
      fetchPayrolls();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik', 'Xatolik', 'danger');
    } finally {
      setCalculating(false);
    }
  };

  const handlePay = async (payroll: Payroll) => {
    if (!window.confirm(`${payroll.employee.name} uchun ${formatNumber(payroll.netSalary)} so'm to'lansinmi?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/hr/payroll/${payroll._id}/approve`, { paymentMethod: 'cash' }, { headers });
      showAlert("Maosh to'landi", 'Muvaffaqiyat', 'success');
      fetchPayrolls();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik', 'Xatolik', 'danger');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Payrollni bekor qilish?')) return;
    try {
      await axios.post(`${API_BASE_URL}/hr/payroll/${id}/cancel`, {}, { headers });
      showAlert('Bekor qilindi', 'Muvaffaqiyat', 'success');
      fetchPayrolls();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik', 'Xatolik', 'danger');
    }
  };

  const totalNet = payrolls.reduce((s, p) => s + (p.status !== 'cancelled' ? p.netSalary : 0), 0);
  const paidCount = payrolls.filter(p => p.status === 'paid').length;

  const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      <UniversalPageHeader title="Maosh to'lash" onMenuToggle={onMenuToggle} />

      <div className="p-4 max-w-5xl mx-auto">
        {/* Filters + Calculate */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button
            onClick={fetchPayrolls}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Yangilash
          </button>
          <button
            onClick={handleCalculateAll}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 ml-auto"
          >
            <Calculator className="w-4 h-4" />
            {calculating ? 'Hisoblanmoqda...' : 'Barcha maoshni hisoblash'}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Users className="w-5 h-5 text-violet-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{payrolls.length}</p>
            <p className="text-xs text-gray-500">Jami xodim</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{paidCount}</p>
            <p className="text-xs text-gray-500">To'landi</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{formatNumber(totalNet)}</p>
            <p className="text-xs text-gray-500">Jami summa</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">Yuklanmoqda...</div>
        ) : payrolls.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <Calculator className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Bu oy uchun maosh hisoblanmagan</p>
            <p className="text-sm mt-1">"Barcha maoshni hisoblash" tugmasini bosing</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Xodim</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Asosiy</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Bonus</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Chegirma</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 font-semibold">Sof</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Holat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.map(p => {
                  const st = STATUS_LABELS[p.status];
                  return (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.employee?.name}</p>
                        <p className="text-xs text-gray-400">{p.employee?.role}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatNumber(p.baseSalary)}</td>
                      <td className="px-4 py-3 text-right text-green-600">+{formatNumber(p.totalBonus)}</td>
                      <td className="px-4 py-3 text-right text-red-500">
                        -{formatNumber((p.deductions || 0) + (p.advancePayments || 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatNumber(p.netSalary)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handlePay(p)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600"
                            >
                              <CheckCircle className="w-3 h-3" />
                              To'lash
                            </button>
                            <button
                              onClick={() => handleCancel(p._id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {p.status === 'paid' && p.paymentDate && (
                          <span className="text-xs text-gray-400">
                            {new Date(p.paymentDate).toLocaleDateString('uz-UZ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert(a => ({ ...a, isOpen: false }))}
      />
    </div>
  );
}
