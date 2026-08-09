import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash, stageFor } from '../engine/utils.js';
import achievements from '../data/achievements.json';
import traitsData from '../data/traits.json';

export default function HUD({ onOpenModal, stress: stressProp }) {
  const { state } = useGame();
  const {
    name, companyName, gender, sector,
    year, age, cash, personalCash, stress: stateStress,
    valuation, propertyList, propertiesOwned, traitId,
  } = state;
  const stress = stressProp ?? stateStress ?? 0;

  const stage = stageFor(year ?? 1);
  const propCount = propertiesOwned ?? (propertyList ?? []).length;
  const achCount  = achievements.filter(a => (state.achievements ?? []).includes(a.id)).length;

  const cashClass = cash < 0 ? 'down' : cash > 10 ? 'up' : '';
  const stressClass = stress > 80 ? 'down' : stress >= 40 ? 'warn' : 'up';
  const stressBarBg = stress > 80 ? 'var(--red)' : stress >= 40 ? 'var(--amber)' : 'var(--accent)';

  const isCashDanger   = cash < -30;
  const isStressWarn   = stress >= 65 && stress < 85;

  const avatarEmoji = gender?.emoji ?? '🙂';
  const sectorLabel = companyName
    ? `🏢 ${companyName} — ${sector?.name ?? ''}`
    : `🏢 ${sector?.name ?? ''}`;
  const trait = traitsData.find(t => t.id === traitId) ?? null;

  const hudStressClass = stress >= 90 ? 'hud-stress-critical' : stress >= 70 ? 'hud-stress-high' : '';

  return (
    <header className={`hud ${hudStressClass}`}>
      <div className="hud-row1">
        <div className="avatar-circle" id="avatarCircle">{avatarEmoji}</div>
        <div className="hud-id">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="name" id="hudName">{name ?? '—'}</div>
            {trait && (
              <span
                data-tip={`${trait.name} — ${trait.desc}`}
                style={{
                  fontSize: 13, lineHeight: 1, cursor: 'default',
                  padding: '1px 5px', borderRadius: 6,
                  background: 'var(--accent-soft)',
                  border: '1px solid rgba(31,122,77,.2)',
                }}
              >{trait.emoji}</span>
            )}
          </div>
          <div className="sector-tag" id="hudSector">{sectorLabel}</div>
        </div>
        <div className="stage-pill" id="hudStage" data-stage={stage}>{stage}</div>
      </div>

      <div className="hud-row2">
        <span className="mini-stat has-bar" data-tip={`${age ?? 18} ans`}>
          <span className="mi-icon">🎂</span>
          <span className="mi-val mono" id="statAge">{age ?? 18}</span>
          <span className="mi-bar">
            <span
              className="mi-bar-fill"
              style={{
                width: `${Math.min(100, ((age ?? 18) - 18) / (80 - 18) * 100)}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--amber))',
              }}
            />
          </span>
        </span>
        <span className="mini-stat" data-tip="Trésorerie de l'entreprise">
          <span className="mi-icon">💰</span>
          <span className={`mi-val mono ${cashClass}`} id="statCash">{fmtCash(cash ?? 0)}</span>
        </span>
        <span className="mini-stat" data-tip="Valeur estimée du parc">
          <span className="mi-icon">📈</span>
          <span className="mi-val mono up" id="statVal">{fmtCash(valuation ?? 0)}</span>
        </span>
        <span className="mini-stat has-bar" data-tip="Ton niveau de stress">
          <span className="mi-icon">😰</span>
          <span className={`mi-val mono ${stressClass}`} id="statStress">{Math.round(stress ?? 0)}</span>
          <span className="mi-bar">
            <span
              className="mi-bar-fill"
              id="barStress"
              style={{
                width: `${Math.max(0, Math.min(100, stress ?? 0))}%`,
                background: stressBarBg,
              }}
            />
          </span>
        </span>
        <span className="mini-stat" data-tip="Ton épargne personnelle">
          <span className="mi-icon">💶</span>
          <span className="mi-val mono" id="statPersonal">{fmtCash(personalCash ?? 0)}</span>
        </span>
      </div>

      {isCashDanger && (
        <div className="cash-warning" id="cashWarning">
          ⚠️ Trésorerie fragile — trouve une solution avant qu'il ne soit trop tard
        </div>
      )}
      {isStressWarn && (
        <div className="cash-warning" id="stressWarning" style={{ background: 'var(--amber)', color: '#fff' }}>
          ⚠️ Stress élevé — repose-toi avant qu'il ne soit trop tard
        </div>
      )}
    </header>
  );
}
