import { useState } from 'react';
import { useOfflineDetection } from '../utils/offlineDetection';

export default function OfflineIndicator() {
  const { online } = useOfflineDetection();

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 px-4 z-50">
      <div className="flex items-center justify-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">
          Server offline - App functionality is limited
        </span>
      </div>
    </div>
  );
}

// Example usage in a component that makes API calls
export function ExampleApiComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkServer, isOffline } = useOfflineDetection();

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Check server status first
      const serverOnline = await checkServer();
      if (!serverOnline) {
        setError('Server is currently offline. Please try again later.');
        return;
      }

      const response = await fetch('/api/some-endpoint');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      if (err.message?.includes('503') || err.message?.includes('offline')) {
        setError('Server is currently offline. Please try again later.');
      } else {
        setError('An error occurred while fetching data.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchData} disabled={loading || isOffline}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      
      {isOffline && (
        <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-700">
          Server is offline. Button is disabled.
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          {error}
        </div>
      )}
      
      {data && (
        <div className="mt-2 p-3 bg-green-100 border border-green-300 rounded">
          Data loaded successfully!
        </div>
      )}
    </div>
  );
}