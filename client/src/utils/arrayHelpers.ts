/**
 * Array safety helpers for admin panel pages
 * Barcha sahifalar uchun umumiy array safety functions
 */

/**
 * Safely ensure a value is an array
 * @param value - Any value that should be an array
 * @returns Array or empty array if not valid
 */
export function ensureArray<T>(value: any): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  
  // Handle wrapped response formats
  if (value && value.success && value.data) {
    if (Array.isArray(value.data.data)) {
      return value.data.data;
    }
    if (Array.isArray(value.data)) {
      return value.data;
    }
  }
  
  // Handle direct data property
  if (value && Array.isArray(value.data)) {
    return value.data;
  }
  
  console.warn('Expected array but got:', typeof value, value);
  return [];
}

/**
 * Safely handle API response and extract array data
 * @param response - API response object
 * @returns Array data or empty array
 */
export function extractArrayFromResponse<T>(response: any): T[] {
  if (!response || !response.data) {
    return [];
  }
  
  const data = response.data;
  
  // Handle multiple response formats
  if (data.success && data.data) {
    // New format: { success: true, data: { data: [...], pagination: {...} } }
    return ensureArray(data.data.data);
  } else if (data.data && Array.isArray(data.data)) {
    // Format: { data: [...], pagination: {...} }
    return data.data;
  } else if (Array.isArray(data)) {
    // Old format: direct array
    return data;
  }
  
  console.warn('Unexpected API response format:', data);
  return [];
}

/**
 * Safe filter function that ensures array input
 * @param items - Items to filter (any type)
 * @param predicate - Filter function
 * @returns Filtered array
 */
export function safeFilter<T>(items: any, predicate: (item: T) => boolean): T[] {
  const array = ensureArray<T>(items);
  return array.filter(predicate);
}

/**
 * Safe map function that ensures array input
 * @param items - Items to map (any type)
 * @param mapper - Map function
 * @returns Mapped array
 */
export function safeMap<T, R>(items: any, mapper: (item: T, index: number) => R): R[] {
  const array = ensureArray<T>(items);
  return array.map(mapper);
}

/**
 * Safe reduce function that ensures array input
 * @param items - Items to reduce (any type)
 * @param reducer - Reduce function
 * @param initialValue - Initial value
 * @returns Reduced value
 */
export function safeReduce<T, R>(items: any, reducer: (acc: R, item: T) => R, initialValue: R): R {
  const array = ensureArray<T>(items);
  return array.reduce(reducer, initialValue);
}

/**
 * Get array length safely
 * @param items - Items to count
 * @returns Length or 0
 */
export function safeLength(items: any): number {
  const array = ensureArray(items);
  return array.length;
}