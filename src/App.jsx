import React, { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import { EffectsProvider } from './context/EffectsContext.jsx';
import { loadTheme, saveTheme } from './engine/saveLoad.js';
import Landing    from './components/Landing.jsx';
import Onboarding from './components/Onboarding.jsx';
import Game       from './components/Game.jsx';
import End        from './components/End.jsx';

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
  return (
    <GameProvider>
      <EffectsProvider>
        <AppShell />
      </EffectsProvider>
    </GameProvider>
  );
}
