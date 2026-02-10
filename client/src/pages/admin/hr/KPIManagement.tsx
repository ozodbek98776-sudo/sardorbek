import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Trash2, DollarSign, CheckCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import { UniversalPageHeader, ActionButton } from '../../../components/common';
import AlertModal from '../../../components/AlertModal';

interface Employee {
  _id: string;
  name: string;
  role: string;
}

interface Task {
  id: string;
  name: string;
  dailyReward: number; // Har kuni uchun mukofot
}

interface DailyRecord {
  date: string;
  taskId: string;
  completed: boolean;
}

export default function KPIManagement() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', dailyReward: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayRecords, setTodayRecords] = useState<DailyRecord[]>([]);

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
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
      fetchEmployeeSalary();
      fetchEmployeeTasks();
      loadTodayRecords();
    }
  }, [selectedEmployee, selectedDate]);

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

  const fetchEmployeeSalary = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/hr/salary/employee/${selectedEmployee}/current`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const salary = response.data.setting?.baseSalary || 0;
      setBaseSalary(salary);
      localStorage.setItem(`base_salary_${selectedEmployee}`, salary.toString());
    } catch (error) {
      console.error('Maoshni yuklashda xatolik:', error);
      setBaseSalary(0);
    }
  };

  const fetchEmployeeTasks = async () => {
    try {
      const savedTasks = localStorage.getItem(`kpi_tasks_${selectedEmployee}`);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Tasklar yuklashda xatolik:', error);
      setTasks([]);
    }
  };

  const loadTodayRecords = () => {
    const recordsKey = `kpi_records_${selectedEmployee}_${selectedDate}`;
    const savedRecords = localStorage.getItem(recordsKey);
    setTodayRecords(savedRecords ? JSON.parse(savedRecords) : []);
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.dailyReward) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Ogohlantirish',
        message: 'Iltimos, barcha maydonlarni to\'ldiring'
      });
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      name: newTask.name,
      dailyReward: Number(newTask.dailyReward)
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    localStorage.setItem(`kpi_tasks_${selectedEmployee}`, JSON.stringify(updatedTasks));

    setAlertModal({
      isOpen: true,
      type: 'success',
      title: 'Muvaffaqiyatli',
      message: 'Har kunlik KPI qo\'shildi'
    });

    setNewTask({ name: '', dailyReward: '' });
    setShowTaskModal(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem(`kpi_tasks_${selectedEmployee}`, JSON.stringify(updatedTasks));

    setAlertModal({
      isOpen: true,
      type: 'success',
      title: 'Muvaffaqiyatli',
      message: 'KPI o\'chirildi'
    });
  };

  const handleToggleTask = (taskId: string) => {
    const recordsKey = `kpi_records_${selectedEmployee}_${selectedDate}`;
    let records = [...todayRecords];
    
    const existingIndex = records.findIndex(r => r.taskId === taskId);
    
    if (existingIndex >= 0) {
      records[existingIndex].completed = !records[existingIndex].completed;
    } else {
      records.push({
        date: selectedDate,
        taskId,
        completed: true
      });
    }

    localStorage.setItem(recordsKey, JSON.stringify(records));
    setTodayRecords(records);
  };

  const getTaskStatus = (taskId: string): boolean => {
    const record = todayRecords.find(r => r.taskId === taskId);
    return record ? record.completed : false;
  };

  const calculateMonthlyBonus = (): number => {
    const currentMonth = selectedDate.substring(0, 7);
    const year = parseInt(currentMonth.split('-')[0]);
    const monthNum = parseInt(currentMonth.split('-')[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    let totalBonus = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentMonth}-${String(day).padStart(2, '0')}`;
      const recordsKey = `kpi_records_${selectedEmployee}_${date}`;
      const savedRecords = localStorage.getItem(recordsKey);
      
      if (savedRecords) {
        const records: DailyRecord[] = JSON.parse(savedRecords);
        records.forEach(record => {
          if (record.completed) {
            const task = tasks.find(t => t.id === record.taskId);
            if (task) {
              // Backward compatibility: dailyReward yoki reward
              const reward = task.dailyReward || (task as any).reward || 0;
              totalBonus += reward;
            }
          }
        });
      }
    }

    return totalBonus;
  };

  const todayBonus = todayRecords
    .filter(r => r.completed)
    .reduce((sum, r) => {
      const task = tasks.find(t => t.id === r.taskId);
      // Backward compatibility: dailyReward yoki reward
      const reward = task?.dailyReward || (task as any)?.reward || 0;
      return sum + reward;
    }, 0);

  const monthlyBonus = calculateMonthlyBonus();
  const totalSalary = baseSalary + monthlyBonus;
  const selectedEmp = employees.find(e => e._id === selectedEmployee);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader 
        title="KPI Boshqaruvi"
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
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            {/* Employee Card with Salary Info */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {selectedEmp?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedEmp?.name}</h3>
                    <p className="text-purple-100 capitalize">{selectedEmp?.role}</p>
                  </div>
                </div>
                <ActionButton
                  icon={Plus}
                  onClick={() => setShowTaskModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  KPI Qo'shish
                </ActionButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Doimiy maosh */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-purple-100 text-sm mb-1">Doimiy Maosh</p>
                  <p className="text-3xl font-bold">{baseSalary.toLocaleString()}</p>
                  <p className="text-purple-100 text-xs mt-1">so'm/oy</p>
                </div>

                {/* Oylik KPI Bonus */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-purple-100 text-sm mb-1">Oylik KPI Bonus</p>
                  <p className="text-3xl font-bold text-green-300">+{monthlyBonus.toLocaleString()}</p>
                  <p className="text-purple-100 text-xs mt-1">bajarilgan kunlar</p>
                </div>

                {/* Jami */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-purple-100 text-sm mb-1">Jami To'lov</p>
                  <p className="text-3xl font-bold text-yellow-300">{totalSalary.toLocaleString()}</p>
                  <p className="text-purple-100 text-xs mt-1">so'm</p>
                </div>
              </div>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {isToday && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Bugun
                  </span>
                )}
                {todayBonus > 0 && (
                  <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">
                      Bugungi bonus: {todayBonus.toLocaleString()} so'm
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Daily KPI Tasks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Har Kunlik KPI</h2>

              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">Hali KPI tasklar yo'q</p>
                  <ActionButton
                    icon={Plus}
                    onClick={() => setShowTaskModal(true)}
                  >
                    Birinchi KPI ni Qo'shish
                  </ActionButton>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => {
                    const isCompleted = getTaskStatus(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          isCompleted
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {isCompleted && (
                              <CheckCircle className="w-5 h-5 text-white" />
                            )}
                          </button>

                          <div className="flex-1">
                            <p className={`font-medium ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                              {task.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-600">
                                {((task.dailyReward || (task as any).reward) || 0).toLocaleString()} so'm / kun
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info */}
            {tasks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Har kunlik KPI tizimi</p>
                    <p className="text-sm text-blue-800">
                      Har kuni ishchi bu tasklar bajarilishini tekshiring. Bajarilgan har bir task uchun 
                      belgilangan summa oylik maoshga qo'shiladi. Oy oxirida jami: <strong>{totalSalary.toLocaleString()} so'm</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Har Kunlik KPI Qo'shish</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KPI Nomi *
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Masalan: Do'kon tozaligi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kunlik Mukofot (so'm) *
                </label>
                <input
                  type="number"
                  value={newTask.dailyReward}
                  onChange={(e) => setNewTask({ ...newTask, dailyReward: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="10000"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Har kuni bajarilsa, bu summa oylik maoshga qo'shiladi
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800">
                  Agar oyda 30 kun bajarilsa: <strong>{(Number(newTask.dailyReward) * 30).toLocaleString()} so'm</strong> qo'shimcha bonus
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setNewTask({ name: '', dailyReward: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddTask}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
}
