import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Smartphone, UserPlus, Check, AlertCircle, Search, Loader2, Trash2, Phone } from 'lucide-react';
import api from '../utils/api';

interface SavedContact {
  _id: string;
  name: string;
  phone: string;
}

interface ContactsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Contact Picker API mavjudligini tekshirish
const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

// vCard (.vcf) faylni parse qilish
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

export default function ContactsImportModal({ isOpen, onClose, onImported }: ContactsImportModalProps) {
  const [tab, setTab] = useState<'contacts' | 'import'>('contacts');
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Import state
  const [importContacts, setImportContacts] = useState<{ name: string; phone: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mijoz qilish state
  const [addingCustomer, setAddingCustomer] = useState<string | null>(null);
  const [customerResults, setCustomerResults] = useState<Record<string, { status: 'success' | 'error' | 'exists'; message: string }>>({});

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await api.get('/contacts');
      setSavedContacts(res.data.data || []);
    } catch {
      setSavedContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      setTab('contacts');
      setImportContacts([]);
      setImportResult(null);
      setCustomerResults({});
      setSearchQuery('');
    }
  }, [isOpen, fetchContacts]);

  // Contact Picker API
  const pickFromDevice = async () => {
    try {
      const nav = navigator as Navigator & {
        contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
      };
      const results = await nav.contacts.select(['name', 'tel'], { multiple: true });
      const parsed = results
        .filter(c => c.tel && c.tel.length > 0)
        .map(c => ({ name: c.name?.[0] || 'Nomsiz', phone: normalizePhone(c.tel![0]) }));
      if (parsed.length > 0) {
        setImportContacts(parsed);
      }
    } catch { /* cancelled */ }
  };

  // vCard fayl
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

  // Bazaga import qilish
  const importToDB = async () => {
    if (importContacts.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post('/contacts/import', { contacts: importContacts });
      const data = res.data.data;
      setImportResult({ imported: data.imported, skipped: data.skipped });
      fetchContacts();
      setImportContacts([]);
    } catch {
      setImportResult({ imported: 0, skipped: 0 });
    } finally {
      setImporting(false);
    }
  };

  // Kontaktni mijoz qilish
  const addAsCustomer = async (contact: SavedContact) => {
    setAddingCustomer(contact._id);
    try {
      await api.post('/customers', { name: contact.name, phone: contact.phone });
      setCustomerResults(prev => ({ ...prev, [contact._id]: { status: 'success', message: 'Mijoz qilindi' } }));
      onImported();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string }, status?: number } };
      if (error.response?.status === 400 && error.response?.data?.message?.includes('mavjud')) {
        setCustomerResults(prev => ({ ...prev, [contact._id]: { status: 'exists', message: 'Allaqachon mijoz' } }));
      } else {
        setCustomerResults(prev => ({ ...prev, [contact._id]: { status: 'error', message: 'Xatolik' } }));
      }
    } finally {
      setAddingCustomer(null);
    }
  };

  // Kontaktni o'chirish
  const deleteContact = async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`);
      setSavedContacts(prev => prev.filter(c => c._id !== id));
    } catch { /* ignore */ }
  };

  if (!isOpen) return null;

  const filtered = savedContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Kontaktlar</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('contacts')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'contacts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Saqlangan ({savedContacts.length})
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'import' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Import qilish
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== SAQLANGAN KONTAKTLAR ===== */}
          {tab === 'contacts' && (
            <div className="flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {loadingContacts ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 px-4 text-center">
                  <Phone className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 mb-2">
                    {searchQuery ? 'Topilmadi' : 'Kontaktlar yo\'q'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setTab('import')}
                      className="text-sm text-blue-600 font-medium"
                    >
                      Telefondan import qiling
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
                  {filtered.map(contact => {
                    const result = customerResults[contact._id];
                    return (
                      <div key={contact._id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">{contact.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.phone}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {result ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                              result.status === 'success' ? 'bg-green-100 text-green-700' :
                              result.status === 'exists' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {result.status === 'success' && <Check className="w-3 h-3 inline mr-1" />}
                              {result.message}
                            </span>
                          ) : (
                            <button
                              onClick={() => addAsCustomer(contact)}
                              disabled={addingCustomer === contact._id}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                            >
                              {addingCustomer === contact._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              Mijoz
                            </button>
                          )}
                          <button
                            onClick={() => deleteContact(contact._id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== IMPORT ===== */}
          {tab === 'import' && (
            <div className="p-4 space-y-3">
              {importContacts.length === 0 && !importResult && (
                <>
                  {hasContactPicker && (
                    <button
                      onClick={pickFromDevice}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl border border-blue-200 transition-all"
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
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl border border-purple-200 transition-all"
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

              {/* Import preview */}
              {importContacts.length > 0 && !importResult && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">{importContacts.length} ta kontakt topildi</p>
                    <button onClick={() => setImportContacts([])} className="text-xs text-slate-500 hover:text-slate-700">
                      Bekor qilish
                    </button>
                  </div>
                  <div className="max-h-[40vh] overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 mb-3">
                    {importContacts.slice(0, 50).map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-500">{c.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </div>
                      </div>
                    ))}
                    {importContacts.length > 50 && (
                      <div className="p-2.5 text-center text-xs text-slate-500">
                        ...va yana {importContacts.length - 50} ta
                      </div>
                    )}
                  </div>
                  <button
                    onClick={importToDB}
                    disabled={importing}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Kontaktlarga saqlash</>
                    )}
                  </button>
                </div>
              )}

              {/* Import result */}
              {importResult && (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 mb-1">{importResult.imported} ta saqlandi</p>
                  {importResult.skipped > 0 && (
                    <p className="text-sm text-amber-600">{importResult.skipped} ta allaqachon mavjud edi</p>
                  )}
                  <button
                    onClick={() => { setImportResult(null); setTab('contacts'); }}
                    className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
                  >
                    Kontaktlarni ko'rish
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
