import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import achievementsDef from '../../data/achievements.json';

const CATEGORY_NAMES = {
  portfolio:   '🏠 Portfolio',
  patrimoine:  '💰 Patrimoine',
  finance:     '📊 Finance',
  stress:      '😌 Bien-être',
  vie:         '🌱 Vie',
  special:     '⭐ Spéciaux',
};

export default function AchievementsModal({ onClose }) {
  const { state } = useGame();
  const unlocked = state.achievements ?? [];

  // Group by category
  const categories = {};
  for (const ach of achievementsDef) {
    const cat = ach.category ?? 'special';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(ach);
  }

  const total = achievementsDef.length;
  const count = unlocked.length;

  return (
    <Modal title={`🏆 Succès (${count}/${total})`} onClose={onClose}>
      <p className="achievements-score">{count} succès débloqués sur {total}</p>

      {Object.entries(categories).map(([cat, achs]) => (
        <div key={cat}>
          <div className="achievement-category">{CATEGORY_NAMES[cat] ?? cat}</div>
          {achs.map(ach => {
            const isUnlocked = unlocked.includes(ach.id);
            return (
              <div className="achievement-row" key={ach.id}>
                <span className="achievement-icon" style={{ opacity: isUnlocked ? 1 : 0.3 }}>
                  {ach.emoji ?? '🎖️'}
                </span>
                <div className="achievement-text">
                  <span className={`achievement-title ${isUnlocked ? 'is-success' : ''}`}>
                    {isUnlocked ? ach.title : '???'}
                  </span>
                  <span className="achievement-desc">
                    {isUnlocked ? ach.desc : ach.hint ?? 'Continue à jouer pour débloquer'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Modal>
  );
}
