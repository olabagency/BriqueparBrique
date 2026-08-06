import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import WealthChart from '../ui/WealthChart.jsx';

const CONTACT_NAMES = {
  courtier: 'Baptiste (courtier)',
  notaire: 'Maître Chauvin (notaire)',
  expert_comptable: 'Claire (comptable)',
  agent_immo: 'Sofia (agent immo)',
};

function generateNarrative(report) {
  const { year, age, finance, stress, valuation, propCount, rentedCount, contacts, courtierSaving } = report;
  const loyers = finance.loyers ?? 0;
  const achats = Math.abs(finance.achats ?? 0);
  const ventes = finance.ventes ?? 0;
  const events = finance.evenements ?? 0;
  const credits = Math.abs(finance.credits ?? 0);
  const paras = [];

  // Bilan général
  const netFlow = loyers + ventes + events - credits - achats;
  if (netFlow > 80)       paras.push(`Une année exceptionnelle. Tes flux nets atteignent +${fmtCash(netFlow)} — le portefeuille travaille pour toi.`);
  else if (netFlow > 20)  paras.push(`Une bonne année dans le vert. La machine se met en route.`);
  else if (netFlow > -20) paras.push(`Une année équilibrée. Les investissements pèsent sur le cash, mais les actifs s'apprécient.`);
  else                    paras.push(`Une année sous tension. Les sorties dépassent les entrées — surveille ta trésorerie.`);

  // Revenus locatifs
  if (loyers > 50) paras.push(`Tes ${rentedCount} bien${rentedCount > 1 ? 's' : ''} loué${rentedCount > 1 ? 's' : ''} ont généré ${fmtCash(loyers)} de revenus locatifs.`);
  else if (loyers > 0) paras.push(`${fmtCash(loyers)} de loyers encaissés — sans trop d'effort.`);

  // Acquisitions
  if (achats > 50) paras.push(`Tu as investi ${fmtCash(achats)} en acquisitions. Le parc s'étend, l'endettement aussi.`);
  else if (achats > 0) paras.push(`Un achat cette année — le parc grandit.`);

  // Cessions
  if (ventes > 0) paras.push(`Cessions pour ${fmtCash(ventes)} — de nouvelles liquidités dans la caisse.`);

  // Contacts bonuses
  if ((contacts ?? []).includes('expert_comptable')) paras.push(`Claire Forestier a géré tes comptes — −3 points de stress en moins.`);
  if ((contacts ?? []).includes('courtier') && courtierSaving > 0) paras.push(`Baptiste Leroux a optimisé tes crédits — ${fmtCash(courtierSaving)} économisés.`);
  if ((contacts ?? []).includes('notaire')) paras.push(`Maître Chauvin t'a donné accès à ${propCount > 0 ? 'plus de' : 'des'} biens off-market.`);
  if ((contacts ?? []).includes('agent_immo')) paras.push(`Sofia Merlo a négocié tes achats à −5 %.`);

  // Stress
  if (stress > 75)      paras.push(`⚠️ Le stress atteint ${Math.round(stress)}/100. Il faut agir avant que la jauge déborde.`);
  else if (stress < 20) paras.push(`Niveau de stress minimal — tu gères sereinement.`);

  return paras;
}

export default function YearReportModal() {
  const { state, dismissYearReport } = useGame();
  const report = state.yearReport;
  const overlayRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for entry animation
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  if (!report) return null;

  const { year, age, finance, valuation, cash, propCount, rentedCount, stress } = report;
  const narrative = generateNarrative(report);

  const tableRows = [
    { label: '📬 Loyers encaissés',  value: fmtCash(finance.loyers ?? 0),                positive: true,  show: (finance.loyers ?? 0) > 0 },
    { label: '🏠 Acquisitions',      value: `−${fmtCash(Math.abs(finance.achats ?? 0))}`, positive: false, show: (finance.achats ?? 0) < 0 },
    { label: '💸 Ventes',            value: `+${fmtCash(finance.ventes ?? 0)}`,            positive: true,  show: (finance.ventes ?? 0) > 0 },
    { label: '💳 Remboursements',    value: `−${fmtCash(Math.abs(finance.credits ?? 0))}`,positive: false, show: (finance.credits ?? 0) < 0 },
    { label: '⚡ Évènements',         value: `${(finance.evenements ?? 0) >= 0 ? '+' : ''}${fmtCash(finance.evenements ?? 0)}`, positive: (finance.evenements ?? 0) >= 0, show: (finance.evenements ?? 0) !== 0 },
  ].filter(r => r.show);

  const stressColor = stress > 75 ? 'var(--red)' : stress > 45 ? 'var(--amber)' : 'var(--accent)';

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity .25s' }}
    >
      <div
        className="modal-sheet year-report-sheet"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'transform .3s cubic-bezier(.2,.8,.2,1)',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 18px 0',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 14,
          background: 'var(--accent-soft)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Bilan annuel
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                Année {year} · {age} ans
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Patrimoine immo.</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtCash(valuation)}
              </div>
            </div>
          </div>

          {/* Mini stats row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Biens', value: propCount },
              { label: 'Loués', value: rentedCount },
              { label: 'Tréso.', value: fmtCash(cash) },
              { label: 'Stress', value: `${Math.round(stress)}`, color: stressColor },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 50 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: s.color ?? 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wealth chart */}
        {(state.wealthHistory ?? []).length >= 2 && (
          <div style={{ padding: '14px 14px 0' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Évolution du patrimoine</div>
            <WealthChart history={state.wealthHistory} />
          </div>
        )}

        {/* Narrative */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {narrative.map((para, i) => (
            <p key={i} style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: para.startsWith('⚠️') ? 'var(--red)' : 'var(--text)',
              padding: '8px 12px',
              background: i === 0 ? 'var(--surface2)' : 'transparent',
              borderRadius: i === 0 ? 10 : 0,
              borderLeft: i === 0 ? '3px solid var(--accent)' : 'none',
            }}>
              {para}
            </p>
          ))}
        </div>

        {/* Finance table */}
        {tableRows.length > 0 && (
          <div style={{ padding: '0 18px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Détail financier</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tableRows.map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  fontSize: 12,
                }}>
                  <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: row.positive ? 'var(--accent)' : 'var(--red)',
                  }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '0 18px 24px' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', fontSize: 15, padding: '13px 0' }}
            onClick={dismissYearReport}
          >
            Continuer l'aventure →
          </button>
        </div>
      </div>
    </div>
  );
}
