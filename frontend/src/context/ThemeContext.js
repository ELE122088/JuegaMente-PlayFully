import React, { createContext, useContext, useState, useEffect } from 'react';

export const Colors = {
  light: {
    background: '#EAECEF',
    card: '#F4F6F8',
    text: '#1E293B',
    textSecondary: '#64748B',
    primary: '#5B52E0',
    primaryText: '#FFFFFF',
    border: '#CBD5E1',
    inputBg: '#DFE3E8',
    overlay: 'rgba(15, 23, 42, 0.5)',
  },
  dark: {
    background: '#1A1D24',
    card: '#242832',
    text: '#E2E8F0',
    textSecondary: '#94A3B8',
    primary: '#6366F1',
    primaryText: '#FFFFFF',
    border: '#333948',
    inputBg: '#1E222B',
    overlay: 'rgba(15, 17, 23, 0.7)',
  },
  neon: {
    background: '#111322',
    card: '#1A1D33',
    text: '#E0E7FF',
    textSecondary: '#818CF8',
    primary: '#06B6D4',
    primaryText: '#FFFFFF',
    border: '#2A2E4D',
    inputBg: '#15182B',
    overlay: 'rgba(17, 19, 34, 0.8)',
  },
  midnight: {
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    primary: '#38BDF8',
    primaryText: '#0F172A',
    border: '#334155',
    inputBg: '#162032',
    overlay: 'rgba(15, 23, 42, 0.75)',
  },
  emerald: {
    background: '#DFEBE3',
    card: '#EBF3ED',
    text: '#143D2B',
    textSecondary: '#276749',
    primary: '#15803D',
    primaryText: '#FFFFFF',
    border: '#B5D3C1',
    inputBg: '#D5E5DA',
    overlay: 'rgba(20, 61, 43, 0.6)',
  },
  sunset: {
    background: '#F3E8DE',
    card: '#FAF2EC',
    text: '#4C240E',
    textSecondary: '#9A3412',
    primary: '#EA580C',
    primaryText: '#FFFFFF',
    border: '#DEC3B0',
    inputBg: '#E9DACD',
    overlay: 'rgba(76, 36, 14, 0.6)',
  },
  sakura: {
    background: '#F2E4EC',
    card: '#F9EFF4',
    text: '#4D1A39',
    textSecondary: '#9D174D',
    primary: '#BE185D',
    primaryText: '#FFFFFF',
    border: '#DFBCCD',
    inputBg: '#E9D2DF',
    overlay: 'rgba(77, 26, 57, 0.6)',
  },
  ocean: {
    background: '#0C1929',
    card: '#15263D',
    text: '#E0F2FE',
    textSecondary: '#7DD3FC',
    primary: '#0EA5E9',
    primaryText: '#FFFFFF',
    border: '#1E3A5F',
    inputBg: '#102035',
    overlay: 'rgba(12, 25, 41, 0.75)',
  },
  gold: {
    background: '#1C1917',
    card: '#292524',
    text: '#FEF3C7',
    textSecondary: '#D6D3D1',
    primary: '#D97706',
    primaryText: '#FFFFFF',
    border: '#44403C',
    inputBg: '#201D1B',
    overlay: 'rgba(28, 25, 23, 0.75)',
  },
  cyber: {
    background: '#1A1528',
    card: '#261F38',
    text: '#F3E8FF',
    textSecondary: '#C084FC',
    primary: '#9333EA',
    primaryText: '#FFFFFF',
    border: '#3E3258',
    inputBg: '#201A30',
    overlay: 'rgba(26, 21, 40, 0.75)',
  },
};

const ThemeContext = createContext({
  theme: 'light',
  colors: Colors.light,
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');

  // Cargar tema inicial desde el almacenamiento local
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedTheme = window.localStorage.getItem('app_theme');
        if (savedTheme && Colors[savedTheme]) {
          setThemeState(savedTheme);
        }
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para cargar el tema:', e);
    }
  }, []);

  const setTheme = (newTheme) => {
    if (Colors[newTheme]) {
      setThemeState(newTheme);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('app_theme', newTheme);
        }
      } catch (e) {
        console.warn('No se pudo guardar el tema en localStorage:', e);
      }
    }
  };

  const colors = Colors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
}
