import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../utils/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginWithCredentials: (login: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Retry logic bilan user ma'lumotlarini olish
      const fetchUserWithRetry = async (retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await api.get('/auth/me', {
              timeout: 5000, // 5 soniya timeout
            });
            setUser(res.data);
            setLoading(false);
            return; // Muvaffaqiyatli bo'lsa, chiqish
          } catch (error: any) {
            console.warn(`User fetch attempt ${i + 1}/${retries} failed:`, error.message);
            
            // Agar oxirgi urinish bo'lsa yoki 401/403 xatolik bo'lsa, token o'chirish
            if (i === retries - 1 || error.response?.status === 401 || error.response?.status === 403) {
              console.error('Failed to fetch user after retries, clearing token');
              localStorage.removeItem('token');
              setLoading(false);
              return;
            }
            
            // Keyingi urinishdan oldin kutish
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      };
      
      fetchUserWithRetry();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await api.post('/auth/login', { phone, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const loginWithCredentials = async (loginUsername: string, password: string) => {
    const res = await api.post('/auth/login', { login: loginUsername, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithCredentials, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
