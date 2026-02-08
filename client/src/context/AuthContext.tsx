import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../utils/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (loginOrPhone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 [AuthContext] initializeAuth started');
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      console.log('🔍 [AuthContext] token:', token ? 'MAVJUD (' + token.substring(0, 20) + '...)' : 'YO\'Q');
      console.log('🔍 [AuthContext] savedUser:', savedUser ? 'MAVJUD' : 'YO\'Q');
      
      if (token) {
        try {
          console.log('🔄 Token topildi, user ma\'lumotlarini yuklash...');
          
          // First try to use cached user data for immediate UI update
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              console.log('📦 Cached user ma\'lumotlari darhol yuklandi:', parsedUser);
              setUser(parsedUser);
              setLoading(false); // Darhol loading ni to'xtatish
            } catch (parseError) {
              console.error('❌ Cached user parse error:', parseError);
            }
          }
          
          // Then validate token with server in background
          console.log('🔍 [AuthContext] /auth/me so\'rovi yuborilmoqda...');
          const res = await api.get('/auth/me');
          console.log('✅ Server dan user ma\'lumotlari tasdiqlandi:', res.data);
          
          // Extract user data from response
          const serverUser = res.data.success ? res.data.data : res.data;
          console.log('📦 Extracted serverUser:', serverUser);
          console.log('📦 serverUser.role:', serverUser.role);
          
          // Update user data if different from cached
          if (!savedUser || JSON.stringify(serverUser) !== savedUser) {
            console.log('🔄 Updating user in state and localStorage');
            localStorage.setItem('user', JSON.stringify(serverUser));
            setUser(serverUser);
          } else {
            console.log('✅ Server user matches cached user, no update needed');
          }
          
        } catch (error: any) {
          console.error('❌ User ma\'lumotlarini yuklashda xatolik:', error);
          console.error('❌ Error response:', error.response?.status, error.response?.data);
          
          // Faqat 401 (Unauthorized) bo'lsa token va user ni o'chirish
          if (error.response?.status === 401) {
            console.warn('🔑 Token yaroqsiz, o\'chirilmoqda...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            // Boshqa xatoliklar uchun (network, server down) cached user ni saqlab qolish
            console.warn('⚠️ Vaqtinchalik xatolik, cached user saqlanib qoldi');
            if (savedUser && !user) {
              // Agar user hali o'rnatilmagan bo'lsa (cached user yuklash muvaffaqiyatsiz bo'lgan)
              try {
                const parsedUser = JSON.parse(savedUser);
                console.log('📦 Cached user ma\'lumotlari ishlatilmoqda (xato tufayli):', parsedUser);
                setUser(parsedUser);
              } catch (parseError) {
                console.error('❌ Cached user parse error:', parseError);
                // If cached user is corrupted, clear everything
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
              }
            }
            // Agar user allaqachon o'rnatilgan bo'lsa (cached user yuklash muvaffaqiyatli bo'lgan), hech narsa qilmaslik
          }
        }
      } else {
        console.log('🔍 Token topilmadi');
        // Clear any stale user data
        localStorage.removeItem('user');
        setUser(null);
      }
      
      console.log('🔍 [AuthContext] setLoading(false) chaqirilmoqda...');
      setLoading(false);
      console.log('🔍 [AuthContext] initializeAuth yakunlandi');
    };

    initializeAuth();
  }, []);

  const login = async (loginOrPhone: string, password: string) => {
    try {
      console.log('🔐 Login so\'rovi yuborilmoqda...');
      const res = await api.post('/auth/login', { login: loginOrPhone, password });
      
      const { token, user: userData } = res.data;
      
      // Token va user ma'lumotlarini saqlash
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData)); // User ma'lumotlarini ham saqlash
      
      console.log('✅ Login muvaffaqiyatli:', userData);
      setUser(userData);
    } catch (error) {
      console.error('❌ Login xatosi:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Logout...');
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // User ma'lumotlarini ham o'chirish
    setUser(null);
  };

  const updateUser = (userData: User) => {
    console.log('🔄 User ma\'lumotlari yangilanmoqda:', userData);
    setUser(userData);
    // localStorage ni ham yangilash
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
