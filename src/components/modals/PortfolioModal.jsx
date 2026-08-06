import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcRent as calcRentEngine } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';

export default function PortfolioModal({ onClose }) {
  const { state, sellProperty, toggleRent } = useGame();
  const properties = state.propertyList ?? [];
  const currentYear = state.year ?? 1;

  const rentedProps = properties.filter(p => p.rented);
  const totalAnnualRent = rentedProps.reduce((sum, p) => sum + calcRentEngine(p), 0);
  const totalValue = properties.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <Modal title={`🏘️ Ton parc immobilier`} onClose={onClose}>

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

      <div style={{
        background: 'var(--accent-soft)',
        border: '1px solid rgba(31,122,77,.25)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        color: 'var(--text)',
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>📬 À quoi sert la location ?</div>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Un bien <strong>loué</strong> génère automatiquement un loyer chaque année (≈ 7 % de sa valeur).
          Ce revenu s'ajoute à ton cash en fin d'année.
          Un bien <strong>vacant</strong> n'apporte rien mais reste disponible à la revente immédiate.
        </p>
        <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--surface)', borderRadius: 8, fontSize: 11, color: 'var(--muted)' }}>
          ⚠️ Tu ne peux <strong>changer le statut</strong> d'un bien qu'<strong>une seule fois par an</strong>.
          Choisis bien le moment — la décision est verrouillée jusqu'à l'année suivante.
        </div>
      </div>

      {properties.length === 0 ? (
        <p className="portfolio-empty">Aucun bien dans ton portfolio.<br />Visite le marché pour acheter ton premier bien !</p>
      ) : (
        <div className="portfolio-list">
          {properties.map(prop => {
            const condLabel = propertyData.conditionLabels?.[prop.condition] ?? prop.condition;
            const rent = calcRentEngine(prop);
            const alreadyToggled = prop.lastRentToggleYear === currentYear;

            return (
              <div className="portfolio-row" key={prop.id}>
                <div className="portfolio-row-info">
                  <span className="portfolio-row-name">{prop.type}</span>
                  <span className="portfolio-row-value">
                    {prop.place} · {condLabel}
                  </span>
                  <span className="portfolio-row-value">
                    Valeur : <strong style={{ color: 'var(--text)' }}>{fmtCash(prop.value ?? prop.baseValue)}</strong>
                  </span>
                  <span className="portfolio-row-value" style={{ color: prop.rented ? 'var(--accent)' : 'var(--muted)' }}>
                    {prop.rented
                      ? `📬 Loué · +${fmtCash(rent)}/an`
                      : '🔓 Vacant · pas de revenus'}
                  </span>
                  {alreadyToggled && (
                    <span style={{ fontSize: 10, color: 'var(--amber)', marginTop: 2 }}>
                      🔒 Statut modifié cette année — débloqué l'an prochain
                    </span>
                  )}
                </div>
                <div className="portfolio-row-actions">
                  <button
                    className="portfolio-renovate-btn"
                    onClick={() => toggleRent(prop.id)}
                    disabled={alreadyToggled}
                    title={alreadyToggled ? 'Déjà modifié cette année' : prop.rented ? 'Arrêter la location' : 'Mettre en location'}
                    style={{ opacity: alreadyToggled ? 0.4 : 1, cursor: alreadyToggled ? 'not-allowed' : 'pointer' }}
                  >
                    {prop.rented ? '🔓' : '📬'}
                  </button>
                  <button
                    className="portfolio-sell-btn"
                    onClick={() => {
                      if (window.confirm(`Vendre ${prop.type} pour ${fmtCash(prop.value ?? prop.baseValue)} ?`)) {
                        sellProperty(prop.id);
                      }
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
    </Modal>
  );
}
