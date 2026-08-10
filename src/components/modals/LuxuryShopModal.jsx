import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import rawCatalog from '../../data/luxury_items.json';
import { subscribeShopOverrides } from '../../engine/adminOverrides.js';

const CATEGORIES = ['Toutes', 'Montres', 'Voitures', 'Avions', 'Bateaux', 'Art', 'Bijoux', 'Mode', 'Vins & Spiritueux', 'Instruments'];

function applyOverrides(items, overrides) {
  return items.map(item => {
    const ov = overrides[item.id];
    if (!ov) return item;
    return {
      ...item,
      ...(ov.price !== undefined ? { price: Number(ov.price) } : {}),
      ...(ov.image !== undefined && ov.image !== '' ? { image: ov.image } : {}),
    };
  });
}

export default function LuxuryShopModal({ onClose }) {
  const { state, buyLuxury, sellLuxury } = useGame();
  const { personalCash = 0, luxuryItems: owned = [], contacts = [] } = state;
  const [filterCat, setFilterCat] = useState('Toutes');
  const [tab, setTab] = useState('shop');
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    const unsub = subscribeShopOverrides(setOverrides);
    return unsub;
  }, []);

  const hasMarchand = contacts.includes('marchand_exception');
  const catalog = applyOverrides(rawCatalog, overrides);
  const ownedIds = owned.map(i => i.id);
  const allFiltered = filterCat === 'Toutes' ? catalog : catalog.filter(i => i.category === filterCat);
  const filtered = allFiltered.filter(i => !i.locked || hasMarchand);
  const lockedFiltered = hasMarchand ? [] : allFiltered.filter(i => !!i.locked);

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
            {owned.map(item => {
              const purchasePrice = item.purchasePrice ?? item.price ?? 0;
              const currentValue = item.currentValue ?? purchasePrice;
              const gain = purchasePrice > 0 ? Math.round(((currentValue - purchasePrice) / purchasePrice) * 100) : 0;
              const netSale = Math.round(currentValue * 0.90);
              return (
                <div className="luxury-card" key={item.id}>
                  {item.image
                    ? <img src={item.image} alt={item.name} className="luxury-card-img" />
                    : <div className="luxury-card-icon">{item.icon}</div>}
                  <div className="luxury-card-body">
                    <div className="luxury-card-name">{item.name}</div>
                    <div className="luxury-card-brand">{item.brand}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>Acheté {fmtCash(purchasePrice)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: gain > 0 ? 'var(--accent)' : gain < 0 ? 'var(--red)' : 'var(--muted)' }}>
                        → {fmtCash(currentValue)} ({gain > 0 ? '+' : ''}{gain}%)
                      </span>
                    </div>
                    {item.yearlyDrift !== undefined && (
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                        {item.yearlyDrift >= 0 ? '📈' : '📉'} {item.yearlyDrift > 0 ? '+' : ''}{Math.round(item.yearlyDrift * 100)}%/an
                      </div>
                    )}
                  </div>
                  <button
                    className="luxury-card-buy"
                    style={{ background: 'var(--red)' }}
                    onClick={() => { if (window.confirm(`Revendre ${item.name} ?\nValeur actuelle : ${fmtCash(currentValue)}\nNet après frais (10%) : ${fmtCash(netSale)}`)) sellLuxury(item.id); }}
                  >
                    Revendre — {fmtCash(netSale)}
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'shop' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {CATEGORIES.map(cat => {
              const isActive = filterCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 20,
                    background: isActive ? 'var(--accent-soft)' : 'var(--surface2)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              );
            })}
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
                  <div className="luxury-card-body">
                    <div className="luxury-card-name">{item.name}</div>
                    <div className="luxury-card-brand">{item.brand}</div>
                    <div className="luxury-card-desc">{item.description}</div>
                  </div>
                  <button
                    className="luxury-card-buy"
                    disabled={isOwned || !canBuy}
                    onClick={() => buyLuxury(item)}
                  >
                    {isOwned ? '✓ Possédé' : canBuy ? `Acheter — ${fmtCash(item.price)}` : 'Budget insuffisant'}
                  </button>
                </div>
              );
            })}
          </div>

          {lockedFiltered.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: 10, border: '1px solid #b8860b',
              }}>
                <span style={{ fontSize: 16 }}>👑</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#b8860b', letterSpacing: '.08em', textTransform: 'uppercase' }}>Collection d'exception</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>Accès réservé · Déblocable via Sébastien de Morlay (an 45)</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 18 }}>🔒</span>
              </div>
              <div
                className="luxury-grid"
                style={{ filter: 'blur(3px) grayscale(0.7)', opacity: 0.55, pointerEvents: 'none', userSelect: 'none' }}
              >
                {lockedFiltered.map(item => (
                  <div className="luxury-card" key={item.id} style={{ border: '1.5px solid #b8860b' }}>
                    <div className="luxury-card-icon">{item.icon}</div>
                    <div className="luxury-card-body">
                      <div className="luxury-card-name">{item.name}</div>
                      <div className="luxury-card-brand">{item.brand}</div>
                      <div className="luxury-card-desc">{'█'.repeat(Math.min(item.description?.length ?? 30, 40))}</div>
                    </div>
                    <button className="luxury-card-buy" disabled style={{ background: '#b8860b' }}>
                      🔒 {fmtCash(item.price)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
