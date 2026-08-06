import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import catalog from '../../data/luxury_items.json';

const CATEGORIES = ['Toutes', 'Montres', 'Voitures', 'Avions', 'Bateaux', 'Art', 'Bijoux', 'Mode', 'Vins & Spiritueux', 'Instruments'];

function estimateValue(item) {
  return item.currentValue !== undefined ? Math.round(item.currentValue) : item.price;
}

export default function LuxuryShopModal({ onClose }) {
  const { state, buyLuxury, sellLuxury } = useGame();
  const { personalCash = 0, luxuryItems: owned = [] } = state;
  const [filterCat, setFilterCat] = useState('Toutes');

  const ownedIds = owned.map(i => i.id);
  const filtered = filterCat === 'Toutes' ? catalog : catalog.filter(i => i.category === filterCat);

  return (
    <Modal title="✨ Boutique luxe" onClose={onClose}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
        Budget personnel disponible : <strong style={{ color: 'var(--text)' }}>{fmtCash(personalCash)}</strong>
      </div>
      <p className="hint" style={{ marginTop: 0, marginBottom: 8, fontSize: 11.5 }}>
        Achats sur ton épargne personnelle — un peu de prestige, sans impact sur ton parc.
      </p>

      {owned.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="finance-section-title">Mes articles ({owned.length})</div>
          {owned.map(item => {
            const val = estimateValue(item);
            const drift = item.yearlyDrift ?? 0;
            const driftLabel = drift > 0 ? `+${(drift * 100).toFixed(0)}%/an` : drift < 0 ? `${(drift * 100).toFixed(0)}%/an` : '';
            const pctChange = item.price > 0 ? Math.round(((val - item.price) / item.price) * 100) : 0;
            const pctLabel = pctChange > 0 ? `+${pctChange}%` : pctChange < 0 ? `${pctChange}%` : '0%';
            const pctColor = pctChange > 0 ? 'var(--accent)' : pctChange < 0 ? 'var(--red)' : 'var(--muted)';
            return (
              <div className="wealth-asset-row" key={item.id}>
                <div className="wealth-asset-info">
                  <span className="wealth-asset-name">{item.icon} {item.name}</span>
                  <span className="wealth-asset-value">
                    {fmtCash(val)} (acheté {fmtCash(item.price)})
                    {' · '}
                    <span style={{ color: pctColor, fontWeight: 700 }}>{pctLabel}</span>
                    {driftLabel && ` · ${driftLabel}`}
                  </span>
                </div>
                <button
                  className="portfolio-sell-btn"
                  onClick={() => {
                    if (window.confirm(`Vendre ${item.name} ?\n\nValeur estimée : ${fmtCash(val)}\nFrais de cession (10%) : -${fmtCash(Math.round(val * 0.1))}\nNet perçu : ${fmtCash(val - Math.round(val * 0.1))}`)) {
                      sellLuxury(item.id);
                    }
                  }}
                >
                  Revendre {fmtCash(val - Math.round(val * 0.1))}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="market-filters" style={{ marginBottom: 8 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`market-filter-chip${filterCat === cat ? ' active' : ''}`}
            onClick={() => setFilterCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="portfolio-list">
        {filtered.map(item => {
          const isOwned = ownedIds.includes(item.id);
          const canBuy = !isOwned && personalCash >= item.price;
          const drift = item.yearlyDrift ?? 0;
          return (
            <div className="market-listing-card" key={item.id} style={{ opacity: isOwned ? 0.5 : 1 }}>
              <div className="market-listing-top">
                <span className="market-listing-name">{item.icon} {item.name}</span>
                <span className="market-listing-price">{fmtCash(item.price)}</span>
              </div>
              <div className="market-listing-meta" style={{ color: 'var(--muted)', fontSize: 11 }}>{item.brand}</div>
              <div className="market-listing-meta">{item.description}</div>
              {drift !== 0 && (
                <div className="market-listing-meta" style={{ color: drift > 0 ? 'var(--accent)' : 'var(--red)' }}>
                  Évolution annuelle : {drift > 0 ? '+' : ''}{(drift * 100).toFixed(0)}%
                </div>
              )}
              <button
                className="market-listing-buy-btn"
                disabled={isOwned || !canBuy}
                onClick={() => buyLuxury(item)}
              >
                {isOwned ? 'Déjà possédé' : canBuy ? `Acheter — ${fmtCash(item.price)}` : 'Budget insuffisant'}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
