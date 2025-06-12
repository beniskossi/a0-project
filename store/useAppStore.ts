import { create } from 'zustand';
import { ThemeMode, DrawResult, DrawCategory } from '../types';

interface AppState {
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  
  // Data
  drawResults: DrawResult[];
  selectedCategory: DrawCategory | null;
  isLoading: boolean;
  lastSync: string | null;
  
  // Actions
  setDrawResults: (results: DrawResult[]) => void;
  setSelectedCategory: (category: DrawCategory | null) => void;
  setLoading: (loading: boolean) => void;
  setLastSync: (sync: string) => void;
  
  // Filters
  dateFilter: {
    startDate: string | null;
    endDate: string | null;
  };
  setDateFilter: (filter: { startDate: string | null; endDate: string | null }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme state
  theme: 'light',
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
  
  // Data state
  drawResults: [],
  selectedCategory: null,
  isLoading: false,
  lastSync: null,
  
  // Data actions
  setDrawResults: (results) => set({ drawResults: results }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLastSync: (sync) => set({ lastSync: sync }),
  
  // Filter state
  dateFilter: {
    startDate: null,
    endDate: null,
  },
  setDateFilter: (filter) => set({ dateFilter: filter }),
}));