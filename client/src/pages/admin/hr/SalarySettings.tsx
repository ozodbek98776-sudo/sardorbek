import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Plus, Edit } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import { UniversalPageHeader, StatCard, ActionButton } from '../../../components/common';
import AlertModal from '../../../components/AlertModal';

interface Employee {
  _id: string;
  name: string;
  role: string;
}

interface SalarySetting {
  _id: string;
  employee: Employee;
  baseSalary: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export default function SalarySettings() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [settings, setSettings] = useState<SalarySetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    baseSalary: '',
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchSettings();
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hr/employees`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Xodimlarni yuklashda xatolik:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/hr/salary/employee/${selectedEmployee}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSettings(response.data.settings || []);
    } catch (error) {
      console.error('Maosh sozlamalarini yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        employee: selectedEmployee,
        baseSalary: Number(formData.baseSalary),
        effectiveFrom: formData.effectiveFrom,
        bonusEnabled: false,
        maxBonus: 0,
        minBonus: 0
      };

      await axios.post(`${API_BASE_URL}/hr/salary`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Muvaffaqiyatli',
        message: 'Maosh sozlamasi saqlandi!'
      });

      setTimeout(() => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        setShowModal(false);
        resetForm();
        fetchSettings();
      }, 2000);
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        type: 'danger',
        title: 'Xatolik',
        message: error.response?.data?.message || 'Xatolik yuz berdi'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      baseSalary: '',
      effectiveFrom: new Date().toISOString().split('T')[0]
    });
  };

  const currentSetting = settings.find(s => !s.effectiveTo || new Date(s.effectiveTo) >= new Date());

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader 
        title="Maosh Sozlamalari"
        onBack={() => navigate('/admin/hr')}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Employee Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Xodimni tanlang
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Xodimni tanlang...</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.role})
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <>
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Yuklanmoqda...</p>
              </div>
            ) : currentSetting ? (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold">
                          {currentSetting.employee?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{currentSetting.employee?.name || 'Noma\'lum'}</h3>
                        <p className="text-purple-100 capitalize">{currentSetting.employee?.role || 'Rol ko\'rsatilmagan'}</p>
                      </div>
                    </div>
                    <ActionButton
                      icon={Edit}
                      onClick={() => setShowModal(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      Tahrirlash
                    </ActionButton>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Maosh */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-medium text-blue-900">Oylik Maosh</p>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">
                        {currentSetting.baseSalary.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">so'm</p>
                    </div>

                    {/* To'lov sanasi */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium text-green-900">To'lov Sanasi</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        Har oyning 1-kuni
                      </p>
                      <p className="text-xs text-green-700 mt-1">Muntazam to'lov</p>
                    </div>

                    {/* Status */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-purple-900">Status</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">Faol</p>
                      <p className="text-xs text-purple-700 mt-1">
                        {new Date(currentSetting.effectiveFrom).toLocaleDateString('uz-UZ')} dan
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">Eslatma</p>
                        <p className="text-sm text-blue-800">
                          Bonus va KPI sozlamalari "KPI Boshqaruvi" bo'limida amalga oshiriladi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">Bu xodim uchun maosh sozlamasi yo'q</p>
                <ActionButton
                  icon={Plus}
                  onClick={() => setShowModal(true)}
                >
                  Maosh Belgilash
                </ActionButton>
              </div>
            )}

            {/* History */}
            {settings.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Maosh Tarixi</h2>
                <div className="space-y-3">
                  {settings.filter(s => s.effectiveTo && new Date(s.effectiveTo) < new Date()).map(setting => (
                    <div key={setting._id} className="flex justify-between items-center bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {setting.baseSalary.toLocaleString()} so'm
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(setting.effectiveFrom).toLocaleDateString('uz-UZ')} - {new Date(setting.effectiveTo!).toLocaleDateString('uz-UZ')}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                        Tugagan
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Maosh Belgilash</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Base Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oylik Maosh (so'm) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5000000"
                  min="0"
                  step="100000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Masalan: 5000000 (5 million so'm)
                </p>
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qaysi sanadan boshlab *
                </label>
                <input
                  type="date"
                  required
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bu sanadan boshlab yangi maosh qo'llaniladi
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Eslatma:</strong> Bonus va KPI sozlamalari "KPI Boshqaruvi" bo'limida amalga oshiriladi.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
}
