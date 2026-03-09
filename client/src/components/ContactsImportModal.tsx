import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Smartphone, UserPlus, Check, Search, Loader2, Trash2, Phone, ChevronDown } from 'lucide-react';
import api from '../utils/api';

interface SavedContact {
  _id: string;
  name: string;
  phone: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
}

interface ContactsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  onSelectContact?: (contact: { name: string; phone: string }) => void;
  selectLabel?: string;
}

const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

function parseVCard(text: string): { name: string; phone: string }[] {
  const contacts: { name: string; phone: string }[] = [];
  const cards = text.split('BEGIN:VCARD');
  for (const card of cards) {
    if (!card.trim()) continue;
    let name = '';
    const fnMatch = card.match(/FN[;:](.+)/i);
    if (fnMatch) {
      name = fnMatch[1].replace(/\\;/g, ' ').replace(/\\/g, '').trim();
    } else {
      const nMatch = card.match(/\nN[;:]([^\n]+)/i);
      if (nMatch) {
        const parts = nMatch[1].split(';').filter(Boolean);
        name = parts.reverse().join(' ').replace(/\\/g, '').trim();
      }
    }
    const telRegex = /TEL[^:\n]*[:]([^\n]+)/gi;
    let telMatch;
    const phones: string[] = [];
    while ((telMatch = telRegex.exec(card)) !== null) {
      let phone = telMatch[1].replace(/[\s\-()]/g, '').trim();
      phone = phone.replace(/^tel:/i, '');
      if (phone.length >= 7) phones.push(phone);
    }
    if (name && phones.length > 0) {
      contacts.push({ name, phone: phones[0] });
    }
  }
  return contacts;
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('998') && !p.startsWith('+998')) p = '+' + p;
  if (!p.startsWith('+998') && p.length === 9) p = '+998' + p;
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

export default function ContactsImportModal({ isOpen, onClose, onImported, onSelectContact, selectLabel }: ContactsImportModalProps) {
  const [tab, setTab] = useState<'contacts' | 'import'>('contacts');
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [importContacts, setImportContacts] = useState<{ name: string; phone: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const loadingRef = useRef(false);

  const [addingCustomer, setAddingCustomer] = useState<string | null>(null);
  const [addingSupplier, setAddingSupplier] = useState<string | null>(null);
  const supplierPhonesRef = useRef<Set<string>>(new Set());

  const fetchContacts = useCallback(async (pageNum: number, append = false, search = '') => {
    if (loadingRef.current && append) return;
    loadingRef.current = true;
    if (pageNum === 1 && !append) setLoadingContacts(true);
    else setLoadingMore(true);
    try {
      const res = await api.get('/contacts', { params: { page: pageNum, limit: 50, search: search || undefined } });
      const { data, total: t, hasMore: hm } = res.data;
      const phones = supplierPhonesRef.current;
      const marked = (data || []).map((c: SavedContact) => ({
        ...c,
        isSupplier: c.isSupplier || (phones.size > 0 && phones.has(c.phone))
      }));
      if (append) {
        setSavedContacts(prev => [...prev, ...marked]);
      } else {
        setSavedContacts(marked);
      }
      setTotal(t || 0);
      setHasMore(hm || false);
      setPage(pageNum);
    } catch {
      if (!append) setSavedContacts([]);
    } finally {
      setLoadingContacts(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        if (onSelectContact) {
          try {
            const { data } = await api.get('/suppliers');
            const phones = new Set<string>((data.suppliers || []).map((s: { phone?: string }) => s.phone).filter(Boolean));
            supplierPhonesRef.current = phones;
          } catch { supplierPhonesRef.current = new Set(); }
        }
        fetchContacts(1, false, '');
      };
      init();
      setTab('contacts');
      setImportContacts([]);
      setSearchQuery('');
      setImportProgress('');
    }
  }, [isOpen, fetchContacts, onSelectContact]);

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchContacts(1, false, val);
    }, 300);
  }, [fetchContacts]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchContacts(page + 1, true, searchQuery);
    }
  }, [loadingMore, hasMore, page, searchQuery, fetchContacts]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        loadMore();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  const pickFromDevice = async () => {
    try {
      const nav = navigator as Navigator & {
        contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
      };
      const results = await nav.contacts.select(['name', 'tel'], { multiple: true });
      const parsed = results
        .filter(c => c.tel && c.tel.length > 0)
        .map(c => ({ name: c.name?.[0] || 'Nomsiz', phone: normalizePhone(c.tel![0]) }));
      if (parsed.length > 0) setImportContacts(parsed);
    } catch { /* cancelled */ }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const parsed = parseVCard(text);
      const items = parsed.map(c => ({ name: c.name, phone: normalizePhone(c.phone) }));
      if (items.length > 0) setImportContacts(items);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const importToDB = async () => {
    if (importContacts.length === 0) return;
    setImporting(true);
    setImportProgress('Saqlanmoqda...');
    try {
      const res = await api.post('/contacts/import', { contacts: importContacts });
      const { imported, total: sent, totalInDB } = res.data.data;
      const skipped = sent - imported;
      setTotal(totalInDB || 0);
      setImportContacts([]);
      await fetchContacts(1, false, '');
      setTab('contacts');
      setImportProgress('');

      if (imported === 0) {
        showToast(`Barcha ${sent} ta kontakt allaqachon saqlangan`, 'warning');
      } else if (skipped > 0) {
        showToast(`${imported} ta yangi saqlandi, ${skipped} ta dublikat o'tkazildi`, 'success');
      } else {
        showToast(`${imported} ta kontakt saqlandi`, 'success');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setImportProgress('');
      showToast(error?.response?.data?.message || 'Server xatosi', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Real-time: mijoz qilgach darhol UI yangilanadi
  const addAsCustomer = async (contact: SavedContact) => {
    setAddingCustomer(contact._id);
    try {
      await api.post('/customers', { name: contact.name, phone: contact.phone });
      // Real-time: darhol isCustomer = true qilish
      setSavedContacts(prev => prev.map(c =>
        c._id === contact._id ? { ...c, isCustomer: true } : c
      ));
      onImported();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string }, status?: number } };
      if (error.response?.status === 400 && error.response?.data?.message?.includes('mavjud')) {
        // Allaqachon mijoz — UI da ham belgilash
        setSavedContacts(prev => prev.map(c =>
          c._id === contact._id ? { ...c, isCustomer: true } : c
        ));
      }
    } finally {
      setAddingCustomer(null);
    }
  };

  // Real-time: ta'minotchi qilgach darhol UI yangilanadi
  const addAsSupplier = async (contact: SavedContact) => {
    setAddingSupplier(contact._id);
    try {
      await api.post('/suppliers', { name: contact.name, phone: contact.phone });
      if (contact.phone) supplierPhonesRef.current.add(contact.phone);
      setSavedContacts(prev => prev.map(c =>
        c._id === contact._id ? { ...c, isSupplier: true } : c
      ));
      onImported();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string }, status?: number } };
      if (error.response?.status === 400 && error.response?.data?.message?.includes('mavjud')) {
        setSavedContacts(prev => prev.map(c =>
          c._id === contact._id ? { ...c, isSupplier: true } : c
        ));
      }
    } finally {
      setAddingSupplier(null);
    }
  };

  // Real-time: o'chirgach darhol UI dan ketadi
  const deleteContact = async (id: string) => {
    setSavedContacts(prev => prev.filter(c => c._id !== id));
    setTotal(prev => prev - 1);
    try {
      await api.delete(`/contacts/${id}`);
    } catch { /* ignore */ }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl no-swipe" style={{ maxHeight: 'calc(100dvh - 2rem)' }}>
        {/* Toast */}
        {toast && (
          <div className={`absolute top-2 left-3 right-3 z-10 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-[slideDown_0.3s_ease] ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> :
             toast.type === 'warning' ? '⚠️' : '❌'}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-0.5 hover:bg-white/20 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Kontaktlar</h2>
            {total > 0 && tab === 'contacts' && (
              <p className="text-xs text-slate-500">{total} ta kontakt</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setTab('contacts')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${
              tab === 'contacts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'
            }`}
          >
            Saqlangan {total > 0 ? `(${total})` : ''}
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${
              tab === 'import' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'
            }`}
          >
            Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* ===== SAQLANGAN KONTAKTLAR ===== */}
          {tab === 'contacts' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="p-3 border-b border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ism yoki telefon..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {loadingContacts ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <p className="text-xs text-slate-400">Yuklanmoqda...</p>
                </div>
              ) : savedContacts.length === 0 ? (
                <div className="flex flex-col items-center py-16 px-4 text-center">
                  <Phone className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 mb-2">
                    {searchQuery ? 'Topilmadi' : 'Kontaktlar yo\'q'}
                  </p>
                  {!searchQuery && (
                    <button onClick={() => setTab('import')} className="text-sm text-blue-600 font-medium active:scale-95">
                      Telefondan import qiling
                    </button>
                  )}
                </div>
              ) : (
                <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
                  {savedContacts.map(contact => (
                    <div key={contact._id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 active:bg-slate-50">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        contact.isSupplier ? 'bg-orange-100' : contact.isCustomer ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-sm font-bold ${contact.isSupplier ? 'text-orange-600' : contact.isCustomer ? 'text-green-600' : 'text-blue-600'}`}>
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                          {contact.isCustomer && (
                            <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex-shrink-0">
                              Mijoz
                            </span>
                          )}
                          {contact.isSupplier && (
                            <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded flex-shrink-0">
                              Ta'minotchi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{contact.phone}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onSelectContact ? (
                          contact.isSupplier ? (
                            <span className="p-1.5">
                              <Check className="w-4 h-4 text-orange-500" />
                            </span>
                          ) : (
                            <button
                              onClick={() => addAsSupplier(contact)}
                              disabled={addingSupplier === contact._id}
                              className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                            >
                              {addingSupplier === contact._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              {selectLabel || "Ta'minotchi"}
                            </button>
                          )
                        ) : (
                          <>
                            {!contact.isCustomer && (
                              <button
                                onClick={() => addAsCustomer(contact)}
                                disabled={addingCustomer === contact._id}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                              >
                                {addingCustomer === contact._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UserPlus className="w-3 h-3" />
                                )}
                                Mijoz
                              </button>
                            )}
                            {contact.isCustomer && (
                              <span className="p-1.5">
                                <Check className="w-4 h-4 text-green-500" />
                              </span>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => deleteContact(contact._id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div className="py-3 flex justify-center">
                      {loadingMore ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      ) : (
                        <button onClick={loadMore} className="flex items-center gap-1 text-sm text-blue-600 font-medium active:scale-95">
                          <ChevronDown className="w-4 h-4" /> Yana yuklash
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== IMPORT ===== */}
          {tab === 'import' && (
            <div className="p-4 space-y-3 overflow-y-auto">
              {importContacts.length === 0 && (
                <>
                  {hasContactPicker && (
                    <button
                      onClick={pickFromDevice}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl border border-blue-200 transition-all active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-blue-900">Telefondan tanlash</p>
                        <p className="text-xs text-blue-600">Kontaktlar ro'yxatidan tanlang</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl border border-purple-200 transition-all active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-md">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-purple-900">vCard fayl yuklash (.vcf)</p>
                      <p className="text-xs text-purple-600">iPhone: Kontaktlar → Eksport → faylni yuklang</p>
                    </div>
                  </button>

                  <input ref={fileInputRef} type="file" accept=".vcf,.vcard" onChange={handleFileUpload} className="hidden" />

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs text-amber-800">
                      <strong>iPhone:</strong> Kontaktlar → Ro'yxatlar → Barcha kontaktlar → ⋯ → Eksport
                    </p>
                  </div>
                </>
              )}

              {importContacts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">{importContacts.length} ta kontakt topildi</p>
                    <button onClick={() => { setImportContacts([]); setImportProgress(''); }} className="text-xs text-slate-500 active:scale-95">
                      Bekor qilish
                    </button>
                  </div>
                  <div className="max-h-[35vh] overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 mb-3 overscroll-contain">
                    {importContacts.slice(0, 30).map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-slate-500">{c.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </div>
                      </div>
                    ))}
                    {importContacts.length > 30 && (
                      <div className="p-2.5 text-center text-xs text-slate-500">
                        ...va yana {importContacts.length - 30} ta
                      </div>
                    )}
                  </div>

                  {importProgress && (
                    <div className={`text-center text-xs font-medium mb-2 ${importProgress.includes('Xatolik') ? 'text-red-600' : 'text-blue-600'}`}>
                      {importProgress}
                    </div>
                  )}

                  <button
                    onClick={importToDB}
                    disabled={importing}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Kontaktlarga saqlash</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
