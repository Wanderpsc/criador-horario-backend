import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string;
  schoolName?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  schoolYear: number;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setSchoolYear: (year: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrated: false,
      schoolYear: new Date().getFullYear(),
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setSchoolYear: (year) => set({ schoolYear: year }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('⚠️ Zustand: localStorage indisponível, marcando hydrated mesmo assim', error);
        }
        console.log('💧 Zustand rehydration completed:', state?.token ? 'HAS TOKEN' : 'NO TOKEN');
        if (state) {
          state.isHydrated = true;
        } else {
          // localStorage bloqueado ou inacessível (ex: TV box, navegadores antigos)
          // Força isHydrated para não deixar o app preso em "Carregando..."
          useAuthStore.setState({ isHydrated: true });
        }
      },
    }
  )
);
