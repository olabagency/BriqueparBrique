import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcRent as calcRentEngine } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';

export default function PortfolioModal({ onClose }) {
  const { state, sellProperty, toggleRent } = useGame();
  const properties = state.propertyList ?? [];

  return (
    <Modal title={`🏘️ Ton parc immobilier`} onClose={onClose}>
      {properties.length === 0 ? (
        <p className="portfolio-empty">Aucun bien dans ton portfolio.<br />Visite le marché pour acheter ton premier bien !</p>
      ) : (
        <div className="portfolio-list">
          {properties.map(prop => {
            const condLabel = propertyData.conditionLabels?.[prop.condition] ?? prop.condition;
            const rent = calcRentEngine(prop);
            return (
              <div className="portfolio-row" key={prop.id}>
                <div className="portfolio-row-info">
                  <span className="portfolio-row-name">{prop.type}</span>
                  <span className="portfolio-row-value">
                    {prop.place} · {condLabel} · {fmtCash(prop.value ?? prop.baseValue)}
                  </span>
                  <span className="portfolio-row-value" style={{ color: prop.rented ? 'var(--accent)' : 'var(--muted)' }}>
                    {prop.rented ? `📬 Loué · +${fmtCash(rent)}/an` : '🔓 Vacant'}
                  </span>
                </div>
                <div className="portfolio-row-actions">
                  <button
                    className="portfolio-renovate-btn"
                    onClick={() => toggleRent(prop.id)}
                    title={prop.rented ? 'Arrêter la location' : 'Mettre en location'}
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
