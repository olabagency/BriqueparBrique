import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcRent as calcRentEngine } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';
import RenovationModal from './RenovationModal.jsx';
import WealthChart from '../ui/WealthChart.jsx';

export default function PortfolioModal({ onClose }) {
  const { state, sellProperty, toggleRent } = useGame();
  const [renovatingProp, setRenovatingProp] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const properties = state.propertyList ?? [];
  const currentYear = state.year ?? 1;

  const rentedProps = properties.filter(p => p.rented);
  const totalAnnualRent = rentedProps.reduce((sum, p) => sum + calcRentEngine(p), 0);
  const totalValue = properties.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const wealthHistory = state.wealthHistory ?? [];

  return (
    <Modal title={`🏘️ Ton parc immobilier`} onClose={onClose} wide>

      {wealthHistory.length >= 2 && (
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 12px 6px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            📈 Évolution du patrimoine
          </div>
          <WealthChart history={wealthHistory} />
        </div>
      )}

      {properties.length > 0 && (
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Biens en portefeuille</span>
            <strong>{properties.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Loués / Vacants</span>
            <strong>{rentedProps.length} / {properties.length - rentedProps.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Valeur totale</span>
            <strong>{fmtCash(totalValue)}</strong>
          </div>
          {totalAnnualRent > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
              <span style={{ color: 'var(--muted)' }}>Revenus locatifs annuels</span>
              <strong style={{ color: 'var(--accent)' }}>+{fmtCash(totalAnnualRent)}/an</strong>
            </div>
          )}
        </div>
      )}

      {properties.length === 0 ? (
        <p className="portfolio-empty">Aucun bien dans ton portfolio.<br />Visite le marché pour acheter ton premier bien !</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {properties.map(prop => {
            const condLabel = propertyData.conditionLabels?.[prop.condition] ?? prop.condition;
            const rent = calcRentEngine(prop);
            const alreadyToggled = prop.lastRentToggleYear === currentYear;
            const baseVal = prop.value ?? prop.baseValue;
            const saleVal = prop.rented ? Math.round(baseVal * 0.95) : baseVal;
            const condColor = prop.condition === 'renove' ? 'var(--accent)' : prop.condition === 'aRenover' ? 'var(--red)' : 'var(--muted)';
            const COND_EMOJI = { bonEtat: '✅', aRenover: '🔨', renove: '⭐', standing: '💎' };
            const isHovered = hoveredId === prop.id;
            const netEquity = baseVal - (prop.loanBalance ?? 0);

            return (
              <div
                key={prop.id}
                onMouseEnter={() => setHoveredId(prop.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: 'var(--surface2)',
                  border: `1.5px solid ${isHovered ? 'var(--accent)' : prop.rented ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '10px 11px',
                  display: 'flex', flexDirection: 'column', gap: 5,
                  cursor: 'default', transition: 'border-color .15s',
                }}
              >
                {/* Compact header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16 }}>{COND_EMOJI[prop.condition] ?? '🏠'}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: condColor, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px' }}>
                    {condLabel}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{prop.type}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.2 }}>{prop.place}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                  <span style={{ color: prop.rented ? 'var(--accent)' : 'var(--muted)' }}>{prop.rented ? '📬' : '🔓'}</span>
                  <strong style={{ fontFamily: 'monospace' }}>{fmtCash(baseVal)}</strong>
                </div>

                {/* Hover: detailed accounting + actions */}
                {isHovered && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Valeur marché</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(baseVal)}</span>
                    </div>
                    {(prop.loanBalance ?? 0) > 0 && (
                      <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Emprunt restant</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--red)' }}>−{fmtCash(prop.loanBalance)}</span>
                      </div>
                    )}
                    {(prop.loanBalance ?? 0) > 0 && (
                      <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Équité nette</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmtCash(netEquity)}</span>
                      </div>
                    )}
                    {prop.rented && (
                      <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Loyer / an</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>+{fmtCash(rent)}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Prix de vente</span>
                      <span style={{ fontFamily: 'monospace' }}>{fmtCash(saleVal)}{prop.rented && <span style={{ color: 'var(--red)', fontSize: 9 }}> −5%</span>}</span>
                    </div>
                    {alreadyToggled && (
                      <div style={{ fontSize: 9, color: 'var(--amber)' }}>🔒 Statut verrouillé jusqu'à l'an prochain</div>
                    )}
                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                      {prop.condition === 'aRenover' && (
                        <button
                          className="portfolio-renovate-btn"
                          onClick={() => setRenovatingProp(prop)}
                          style={{ background: 'var(--amber)', color: '#fff', flex: '0 0 auto' }}
                          title="Rénover"
                        >🔨</button>
                      )}
                      <button
                        className="portfolio-renovate-btn"
                        onClick={() => toggleRent(prop.id)}
                        disabled={alreadyToggled}
                        style={{ opacity: alreadyToggled ? 0.4 : 1, cursor: alreadyToggled ? 'not-allowed' : 'pointer', flex: '0 0 auto' }}
                        title={prop.rented ? 'Arrêter la location' : 'Mettre en location'}
                      >
                        {prop.rented ? '🔓' : '📬'}
                      </button>
                      <button
                        className="portfolio-sell-btn"
                        style={{ flex: 1 }}
                        onClick={() => {
                          const msg = prop.rented
                            ? `Vendre ${prop.type} loué ?\nPrix : ${fmtCash(saleVal)} (−5 % locataire en place)`
                            : `Vendre ${prop.type} pour ${fmtCash(saleVal)} ?`;
                          if (window.confirm(msg)) sellProperty(prop.id);
                        }}
                      >
                        Vendre
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {renovatingProp && (
        <RenovationModal
          property={renovatingProp}
          onClose={() => setRenovatingProp(null)}
        />
      )}
    </Modal>
  );
}
