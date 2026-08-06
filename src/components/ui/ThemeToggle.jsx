import React, { useState, useEffect, useRef } from 'react';
import { loadTheme, saveTheme } from '../../engine/saveLoad.js';
import { useGame } from '../../context/GameContext.jsx';

export default function SettingsButton() {
  const [open, setOpen]   = useState(false);
  const [theme, setTheme] = useState(() => loadTheme());
  const [confirmQuit, setConfirmQuit] = useState(false);
  const { resetGame } = useGame();
  const ref = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleQuit = () => {
    if (!confirmQuit) { setConfirmQuit(true); return; }
    setOpen(false);
    setConfirmQuit(false);
    resetGame();
  };

  return (
    <div ref={ref} style={{ position: 'fixed', top: 'calc(12px + env(safe-area-inset-top))', right: 'calc(12px + env(safe-area-inset-right))', zIndex: 600 }}>
      <button
        className="theme-toggle"
        onClick={() => { setOpen(o => !o); setConfirmQuit(false); }}
        aria-label="Paramètres"
        title="Paramètres"
        style={{ position: 'static' }}
      >
        ⚙️
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          padding: '8px', minWidth: 200, zIndex: 601,
        }}>
          {/* Theme row */}
          <button
            onClick={toggle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: 'none', color: 'var(--text)',
              fontSize: 14, fontWeight: 600, textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 18 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Quit row */}
          <button
            onClick={handleQuit}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
              background: confirmQuit ? 'rgba(239,68,68,.1)' : 'transparent',
              border: 'none',
              color: confirmQuit ? 'var(--red)' : 'var(--text)',
              fontSize: 14, fontWeight: 600, textAlign: 'left',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => !confirmQuit && (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => !confirmQuit && (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 18 }}>🚪</span>
            {confirmQuit ? 'Confirmer — quitter ?' : 'Quitter la partie'}
          </button>
        </div>
      )}
    </div>
  );
}
