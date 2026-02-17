import { useState, useEffect } from 'react';
import { X, Copy, Trash2, ChevronDown } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
}

export default function DebugModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Intercept console methods
    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  const addLog = (level: LogEntry['level'], args: any[]) => {
    const message = args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
      })
      .join(' ');

    const data = args.length > 1 ? args.slice(1) : undefined;

    setLogs(prev => [
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('uz-UZ'),
        level,
        message,
        data
      },
      ...prev.slice(0, 99) // Keep last 100 logs
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyAllLogs = () => {
    const text = logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Loglar clipboard ga ko\'chirildi!');
  };

  const copyLog = (log: LogEntry) => {
    const text = `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
    navigator.clipboard.writeText(text);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getLevelBadgeColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {/* Debug Button - Fixed position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center font-bold text-lg"
        title="Debug Modal"
      >
        🐛
      </button>

      {/* Debug Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-purple-50">
              <h3 className="text-lg font-semibold text-purple-900">🐛 Debug Logs ({logs.length})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAllLogs}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Barcha loglarni copy qilish"
                >
                  <Copy className="w-4 h-4 text-purple-600" />
                </button>
                <button
                  onClick={clearLogs}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Loglarni tozalash"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-purple-600" />
                </button>
              </div>
            </div>

            {/* Logs Container */}
            <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-gray-50">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Hali log yo'q</p>
                </div>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-3 ${getLevelColor(log.level)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelBadgeColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs opacity-75">{log.timestamp}</span>
                        </div>
                        <p className="text-sm break-words font-mono">{log.message}</p>
                        
                        {/* Expandable data */}
                        {log.data && log.data.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="mt-2 flex items-center gap-1 text-xs opacity-75 hover:opacity-100"
                          >
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                expandedId === log.id ? 'rotate-180' : ''
                              }`}
                            />
                            Ma'lumotlar
                          </button>
                        )}
                        
                        {expandedId === log.id && log.data && (
                          <pre className="mt-2 text-xs bg-black/10 p-2 rounded overflow-x-auto max-h-32">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                      
                      <button
                        onClick={() => copyLog(log)}
                        className="p-1 hover:bg-black/10 rounded transition-colors flex-shrink-0"
                        title="Copy log"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
