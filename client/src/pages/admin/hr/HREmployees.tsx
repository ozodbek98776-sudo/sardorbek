import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, DollarSign, TrendingUp, Target, Calendar, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import { UniversalPageHeader, StatCard, ActionButton } from '../../../components/common';
import AlertModal from '../../../components/AlertModal';

interface Employee {
  _id: string;
  name: string;
  login: string;
  phone: string;
  role: string;
  position?: string;
  department?: string;
  status: string;
  hireDate?: string;
  salary?: {
    baseSalary: number;
    maxBonus: number;
    bonusEnabled: boolean;
  };
}

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  avgSalary: number;
}

interface SalarySetting {
  _id: string;
  employee: { _id: string; name: string; role: string };
  salaryType: 'hourly' | 'monthly';
  hourlyRate: number;
  baseSalary: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

interface KPITask {
  id: string;
  name: string;
  dailyReward: number;
}

interface DailyRecord {
  date: string;
  taskId: string;
  completed: boolean;
}

export default function HREmployees() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stats, setStats] = useState<HRStats>({ totalEmployees: 0, activeEmployees: 0, totalPayroll: 0, avgSalary: 0 });

  // Employee modal
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ name: '', login: '', password: '', phone: '', role: 'cashier' });

  // Salary modal
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [salarySettings, setSalarySettings] = useState<SalarySetting[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    salaryType: 'hourly' as 'hourly' | 'monthly',
    hourlyRate: '',
    baseSalary: '',
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  // KPI modal
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [kpiEmployee, setKpiEmployee] = useState<Employee | null>(null);
  const [kpiBaseSalary, setKpiBaseSalary] = useState(0);
  const [kpiTasks, setKpiTasks] = useState<KPITask[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', dailyReward: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayRecords, setTodayRecords] = useState<DailyRecord[]>([]);

  // Alert + Delete
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'danger' | 'warning' | 'info',
    title: '',
    message: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, employeeId: '', employeeName: '' });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  // Scroll lock for modals
  useEffect(() => {
    const anyOpen = showModal || showSalaryModal || showKPIModal || showTaskModal;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal, showSalaryModal, showKPIModal, showTaskModal]);

  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, [roleFilter]);

  // KPI: load tasks and records when employee or date changes
  useEffect(() => {
    if (kpiEmployee) {
      loadKPIData(kpiEmployee._id);
    }
  }, [kpiEmployee, selectedDate]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { _t: Date.now() };
      if (roleFilter !== 'all') params.role = roleFilter;
      const res = await axios.get(`${API_BASE_URL}/hr/employees`, {
        params,
        headers: { ...headers, 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      setEmployees((res.data.employees || []).filter((e: Employee) => e.status !== 'terminated'));
    } catch (error) {
      console.error('Xodimlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/hr/employees/stats/dashboard`, { headers });
      if (res.data.success) {
        const s = res.data.stats;
        setStats({ totalEmployees: s.totalEmployees, activeEmployees: s.activeEmployees, totalPayroll: s.totalPayroll, avgSalary: s.avgSalary });
      }
    } catch {
      // stats default 0
    }
  };

  // ---- Employee CRUD ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanData: Record<string, string> = { name: formData.name, login: formData.login, role: formData.role };
      if (formData.phone?.trim()) cleanData.phone = formData.phone.trim();
      if (!editingEmployee && formData.password) cleanData.password = formData.password;

      if (editingEmployee) {
        const res = await axios.put(`${API_BASE_URL}/hr/employees/${editingEmployee._id}`, cleanData, { headers });
        showAlert('success', 'Muvaffaqiyatli!', res.data.message || "Xodim yangilandi");
      } else {
        const res = await axios.post(`${API_BASE_URL}/hr/employees`, cleanData, { headers });
        showAlert('success', 'Muvaffaqiyatli!', res.data.message || "Yangi xodim qo'shildi");
      }
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
      fetchStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      showAlert('danger', 'Xatolik!', err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/hr/employees/${id}`, { headers });
      showAlert('success', 'Muvaffaqiyatli!', res.data.message || "Xodim o'chirildi");
      setDeleteConfirm({ isOpen: false, employeeId: '', employeeName: '' });
      fetchEmployees();
      fetchStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      showAlert('danger', 'Xatolik!', err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({ name: emp.name, login: emp.login, password: '', phone: emp.phone, role: emp.role });
    setShowModal(true);
  };

  const resetForm = () => setFormData({ name: '', login: '', password: '', phone: '', role: 'cashier' });

  // ---- Salary Modal ----
  const openSalaryModal = async (emp: Employee) => {
    setSalaryEmployee(emp);
    setShowSalaryModal(true);
    setSalaryLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/hr/salary/employee/${emp._id}`, { headers });
      setSalarySettings(res.data.settings || []);
    } catch {
      setSalarySettings([]);
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryEmployee) return;
    try {
      await axios.post(`${API_BASE_URL}/hr/salary`, {
        employee: salaryEmployee._id,
        salaryType: salaryForm.salaryType,
        hourlyRate: salaryForm.salaryType === 'hourly' ? Number(salaryForm.hourlyRate) : 0,
        baseSalary: salaryForm.salaryType === 'monthly' ? Number(salaryForm.baseSalary) : 0,
        effectiveFrom: salaryForm.effectiveFrom,
        bonusEnabled: false, maxBonus: 0, minBonus: 0
      }, { headers });
      showAlert('success', 'Muvaffaqiyatli', 'Maosh saqlandi!');
      setShowSalaryModal(false);
      resetSalaryForm();
      fetchEmployees();
      fetchStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showAlert('danger', 'Xatolik', err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const resetSalaryForm = () => setSalaryForm({ salaryType: 'hourly', hourlyRate: '', baseSalary: '', effectiveFrom: new Date().toISOString().split('T')[0] });

  // ---- KPI Modal ----
  const openKPIModal = async (emp: Employee) => {
    setKpiEmployee(emp);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setShowKPIModal(true);
    // Load base salary
    try {
      const res = await axios.get(`${API_BASE_URL}/hr/salary/employee/${emp._id}/current`, { headers });
      setKpiBaseSalary(res.data.setting?.baseSalary || 0);
    } catch {
      setKpiBaseSalary(0);
    }
  };

  const loadKPIData = (empId: string) => {
    // Tasks from localStorage
    const savedTasks = localStorage.getItem(`kpi_tasks_${empId}`);
    setKpiTasks(savedTasks ? JSON.parse(savedTasks) : []);
    // Daily records
    const recordsKey = `kpi_records_${empId}_${selectedDate}`;
    const savedRecords = localStorage.getItem(recordsKey);
    setTodayRecords(savedRecords ? JSON.parse(savedRecords) : []);
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.dailyReward || !kpiEmployee) {
      showAlert('warning', 'Ogohlantirish', "Barcha maydonlarni to'ldiring");
      return;
    }
    const task: KPITask = { id: Date.now().toString(), name: newTask.name, dailyReward: Number(newTask.dailyReward) };
    const updated = [...kpiTasks, task];
    setKpiTasks(updated);
    localStorage.setItem(`kpi_tasks_${kpiEmployee._id}`, JSON.stringify(updated));
    showAlert('success', 'Muvaffaqiyatli', "KPI qo'shildi");
    setNewTask({ name: '', dailyReward: '' });
    setShowTaskModal(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!kpiEmployee) return;
    const updated = kpiTasks.filter(t => t.id !== taskId);
    setKpiTasks(updated);
    localStorage.setItem(`kpi_tasks_${kpiEmployee._id}`, JSON.stringify(updated));
  };

  const handleToggleTask = (taskId: string) => {
    if (!kpiEmployee) return;
    const recordsKey = `kpi_records_${kpiEmployee._id}_${selectedDate}`;
    const records = [...todayRecords];
    const idx = records.findIndex(r => r.taskId === taskId);
    if (idx >= 0) {
      records[idx].completed = !records[idx].completed;
    } else {
      records.push({ date: selectedDate, taskId, completed: true });
    }
    localStorage.setItem(recordsKey, JSON.stringify(records));
    setTodayRecords(records);
  };

  const getTaskStatus = (taskId: string) => todayRecords.find(r => r.taskId === taskId)?.completed || false;

  const calculateMonthlyBonus = (): number => {
    if (!kpiEmployee) return 0;
    const month = selectedDate.substring(0, 7);
    const [y, m] = month.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let total = 0;
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const saved = localStorage.getItem(`kpi_records_${kpiEmployee._id}_${date}`);
      if (saved) {
        (JSON.parse(saved) as DailyRecord[]).forEach(rec => {
          if (rec.completed) {
            const t = kpiTasks.find(tk => tk.id === rec.taskId);
            if (t) total += t.dailyReward || 0;
          }
        });
      }
    }
    return total;
  };

  const todayBonus = todayRecords.filter(r => r.completed).reduce((sum, r) => {
    const t = kpiTasks.find(tk => tk.id === r.taskId);
    return sum + (t?.dailyReward || 0);
  }, 0);

  // Helpers
  const showAlert = (type: 'success' | 'danger' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone?.includes(searchTerm)
  );

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = { admin: 'bg-purple-100 text-purple-800', cashier: 'bg-blue-100 text-blue-800', helper: 'bg-green-100 text-green-800' };
    const labels: Record<string, string> = { admin: 'Admin', cashier: 'Kassir', helper: 'Yordamchi' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || ''}`}>{labels[role] || role}</span>;
  };

  const getStatusBadge = (status: string) => status === 'active'
    ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Faol</span>
    : <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Nofaol</span>;

  const currentSalarySetting = salarySettings.find(s => !s.effectiveTo || new Date(s.effectiveTo) >= new Date());
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const monthlyBonus = calculateMonthlyBonus();

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader
        title="Xodimlar"
        onMenuToggle={onMenuToggle}
        showSearch
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Ism, login yoki telefon..."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin/hr/tracking')}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              Tracking
            </button>
            <ActionButton icon={Plus} onClick={() => { setEditingEmployee(null); resetForm(); setShowModal(true); }}>
              Yangi Xodim
            </ActionButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Jami xodimlar" value={stats.totalEmployees.toString()} icon={Users} color="blue" />
          <StatCard title="Faol xodimlar" value={stats.activeEmployees.toString()} icon={Users} color="green" />
          <StatCard title="Jami maosh" value={`${(stats.totalPayroll / 1000000).toFixed(1)}M`} icon={DollarSign} color="purple" />
          <StatCard title="O'rtacha maosh" value={`${(stats.avgSalary / 1000000).toFixed(1)}M`} icon={TrendingUp} color="orange" />
        </div>

        {/* Role Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Barcha rollar</option>
            <option value="cashier">Kassir</option>
            <option value="helper">Yordamchi</option>
          </select>
        </div>

        {/* Employees Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Xodimlar topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map((employee) => (
                <div key={employee._id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">{employee.name}</h3>
                        {getRoleBadge(employee.role)}
                      </div>
                    </div>
                    {getStatusBadge(employee.status)}
                  </div>

                  {/* Contact */}
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{employee.phone || "Telefon yo'q"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>@{employee.login}</span>
                    </div>
                  </div>

                  {/* Salary Info */}
                  <div className="mb-4">
                    {employee.salary ? (
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Asosiy maosh</span>
                          <span className="text-sm font-bold text-gray-900">
                            {(employee.salary.baseSalary / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        {employee.salary.bonusEnabled && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Max bonus</span>
                            <span className="text-xs font-semibold text-emerald-600">
                              +{(employee.salary.maxBonus / 1000000).toFixed(1)}M
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <span className="text-sm text-gray-400">Maosh belgilanmagan</span>
                      </div>
                    )}
                  </div>

                  {/* Actions - 4 buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditModal(employee)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                    >
                      <Edit className="w-3.5 h-3.5" /> Tahrir
                    </button>
                    <button
                      onClick={() => openSalaryModal(employee)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Maosh
                    </button>
                    <button
                      onClick={() => openKPIModal(employee)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium"
                    >
                      <Target className="w-3.5 h-3.5" /> KPI
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, employeeId: employee._id, employeeName: employee.name })}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> O'chir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Employee Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setEditingEmployee(null); resetForm(); } }}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingEmployee ? 'Xodimni Tahrirlash' : 'Yangi Xodim'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login *</label>
                <input type="text" required value={formData.login} onChange={(e) => setFormData({ ...formData, login: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={!!editingEmployee} />
              </div>
              {!editingEmployee ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parol *</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yangi Parol (ixtiyoriy)</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Bo'sh qoldiring agar o'zgartirmoqchi bo'lmasangiz" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="cashier">Kassir</option>
                  <option value="helper">Yordamchi</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingEmployee(null); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Bekor qilish</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingEmployee ? 'Saqlash' : "Qo'shish"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Salary Modal ===== */}
      {showSalaryModal && salaryEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowSalaryModal(false); resetSalaryForm(); } }}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{salaryEmployee.name} — Maosh</h2>
            <p className="text-sm text-gray-500 mb-4 capitalize">{salaryEmployee.role}</p>

            {salaryLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
            ) : (
              <>
                {/* Current salary */}
                {currentSalarySetting && (
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 mb-4">
                    <p className="text-sm text-purple-700 mb-1">{currentSalarySetting.salaryType === 'hourly' ? 'Soatlik Stavka' : 'Oylik Maosh'}</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {(currentSalarySetting.salaryType === 'hourly' ? currentSalarySetting.hourlyRate : currentSalarySetting.baseSalary).toLocaleString()} so'm
                    </p>
                    <p className="text-xs text-purple-600 mt-1">{new Date(currentSalarySetting.effectiveFrom).toLocaleDateString('uz-UZ')} dan</p>
                  </div>
                )}

                {/* Salary form */}
                <form onSubmit={handleSalarySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maosh turi *</label>
                    <select value={salaryForm.salaryType} onChange={(e) => setSalaryForm({ ...salaryForm, salaryType: e.target.value as 'hourly' | 'monthly' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="hourly">Soatlik</option>
                      <option value="monthly">Oylik (fixed)</option>
                    </select>
                  </div>
                  {salaryForm.salaryType === 'hourly' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Soatlik stavka (so'm) *</label>
                      <input type="number" required value={salaryForm.hourlyRate} onChange={(e) => setSalaryForm({ ...salaryForm, hourlyRate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="15000" min="0" step="1000" />
                      <p className="text-xs text-gray-500 mt-1">8 soat x 22 kun = {salaryForm.hourlyRate ? (Number(salaryForm.hourlyRate) * 8 * 22).toLocaleString() : '0'} so'm/oy</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Oylik Maosh (so'm) *</label>
                      <input type="number" required value={salaryForm.baseSalary} onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="5000000" min="0" step="100000" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qaysi sanadan boshlab *</label>
                    <input type="date" required value={salaryForm.effectiveFrom} onChange={(e) => setSalaryForm({ ...salaryForm, effectiveFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowSalaryModal(false); resetSalaryForm(); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Bekor qilish</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Saqlash</button>
                  </div>
                </form>

                {/* Salary History */}
                {salarySettings.length > 1 && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Maosh Tarixi</h3>
                    {salarySettings.filter(s => s.effectiveTo && new Date(s.effectiveTo) < new Date()).map(s => (
                      <div key={s._id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 border border-gray-200 mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{s.baseSalary.toLocaleString()} so'm</p>
                          <p className="text-xs text-gray-500">{new Date(s.effectiveFrom).toLocaleDateString('uz-UZ')} - {new Date(s.effectiveTo!).toLocaleDateString('uz-UZ')}</p>
                        </div>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">Tugagan</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== KPI Modal ===== */}
      {showKPIModal && kpiEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowKPIModal(false); }}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{kpiEmployee.name} — KPI</h2>
                <p className="text-sm text-gray-500">Doimiy maosh: {kpiBaseSalary.toLocaleString()} so'm</p>
              </div>
              <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                <Plus className="w-4 h-4" /> KPI Qo'shish
              </button>
            </div>

            {/* Salary summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                <p className="text-xs text-purple-600">Doimiy</p>
                <p className="text-lg font-bold text-purple-900">{kpiBaseSalary.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                <p className="text-xs text-green-600">Oylik Bonus</p>
                <p className="text-lg font-bold text-green-700">+{monthlyBonus.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
                <p className="text-xs text-yellow-600">Jami</p>
                <p className="text-lg font-bold text-yellow-700">{(kpiBaseSalary + monthlyBonus).toLocaleString()}</p>
              </div>
            </div>

            {/* Date selector */}
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              {isToday && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Bugun</span>}
              {todayBonus > 0 && <span className="ml-auto text-sm font-semibold text-green-600">+{todayBonus.toLocaleString()} so'm</span>}
            </div>

            {/* Task list */}
            {kpiTasks.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">KPI topshiriqlar yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {kpiTasks.map(task => {
                  const done = getTaskStatus(task.id);
                  return (
                    <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <button onClick={() => handleToggleTask(task.id)} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'}`}>
                          {done && <CheckCircle className="w-4 h-4 text-white" />}
                        </button>
                        <div>
                          <p className={`font-medium text-sm ${done ? 'text-green-900' : 'text-gray-900'}`}>{task.name}</p>
                          <p className="text-xs text-green-600 font-semibold">{task.dailyReward.toLocaleString()} so'm/kun</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowKPIModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Yopish</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Add KPI Task Modal ===== */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowTaskModal(false); setNewTask({ name: '', dailyReward: '' }); } }}>
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Har Kunlik KPI Qo'shish</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI Nomi *</label>
                <input type="text" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="Masalan: Do'kon tozaligi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kunlik Mukofot (so'm) *</label>
                <input type="number" value={newTask.dailyReward} onChange={(e) => setNewTask({ ...newTask, dailyReward: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="10000" min="0" step="1000" />
                {newTask.dailyReward && <p className="text-xs text-gray-500 mt-1">30 kun: {(Number(newTask.dailyReward) * 30).toLocaleString()} so'm</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowTaskModal(false); setNewTask({ name: '', dailyReward: '' }); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Bekor qilish</button>
              <button onClick={handleAddTask} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Qo'shish</button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} type={alertModal.type} title={alertModal.title} message={alertModal.message} autoClose={alertModal.type === 'success'} autoCloseDelay={2000} />
      <AlertModal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, employeeId: '', employeeName: '' })} onConfirm={() => handleDelete(deleteConfirm.employeeId)} type="warning" title="Xodimni o'chirish" message={`${deleteConfirm.employeeName} nomli xodimni o'chirmoqchimisiz?`} confirmText="O'chirish" cancelText="Bekor qilish" showCancel={true} />
    </div>
  );
}
