import { useState, useEffect } from 'react';
import {
  getAllStaffReceipts, saveStaffReceipt, getUnsyncedStaffReceipts,
  markStaffReceiptsAsSynced, deleteSyncedStaffReceipts,
  StaffReceiptDBRecord
} from '../../utils/indexedDbService';

import Header from '../../components/Header';
import { 
  Receipt, Check, X, Clock, User, CheckCircle2, XCircle, Package, FileText, ChevronDown, Filter
} from 'lucide-react';
import api from '../../utils/api';

// Интерфейс теперь не нужен - используем StaffReceiptDBRecord из indexedDbService

// Инлайн форма добавления товара для чека сотрудника
function AddItemInlineForm({ receipt, onAdd }: { receipt: StaffReceiptDBRecord, onAdd: (item: { name: string; quantity: number; price: number }) => void }) {
  const [form, setForm] = useState({ name: '', quantity: 1, price: 0 });
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      {open ? (
        <form
          className="flex flex-col gap-2 sm:flex-row items-stretch mt-2"
          onSubmit={e => { e.preventDefault(); if (!form.name || form.quantity < 1) return; onAdd(form); setForm({ name: '', quantity: 1, price: 0 }); setOpen(false); }}
        >
          <input
            type="text"
            placeholder="Товар"
            className="input flex-1"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="number"
            min={1}
            placeholder="Кол-во"
            className="input w-16"
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: +(e.target.value || 1) }))}
            required
          />
          <input
            type="number"
            min={0}
            placeholder="Цена"
            className="input w-20"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: +(e.target.value || 0) }))}
            required
          />
          <button className="btn-primary whitespace-nowrap" type="submit">Добавить</button>
          <button className="btn-secondary" type="button" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
        </form>
      ) : (
        <button className="btn-outline mt-2 w-full" onClick={() => setOpen(true)}>
          + Товар
        </button>
      )}
    </div>
  );
}

export default function StaffReceipts() {
  const [receipts, setReceipts] = useState<StaffReceiptDBRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const filterOptions = [
    { key: 'all', label: 'Barchasi', icon: FileText },
    { key: 'pending', label: 'Kutilmoqda', icon: Clock },
    { key: 'approved', label: 'Tasdiqlangan', icon: CheckCircle2 },
    { key: 'rejected', label: 'Rad etilgan', icon: XCircle }
  ];

  const getFilterLabel = () => {
    const option = filterOptions.find(o => o.key === filter);
    return option?.label || 'Barchasi';
  };

  const pendingCount = receipts.filter(r => r.status === 'pending').length;

  useEffect(() => { fetchOfflineReceipts(); syncStaffReceipts(); }, []);

  // Сначала загружаем из IndexedDB, потом синхронизируем
  const fetchOfflineReceipts = async () => {
    setLoading(true);
    try {
      const local = await getAllStaffReceipts();
      setReceipts(local);
    } catch (err) { console.error('Error loading from offline:', err); }
    finally { setLoading(false); }
  };

  // Основная синхронизация: получаем серверные данные, мержим, записываем локально
  const syncStaffReceipts = async () => {
    // Примерная логика синхронизации (расширяема):
    try {
      // 1. Получаем актуальные данные с сервера
      const res = await api.get('/receipts/staff');
      const serverReceipts = res.data;

      // 2. Получаем локальные чеки
      const localReceipts = await getAllStaffReceipts();
      const localMap = new Map(localReceipts.map(r => [r.id, r]));
      const toWrite: StaffReceiptDBRecord[] = [];

      // 3. Для каждого серверного чека сравниваем updatedAt
      for (const s of serverReceipts) {
        const local = localMap.get(s._id);
        if (!local) {
          // Нет в локальных — записать
          toWrite.push({
            id: s._id,
            userId: s.createdBy?._id || '',
            items: s.items,
            total: s.total,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt || s.createdAt,
            syncStatus: 'synced'
          });
        } else if (new Date(s.updatedAt || s.createdAt) > new Date(local.updatedAt)) {
          // Сервер новее — обновить
          toWrite.push({ ...local, ...{
            items: s.items,
            total: s.total,
            updatedAt: s.updatedAt || s.createdAt,
            syncStatus: 'synced'
          }});
        }
      }
      // 4. Обновляем локальные stale записи
      for (const rec of toWrite) {
        await saveStaffReceipt(rec);
      }

      // 5. Получаем unsynced локальные и пушим на сервер
      const pending = await getUnsyncedStaffReceipts();
      for(const rec of pending) {
        try {
          await api.post('/receipts/staff/sync', rec); // фиктивный endpoint — заменить под реальный
          await markStaffReceiptsAsSynced([rec.id]);
        } catch { /* Обработка ошибок — оставить pending, будет повторяться */ }
      }
      // 6. Прочесть снова (актуализация local/remote)
      fetchOfflineReceipts();
    } catch (err) {
      // Online fetch fail — fallback only local
      console.error('Staff receipt sync error:', err);
    }
  };


  const handleApprove = async (id: string) => {
    try {
      await api.put(`/receipts/${id}/approve`);
      fetchReceipts();
    } catch (err) { console.error('Error approving receipt:', err); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/receipts/${id}/reject`);
      fetchReceipts();
    } catch (err) { console.error('Error rejecting receipt:', err); }
  };

  const statusConfig = {
    pending: { color: 'warning', label: 'Kutilmoqda', icon: Clock },
    approved: { color: 'success', label: 'Tasdiqlangan', icon: CheckCircle2 },
    rejected: { color: 'danger', label: 'Rad etilgan', icon: XCircle },
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const search = searchQuery.toLowerCase();
    // фильтровать по userId, id и (необязательно) по названиям товаров
    const matchesUserId = typeof r.userId === 'string' && r.userId.toLowerCase().includes(search);
    const matchesId = typeof r.id === 'string' && r.id.toLowerCase().includes(search);
    const matchesItems = Array.isArray(r.items) && r.items.some(item => item.name?.toLowerCase().includes(search));
    return matchesFilter && (matchesUserId || matchesId || matchesItems);
  });

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      <Header 
        title="Xodimlar cheklari"
        showSearch
        onSearch={setSearchQuery}
        actions={
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter !== 'all' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>{getFilterLabel()}</span>
              {pendingCount > 0 && filter === 'all' && (
                <span className="px-1.5 py-0.5 bg-warning-500 text-white text-xs rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden">
                  {filterOptions.map(option => {
                    const Icon = option.icon;
                    const count = option.key === 'pending' ? pendingCount : 
                                  option.key === 'all' ? receipts.length :
                                  receipts.filter(r => r.status === option.key).length;
                    return (
                      <button
                        key={option.key}
                        onClick={() => { setFilter(option.key); setShowFilterDropdown(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                          filter === option.key ? 'bg-brand-50 text-brand-700' : 'text-surface-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          option.key === 'pending' && count > 0 
                            ? 'bg-warning-100 text-warning-700' 
                            : 'bg-surface-100 text-surface-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">

        {/* Receipts List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8" />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Cheklar topilmadi</h3>
              <p className="text-surface-500">Hozircha cheklar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReceipts.sort((a, b) => (a.userId || a.id).localeCompare(b.userId || b.id)).map(receipt => {
                const checkStatus = (receipt.status || 'pending');
                const config = statusConfig[checkStatus] || statusConfig['pending'];
                const StatusIcon = config.icon;
                return (
                  <div key={receipt._id} className="p-4 lg:p-6 hover:bg-surface-50 transition-colors">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-6 h-6 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-surface-900">Chek #{(receipt.id || receipt._id || '').slice(-6)}</h4>
                            <div className="flex items-center gap-3 text-sm text-surface-500 mt-1">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>{receipt.createdBy?.name || receipt.userId || 'Noma\'lum'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(receipt.createdAt).toLocaleString('uz-UZ')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-surface-900">{receipt.total.toLocaleString()} <span className="text-sm font-normal text-surface-500">so'm</span></p>
                            <span className={`badge badge-${config.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-surface-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-surface-700">
                        <Package className="w-4 h-4" />
                        Mahsulotlar ({receipt.items.length} ta)
                      </div>
                      <div className="space-y-2">
                        {receipt.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-surface-900">{item.name}</span>
                              <span className="text-surface-500">× {item.quantity}</span>
                            </div>
                            <span className="font-semibold text-surface-900">{(item.price * item.quantity).toLocaleString()}</span>
                            <button
                              className="ml-2 text-danger-500 hover:text-danger-700"
                              onClick={async () => {
                                // Удаление товара: UI + IndexedDB
                                const upd = {
                                  ...receipt,
                                  items: receipt.items.filter((_, idx) => idx !== i),
                                  updatedAt: new Date().toISOString(),
                                  syncStatus: 'pending',
                                };
                                await saveStaffReceipt(upd);
                                setReceipts(rs => rs.map(r => r.id === upd.id ? upd : r));
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {receipt.items.length > 3 && (
                          <p className="text-sm text-surface-500 text-center py-2">
                            +{receipt.items.length - 3} ta mahsulot
                          </p>
                        )}
</div>
                      </div>
                      {/* Add Item Inline Form */}
                      <AddItemInlineForm receipt={receipt} onAdd={async (item) => {
                        const upd = {
                          ...receipt,
                          items: [...receipt.items, item],
                          updatedAt: new Date().toISOString(),
                          syncStatus: 'pending',
                        };
                        await saveStaffReceipt(upd);
                        setReceipts(rs => rs.map(r => r.id === upd.id ? upd : r));
                      }} />

                      {/* Actions */}
                      {receipt.status === 'pending' && (
                        <div className="flex gap-3">
                          <button onClick={() => handleApprove(receipt._id)} className="btn-success flex-1">
                            <Check className="w-4 h-4" />
                            Tasdiqlash
                          </button>
                          <button onClick={() => handleReject(receipt._id)} className="btn-danger flex-1">
                            <X className="w-4 h-4" />
                            Rad etish
                          </button>
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
