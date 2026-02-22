import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin, CheckCircle, XCircle, Clock, Loader2, Navigation, LogOut, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';

type Step = 'loading' | 'gps_request' | 'gps_loading' | 'checking' | 'success' | 'error' | 'gps_denied';

interface AttendanceStatus {
  canCheckIn: boolean;
  canCheckOut: boolean;
  attendance: {
    checkIn: string;
    checkOut?: string;
    workHours?: number;
    isLate?: boolean;
    lateMinutes?: number;
  } | null;
  hasStoreLocation: boolean;
}

interface ResultData {
  message: string;
  distance?: number;
  isLate?: boolean;
  lateMinutes?: number;
  workHours?: number;
}

export default function LocationCheckIn() {
  const [searchParams] = useSearchParams();
  const storeToken = searchParams.get('store');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [action, setAction] = useState<'check-in' | 'check-out'>('check-in');

  // Fetch today's status
  useEffect(() => {
    if (!storeToken) {
      setStep('error');
      setErrorMsg('QR kod yaroqsiz — store token topilmadi');
      return;
    }
    fetchStatus();
  }, [storeToken]);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/hr/location-attendance/status');
      const data: AttendanceStatus = res.data.data;
      setStatus(data);

      if (!data.hasStoreLocation) {
        setStep('error');
        setErrorMsg("Do'kon lokatsiyasi sozlanmagan. Admin bilan bog'laning.");
        return;
      }

      if (data.canCheckIn) {
        setAction('check-in');
      } else if (data.canCheckOut) {
        setAction('check-out');
      } else {
        // Already fully checked in and out
        setStep('success');
        setResult({
          message: 'Bugungi davomat to\'liq qayd etilgan',
          workHours: data.attendance?.workHours
        });
        return;
      }

      setStep('gps_request');
    } catch (err: unknown) {
      setStep('error');
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error.response?.data?.message || 'Status olishda xatolik');
    }
  };

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setStep('gps_denied');
      setErrorMsg('Brauzeringiz GPS ni qo\'llab-quvvatlamaydi');
      return;
    }

    setStep('gps_loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        performAttendance(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      },
      (err) => {
        setStep('gps_denied');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErrorMsg('GPS ruxsat berilmadi. Brauzer sozlamalaridan joylashuvga ruxsat bering.');
            break;
          case err.POSITION_UNAVAILABLE:
            setErrorMsg('GPS signal topilmadi. Ochiq joyga chiqing va qayta urinib ko\'ring.');
            break;
          case err.TIMEOUT:
            setErrorMsg('GPS vaqti tugadi. Qayta urinib ko\'ring.');
            break;
          default:
            setErrorMsg('GPS olishda noma\'lum xatolik');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [action, storeToken]);

  const performAttendance = async (latitude: number, longitude: number, accuracy: number) => {
    setStep('checking');
    try {
      const endpoint = action === 'check-in'
        ? '/hr/location-attendance/check-in'
        : '/hr/location-attendance/check-out';

      const res = await api.post(endpoint, {
        storeToken,
        latitude,
        longitude,
        accuracy
      });

      setStep('success');
      setResult({
        message: res.data.message,
        distance: res.data.data?.distance,
        isLate: res.data.data?.isLate,
        lateMinutes: res.data.data?.lateMinutes,
        workHours: res.data.data?.workHours
      });
    } catch (err: unknown) {
      setStep('error');
      const error = err as { response?: { data?: { message?: string; distance?: number; allowedRadius?: number } } };
      const data = error.response?.data;
      if (data?.distance && data?.allowedRadius) {
        setErrorMsg(`${data.message}`);
      } else {
        setErrorMsg(data?.message || 'Xatolik yuz berdi');
      }
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <MapPin className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">GPS Davomat</h1>
          {user && <p className="text-sm text-gray-500 mt-1">{user.name}</p>}
        </div>

        {/* Status info */}
        {status?.attendance?.checkIn && step === 'gps_request' && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Check-in: {formatTime(status.attendance.checkIn)}</span>
              {status.attendance.isLate && (
                <span className="text-yellow-600 text-xs">({status.attendance.lateMinutes} daq. kechikish)</span>
              )}
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Loading */}
          {step === 'loading' && (
            <div className="p-8 text-center">
              <Loader2 className="w-10 h-10 mx-auto text-indigo-500 animate-spin mb-3" />
              <p className="text-gray-500">Tekshirilmoqda...</p>
            </div>
          )}

          {/* GPS Request */}
          {step === 'gps_request' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center">
                <Navigation className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {action === 'check-in' ? 'Check-in' : 'Check-out'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Joylashuvingizni aniqlash uchun GPS ruxsat bering
              </p>
              <button
                onClick={requestGPS}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all active:scale-[0.98]"
              >
                {action === 'check-in' ? (
                  <span className="flex items-center justify-center gap-2">
                    <MapPin className="w-5 h-5" /> Check-in
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogOut className="w-5 h-5" /> Check-out
                  </span>
                )}
              </button>
            </div>
          )}

          {/* GPS Loading */}
          {step === 'gps_loading' && (
            <div className="p-8 text-center">
              <Loader2 className="w-10 h-10 mx-auto text-indigo-500 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">GPS aniqlanmoqda...</p>
              <p className="text-sm text-gray-400 mt-1">Bu biroz vaqt olishi mumkin</p>
            </div>
          )}

          {/* Checking */}
          {step === 'checking' && (
            <div className="p-8 text-center">
              <Loader2 className="w-10 h-10 mx-auto text-indigo-500 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">
                {action === 'check-in' ? 'Check-in amalga oshirilmoqda...' : 'Check-out amalga oshirilmoqda...'}
              </p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && result && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-green-700 mb-2">Muvaffaqiyatli!</h2>
              <p className="text-gray-600 mb-4">{result.message}</p>

              {result.distance != null && (
                <div className="text-sm text-gray-500 mb-2">
                  Do'konga masofa: {result.distance}m
                </div>
              )}

              {result.isLate && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {result.lateMinutes} daqiqa kechikish
                </div>
              )}

              {result.workHours != null && (
                <div className="text-sm text-gray-600 mt-2">
                  Ish soati: <span className="font-semibold">{result.workHours.toFixed(1)} soat</span>
                </div>
              )}

              <button
                onClick={() => navigate('/')}
                className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Bosh sahifaga qaytish
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-red-700 mb-2">Xatolik</h2>
              <p className="text-gray-600 mb-6">{errorMsg}</p>
              <button
                onClick={() => {
                  setStep('loading');
                  setErrorMsg('');
                  fetchStatus();
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          )}

          {/* GPS Denied */}
          {step === 'gps_denied' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-yellow-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
              </div>
              <h2 className="text-lg font-semibold text-yellow-700 mb-2">GPS muammo</h2>
              <p className="text-gray-600 mb-4">{errorMsg}</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-6 text-left text-sm text-gray-500">
                <p className="font-medium text-gray-700 mb-1">GPS ni yoqish:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Brauzer sozlamalarini oching</li>
                  <li>Sayt ruxsatlari bo'limiga o'ting</li>
                  <li>Joylashuv (Location) ga ruxsat bering</li>
                  <li>Sahifani yangilang</li>
                </ol>
              </div>
              <button
                onClick={requestGPS}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
