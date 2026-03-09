import { useState, useRef, useCallback } from 'react';
import { X, Upload, Smartphone, UserPlus, Check, AlertCircle, Search, CheckSquare, Square, Loader2 } from 'lucide-react';
import api from '../utils/api';

interface ContactItem {
  name: string;
  phone: string;
  selected: boolean;
  status: 'idle' | 'loading' | 'success' | 'error' | 'exists';
  message?: string;
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

    // Ism — FN yoki N dan olish
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

    // Telefon raqamlar — barcha TEL qatorlarni olish
    const telRegex = /TEL[^:\n]*[:]([^\n]+)/gi;
    let telMatch;
    const phones: string[] = [];
    while ((telMatch = telRegex.exec(card)) !== null) {
      let phone = telMatch[1].replace(/[\s\-()]/g, '').trim();
      // tel: prefix olib tashlash
      phone = phone.replace(/^tel:/i, '');
      if (phone.length >= 7) phones.push(phone);
    }

    if (name && phones.length > 0) {
      // Birinchi telefon raqam bilan qo'shish
      contacts.push({ name, phone: phones[0] });
    }
  }
  return contacts;
}

// Telefon raqamni normalizatsiya qilish
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  // +998 boshlanmasa, 998 qo'shish
  if (p.startsWith('998') && !p.startsWith('+998')) p = '+' + p;
  if (!p.startsWith('+998') && p.length === 9) p = '+998' + p;
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

export default function ContactsImportModal({ isOpen, onClose, onImported }: ContactsImportModalProps) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'pick' | 'list' | 'result'>('pick');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setContacts([]);
    setSearchQuery('');
    setStep('pick');
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Contact Picker API (Android Chrome)
  const pickFromDevice = async () => {
    try {
      const nav = navigator as Navigator & {
        contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
      };
      const results = await nav.contacts.select(['name', 'tel'], { multiple: true });
      const parsed: ContactItem[] = results
        .filter(c => c.tel && c.tel.length > 0)
        .map(c => ({
          name: c.name?.[0] || 'Nomsiz',
          phone: normalizePhone(c.tel![0]),
          selected: true,
          status: 'idle' as const
        }));
      if (parsed.length === 0) return;
      setContacts(parsed);
      setStep('list');
    } catch {
      // User cancelled or error
    }
  };

  // vCard fayl yuklash
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const parsed = parseVCard(text);
      const items: ContactItem[] = parsed.map(c => ({
        name: c.name,
        phone: normalizePhone(c.phone),
        selected: true,
        status: 'idle' as const
      }));
      if (items.length === 0) return;
      setContacts(items);
      setStep('list');
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  }, []);

  const toggleSelect = (idx: number) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  };

  const toggleAll = () => {
    const allSelected = filteredContacts.every(c => c.selected);
    const filteredNames = new Set(filteredContacts.map(c => c.phone));
    setContacts(prev => prev.map(c => filteredNames.has(c.phone) ? { ...c, selected: !allSelected } : c));
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const selectedCount = contacts.filter(c => c.selected).length;

  // Tanlangan kontaktlarni mijoz sifatida qo'shish
  const importSelected = async () => {
    const selected = contacts.filter(c => c.selected && c.status === 'idle');
    if (selected.length === 0) return;
    setImporting(true);

    const updated = [...contacts];
    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].selected || updated[i].status !== 'idle') continue;
      updated[i] = { ...updated[i], status: 'loading' };
      setContacts([...updated]);

      try {
        await api.post('/customers', { name: updated[i].name, phone: updated[i].phone });
        updated[i] = { ...updated[i], status: 'success', message: 'Qo\'shildi' };
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string }, status?: number } };
        if (error.response?.status === 400 && error.response?.data?.message?.includes('mavjud')) {
          updated[i] = { ...updated[i], status: 'exists', message: 'Allaqachon mavjud' };
        } else {
          updated[i] = { ...updated[i], status: 'error', message: error.response?.data?.message || 'Xatolik' };
        }
      }
      setContacts([...updated]);
    }

    setImporting(false);
    setStep('result');
    onImported();
  };

  if (!isOpen) return null;

  const successCount = contacts.filter(c => c.status === 'success').length;
  const existsCount = contacts.filter(c => c.status === 'exists').length;
  const errorCount = contacts.filter(c => c.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {step === 'pick' ? 'Kontaktlardan import' : step === 'list' ? `Kontaktlar (${contacts.length})` : 'Natija'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'pick' && (
            <div className="p-4 space-y-3">
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
                  <p className="text-xs text-purple-600">
                    iPhone: Kontaktlar → Hammasini tanlash → Ulashish → Fayl
                  </p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,.vcard"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>iPhone uchun:</strong> Kontaktlar ilovasini oching → Ro'yxatlar → Barcha kontaktlar →
                  ⋯ tugmasi → Eksport → faylni shu yerga yuklang
                </p>
              </div>
            </div>
          )}

          {step === 'list' && (
            <div className="flex flex-col">
              {/* Search + Select All */}
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Kontakt qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                  {filteredContacts.every(c => c.selected) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {filteredContacts.every(c => c.selected) ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
                </button>
              </div>

              {/* Contact List */}
              <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                {filteredContacts.map((contact, idx) => {
                  const realIdx = contacts.indexOf(contact);
                  return (
                    <button
                      key={realIdx}
                      onClick={() => toggleSelect(realIdx)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        contact.selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {contact.selected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.phone}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="p-4 space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-green-50 rounded-xl text-center">
                  <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-900">{successCount}</p>
                  <p className="text-xs text-green-600">Qo'shildi</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-900">{existsCount}</p>
                  <p className="text-xs text-amber-600">Mavjud</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-center">
                  <X className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-red-900">{errorCount}</p>
                  <p className="text-xs text-red-600">Xatolik</p>
                </div>
              </div>

              {/* Detail list */}
              <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto rounded-xl border border-slate-200">
                {contacts.filter(c => c.selected).map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3">
                    {contact.status === 'success' && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    {contact.status === 'exists' && <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    {contact.status === 'error' && <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.phone}</p>
                    </div>
                    <span className={`text-xs font-medium ${
                      contact.status === 'success' ? 'text-green-600' :
                      contact.status === 'exists' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {contact.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          {step === 'list' && (
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('pick')} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm">
                Orqaga
              </button>
              <button
                onClick={importSelected}
                disabled={selectedCount === 0 || importing}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Import qilmoqda...</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> {selectedCount} ta qo'shish</>
                )}
              </button>
            </div>
          )}
          {step === 'result' && (
            <button onClick={handleClose} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm">
              Yopish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
