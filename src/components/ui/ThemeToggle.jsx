import React, { useState, useEffect } from 'react';
import { loadTheme, saveTheme } from '../../engine/saveLoad.js';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => loadTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label="Changer de thème"
      title="Changer de thème"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
