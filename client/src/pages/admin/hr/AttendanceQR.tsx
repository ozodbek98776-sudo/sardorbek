import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, UserCheck, UserX, Clock, RefreshCw, Printer } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import { UniversalPageHeader } from '../../../components/common';
import AlertModal from '../../../components/AlertModal';
import { QRCodeCanvas } from 'qrcode.react';

interface Employee {
  _id: string;
  name: string;
  role: string;
  position?: string;
  qrToken?: string;
}

interface AttendanceRecord {
  _id: string;
  employee: { _id: string; name: string; role: string; position?: string };
  checkIn: string;
  checkOut?: string;
  workHours: number;
  status: string;
  isLate: boolean;
  lateMinutes: number;
}

interface TodaySummary {
  total: number;
  present: number;
  checkedOut: number;
  absent: number;
  late: number;
}

type TabType = 'scanner' | 'today' | 'qrcodes';

export default function AttendanceQR() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [notCheckedIn, setNotCheckedIn] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<TodaySummary>({ total: 0, present: 0, checkedOut: 0, absent: 0, late: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'checkin' | 'checkout'>('checkin');
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    fetchTodayAttendance();
    fetchEmployees();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/hr/attendance/today`, { headers });
      setAttendances(res.data.attendances || []);
      setNotCheckedIn(res.data.notCheckedIn || []);
      setSummary(res.data.summary || { total: 0, present: 0, checkedOut: 0, absent: 0, late: 0 });
    } catch (error) {
      console.error('Bugungi davomat xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/hr/employees`, { headers });
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Xodimlar xatolik:', error);
    }
  };

  const handleQRScan = async (qrToken: string) => {
    try {
      const endpoint = scanMode === 'checkin' ? 'qr-checkin' : 'qr-checkout';
      const res = await axios.post(`${API_BASE_URL}/hr/attendance/${endpoint}`, { qrToken }, { headers });

      setAlertModal({
        isOpen: true,
        type: 'success',
        title: scanMode === 'checkin' ? 'Check-in!' : 'Check-out!',
        message: res.data.message
      });

      fetchTodayAttendance();
      setScanResult(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setAlertModal({
        isOpen: true,
        type: 'danger',
        title: 'Xatolik',
        message: err.response?.data?.message || 'Xatolik yuz berdi'
      });
    }
  };

  const handleQRInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanResult) {
      handleQRScan(scanResult);
    }
  };

  const generateQR = async (employeeId: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/hr/attendance/qr-generate/${employeeId}`, {}, { headers });
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'QR yaratildi',
        message: `${res.data.employee.name} uchun QR kod yaratildi`
      });
      fetchEmployees();
    } catch (error) {
      console.error('QR generate xatolik:', error);
    }
  };

  const printQR = (employee: Employee) => {
    if (!employee.qrToken) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${employee.name} - QR</title>
      <style>body{text-align:center;font-family:sans-serif;padding:40px}
      .name{font-size:24px;font-weight:bold;margin:20px 0}
      .role{color:#666;font-size:16px}
      canvas{margin:20px auto;display:block}</style></head>
      <body>
        <div class="name">${employee.name}</div>
        <div class="role">${employee.role} ${employee.position ? '- ' + employee.position : ''}</div>
        <div id="qr"></div>
        <p style="color:#999;font-size:12px;margin-top:20px">Sardorbek Furnitura - HR Tracking</p>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
        <script>QRCode.toCanvas(document.createElement('canvas'),${JSON.stringify(employee.qrToken)},{width:250},function(e,c){document.getElementById('qr').appendChild(c);window.print()})<\/script>
      </body></html>
    `);
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const tabs: { key: TabType; label: string; icon: typeof Clock }[] = [
    { key: 'today', label: 'Bugungi', icon: Clock },
    { key: 'scanner', label: 'Skaner', icon: Camera },
    { key: 'qrcodes', label: 'QR kodlar', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader title="QR Davomat" onBack={() => navigate('/admin/hr')} />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <UserCheck className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            <p className="text-xs text-gray-500">Kelganlar</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <UserX className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            <p className="text-xs text-gray-500">Kelmaganlar</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
            <p className="text-xs text-gray-500">Kechikkanlar</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <UserCheck className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{summary.checkedOut}</p>
            <p className="text-xs text-gray-500">Ketganlar</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Bugungi davomat</h3>
              <button onClick={fetchTodayAttendance} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Checked in */}
            {attendances.map(a => (
              <div key={a._id} className={`bg-white rounded-lg p-4 border ${a.isLate ? 'border-yellow-300' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{a.employee.name}</p>
                    <p className="text-xs text-gray-500">{a.employee.role} {a.employee.position ? `• ${a.employee.position}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{formatTime(a.checkIn)}</p>
                    {a.checkOut ? (
                      <p className="text-xs text-blue-600">{formatTime(a.checkOut)} • {a.workHours.toFixed(1)} soat</p>
                    ) : (
                      <p className="text-xs text-orange-500">Hali ketmagan</p>
                    )}
                    {a.isLate && <p className="text-xs text-yellow-600">{a.lateMinutes} daq kechikdi</p>}
                  </div>
                </div>
              </div>
            ))}

            {/* Not checked in */}
            {notCheckedIn.length > 0 && (
              <>
                <h3 className="font-semibold text-red-600 mt-4">Kelmagan xodimlar</h3>
                {notCheckedIn.map(e => (
                  <div key={e._id} className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="font-medium text-red-900">{e.name}</p>
                    <p className="text-xs text-red-600">{e.role} {e.position ? `• ${e.position}` : ''}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'scanner' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
            {/* Scan mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setScanMode('checkin')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  scanMode === 'checkin' ? 'bg-green-600 text-white' : 'text-gray-600'
                }`}
              >
                Check-in
              </button>
              <button
                onClick={() => setScanMode('checkout')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  scanMode === 'checkout' ? 'bg-blue-600 text-white' : 'text-gray-600'
                }`}
              >
                Check-out
              </button>
            </div>

            {/* QR input */}
            <div className="text-center space-y-4">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                scanMode === 'checkin' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <Camera className={`w-12 h-12 ${scanMode === 'checkin' ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <p className="text-gray-600">
                QR kodni skanerlang yoki token ni kiriting
              </p>
              <input
                ref={qrInputRef}
                type="text"
                value={scanResult || ''}
                onChange={(e) => setScanResult(e.target.value)}
                onKeyDown={handleQRInput}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="QR token..."
                autoFocus
              />
              <button
                onClick={() => scanResult && handleQRScan(scanResult)}
                disabled={!scanResult}
                className={`w-full py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                  scanMode === 'checkin' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {scanMode === 'checkin' ? 'Check-in' : 'Check-out'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'qrcodes' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Xodimlar QR kodlari</h3>
            {employees.filter(e => e.role !== 'admin').map(emp => (
              <div key={emp._id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {emp.qrToken ? (
                      <div className="w-16 h-16 flex-shrink-0">
                        <QRCodeCanvas value={emp.qrToken} size={64} level="M" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.role} {emp.position ? `• ${emp.position}` : ''}</p>
                      {emp.qrToken && <p className="text-xs text-gray-400 font-mono mt-1">{emp.qrToken}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {emp.qrToken ? (
                      <>
                        <button
                          onClick={() => printQR(emp)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => generateQR(emp._id)}
                          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                          title="Qayta yaratish"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => generateQR(emp._id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        QR yaratish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
