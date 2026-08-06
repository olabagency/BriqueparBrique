import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcRent as calcRentEngine } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';
import RenovationModal from './RenovationModal.jsx';
import WealthChart from '../ui/WealthChart.jsx';

const COND_EMOJI  = { bonEtat: '✅', aRenover: '🔨', renove: '⭐', standing: '💎' };
const COND_COLOR  = { bonEtat: 'var(--muted)', aRenover: 'var(--red)', renove: 'var(--accent)', standing: 'var(--amber)' };

export default function PortfolioModal({ onClose }) {
  const { state, sellProperty, toggleRent } = useGame();
  const [renovatingProp, setRenovatingProp] = useState(null);
  const properties = state.propertyList ?? [];
  const currentYear = state.year ?? 1;

  const rentedProps = properties.filter(p => p.rented);
  const totalAnnualRent = rentedProps.reduce((sum, p) => sum + calcRentEngine(p), 0);
  const totalValue = properties.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const wealthHistory = state.wealthHistory ?? [];

  return (
    <Modal title="🏘️ Ton parc immobilier" onClose={onClose} wide>

      {/* Summary + sparkline */}
      {properties.length > 0 && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { label: 'Biens', value: properties.length },
              { label: 'Loués', value: `${rentedProps.length} / ${properties.length}` },
              { label: 'Valeur totale', value: fmtCash(totalValue), accent: true },
              ...(totalAnnualRent > 0 ? [{ label: 'Revenus/an', value: `+${fmtCash(totalAnnualRent)}`, green: true }] : []),
            ].map((item, i, arr) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                paddingRight: i < arr.length - 1 ? 12 : 0,
                paddingLeft: i > 0 ? 12 : 0,
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: item.green ? 'var(--accent)' : item.accent ? 'var(--text)' : 'var(--text)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {wealthHistory.length >= 2 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
              <WealthChart history={wealthHistory} />
            </div>
          )}
        </div>
      )}

      {properties.length === 0 ? (
        <p className="portfolio-empty">Aucun bien dans ton portfolio.<br />Visite le marché pour acheter ton premier bien !</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {properties.map(prop => {
            const condLabel    = propertyData.conditionLabels?.[prop.condition] ?? prop.condition;
            const rent         = calcRentEngine(prop);
            const alreadyToggled = prop.lastRentToggleYear === currentYear;
            const baseVal      = prop.value ?? prop.baseValue;
            const saleVal      = prop.rented ? Math.round(baseVal * 0.95) : baseVal;
            const loanBal      = prop.loanBalance ?? 0;
            const netEquity    = baseVal - loanBal;
            const condColor    = COND_COLOR[prop.condition] ?? 'var(--muted)';
            const emoji        = COND_EMOJI[prop.condition] ?? '🏠';

            return (
              <div
                key={prop.id}
                style={{
                  background: 'var(--surface2)',
                  border: `1.5px solid ${prop.rented ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '11px 12px',
                  display: 'flex', flexDirection: 'column', gap: 0,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 17 }}>{emoji}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: condColor,
                    background: 'var(--surface)', border: `1px solid ${condColor}`,
                    borderRadius: 5, padding: '2px 6px', opacity: .85,
                  }}>
                    {condLabel}
                  </span>
                </div>

                {/* Type + place */}
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{prop.type}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>📍 {prop.place}</div>

                {/* Accounting rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8 }}>
                  <Row label="Valeur marché"  value={fmtCash(baseVal)} color="var(--text)" />
                  {loanBal > 0 && <Row label="Emprunt restant" value={`−${fmtCash(loanBal)}`} color="var(--red)" />}
                  {loanBal > 0 && <Row label="Équité nette"   value={fmtCash(netEquity)} color={netEquity >= 0 ? 'var(--accent)' : 'var(--red)'} bold />}
                  {prop.rented && <Row label="Loyer / an"     value={`+${fmtCash(rent)}`} color="var(--accent)" />}
                  <Row
                    label="Prix de vente"
                    value={<>{fmtCash(saleVal)}{prop.rented && <span style={{ fontSize: 9, color: 'var(--red)', marginLeft: 3 }}>−5%</span>}</>}
                    color="var(--muted)"
                  />
                </div>

                {/* Status lock notice */}
                {alreadyToggled && (
                  <div style={{ fontSize: 9, color: 'var(--amber)', marginBottom: 6 }}>🔒 Statut verrouillé jusqu'à l'an prochain</div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
                  {prop.condition === 'aRenover' && (
                    <button
                      className="portfolio-renovate-btn amber"
                      onClick={() => setRenovatingProp(prop)}
                      style={{ flex: '0 0 auto' }}
                    >🔨 Rénover</button>
                  )}
                  <button
                    className="portfolio-renovate-btn"
                    onClick={() => toggleRent(prop.id)}
                    disabled={alreadyToggled}
                    style={{ opacity: alreadyToggled ? 0.4 : 1, cursor: alreadyToggled ? 'not-allowed' : 'pointer', flex: 1 }}
                  >
                    {prop.rented ? '🔓 Délouer' : '📬 Louer'}
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

function Row({ label, value, color = 'var(--text)', bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
