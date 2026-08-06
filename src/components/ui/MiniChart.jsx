import React from 'react';

const W = 240;
const H = 60;
const PAD = 6;

function toPoints(data, key, minY, maxY) {
  if (data.length < 2) return '';
  const rangeY = maxY - minY || 1;
  return data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d[key] - minY) / rangeY) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function MiniChart({ history, keys = ['cash', 'personalCash'] }) {
  if (!history || history.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 11 }}>
        Données insuffisantes
      </div>
    );
  }

  const colors = { cash: 'var(--accent)', personalCash: 'var(--blue)', valuation: 'var(--amber)' };
  const labels = { cash: 'Trésorerie', personalCash: 'Épargne', valuation: 'Parc' };

  const allVals = history.flatMap(d => keys.map(k => d[k] ?? 0));
  const minY = Math.min(0, ...allVals);
  const maxY = Math.max(1, ...allVals);

  // Zero line position
  const zeroY = H - PAD - ((0 - minY) / (maxY - minY || 1)) * (H - PAD * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}>
        {/* Zero line */}
        {minY < 0 && (
          <line
            x1={PAD} y1={zeroY.toFixed(1)} x2={W - PAD} y2={zeroY.toFixed(1)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3"
          />
        )}
        {/* Lines */}
        {keys.map(k => (
          <polyline
            key={k}
            points={toPoints(history, k, minY, maxY)}
            fill="none"
            stroke={colors[k] ?? 'var(--muted)'}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />
        ))}
        {/* Last point dot */}
        {keys.map(k => {
          const last = history[history.length - 1];
          const x = W - PAD;
          const rangeY = maxY - minY || 1;
          const y = H - PAD - ((last[k] - minY) / rangeY) * (H - PAD * 2);
          return <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill={colors[k] ?? 'var(--muted)'} />;
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 4 }}>
        {keys.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 2, background: colors[k] ?? 'var(--muted)', display: 'inline-block', borderRadius: 1 }} />
            {labels[k] ?? k}
          </div>
        ))}
      </div>
    </div>
  );
}
