import { extractArrayFromResponse, safeFilter, safeMap } from '../arrayHelpers';

describe('🔧 ARRAY HELPERS TESTS', () => {
  describe('extractArrayFromResponse', () => {
    it('✅ Direct array response', () => {
      const response = { data: [1, 2, 3] };
      const result = extractArrayFromResponse(response);
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('✅ Nested data.data response', () => {
      const response = { 
        data: { 
          data: [{ id: 1 }, { id: 2 }],
          pagination: { page: 1 }
        } 
      };
      const result = extractArrayFromResponse(response);
      
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('✅ Success wrapper response', () => {
      const response = { 
        data: { 
          success: true,
          data: { 
            data: ['a', 'b', 'c']
          }
        } 
      };
      const result = extractArrayFromResponse(response);
      
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('✅ Empty array', () => {
      const response = { data: [] };
      const result = extractArrayFromResponse(response);
      
      expect(result).toEqual([]);
    });

    it('❌ Invalid response - returns empty array', () => {
      const response = { data: null };
      const result = extractArrayFromResponse(response);
      
      expect(result).toEqual([]);
    });

    it('❌ Non-array data - returns empty array', () => {
      const response = { data: { name: 'test' } };
      const result = extractArrayFromResponse(response);
      
      expect(result).toEqual([]);
    });

    it('❌ Undefined response', () => {
      const result = extractArrayFromResponse(undefined as any);
      
      expect(result).toEqual([]);
    });
  });

  describe('safeFilter', () => {
    const testArray = [
      { id: 1, name: 'Apple', price: 100 },
      { id: 2, name: 'Banana', price: 50 },
      { id: 3, name: 'Cherry', price: 150 }
    ];

    it('✅ Filter by condition', () => {
      const result = safeFilter(testArray, item => item.price > 50);
      
      expect(result).toEqual([
        { id: 1, name: 'Apple', price: 100 },
        { id: 3, name: 'Cherry', price: 150 }
      ]);
    });

    it('✅ Filter returns all', () => {
      const result = safeFilter(testArray, item => item.price > 0);
      
      expect(result).toEqual(testArray);
    });

    it('✅ Filter returns none', () => {
      const result = safeFilter(testArray, item => item.price > 1000);
      
      expect(result).toEqual([]);
    });

    it('❌ Non-array input - returns empty array', () => {
      const result = safeFilter(null as any, item => true);
      
      expect(result).toEqual([]);
    });

    it('❌ Undefined input', () => {
      const result = safeFilter(undefined as any, item => true);
      
      expect(result).toEqual([]);
    });

    it('✅ Empty array', () => {
      const result = safeFilter([], item => true);
      
      expect(result).toEqual([]);
    });

    it('✅ Complex filter', () => {
      const result = safeFilter(
        testArray, 
        item => item.name.includes('a') && item.price < 100
      );
      
      expect(result).toEqual([
        { id: 2, name: 'Banana', price: 50 }
      ]);
    });
  });

  describe('safeMap', () => {
    const testArray = [1, 2, 3, 4, 5];

    it('✅ Map to new values', () => {
      const result = safeMap(testArray, x => x * 2);
      
      expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    it('✅ Map to objects', () => {
      const result = safeMap(testArray, x => ({ value: x }));
      
      expect(result).toEqual([
        { value: 1 },
        { value: 2 },
        { value: 3 },
        { value: 4 },
        { value: 5 }
      ]);
    });

    it('✅ Empty array', () => {
      const result = safeMap([], x => x);
      
      expect(result).toEqual([]);
    });

    it('❌ Non-array input - returns empty array', () => {
      const result = safeMap(null as any, x => x);
      
      expect(result).toEqual([]);
    });

    it('❌ Undefined input', () => {
      const result = safeMap(undefined as any, x => x);
      
      expect(result).toEqual([]);
    });

    it('✅ Complex transformation', () => {
      const products = [
        { name: 'A', price: 100 },
        { name: 'B', price: 200 }
      ];
      
      const result = safeMap(products, p => ({
        ...p,
        discountPrice: p.price * 0.9
      }));
      
      expect(result).toEqual([
        { name: 'A', price: 100, discountPrice: 90 },
        { name: 'B', price: 200, discountPrice: 180 }
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('✅ Large array performance', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const start = performance.now();
      const result = safeFilter(largeArray, x => x % 2 === 0);
      const duration = performance.now() - start;
      
      expect(result.length).toBe(5000);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('✅ Nested arrays', () => {
      const nested = [[1, 2], [3, 4], [5, 6]];
      
      const result = safeMap(nested, arr => arr.reduce((a, b) => a + b, 0));
      
      expect(result).toEqual([3, 7, 11]);
    });

    it('✅ Mixed types', () => {
      const mixed = [1, 'two', 3, 'four', 5];
      
      const result = safeFilter(mixed, x => typeof x === 'number');
      
      expect(result).toEqual([1, 3, 5]);
    });
  });
});
