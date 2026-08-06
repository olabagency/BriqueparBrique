import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash } from '../engine/utils.js';

const COND_EMOJI = {
  bonEtat:   '✅',
  aRenover:  '🔨',
  renove:    '⭐',
  standing:  '💎',
};

export default function LeftSidebar({ onOpenModal }) {
  const { state } = useGame();
  const { propertyList = [], valuation = 0, personalCash = 0, cash = 0, luxuryItems = [] } = state;

  const totalWealth = valuation + personalCash + cash;
  const luxuryVal = luxuryItems.reduce((s, i) => s + (i.currentValue ?? i.price ?? 0), 0);

  return (
    <div className="left-column-wrapper">
      {/* Property map */}
      <div className="left-column-box">
        <h3>🗺️ Mon parc</h3>
        {propertyList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
            Aucun bien pour l'instant
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {propertyList.map(prop => (
              <div key={prop.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 11, padding: '4px 6px',
                background: 'var(--surface2)', borderRadius: 6,
                border: '1px solid var(--border)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{COND_EMOJI[prop.condition] ?? '🏠'}</span>
                  <span style={{ color: 'var(--text)' }}>{prop.type}</span>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                  {prop.rented ? '📬' : '🔓'} {fmtCash(prop.value ?? prop.baseValue)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            className="btn-ghost"
            style={{ flex: 1, fontSize: 11, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}
            onClick={() => onOpenModal('portfolio')}
          >
            📋 Gérer
          </button>
          <button
            style={{
              flex: 1, fontSize: 11, fontWeight: 700, padding: '6px 0',
              background: 'var(--accent-soft)', border: '1px solid var(--accent)',
              borderRadius: 8, color: 'var(--accent)', cursor: 'pointer',
            }}
            onClick={() => onOpenModal('market')}
          >
            🛒 Acheter
          </button>
        </div>

        <div className="sidebar-location-tip">
          <div className="sidebar-location-tip-title">📬 Location</div>
          <div>✅ Louer → loyer auto ~7% · +1 stress/an · risque événements</div>
          <div>💸 Vente loué −5% · 🚀 Vacant = prix plein</div>
          <div style={{ marginTop: 4, color: 'var(--amber)' }}>⚠️ 1 changement de statut/an</div>
        </div>
      </div>

      {/* Patrimoine + boutique */}
      <div className="left-column-box">
        <h3>💎 Patrimoine</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>🏠 Immobilier</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(valuation)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>💰 Trésorerie</span>
            <span style={{ fontFamily: 'monospace', color: cash >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmtCash(cash)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>👤 Épargne</span>
            <span style={{ fontFamily: 'monospace' }}>{fmtCash(personalCash)}</span>
          </div>
          {luxuryVal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>🛍️ Objets de luxe</span>
              <span style={{ fontFamily: 'monospace' }}>{fmtCash(luxuryVal)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2,
            fontWeight: 700,
          }}>
            <span>Total</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(totalWealth + luxuryVal)}</span>
          </div>
        </div>

        <button
          className="btn-ghost"
          style={{ width: '100%', fontSize: 11, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}
          onClick={() => onOpenModal('luxury')}
        >
          🛍️ Boutique
        </button>
      </div>
    </div>
  );
}
