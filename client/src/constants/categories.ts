// Mahsulot kategoriyalari
export const PRODUCT_CATEGORIES = [
  'Mebel furnitura',
  'Yumshoq mebel',
  'Linoleum uy',
  'Linoleum avto',
  'Paralon',
  'Fant (avtomobil)',
  'Avto mato',
  'Klyonka',
  'Boshqa'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
