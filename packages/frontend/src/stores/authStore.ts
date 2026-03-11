import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tier: string;
  avatar_url: string | null;
  monthlyUsage?: number;
  tierLimits?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  updateUser: (partial) =>
    set((s) => {
      const user = s.user ? { ...s.user, ...partial } : null;
      if (user) localStorage.setItem('user', JSON.stringify(user));
      return { user };
    }),
}));
