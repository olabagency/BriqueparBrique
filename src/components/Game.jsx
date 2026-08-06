import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useEffects } from '../context/EffectsContext.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import HUD from './HUD.jsx';
import EventCard from './EventCard.jsx';
import EffectsLayer from './ui/EffectsLayer.jsx';
import LivePresence from './ui/LivePresence.jsx';
import PortfolioModal    from './modals/PortfolioModal.jsx';
import MarketModal       from './modals/MarketModal.jsx';
import LoansModal        from './modals/LoansModal.jsx';
import AchievementsModal from './modals/AchievementsModal.jsx';
import LuxuryShopModal   from './modals/LuxuryShopModal.jsx';
import BankModal         from './modals/BankModal.jsx';
import achievementsDef from '../data/achievements.json';

const MODALS = {
  portfolio:    PortfolioModal,
  market:       MarketModal,
  loans:        LoansModal,
  achievements: AchievementsModal,
  luxury:       LuxuryShopModal,
  bank:         BankModal,
};

export default function Game() {
  const { state } = useGame();
  const { emit } = useEffects();
  const [activeModal, setActiveModal] = useState(null);
  const prevStateRef = useRef(state);

  // Detect state changes and emit visual effects
  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev === state) return;

    const prevYear = prev.year ?? 1;
    const currYear = state.year ?? 1;
    const yearAdvanced = currYear > prevYear;

    if (yearAdvanced) {
      // Year flash
      emit({ type: 'year', year: currYear });

      // Rent income float
      const loyers = state.currentYearFinance?.loyers ?? 0;
      if (loyers > 0) {
        setTimeout(() => emit({
          type: 'float',
          label: `+${loyers} k€ loyers`,
          positive: true,
          xPct: 40 + Math.floor(Math.random() * 20),
        }), 700);
      }

      // Loan cost float
      const credits = state.currentYearFinance?.credits ?? 0;
      if (credits < -20) {
        setTimeout(() => emit({
          type: 'float',
          label: `${credits} k€ crédit`,
          positive: false,
          xPct: 55 + Math.floor(Math.random() * 15),
        }), 1100);
      }
    } else {
      // Event-level cash delta
      const cashDelta = (state.cash ?? 0) - (prev.cash ?? 0);
      if (cashDelta >= 25) {
        emit({
          type: 'float',
          label: `+${Math.round(cashDelta)} k€`,
          positive: true,
          xPct: 35 + Math.floor(Math.random() * 30),
        });
        if (cashDelta >= 100) emit({ type: 'flash', color: 'green' });
      } else if (cashDelta <= -25) {
        emit({
          type: 'float',
          label: `${Math.round(cashDelta)} k€`,
          positive: false,
          xPct: 35 + Math.floor(Math.random() * 30),
        });
        if (cashDelta <= -100) emit({ type: 'flash', color: 'red' });
      }

      // Stress spike
      const stressDelta = (state.stress ?? 0) - (prev.stress ?? 0);
      if (stressDelta >= 20) emit({ type: 'flash', color: 'red' });

      // Valuation jump
      const valDelta = (state.valuation ?? 0) - (prev.valuation ?? 0);
      if (valDelta >= 200) {
        emit({
          type: 'float',
          label: `+${Math.round(valDelta)} k€ parc`,
          positive: true,
          xPct: 50 + Math.floor(Math.random() * 20),
        });
      }
    }

    // New achievements
    const prevAchs = prev.achievements ?? [];
    const currAchs = state.achievements ?? [];
    const newAchs = currAchs.filter(id => !prevAchs.includes(id));
    newAchs.forEach(id => {
      const def = achievementsDef.find(a => a.id === id);
      if (def) emit({ type: 'achievement', def });
    });

    prevStateRef.current = state;
  }, [state, emit]);

  const openModal  = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const ModalComponent = activeModal ? MODALS[activeModal] : null;
  const pendingEvents = state.pendingEvents ?? [];
  const idx = state.currentEventIndex ?? 0;
  const hasEvent = idx < pendingEvents.length;
  const stress = state.stress ?? 0;

  return (
    <div className="app">
      <ThemeToggle />
      <div className="react-screen game">
        <HUD onOpenModal={openModal} stress={stress} />
        <LivePresence />

        {hasEvent ? (
          <EventCard />
        ) : (
          <div className="event-card" style={{ color: 'var(--muted)', fontSize: 15, padding: 28 }}>
            <p>🎉 Fin de l'année {state.year}.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              Le temps avance automatiquement…
            </p>
          </div>
        )}
      </div>

      {ModalComponent && <ModalComponent onClose={closeModal} />}
      <EffectsLayer stress={stress} />
    </div>
  );
}
