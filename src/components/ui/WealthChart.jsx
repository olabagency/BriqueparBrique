import React from 'react';
import { fmtCash } from '../../engine/utils.js';

const W = 320, H = 90;
const PAD = { top: 10, bottom: 22, left: 6, right: 6 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

export default function WealthChart({ history }) {
  if (!history || history.length < 2) return null;

  const maxVal = Math.max(...history.map(h => h.valuation), 1);
  const pts = history.map((h, i) => ({
    x: PAD.left + (i / (history.length - 1)) * CW,
    y: PAD.top + (1 - h.valuation / maxVal) * CH,
    ...h,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${pts[0].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;

  // Label every ~5 points, always include first and last
  const labelStep = Math.max(1, Math.floor(pts.length / 5));
  const labelPts = pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % labelStep === 0);

  const gradId = 'wc-grad';

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Évolution du patrimoine">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line
            key={f}
            x1={PAD.left} y1={PAD.top + f * CH}
            x2={W - PAD.right} y2={PAD.top + f * CH}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots and labels */}
        {labelPts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5" />
            <text
              x={p.x}
              y={H - 4}
              textAnchor={i === 0 ? 'start' : i === labelPts.length - 1 ? 'end' : 'middle'}
              fontSize="7"
              fill="var(--muted)"
              fontFamily="'JetBrains Mono', monospace"
            >
              {p.age}
            </text>
          </g>
        ))}

        {/* Max value label */}
        <text x={W - PAD.right} y={PAD.top - 2} textAnchor="end" fontSize="7.5" fill="var(--accent)" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
          {fmtCash(maxVal)}
        </text>
      </svg>
    </div>
  );
}
