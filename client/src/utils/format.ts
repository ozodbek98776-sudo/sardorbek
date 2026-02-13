// Format number with dots as thousand separators (e.g., 1.000.000)
export const formatNumber = (num: number | string): string => {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Parse formatted number string back to number (removes dots)
export const parseNumber = (str: string): string => {
  return str.replace(/\./g, '');
};

// Format input value while typing (for controlled inputs)
export const formatInputNumber = (value: string): string => {
  const cleaned = value.replace(/\./g, '');
  if (cleaned === '' || cleaned === '-') return cleaned;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return formatNumber(num);
};

// Format phone number as +998 (XX) XXX-XX-XX
export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  
  let phone = digits;
  if (!phone.startsWith('998') && phone.length > 0) {
    phone = '998' + phone;
  }
  
  phone = phone.slice(0, 12);
  
  if (phone.length === 0) return '';
  if (phone.length <= 3) return '+' + phone;
  if (phone.length <= 5) return '+998 (' + phone.slice(3);
  if (phone.length <= 8) return '+998 (' + phone.slice(3, 5) + ') ' + phone.slice(5);
  if (phone.length <= 10) return '+998 (' + phone.slice(3, 5) + ') ' + phone.slice(5, 8) + '-' + phone.slice(8);
  return '+998 (' + phone.slice(3, 5) + ') ' + phone.slice(5, 8) + '-' + phone.slice(8, 10) + '-' + phone.slice(10);
};

// Get raw phone digits
export const getRawPhone = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

// Display formatted phone from stored value
export const displayPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 12) return phone;
  return '+998 (' + digits.slice(3, 5) + ') ' + digits.slice(5, 8) + '-' + digits.slice(8, 10) + '-' + digits.slice(10);
};

// Format date to Uzbek locale
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Format date and time to Uzbek locale
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
