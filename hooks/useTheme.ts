import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AppTheme } from '../types';

export const useTheme = (): AppTheme => {
  const theme = useAppStore((state) => state.theme);
  
  return useMemo(() => {
    const lightTheme: AppTheme = {
      mode: 'light',
      colors: {
        primary: '#3B82F6',
        background: '#F8FAFC',
        card: '#FFFFFF',
        text: '#1F2937',
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    };
    
    const darkTheme: AppTheme = {
      mode: 'dark',
      colors: {
        primary: '#60A5FA',
        background: '#0F172A',
        card: '#1E293B',
        text: '#F1F5F9',
        border: '#334155',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
      },
    };
    
    return theme === 'light' ? lightTheme : darkTheme;
  }, [theme]);
};