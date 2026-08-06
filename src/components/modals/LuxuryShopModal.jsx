import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import catalog from '../../data/luxury_items.json';

const CATEGORIES = ['Toutes', 'Montres', 'Voitures', 'Avions', 'Bateaux', 'Art', 'Bijoux', 'Mode', 'Vins & Spiritueux', 'Instruments'];

export default function LuxuryShopModal({ onClose }) {
  const { state, buyLuxury, sellLuxury } = useGame();
  const { personalCash = 0, luxuryItems: owned = [] } = state;
  const [filterCat, setFilterCat] = useState('Toutes');
  const [tab, setTab] = useState('shop');

  const ownedIds = owned.map(i => i.id);
  const filtered = filterCat === 'Toutes' ? catalog : catalog.filter(i => i.category === filterCat);

  return (
    <Modal title="✨ Boutique luxe" onClose={onClose} wide>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Budget personnel : <strong style={{ color: 'var(--text)' }}>{fmtCash(personalCash)}</strong>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['shop', 'owned'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                background: tab === t ? 'var(--accent)' : 'var(--surface2)',
                color: tab === t ? '#fff' : 'var(--muted)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              {t === 'shop' ? '🛍️ Boutique' : `🏆 Mes articles (${owned.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'owned' && (
        owned.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
            Aucun article possédé pour l'instant.
          </div>
        ) : (
          <div className="luxury-grid">
            {owned.map(item => (
              <div className="luxury-card" key={item.id}>
                {item.image
                  ? <img src={item.image} alt={item.name} className="luxury-card-img" />
                  : <div className="luxury-card-icon">{item.icon}</div>}
                <div className="luxury-card-name">{item.name}</div>
                <div className="luxury-card-brand">{item.brand}</div>
                <div className="luxury-card-desc">{item.description}</div>
                <button
                  className="luxury-card-buy"
                  style={{ background: 'var(--red)' }}
                  onClick={() => {
                    const val = item.currentValue !== undefined ? Math.round(item.currentValue) : item.price;
                    if (window.confirm(`Revendre ${item.name} ?`)) sellLuxury(item.id);
                  }}
                >
                  Revendre
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'shop' && (
        <>
          <div className="market-filters" style={{ marginBottom: 10 }}>
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
          <div className="luxury-grid">
            {filtered.map(item => {
              const isOwned = ownedIds.includes(item.id);
              const canBuy = !isOwned && personalCash >= item.price;
              return (
                <div className={`luxury-card${isOwned ? ' luxury-card--owned' : ''}`} key={item.id}>
                  {item.image
                  ? <img src={item.image} alt={item.name} className="luxury-card-img" />
                  : <div className="luxury-card-icon">{item.icon}</div>}
                  <div className="luxury-card-name">{item.name}</div>
                  <div className="luxury-card-brand">{item.brand}</div>
                  <div className="luxury-card-desc">{item.description}</div>
                  <button
                    className="luxury-card-buy"
                    disabled={isOwned || !canBuy}
                    onClick={() => buyLuxury(item)}
                    style={!isOwned && !canBuy ? { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' } : {}}
                  >
                    {isOwned ? '✓ Possédé' : canBuy ? `Acheter — ${fmtCash(item.price)}` : 'Budget insuffisant'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
