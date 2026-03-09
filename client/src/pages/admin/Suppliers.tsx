import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Truck, Plus, Search, ArrowLeft, Package, Phone, Building2,
  CreditCard, Banknote, Smartphone, AlertCircle, X, ChevronRight,
  Calendar, FileText, Trash2, Edit3, Check, MapPin
} from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { UniversalPageHeader, LoadingSpinner } from '../../components/common';

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  company?: string;
  address?: string;
  note?: string;
  totalDebt: number;
  totalPaid: number;
  totalAmount: number;
  transactionCount: number;
  createdAt: string;
}

interface TransactionItem {
  product: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Transaction {
  _id: string;
  items: TransactionItem[];
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  clickAmount: number;
  debtAmount: number;
  paidAmount: number;
  note?: string;
  createdBy?: { name: string };
  createdAt: string;
}

interface ProductOption {
  _id: string;
  name: string;
  code: number;
  quantity: number;
  unit: string;
}

interface KirimItem {
  product: string;
  name: string;
  quantity: number;
  price: number;
}

type View = 'list' | 'detail' | 'kirim' | 'add' | 'edit' | 'pay-debt';

const fmt = (n: number) => n?.toLocaleString('uz-UZ') || '0';

export default function Suppliers() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { showAlert, AlertComponent } = useAlert();

  const [view, setView] = useState<View>('list');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [form, setForm] = useState({ name: '', phone: '', company: '', address: '', note: '' });

  // Kirim states
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [kirimItems, setKirimItems] = useState<KirimItem[]>([]);
  const [payment, setPayment] = useState({ cash: 0, card: 0, click: 0 });

  // Pay debt
  const [debtPayAmount, setDebtPayAmount] = useState(0);
  const [debtPayMethod, setDebtPayMethod] = useState<'cash' | 'card' | 'click'>('cash');

  // Contacts for adding supplier
  const [contacts, setContacts] = useState<Array<{ _id: string; name: string; phone: string }>>([]);
  const [contactSearch, setContactSearch] = useState('');
  const contactPage = useRef(1);
  const [hasMoreContacts, setHasMoreContacts] = useState(true);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers', { params: { search: search || undefined } });
      setSuppliers(data.suppliers);
    } catch { showAlert("Xatolik yuz berdi", 'error'); }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  // Fetch supplier detail
  const openDetail = async (s: Supplier) => {
    setSelected(s);
    setView('detail');
    try {
      const { data } = await api.get(`/suppliers/${s._id}`);
      setSelected(data.supplier);
      setTransactions(data.transactions);
    } catch { showAlert("Xatolik", 'error'); }
  };

  // Fetch products for kirim
  const fetchProducts = useCallback(async (q?: string) => {
    try {
      const { data } = await api.get('/products', { params: { search: q || undefined, limit: 50 } });
      setProducts(data.products || data.data || []);
    } catch {}
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async (reset = false) => {
    const page = reset ? 1 : contactPage.current;
    try {
      const { data } = await api.get('/contacts', { params: { search: contactSearch || undefined, page, limit: 30 } });
      const list = data.contacts || data.data || [];
      if (reset) {
        setContacts(list);
        contactPage.current = 2;
      } else {
        setContacts(prev => [...prev, ...list]);
        contactPage.current = page + 1;
      }
      setHasMoreContacts(list.length >= 30);
    } catch {}
  }, [contactSearch]);

  // Open add supplier
  const openAdd = () => {
    setForm({ name: '', phone: '', company: '', address: '', note: '' });
    setContactSearch('');
    setContacts([]);
    setView('add');
    fetchContacts(true);
  };

  // Open edit
  const openEdit = (s: Supplier) => {
    setForm({ name: s.name, phone: s.phone || '', company: s.company || '', address: s.address || '', note: s.note || '' });
    setSelected(s);
    setView('edit');
  };

  // Save supplier
  const saveSupplier = async () => {
    if (!form.name.trim()) return showAlert('Ism majburiy', 'error');
    try {
      if (view === 'edit' && selected) {
        await api.put(`/suppliers/${selected._id}`, form);
        showAlert("Yangilandi", 'success');
      } else {
        await api.post('/suppliers', form);
        showAlert("Qo'shildi", 'success');
      }
      setView('list');
      fetchSuppliers();
    } catch { showAlert("Xatolik", 'error'); }
  };

  // Delete supplier
  const deleteSupplier = async (id: string) => {
    try {
      await api.delete(`/suppliers/${id}`);
      showAlert("O'chirildi", 'success');
      setView('list');
      fetchSuppliers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Xatolik";
      showAlert(msg, 'error');
    }
  };

  // Open kirim
  const openKirim = (s: Supplier) => {
    setSelected(s);
    setKirimItems([]);
    setPayment({ cash: 0, card: 0, click: 0 });
    setProductSearch('');
    setProducts([]);
    setView('kirim');
    fetchProducts();
  };

  // Add product to kirim
  const addKirimItem = (p: ProductOption) => {
    if (kirimItems.find(i => i.product === p._id)) return;
    setKirimItems(prev => [...prev, { product: p._id, name: p.name, quantity: 1, price: 0 }]);
  };

  // Remove kirim item
  const removeKirimItem = (idx: number) => {
    setKirimItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Update kirim item
  const updateKirimItem = (idx: number, field: 'quantity' | 'price', value: number) => {
    setKirimItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Kirim total
  const kirimTotal = kirimItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const paidTotal = payment.cash + payment.card + payment.click;
  const debtTotal = Math.max(0, kirimTotal - paidTotal);

  // Submit kirim
  const submitKirim = async () => {
    if (kirimItems.length === 0) return showAlert("Mahsulot qo'shing", 'error');
    if (kirimItems.some(i => i.quantity <= 0)) return showAlert("Miqdor 0 dan katta bo'lishi kerak", 'error');
    try {
      await api.post(`/suppliers/${selected!._id}/transactions`, {
        items: kirimItems.map(i => ({ product: i.product, quantity: i.quantity, price: i.price })),
        cashAmount: payment.cash,
        cardAmount: payment.card,
        clickAmount: payment.click,
        debtAmount: debtTotal
      });
      showAlert("Kirim saqlandi", 'success');
      openDetail(selected!);
    } catch { showAlert("Xatolik", 'error'); }
  };

  // Pay debt
  const openPayDebt = (s: Supplier) => {
    setSelected(s);
    setDebtPayAmount(0);
    setDebtPayMethod('cash');
    setView('pay-debt');
  };

  const submitPayDebt = async () => {
    if (debtPayAmount <= 0) return showAlert("Summa kiriting", 'error');
    try {
      await api.post(`/suppliers/${selected!._id}/pay-debt`, {
        amount: debtPayAmount,
        method: debtPayMethod
      });
      showAlert("To'lov saqlandi", 'success');
      openDetail(selected!);
    } catch { showAlert("Xatolik", 'error'); }
  };

  // Select contact as supplier
  const selectContact = (c: { name: string; phone: string }) => {
    setForm(prev => ({ ...prev, name: c.name, phone: c.phone }));
  };

  // Product search effect
  useEffect(() => {
    if (view === 'kirim') {
      const t = setTimeout(() => fetchProducts(productSearch), 300);
      return () => clearTimeout(t);
    }
  }, [productSearch, view]);

  // Contact search effect
  useEffect(() => {
    if (view === 'add') {
      const t = setTimeout(() => fetchContacts(true), 300);
      return () => clearTimeout(t);
    }
  }, [contactSearch, view]);

  // === RENDERS ===

  // Supplier card
  const SupplierCard = ({ s }: { s: Supplier }) => (
    <div
      onClick={() => openDetail(s)}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
          {s.phone && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{s.phone}</p>}
          {s.company && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" />{s.company}</p>}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500">Jami</p>
          <p className="text-sm font-semibold">{fmt(s.totalAmount)}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500">To'langan</p>
          <p className="text-sm font-semibold text-green-600">{fmt(s.totalPaid)}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500">Qarz</p>
          <p className={`text-sm font-semibold ${s.totalDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(s.totalDebt)}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500">Kirimlar</p>
          <p className="text-sm font-semibold">{s.transactionCount}</p>
        </div>
      </div>
    </div>
  );

  // LIST VIEW
  if (view === 'list') return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AlertComponent />
      <UniversalPageHeader
        title="Ta'minotchilar"
        onMenuToggle={onMenuToggle}
        rightContent={
          <button onClick={openAdd} className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        }
      />
      <div className="px-4 pt-2 pb-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        {loading ? <LoadingSpinner /> : suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ta'minotchilar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map(s => <SupplierCard key={s._id} s={s} />)}
          </div>
        )}
      </div>
    </div>
  );

  // ADD / EDIT VIEW
  if (view === 'add' || view === 'edit') return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AlertComponent />
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setView('list')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{view === 'edit' ? "Tahrirlash" : "Yangi ta'minotchi"}</h1>
      </div>
      <div className="px-4 pt-4 space-y-4">
        {/* Kontaktdan tanlash */}
        {view === 'add' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Kontaktdan tanlash</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Kontakt qidirish..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg divide-y">
              {contacts.map(c => (
                <button
                  key={c._id}
                  onClick={() => selectContact(c)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 flex justify-between items-center"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-500">{c.phone}</span>
                </button>
              ))}
              {hasMoreContacts && contacts.length > 0 && (
                <button onClick={() => fetchContacts(false)} className="w-full py-2 text-sm text-orange-600 font-medium">
                  Ko'proq yuklash...
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Ism *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Telefon</label>
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Kompaniya</label>
          <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Manzil</label>
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Izoh</label>
          <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
        </div>
        <button onClick={saveSupplier} className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm">
          {view === 'edit' ? 'Saqlash' : "Qo'shish"}
        </button>
      </div>
    </div>
  );

  // DETAIL VIEW
  if (view === 'detail' && selected) return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AlertComponent />
      <div className="sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => { setView('list'); fetchSuppliers(); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{selected.name}</h1>
          {selected.phone && <p className="text-sm text-orange-100">{selected.phone}</p>}
        </div>
        <button onClick={() => openEdit(selected)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Jami kirim</p>
            <p className="text-lg font-bold">{fmt(selected.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">To'langan</p>
            <p className="text-lg font-bold text-green-600">{fmt(selected.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Qarz</p>
            <p className={`text-lg font-bold ${selected.totalDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(selected.totalDebt)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Kirimlar soni</p>
            <p className="text-lg font-bold">{selected.transactionCount}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={() => openKirim(selected)} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
            <Package className="w-4 h-4" /> Kirim
          </button>
          {selected.totalDebt > 0 && (
            <button onClick={() => openPayDebt(selected)} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Banknote className="w-4 h-4" /> Qarz to'lash
            </button>
          )}
        </div>

        {/* Info */}
        {(selected.company || selected.address || selected.note) && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
            {selected.company && <p className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{selected.company}</p>}
            {selected.address && <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{selected.address}</p>}
            {selected.note && <p className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />{selected.note}</p>}
          </div>
        )}

        {/* Transactions history */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Kirim tarixi</h2>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Hali kirim yo'q</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div key={tx._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString('uz-UZ')} {new Date(tx.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {tx.createdBy && <p className="text-xs text-gray-400">{tx.createdBy.name}</p>}
                    </div>
                    <p className={`font-bold ${tx.totalAmount > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                      {tx.totalAmount > 0 ? fmt(tx.totalAmount) : `+${fmt(tx.paidAmount)}`} so'm
                    </p>
                  </div>
                  {/* Items */}
                  {tx.items.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {tx.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600 truncate flex-1">{item.name}</span>
                          <span className="text-gray-500 ml-2">{item.quantity} x {fmt(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Payment breakdown */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {tx.cashAmount > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Naqd: {fmt(tx.cashAmount)}</span>}
                    {tx.cardAmount > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Karta: {fmt(tx.cardAmount)}</span>}
                    {tx.clickAmount > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Click: {fmt(tx.clickAmount)}</span>}
                    {tx.debtAmount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Qarz: {fmt(tx.debtAmount)}</span>}
                    {tx.debtAmount < 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Qarz to'landi: {fmt(Math.abs(tx.debtAmount))}</span>}
                  </div>
                  {tx.note && <p className="text-xs text-gray-400 mt-2">{tx.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete button */}
        {selected.transactionCount === 0 && (
          <button onClick={() => deleteSupplier(selected._id)} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> O'chirish
          </button>
        )}
      </div>
    </div>
  );

  // KIRIM VIEW
  if (view === 'kirim' && selected) return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <AlertComponent />
      <div className="sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => openDetail(selected)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Kirim</h1>
          <p className="text-sm text-orange-100">{selected.name}</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Product search */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Mahsulot qo'shish</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {products.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl divide-y">
              {products.filter(p => !kirimItems.find(i => i.product === p._id)).slice(0, 20).map(p => (
                <button
                  key={p._id}
                  onClick={() => addKirimItem(p)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-orange-50 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-400 ml-2">#{p.code}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{p.quantity} {p.unit}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kirim items */}
        {kirimItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tanlangan mahsulotlar ({kirimItems.length})</h3>
            <div className="space-y-2">
              {kirimItems.map((item, idx) => (
                <div key={item.product} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium truncate flex-1">{item.name}</span>
                    <button onClick={() => removeKirimItem(idx)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Miqdor</label>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={e => updateKirimItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0.01"
                        step="any"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Narx</label>
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={e => updateKirimItem(idx, 'price', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0"
                      />
                    </div>
                    <div className="w-24 text-right pt-4">
                      <p className="text-sm font-semibold">{fmt(item.quantity * item.price)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment section */}
        {kirimItems.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900">Jami:</h3>
              <p className="text-lg font-bold text-orange-600">{fmt(kirimTotal)} so'm</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <label className="text-sm text-gray-600 w-14">Naqd</label>
                <input
                  type="number"
                  value={payment.cash || ''}
                  onChange={e => setPayment(p => ({ ...p, cash: Number(e.target.value) }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <label className="text-sm text-gray-600 w-14">Karta</label>
                <input
                  type="number"
                  value={payment.card || ''}
                  onChange={e => setPayment(p => ({ ...p, card: Number(e.target.value) }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                </div>
                <label className="text-sm text-gray-600 w-14">Click</label>
                <input
                  type="number"
                  value={payment.click || ''}
                  onChange={e => setPayment(p => ({ ...p, click: Number(e.target.value) }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="0"
                />
              </div>
              {debtTotal > 0 && (
                <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Qarz: {fmt(debtTotal)} so'm</p>
                    <p className="text-xs text-red-500">To'lanmagan qolgan summa qarzga yoziladi</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      {kirimItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <button onClick={submitKirim} className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Kirimni saqlash
          </button>
        </div>
      )}
    </div>
  );

  // PAY DEBT VIEW
  if (view === 'pay-debt' && selected) return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AlertComponent />
      <div className="sticky top-0 z-30 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => openDetail(selected)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Qarz to'lash</h1>
          <p className="text-sm text-green-100">{selected.name} — Qarz: {fmt(selected.totalDebt)} so'm</p>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Summa</label>
          <input
            type="number"
            value={debtPayAmount || ''}
            onChange={e => setDebtPayAmount(Number(e.target.value))}
            placeholder="Summa kiriting"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            max={selected.totalDebt}
            min="1"
          />
          <button
            onClick={() => setDebtPayAmount(selected.totalDebt)}
            className="mt-2 text-sm text-green-600 font-medium"
          >
            To'liq to'lash: {fmt(selected.totalDebt)} so'm
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">To'lov usuli</label>
          <div className="flex gap-2">
            {(['cash', 'card', 'click'] as const).map(m => (
              <button
                key={m}
                onClick={() => setDebtPayMethod(m)}
                className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border-2 transition-colors ${
                  debtPayMethod === m
                    ? m === 'cash' ? 'border-green-500 bg-green-50 text-green-700'
                    : m === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {m === 'cash' ? <Banknote className="w-4 h-4" /> : m === 'card' ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                {m === 'cash' ? 'Naqd' : m === 'card' ? 'Karta' : 'Click'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={submitPayDebt} className="w-full py-3.5 bg-green-500 text-white rounded-xl font-bold text-base">
          To'lovni saqlash
        </button>
      </div>
    </div>
  );

  return null;
}
