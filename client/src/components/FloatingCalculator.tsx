import { useState, useRef, useCallback, useEffect } from 'react';
import { Calculator, X, Delete, Plus, Minus, Divide, Percent } from 'lucide-react';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

export default function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Draggable button
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, bx: 0, by: 0 });
  const moved = useRef(false);

  useModalScrollLock(isOpen);

  // Default position
  const defaultPos = useCallback(() => ({
    x: 16,
    y: window.innerHeight - 72 - 16
  }), []);

  useEffect(() => {
    if (!btnPos) setBtnPos(defaultPos());
  }, [btnPos, defaultPos]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const pos = btnPos || defaultPos();
    dragStart.current = { x: t.clientX, y: t.clientY, bx: pos.x, by: pos.y };
    dragging.current = true;
    moved.current = false;
  }, [btnPos, defaultPos]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.x;
    const dy = t.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved.current = true;
    if (!moved.current) return;
    e.preventDefault();
    const nx = Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.bx + dx));
    const ny = Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.by + dy));
    setBtnPos({ x: nx, y: ny });
  }, []);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    if (!moved.current) setIsOpen(true);
  }, []);

  // Calculator logic
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

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+': return prev + current;
      case '-': return prev - current;
      case '×': return prev * current;
      case '÷': return current !== 0 ? prev / current : 0;
      case '%': return prev % current;
      default: return current;
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
    setDisplay(display.length === 1 ? '0' : display.slice(0, -1));
  };

  const handlePercent = () => {
    setDisplay(String(parseFloat(display) / 100));
    setWaitingForNewValue(true);
  };

  const numBtn = "py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 bg-gray-100 hover:bg-gray-200 text-gray-900 active:scale-95 select-none";
  const opBtn = "py-2.5 rounded-xl font-semibold text-sm transition-all text-white flex items-center justify-center select-none";

  return (
    <>
      {/* Floating Draggable Button */}
      {!isOpen && btnPos && (
        <button
          onClick={() => { if (!moved.current) setIsOpen(true); }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="fixed z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-purple-600 hover:bg-purple-700 active:scale-95 transition-[background-color] touch-none"
          style={{ left: btnPos.x, top: btnPos.y }}
        >
          <Calculator className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Calculator Modal */}
      {isOpen && (
        <div
          data-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-[300px] sm:w-[320px] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 select-none"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            <div className="flex items-center gap-2 text-white">
              <Calculator className="w-4 h-4" />
              <span className="font-semibold text-sm">Kalkulyator</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Calculator Body */}
          <div className="bg-white p-3">
            {/* Display */}
            <div
              className="w-full p-4 rounded-xl mb-3 text-right text-3xl font-bold overflow-hidden break-all select-text"
              style={{
                background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
                border: '1.5px solid #ddd6fe',
                color: '#2e1065',
                minHeight: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {display}
            </div>

            {/* Buttons Grid */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={handleClear} className="col-span-2 py-2.5 rounded-xl font-semibold text-sm text-white select-none" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>C</button>
              <button onClick={handleBackspace} className={`${opBtn}`} style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}><Delete className="w-4 h-4" /></button>
              <button onClick={() => handleOperation('÷')} className={opBtn} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><Divide className="w-4 h-4" /></button>

              {['7','8','9'].map(n => <button key={n} onClick={() => handleNumber(n)} className={numBtn}>{n}</button>)}
              <button onClick={() => handleOperation('×')} className={opBtn} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>×</button>

              {['4','5','6'].map(n => <button key={n} onClick={() => handleNumber(n)} className={numBtn}>{n}</button>)}
              <button onClick={() => handleOperation('-')} className={opBtn} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><Minus className="w-4 h-4" /></button>

              {['1','2','3'].map(n => <button key={n} onClick={() => handleNumber(n)} className={numBtn}>{n}</button>)}
              <button onClick={() => handleOperation('+')} className={opBtn} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><Plus className="w-4 h-4" /></button>

              <button onClick={() => handleNumber('0')} className={`col-span-2 ${numBtn}`}>0</button>
              <button onClick={handleDecimal} className={numBtn}>.</button>
              <button onClick={handleEquals} className="py-2.5 rounded-xl font-semibold text-sm text-white select-none" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>=</button>

              <button onClick={handlePercent} className="col-span-4 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 select-none" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <Percent className="w-4 h-4" /> Foiz
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
