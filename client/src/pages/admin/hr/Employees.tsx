import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
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

export default function Employees() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    phone: '',
    role: 'cashier'
  });
  
  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'danger' | 'warning' | 'info',
    title: '',
    message: ''
  });
  
  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    employeeId: '',
    employeeName: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (roleFilter !== 'all') params.role = roleFilter;
      
      // Cache busting - har safar yangi ma'lumot olish
      params._t = Date.now();
      
      const response = await axios.get(`${API_BASE_URL}/hr/employees`, { 
        params,
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Faqat active va inactive xodimlarni ko'rsatish (terminated ni yo'q)
      const activeEmployees = (response.data.employees || []).filter(
        (emp: Employee) => emp.status !== 'terminated'
      );
      
      setEmployees(activeEmployees);
    } catch (error) {
      console.error('Xodimlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Bo'sh stringlarni olib tashlash
      const cleanData: any = {
        name: formData.name,
        login: formData.login,
        role: formData.role
      };
      
      if (formData.phone && formData.phone.trim()) {
        cleanData.phone = formData.phone.trim();
      }
      
      if (!editingEmployee && formData.password) {
        cleanData.password = formData.password;
      }
      
      if (editingEmployee) {
        // Tahrirlash
        const response = await axios.put(
          `${API_BASE_URL}/hr/employees/${editingEmployee._id}`,
          cleanData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
        );
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Muvaffaqiyatli!',
          message: response.data.message || 'Xodim ma\'lumotlari yangilandi'
        });
      } else {
        // Yangi qo'shish
        const response = await axios.post(
          `${API_BASE_URL}/hr/employees`,
          cleanData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
        );
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Muvaffaqiyatli!',
          message: response.data.message || 'Yangi xodim qo\'shildi'
        });
      }
      
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error('CRUD xatolik:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Xatolik yuz berdi';
      setAlertModal({
        isOpen: true,
        type: 'danger',
        title: 'Xatolik!',
        message: errorMessage
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/hr/employees/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Muvaffaqiyatli!',
        message: response.data.message || 'Xodim o\'chirildi'
      });
      setDeleteConfirm({ isOpen: false, employeeId: '', employeeName: '' });
      fetchEmployees();
    } catch (error: any) {
      console.error('Delete xatolik:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Xatolik yuz berdi';
      setAlertModal({
        isOpen: true,
        type: 'danger',
        title: 'Xatolik!',
        message: errorMessage
      });
    }
  };
  
  const confirmDelete = (employee: Employee) => {
    setDeleteConfirm({
      isOpen: true,
      employeeId: employee._id,
      employeeName: employee.name
    });
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      login: employee.login,
      password: '',
      phone: employee.phone,
      role: employee.role
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      login: '',
      password: '',
      phone: '',
      role: 'cashier'
    });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone?.includes(searchTerm)
  );

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      cashier: 'bg-blue-100 text-blue-800',
      helper: 'bg-green-100 text-green-800'
    };
    const labels = {
      admin: 'Admin',
      cashier: 'Kassir',
      helper: 'Yordamchi'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Faol
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Nofaol
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader 
        title="Xodimlar"
        onBack={() => navigate('/admin/hr')}
        showSearch
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Ism, login yoki telefon raqam..."
        actions={
          <ActionButton 
            icon={Plus} 
            onClick={() => {
              setEditingEmployee(null);
              resetForm();
              setShowModal(true);
            }}
          >
            Yangi Xodim
          </ActionButton>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          <StatCard
            title="Jami xodimlar"
            value={employees.length.toString()}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Faol xodimlar"
            value={employees.filter(e => e.status === 'active').length.toString()}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Nofaol xodimlar"
            value={employees.filter(e => e.status === 'terminated' || e.status === 'inactive').length.toString()}
            icon={Users}
            color="red"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Role Filter */}
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
              <div 
                key={employee._id} 
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              >
                {/* Header - Avatar va Status */}
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

                {/* Contact Info */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{employee.phone || 'Telefon yo\'q'}</span>
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

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(employee)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => confirmDelete(employee)}
                    className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingEmployee ? 'Xodimni Tahrirlash' : 'Yangi Xodim'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ism *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login *
                </label>
                <input
                  type="text"
                  required
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!!editingEmployee}
                />
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parol *
                  </label>
                  <input
                    type="password"
                    required={!editingEmployee}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cashier">Kassir</option>
                  <option value="helper">Yordamchi</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingEmployee ? 'Saqlash' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        autoClose={alertModal.type === 'success'}
        autoCloseDelay={2000}
      />
      
      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, employeeId: '', employeeName: '' })}
        onConfirm={() => handleDelete(deleteConfirm.employeeId)}
        type="warning"
        title="Xodimni o'chirish"
        message={`${deleteConfirm.employeeName} nomli xodimni o'chirmoqchimisiz?`}
        confirmText="O'chirish"
        cancelText="Bekor qilish"
        showCancel={true}
      />
      </div>
    </div>
  );
}
