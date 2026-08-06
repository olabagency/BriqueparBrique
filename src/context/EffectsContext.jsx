import React, { createContext, useContext, useState, useCallback } from 'react';

const EffectsContext = createContext(null);

const DURATIONS = {
  achievement: 3800,
  live:        4500,
  year:        1600,
  flash:        700,
  float:       1800,
};

export function EffectsProvider({ children }) {
  const [effects, setEffects] = useState([]);

  const emit = useCallback((effect) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = DURATIONS[effect.type] ?? 1800;
    setEffects(prev => [...prev, { ...effect, id }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), duration + 200);
  }, []);

  return (
    <EffectsContext.Provider value={{ emit, effects }}>
      {children}
    </EffectsContext.Provider>
  );
}

export function useEffects() {
  const ctx = useContext(EffectsContext);
  if (!ctx) throw new Error('useEffects must be used inside EffectsProvider');
  return ctx;
}
