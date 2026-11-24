import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  switchRole: (role: 'admin' | 'manager' | 'agent') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('crmx_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('crmx_token');
      if (savedToken) {
        try {
          const me = await api.getMe();
          setUser(me);
          setToken(savedToken);
        } catch (err) {
          localStorage.removeItem('crmx_token');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('crmx_token', res.token);
    localStorage.setItem('crmx_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('crmx_token');
    localStorage.removeItem('crmx_user');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (role: 'admin' | 'manager' | 'agent') => {
    const creds: Record<string, string> = {
      admin: 'admin@crmx.io',
      manager: 'manager@crmx.io',
      agent: 'agent@crmx.io'
    };
    const passwords: Record<string, string> = {
      admin: 'admin123',
      manager: 'manager123',
      agent: 'agent123'
    };
    await login(creds[role], passwords[role]);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
