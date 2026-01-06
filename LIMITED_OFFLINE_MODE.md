# Limited Offline Mode - Service Worker Implementation

## Overview
The Service Worker has been modified to **limit offline functionality** and prevent the app from appearing to work when the server is down.

## Key Changes

### 1. **No HTML Page Caching**
- HTML pages are **never cached**
- When server is offline, users see a clear "Server Offline" error page
- App cannot appear to be "working" when server is down

### 2. **API Request Blocking**
- All `/api/*` requests **never use cache**
- Failed API calls return 503 errors with clear offline messages
- No stale data served from cache

### 3. **Limited Static Asset Caching**
- Only essential assets cached: icons, manifest.json
- No JavaScript, CSS, or HTML files cached
- Reduces false "working" appearance

### 4. **Server Health Checks**
- Service Worker checks `/api/health` endpoint before serving pages
- 3-second timeout for health checks
- Immediate offline detection

## How It Works

### When Server is Online ✅
- Normal app functionality
- All requests go to server
- Fresh data always served

### When Server is Offline ❌
- **HTML requests**: Show "Server Offline" error page
- **API requests**: Return 503 JSON error responses  
- **Static assets**: Serve from cache (icons only)
- **Other requests**: Return 503 errors

## Files Modified

1. **`/client/public/sw.js`** - New limited offline Service Worker
2. **`/server/src/index.js`** - Added `/api/health` endpoint
3. **`/client/src/utils/offlineDetection.ts`** - Client-side offline detection utility

## Usage

### Basic Integration
```javascript
import { offlineDetection } from './utils/offlineDetection';

// Check server status
const isOnline = await offlineDetection.checkServerStatus();

// Listen for status changes
const unsubscribe = offlineDetection.onStatusChange((status) => {
  console.log('Server status:', status.online ? 'Online' : 'Offline');
});
```

### React Hook
```javascript
import { useOfflineDetection } from './utils/offlineDetection';

function MyComponent() {
  const { online, isOffline, checkServer } = useOfflineDetection();
  
  return (
    <div>
      Status: {online ? 'Online' : 'Offline'}
      <button onClick={checkServer}>Check Server</button>
    </div>
  );
}
```

## Production Safety

✅ **Safe for production use**
- No aggressive caching that could serve stale data
- Clear error messages when server is down
- Graceful degradation for static assets
- No data loss (existing offline sales sync still works)

## Testing

1. **Start the app normally** - should work as before
2. **Stop the server** - should show "Server Offline" page immediately
3. **Try API calls when offline** - should get 503 errors
4. **Restart server** - should automatically detect and work again

## Benefits

- ✅ Users can't be confused by a "working" offline app
- ✅ Clear indication when server is down
- ✅ API calls never serve stale cached data
- ✅ Essential assets (icons) still work offline
- ✅ Existing offline POS functionality preserved
- ✅ Production-safe implementation