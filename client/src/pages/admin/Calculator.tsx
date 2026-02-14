import { useState } from 'react';
import { Delete, Plus, Minus, Divide, Percent, Menu } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && (window as any).toggleSidebar) {
      (window as any).toggleSidebar();
    }
  };

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
      setWaitingForNewValue(false);
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operation) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setOperation(op);
    setWaitingForNewValue(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '×':
        return prev * current;
      case '÷':
        return prev / current;
      case '%':
        return prev % current;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const currentValue = parseFloat(display);
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleBackspace = () => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
    setWaitingForNewValue(true);
  };

  return (
    <div className="min-h-screen w-full p-4 sm:p-8" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header with Sidebar Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: '#2e1065' }}>
              Tez Hisoblash
            </h1>
            <p className="text-lg" style={{ color: '#7c3aed' }}>
              Tezkor va oson hisoblash uchun
            </p>
          </div>
          <button
            onClick={handleToggleSidebar}
            className="p-3 rounded-xl transition-all duration-200 hover:shadow-lg lg:hidden"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
            }}
            title="Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Calculator Card */}
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #faf5ff 100%)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(46, 16, 101, 0.35)',
          }}
        >
          {/* Display */}
          <div
            className="w-full p-6 sm:p-8 rounded-2xl mb-6 text-right text-5xl sm:text-6xl font-bold overflow-hidden break-words"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
              border: '1.5px solid #ddd6fe',
              color: '#2e1065',
              minHeight: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {display}
          </div>

          {/* Buttons Grid */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {/* Row 1 */}
            <button
              onClick={handleClear}
              className="col-span-2 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 text-white hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.3)',
              }}
            >
              C
            </button>
            <button
              onClick={handleBackspace}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(249, 115, 22, 0.3)',
              }}
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleOperation('÷')}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
              }}
            >
              <Divide className="w-5 h-5" />
            </button>

            {/* Row 2 */}
            {['7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumber(num)}
                className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#2e1065',
                  border: '1.5px solid #ddd6fe',
                }}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleOperation('×')}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
              }}
            >
              ×
            </button>

            {/* Row 3 */}
            {['4', '5', '6'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumber(num)}
                className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#2e1065',
                  border: '1.5px solid #ddd6fe',
                }}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleOperation('-')}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
              }}
            >
              <Minus className="w-5 h-5" />
            </button>

            {/* Row 4 */}
            {['1', '2', '3'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumber(num)}
                className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#2e1065',
                  border: '1.5px solid #ddd6fe',
                }}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleOperation('+')}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
              }}
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Row 5 */}
            <button
              onClick={() => handleNumber('0')}
              className="col-span-2 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                color: '#2e1065',
                border: '1.5px solid #ddd6fe',
              }}
            >
              0
            </button>
            <button
              onClick={handleDecimal}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                color: '#2e1065',
                border: '1.5px solid #ddd6fe',
              }}
            >
              .
            </button>
            <button
              onClick={handleEquals}
              className="py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 text-white hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 4px 12px -2px rgba(6, 182, 212, 0.4)',
              }}
            >
              =
            </button>

            {/* Row 6 - Percent */}
            <button
              onClick={handlePercent}
              className="col-span-4 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(34, 197, 94, 0.3)',
              }}
            >
              <Percent className="w-5 h-5" />
              Foiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
