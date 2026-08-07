import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import { EffectsProvider } from './context/EffectsContext.jsx';
import { loadTheme } from './engine/saveLoad.js';
import { subscribeConfigOverrides } from './engine/adminOverrides.js';
import { applyGameConfigOverrides } from './engine/runtimeConfig.js';
import Landing    from './components/Landing.jsx';
import Onboarding from './components/Onboarding.jsx';
import Game       from './components/Game.jsx';
import End        from './components/End.jsx';
import AdminPage  from './components/AdminPage.jsx';

function AppShell() {
  const { state } = useGame();

  useEffect(() => {
    const theme = loadTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const screen = (state.over || state.gameOver) ? 'end' : (state.screen ?? 'landing');
  switch (screen) {
    case 'landing':    return <Landing />;
    case 'onboarding': return <Onboarding />;
    case 'game':       return <Game />;
    case 'end':        return <End />;
    default:           return <Landing />;
  }
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let resolved = false;
    const unsub = subscribeConfigOverrides(overrides => {
      resolved = true;
      applyGameConfigOverrides(overrides);
      setReady(true);
    });
    // Fallback: if Firebase never responds, start with defaults after 5s
    const timer = setTimeout(() => {
      if (!resolved) { applyGameConfigOverrides({}); setReady(true); }
    }, 5000);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  if (!ready) return null;

  if (window.location.pathname === '/admin') return <AdminPage />;
  return (
    <GameProvider>
      <EffectsProvider>
        <AppShell />
      </EffectsProvider>
    </GameProvider>
  );
}
