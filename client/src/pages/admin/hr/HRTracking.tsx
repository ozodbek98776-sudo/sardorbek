import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { QrCode, UserCheck, UserX, Clock, RefreshCw, Printer, MapPin, Navigation, Save, Loader2, Users } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../../utils/api';
import { FRONTEND_URL } from '../../../config/api';
import { UniversalPageHeader } from '../../../components/common';
import AlertModal from '../../../components/AlertModal';

// Fix leaflet default marker icon
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

interface Employee {
  _id: string;
  name: string;
  role: string;
  position?: string;
}

interface TodaySummary {
  total: number;
  present: number;
  checkedOut: number;
  absent: number;
  late: number;
}

interface StoreLocationData {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  qrToken: string;
  address: string;
  workStartTime: string;
  isActive: boolean;
}

type TabType = 'today' | 'location';

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function HRTracking() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [loading, setLoading] = useState(false);

  // Attendance state
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [notCheckedIn, setNotCheckedIn] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<TodaySummary>({ total: 0, present: 0, checkedOut: 0, absent: 0, late: 0 });

  // Location state
  const [location, setLocation] = useState<StoreLocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: "Sardor Furnitura do'koni",
    latitude: '',
    longitude: '',
    allowedRadius: '100',
    address: '',
    workStartTime: '09:00'
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    fetchTodayAttendance();
    fetchLocation();
  }, []);

  // ---- Attendance APIs ----
  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr/attendance/today');
      setAttendances(res.data.attendances || []);
      setNotCheckedIn(res.data.notCheckedIn || []);
      setSummary(res.data.summary || { total: 0, present: 0, checkedOut: 0, absent: 0, late: 0 });
    } catch (error) {
      console.error('Bugungi davomat xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  // ---- Location APIs ----
  const fetchLocation = async () => {
    try {
      setLocationLoading(true);
      const res = await api.get('/hr/store-location');
      if (res.data.success && res.data.data) {
        const loc = res.data.data;
        setLocation(loc);
        setLocationForm({
          name: loc.name,
          latitude: loc.latitude.toString(),
          longitude: loc.longitude.toString(),
          allowedRadius: loc.allowedRadius.toString(),
          address: loc.address || '',
          workStartTime: loc.workStartTime || '09:00'
        });
      }
    } catch (error) {
      console.error('Lokatsiya olishda xatolik:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!locationForm.latitude || !locationForm.longitude) {
      setAlertModal({ isOpen: true, type: 'warning', title: 'Ogohlantirish', message: 'Xaritadan joy tanlang yoki GPS ishlating' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: locationForm.name,
        latitude: parseFloat(locationForm.latitude),
        longitude: parseFloat(locationForm.longitude),
        allowedRadius: parseInt(locationForm.allowedRadius) || 100,
        address: locationForm.address,
        workStartTime: locationForm.workStartTime
      };
      const res = location
        ? await api.put(`/hr/store-location/${location._id}`, payload)
        : await api.post('/hr/store-location', payload);
      if (res.data.success) setLocation(res.data.data);
      setAlertModal({ isOpen: true, type: 'success', title: 'Muvaffaqiyatli', message: 'Saqlandi!' });
    } catch (error) {
      console.error('Saqlashda xatolik:', error);
      setAlertModal({ isOpen: true, type: 'danger', title: 'Xatolik', message: 'Saqlashda xatolik' });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!location) return;
    if (!confirm('QR tokenni yangilash? Eski QR kod ishlamay qoladi.')) return;
    try {
      const res = await api.post(`/hr/store-location/${location._id}/regenerate-token`);
      if (res.data.success) {
        setLocation(prev => prev ? { ...prev, qrToken: res.data.data.qrToken } : null);
        setAlertModal({ isOpen: true, type: 'success', title: 'Muvaffaqiyatli', message: 'QR token yangilandi' });
      }
    } catch (error) {
      console.error('Token yangilashda xatolik:', error);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setAlertModal({ isOpen: true, type: 'warning', title: 'Xatolik', message: "GPS qo'llab-quvvatlanmaydi" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
        setGpsLoading(false);
      },
      () => {
        setAlertModal({ isOpen: true, type: 'danger', title: 'Xatolik', message: 'GPS olishda xatolik. Ruxsat bering.' });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setLocationForm(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  }, []);

  const handlePrintStoreQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !location) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Do'kon QR Kod</title>
      <style>body{text-align:center;font-family:Arial,sans-serif;padding:40px}
      h1{font-size:24px;margin-bottom:10px}p{font-size:14px;color:#666;margin-bottom:20px}
      .qr-container{display:inline-block;padding:20px;border:3px solid #333;border-radius:12px}
      .instructions{margin-top:20px;font-size:13px;color:#888}</style></head>
      <body><h1>${location.name}</h1><p>${location.address || ''}</p>
      <div class="qr-container"><img src="${document.getElementById('store-qr-canvas')?.querySelector('canvas')?.toDataURL()}" width="250" height="250" /></div>
      <p class="instructions">QR kodni telefoningiz bilan skanerlang va davomat qayd eting</p>
      <script>window.print();</script></body></html>
    `);
    printWindow.document.close();
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const qrUrl = location ? `${FRONTEND_URL}/attendance/check-in?store=${location.qrToken}` : '';

  const mapCenter: [number, number] = locationForm.latitude && locationForm.longitude
    ? [parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)]
    : [41.311081, 69.240562]; // Default: Tashkent

  const tabs: { key: TabType; label: string; icon: typeof Clock }[] = [
    { key: 'today', label: 'Bugungi', icon: Clock },
    { key: 'location', label: 'Lokatsiya & QR', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader
        title="HR Tracking"
        onMenuToggle={onMenuToggle}
        actions={
          <button
            onClick={() => navigate('/admin/hr')}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Users className="w-4 h-4" /> Xodimlar
          </button>
        }
      />

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
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== Tab: Bugungi ===== */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Bugungi davomat</h3>
              <button onClick={fetchTodayAttendance} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

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

        {/* ===== Tab: Lokatsiya & QR ===== */}
        {activeTab === 'location' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {locationLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                {/* Map */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" /> Xaritadan joy tanlang
                  </h2>
                  <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 350 }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={16}
                      style={{ height: '100%', width: '100%' }}
                      key={`${mapCenter[0]}-${mapCenter[1]}`}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapClickHandler onMapClick={handleMapClick} />
                      {locationForm.latitude && locationForm.longitude && (
                        <>
                          <Marker
                            position={[parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)]}
                            icon={markerIcon}
                          />
                          <Circle
                            center={[parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)]}
                            radius={parseInt(locationForm.allowedRadius) || 100}
                            pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.15 }}
                          />
                        </>
                      )}
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Xaritada bosib do'kon joyini belgilang. Ko'k doira — ruxsat etilgan radius.</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Do'kon sozlamalari</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input type="text" value={locationForm.name} onChange={e => setLocationForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                      <input type="text" value={locationForm.address} onChange={e => setLocationForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Masalan: Chilonzor 9-kvartal" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input type="number" step="any" value={locationForm.latitude} onChange={e => setLocationForm(p => ({ ...p, latitude: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50" readOnly />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input type="number" step="any" value={locationForm.longitude} onChange={e => setLocationForm(p => ({ ...p, longitude: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50" readOnly />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ruxsat etilgan radius (metr)</label>
                      <input type="number" value={locationForm.allowedRadius} onChange={e => setLocationForm(p => ({ ...p, allowedRadius: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" min="10" max="5000" />
                      <p className="text-xs text-gray-400 mt-1">Xodim shu radius ichida bo'lishi kerak</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ish boshlanish vaqti</label>
                      <input type="time" value={locationForm.workStartTime} onChange={e => setLocationForm(p => ({ ...p, workStartTime: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button onClick={handleGetCurrentLocation} disabled={gpsLoading} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                      {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      Hozirgi joylashuvni ishlat
                    </button>
                    <button onClick={handleSaveLocation} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Saqlash
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                {location && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-indigo-600" /> Do'kon QR Kodi
                    </h2>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div id="store-qr-canvas" className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                        <QRCodeCanvas value={qrUrl} size={200} level="H" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">QR Token:</p>
                          <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">{location.qrToken}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">QR URL:</p>
                          <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">{qrUrl}</p>
                        </div>
                        <p className="text-sm text-gray-500">Radius: <span className="font-semibold text-gray-700">{location.allowedRadius}m</span></p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button onClick={handlePrintStoreQR} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <Printer className="w-4 h-4" /> Chop etish
                          </button>
                          <button onClick={handleRegenerateToken} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                            <RefreshCw className="w-4 h-4" /> Tokenni yangilash
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                      Bu QR kodni do'kon kirish joyiga osib qo'ying. Xodimlar telefonlari bilan skanerlaydi va GPS tekshiriladi.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} type={alertModal.type} title={alertModal.title} message={alertModal.message} />
    </div>
  );
}
