import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function DebtApprovalNotification() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();
    // Har 30 soniyada yangilab turish
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/debts?status=pending_approval');
      setPendingCount(res.data.length);
    } catch (err) {
      console.error('Error fetching pending debts count:', err);
    }
  };

  const handleClick = () => {
    navigate('/admin/debt-approvals');
  };

  if (pendingCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="relative p-2 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
        title={`${pendingCount} ta qarz tasdiqlashni kutmoqda`}
      >
        <Bell className="w-5 h-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}