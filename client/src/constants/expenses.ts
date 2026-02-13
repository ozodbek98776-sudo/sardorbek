// Xarajat kategoriyalari
export const EXPENSE_CATEGORIES = {
  komunal: 'Komunal',
  soliqlar: 'Soliqlar',
  ovqatlanish: 'Ovqatlanish',
  dostavka: 'Dostavka',
  tovar_xarid: 'Tovar xaridi',
  shaxsiy: 'Shaxsiy xarajatlar',
  maosh: 'Maosh to\'lovlari'
} as const;

// Kategoriya ranglari
export const EXPENSE_CATEGORY_COLORS = {
  komunal: 'bg-blue-100 text-blue-700',
  soliqlar: 'bg-red-100 text-red-700',
  ovqatlanish: 'bg-green-100 text-green-700',
  dostavka: 'bg-yellow-100 text-yellow-700',
  tovar_xarid: 'bg-purple-100 text-purple-700',
  shaxsiy: 'bg-pink-100 text-pink-700',
  maosh: 'bg-indigo-100 text-indigo-700'
} as const;

// Kategoriya gradient ranglari
export const EXPENSE_CATEGORY_GRADIENTS = {
  komunal: 'from-blue-500 to-blue-600',
  soliqlar: 'from-red-500 to-red-600',
  ovqatlanish: 'from-green-500 to-green-600',
  dostavka: 'from-yellow-500 to-yellow-600',
  tovar_xarid: 'from-purple-500 to-purple-600',
  shaxsiy: 'from-pink-500 to-pink-600',
  maosh: 'from-indigo-500 to-indigo-600'
} as const;

// Xarajat turlari
export const EXPENSE_TYPES = {
  // Soliq turlari
  ndpi: 'NDPI',
  qqs: 'QQS',
  mulk_solig: 'Mulk solig\'i',
  transport_solig: 'Transport solig\'i',
  // Komunal turlari
  elektr: 'Elektr',
  gaz: 'Gaz',
  suv: 'Suv',
  internet: 'Internet',
  telefon: 'Telefon',
  chiqindi: 'Chiqindi',
  // Shaxsiy xarajatlar
  transport: 'Transport',
  uyali_aloqa: 'Uyali aloqa',
  kiyim: 'Kiyim-kechak',
  tibbiyot: 'Tibbiyot',
  ta_lim: 'Ta\'lim',
  // Umumiy
  boshqa: 'Boshqa'
} as const;

// Kategoriya turlari
export const CATEGORY_TYPES = {
  komunal: [
    { value: 'elektr', label: 'Elektr' },
    { value: 'gaz', label: 'Gaz' },
    { value: 'suv', label: 'Suv' },
    { value: 'internet', label: 'Internet' },
    { value: 'telefon', label: 'Telefon' },
    { value: 'chiqindi', label: 'Chiqindi' },
    { value: 'boshqa', label: 'Boshqa' }
  ],
  soliqlar: [
    { value: 'ndpi', label: 'NDPI' },
    { value: 'qqs', label: 'QQS' },
    { value: 'mulk_solig', label: 'Mulk solig\'i' },
    { value: 'transport_solig', label: 'Transport solig\'i' },
    { value: 'boshqa', label: 'Boshqa' }
  ],
  shaxsiy: [
    { value: 'transport', label: 'Transport' },
    { value: 'uyali_aloqa', label: 'Uyali aloqa' },
    { value: 'kiyim', label: 'Kiyim-kechak' },
    { value: 'tibbiyot', label: 'Tibbiyot' },
    { value: 'ta_lim', label: 'Ta\'lim' },
    { value: 'boshqa', label: 'Boshqa' }
  ]
} as const;

// Kategoriya ro'yxati
export const EXPENSE_CATEGORY_LIST = [
  { value: '', label: 'Barcha kategoriyalar' },
  { value: 'komunal', label: 'Komunal' },
  { value: 'soliqlar', label: 'Soliqlar' },
  { value: 'ovqatlanish', label: 'Ovqatlanish' },
  { value: 'dostavka', label: 'Dostavka' },
  { value: 'tovar_xarid', label: 'Tovar xaridi' },
  { value: 'shaxsiy', label: 'Shaxsiy xarajatlar' },
  { value: 'maosh', label: 'Maosh to\'lovlari' }
] as const;
