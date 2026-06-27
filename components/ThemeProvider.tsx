'use client';

import React, { useEffect, useState, createContext } from 'react';

export const ThemeContext = createContext({
  theme: 'dark',
  setTheme: (t: string) => {}
});

export function ThemeProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [theme, setTheme] = useState('dark');
  
  useEffect(() => {
    const stored = localStorage.getItem('alphaline_theme') || 'dark';
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
  }, []);

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('alphaline_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
