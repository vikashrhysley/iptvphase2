// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEME_KEY = 'nexos-theme-v2'; // new key so old saved "dark" prefs default to light

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Enable the cross-fade transition only for the duration of a theme switch, so the
    // universal transition rule isn't live on every element during normal interaction.
    root.classList.add('theme-transition');
    root.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const t = setTimeout(() => root.classList.remove('theme-transition'), 260);
    return () => clearTimeout(t);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);