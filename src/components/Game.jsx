import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import HUD from './HUD.jsx';
import EventCard from './EventCard.jsx';
import PortfolioModal    from './modals/PortfolioModal.jsx';
import MarketModal       from './modals/MarketModal.jsx';
import LoansModal        from './modals/LoansModal.jsx';
import AchievementsModal from './modals/AchievementsModal.jsx';
import LuxuryShopModal   from './modals/LuxuryShopModal.jsx';
import BankModal         from './modals/BankModal.jsx';

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
  const [activeModal, setActiveModal] = useState(null);

  const openModal  = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const ModalComponent = activeModal ? MODALS[activeModal] : null;

  // Check if we've run out of events for this year (show a "next year" idle state)
  const pendingEvents = state.pendingEvents ?? [];
  const idx = state.currentEventIndex ?? 0;
  const hasEvent = idx < pendingEvents.length;

  return (
    <div className="app">
      <ThemeToggle />
      <div className="react-screen game">
        <HUD onOpenModal={openModal} />

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
    </div>
  );
}
