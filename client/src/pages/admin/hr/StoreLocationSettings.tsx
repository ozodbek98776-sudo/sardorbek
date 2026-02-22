import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapPin, RefreshCw, Printer, Navigation, Save, Loader2, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';
import { API_BASE_URL, FRONTEND_URL } from '../../../config/api';
import { UniversalPageHeader } from '../../../components/common';

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

export default function StoreLocationSettings() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [location, setLocation] = useState<StoreLocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "Sardor Furnitura do'koni",
    latitude: '',
    longitude: '',
    allowedRadius: '100',
    address: '',
    workStartTime: '09:00'
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchLocation(); }, []);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/hr/store-location`, { headers });
      if (res.data.success && res.data.data) {
        const loc = res.data.data;
        setLocation(loc);
        setForm({
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
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.latitude || !form.longitude) {
      alert('Latitude va longitude majburiy');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        allowedRadius: parseInt(form.allowedRadius) || 100,
        address: form.address,
        workStartTime: form.workStartTime
      };

      if (location) {
        const res = await axios.put(`${API_BASE_URL}/hr/store-location/${location._id}`, payload, { headers });
        if (res.data.success) setLocation(res.data.data);
      } else {
        const res = await axios.post(`${API_BASE_URL}/hr/store-location`, payload, { headers });
        if (res.data.success) setLocation(res.data.data);
      }
      alert('Saqlandi!');
    } catch (error) {
      console.error('Saqlashda xatolik:', error);
      alert('Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!location) return;
    if (!confirm('QR tokenni yangilash? Eski QR kod ishlamay qoladi.')) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/hr/store-location/${location._id}/regenerate-token`, {}, { headers });
      if (res.data.success) {
        setLocation(prev => prev ? { ...prev, qrToken: res.data.data.qrToken } : null);
        alert('QR token yangilandi');
      }
    } catch (error) {
      console.error('Token yangilashda xatolik:', error);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('GPS qo\'llab-quvvatlanmaydi');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
        setGpsLoading(false);
      },
      () => {
        alert('GPS olishda xatolik. Ruxsat bering.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const qrUrl = location ? `${FRONTEND_URL}/attendance/check-in?store=${location.qrToken}` : '';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Do'kon QR Kod</title>
      <style>
        body { text-align: center; font-family: Arial, sans-serif; padding: 40px; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        p { font-size: 14px; color: #666; margin-bottom: 20px; }
        .qr-container { display: inline-block; padding: 20px; border: 3px solid #333; border-radius: 12px; }
        .instructions { margin-top: 20px; font-size: 13px; color: #888; }
      </style>
      </head>
      <body>
        <h1>${location?.name || "Do'kon"}</h1>
        <p>${location?.address || ''}</p>
        <div class="qr-container">
          <img src="${document.getElementById('store-qr-canvas')?.querySelector('canvas')?.toDataURL()}" width="250" height="250" />
        </div>
        <p class="instructions">QR kodni telefoningiz bilan skanerlang va davomat qayd eting</p>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50">
        <UniversalPageHeader title="Do'kon QR Sozlamalari" onMenuToggle={onMenuToggle} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader title="Do'kon QR Sozlamalari" onMenuToggle={onMenuToggle} />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Do'kon Lokatsiyasi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Masalan: Chilonzor 9-kvartal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="41.311081"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="69.240562"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruxsat etilgan radius (metr)</label>
              <input
                type="number"
                value={form.allowedRadius}
                onChange={e => setForm(p => ({ ...p, allowedRadius: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min="10"
                max="5000"
              />
              <p className="text-xs text-gray-400 mt-1">Xodim shu radius ichida bo'lishi kerak</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ish boshlanish vaqti</label>
              <input
                type="time"
                value={form.workStartTime}
                onChange={e => setForm(p => ({ ...p, workStartTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Hozirgi joylashuvni ishlat
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Saqlash
            </button>
          </div>
        </div>

        {/* QR Code */}
        {location && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              Do'kon QR Kodi
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
                <div>
                  <p className="text-sm text-gray-500">Radius: <span className="font-semibold text-gray-700">{location.allowedRadius}m</span></p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Chop etish
                  </button>
                  <button
                    onClick={handleRegenerateToken}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tokenni yangilash
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Bu QR kodni do'kon kirish joyiga osib qo'ying. Xodimlar telefonlari bilan skanerlaydi va GPS tekshiriladi.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
