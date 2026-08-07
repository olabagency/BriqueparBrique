import React, { useState, useEffect } from 'react';
import catalog from '../data/luxury_items.json';
import { GAME_CONFIG } from '../config.js';
import {
  fetchShopOverrides, saveShopOverrides,
  fetchConfigOverrides, saveConfigOverrides,
} from '../engine/adminOverrides.js';

const PASSWORD = '2257';
const CATEGORIES = ['Toutes', 'Montres', 'Voitures', 'Avions', 'Bateaux', 'Art', 'Bijoux', 'Mode', 'Vins & Spiritueux', 'Instruments'];

/* ── Styles helpers ─────────────────────────────────── */
const S = {
  page:   { minHeight: '100dvh', background: '#0f1410', fontFamily: "'Inter', sans-serif", color: '#e8ede8', padding: '24px 20px' },
  card:   { background: '#1a221a', border: '1px solid #2d3d2d', borderRadius: 12, padding: '14px 16px' },
  input:  { padding: '6px 8px', borderRadius: 7, fontSize: 12, background: '#0f1410', border: '1px solid #2d3d2d', color: '#fff', outline: 'none' },
  label:  { fontSize: 10, color: '#6b7c6b', marginBottom: 4, display: 'block' },
  badge:  { fontSize: 9, background: '#1B6B44', color: '#fff', padding: '1px 5px', borderRadius: 4 },
  btn:    (active) => ({ padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: active ? '#1B6B44' : '#1a221a', color: active ? '#fff' : '#8ab89a', border: `1px solid ${active ? '#1B6B44' : '#2d3d2d'}`, cursor: 'pointer' }),
};

/* ── Login ───────────────────────────────────────────── */
function LoginScreen({ onAuth }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (pw === PASSWORD) { onAuth(); }
    else { setErr(true); setPw(''); setTimeout(() => setErr(false), 1500); }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1410', fontFamily: "'Inter', sans-serif" }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 300 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center' }}>🔐 Admin</div>
        <div style={{ fontSize: 12, color: '#6b7c6b', textAlign: 'center' }}>Brique par Brique</div>
        <input
          type="password" autoFocus placeholder="Mot de passe"
          value={pw} onChange={e => setPw(e.target.value)}
          style={{ ...S.input, padding: '10px 14px', fontSize: 15, border: `1px solid ${err ? '#c0392b' : '#2d3d2d'}` }}
        />
        {err && <div style={{ color: '#e74c3c', fontSize: 12, textAlign: 'center' }}>Mot de passe incorrect</div>}
        <button type="submit" style={{ ...S.btn(true), padding: '10px', fontSize: 14 }}>Accéder →</button>
      </form>
    </div>
  );
}

/* ── Shop tab ────────────────────────────────────────── */
function ShopTab() {
  const [overrides, setOverrides] = useState({});
  const [filterCat, setFilterCat] = useState('Toutes');
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState(null); // 'saving' | 'saved' | 'error'
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchShopOverrides().then(data => { setOverrides(data); setLoading(false); });
  }, []);

  const setField = (id, field, val) => setOverrides(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  const resetItem = (id) => setOverrides(prev => { const next = { ...prev }; delete next[id]; return next; });

  const handleSave = async () => {
    setStatus('saving');
    try {
      await saveShopOverrides(overrides);
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch { setStatus('error'); setTimeout(() => setStatus(null), 3000); }
  };

  const displayed = catalog.filter(item => {
    if (filterCat !== 'Toutes' && item.category !== filterCat) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div style={{ color: '#6b7c6b', textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text" placeholder="Rechercher un article…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...S.input, minWidth: 200, flex: '1 1 200px' }}
        />
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            style={{ ...S.btn(filterCat === cat), padding: '5px 12px', fontSize: 11 }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {displayed.map(item => {
          const ov = overrides[item.id] ?? {};
          const isModified = !!overrides[item.id];
          const price = ov.price !== undefined ? ov.price : item.price;
          const image = ov.image !== undefined ? ov.image : (item.image ?? '');

          return (
            <div key={item.id} style={{
              ...S.card,
              display: 'grid', gridTemplateColumns: '2fr 1fr 3fr auto',
              gap: 12, alignItems: 'center',
              borderColor: isModified ? 'rgba(27,107,68,.5)' : '#2d3d2d',
            }}>
              {/* Identity */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{item.icon}</span><span>{item.name}</span>
                  {isModified && <span style={S.badge}>modifié</span>}
                </div>
                <div style={{ fontSize: 10, color: '#6b7c6b', marginTop: 2 }}>{item.brand} · {item.category}</div>
                <div style={{ fontSize: 9, color: '#3a4a3a', fontFamily: 'monospace' }}>{item.id}</div>
              </div>

              {/* Price */}
              <div>
                <label style={S.label}>Prix (k€)</label>
                <input type="number" step="1" min="1" value={price}
                  onChange={e => setField(item.id, 'price', Number(e.target.value))}
                  style={{ ...S.input, width: '100%', fontWeight: 700, fontFamily: 'monospace' }}
                />
                {isModified && ov.price !== undefined && Number(ov.price) !== item.price && (
                  <div style={{ fontSize: 9, color: '#6b7c6b', marginTop: 2 }}>défaut : {item.price} k€</div>
                )}
              </div>

              {/* Image URL */}
              <div>
                <label style={S.label}>URL image</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {image && (
                    <img src={image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#0f1410' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <input type="text" placeholder="https://…" value={image}
                    onChange={e => setField(item.id, 'image', e.target.value)}
                    style={{ ...S.input, flex: 1, color: '#a0c0a0', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Reset */}
              <button onClick={() => resetItem(item.id)} disabled={!isModified}
                style={{ padding: '6px 10px', borderRadius: 7, fontSize: 12, background: 'transparent', border: `1px solid ${isModified ? '#c0392b44' : '#2d3d2d'}`, color: isModified ? '#e74c3c' : '#3a4a3a', cursor: isModified ? 'pointer' : 'default' }}
                title="Réinitialiser">↩</button>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <SaveBar status={status} onSave={handleSave} count={Object.keys(overrides).length} noun="article" />
    </>
  );
}

/* ── Config tab ──────────────────────────────────────── */
const CONFIG_FIELDS = [
  { key: 'STARTING_CASH',                 label: 'Tréso de départ (k€)',        type: 'number', hint: 'Montant en k€ disponible dans la trésorerie d\'entreprise au début de chaque partie. Valeur typique : 25 k€.' },
  { key: 'STARTING_AGE',                  label: 'Âge de départ',               type: 'number', hint: 'Âge du joueur à la création de sa partie. Influe sur le temps restant avant la retraite.' },
  { key: 'STARTING_STRESS',               label: 'Stress de départ',            type: 'number', hint: 'Niveau de stress initial (0–100). Plus c\'est élevé, plus le joueur démarre sous pression.' },
  { key: 'CASH_CRISIS_THRESHOLD',         label: 'Seuil crise tréso (k€)',      type: 'number', hint: 'En dessous de cette valeur (k€), la trésorerie est considérée en crise et peut déclencher un game over. Mettre négatif pour tolérer un découvert.' },
  { key: 'STRESS_CRISIS_THRESHOLD',       label: 'Seuil crise stress',          type: 'number', hint: 'Au-dessus de ce seuil (0–100), le joueur entre en zone de burn-out et risque un game over.' },
  { key: 'EVENTS_PER_YEAR_MIN',           label: 'Événements/an (min)',         type: 'number', hint: 'Nombre minimum d\'événements aléatoires tirés chaque année. Augmenter pour plus d\'intensité.' },
  { key: 'EVENTS_PER_YEAR_MAX',           label: 'Événements/an (max)',         type: 'number', hint: 'Nombre maximum d\'événements aléatoires par an. Le nombre réel est tiré entre min et max.' },
  { key: 'MARKET_SIZE',                   label: 'Biens affichés au marché',    type: 'number', hint: 'Nombre d\'annonces immobilières générées à chaque chargement du marché. Plus = plus de choix.' },
  { key: 'MARKET_MAX_REFRESH',            label: 'Actualisations marché/an',    type: 'number', hint: 'Nombre maximum de fois que le joueur peut rafraîchir le marché immobilier par année.' },
  { key: 'BANK_OPS_PER_YEAR_MAX',         label: 'Opérations bancaires/an',     type: 'number', hint: 'Nombre de transferts autorisés entre trésorerie et épargne personnelle par an (retraits + injections cumulés).' },
  { key: 'PROPERTY_LOAN_RATE',            label: 'LTV crédit immobilier (%)',   type: 'pct',    hint: 'Quotité maximale financée par emprunt (loan-to-value). À 80 %, un bien à 100 k€ peut être financé jusqu\'à 80 k€ en crédit.' },
  { key: 'PROPERTY_LOAN_INTEREST',        label: 'Taux d\'intérêt crédit (%)', type: 'pct',    hint: 'Taux d\'intérêt annuel appliqué aux crédits immobiliers. Modifiable pour simuler un marché tendu ou favorable.' },
  { key: 'PROPERTY_RENT_RATIO',           label: 'Rendement locatif (%)',       type: 'pct',    hint: 'Loyer annuel brut exprimé en % de la valeur du bien. À 9 %, un bien à 100 k€ génère 9 k€/an en loyer.' },
  { key: 'RETIREMENT_MIN_AGE',            label: 'Âge minimum retraite',        type: 'number', hint: 'Âge à partir duquel le joueur peut volontairement prendre sa retraite et clôturer la partie.' },
  { key: 'GAME_OVER_MAX_AGE',             label: 'Âge maximum (game over)',     type: 'number', hint: 'Âge auquel la partie se termine automatiquement si le joueur n\'a pas encore pris sa retraite.' },
  { key: 'GOLD_INGOT_PRICE',              label: 'Prix lingot d\'or (k€)',      type: 'number', hint: 'Prix d\'achat d\'un lingot d\'or en k€. À la revente, le prix varie aléatoirement entre min et max return.' },
  { key: 'ECONOMIC_CYCLE_FIRST_YEAR_MIN', label: 'Premier cycle éco (an min)', type: 'number', hint: 'Année minimale à partir de laquelle le premier changement de cycle économique (hausse/baisse) peut survenir.' },
  { key: 'ECONOMIC_CYCLE_DURATION_MIN',   label: 'Durée cycle éco (min, ans)', type: 'number', hint: 'Durée minimale en années d\'un cycle économique (haussier, neutre ou baissier) avant qu\'il ne change.' },
  { key: 'ECONOMIC_CYCLE_DURATION_MAX',   label: 'Durée cycle éco (max, ans)', type: 'number', hint: 'Durée maximale en années d\'un cycle économique. La durée réelle est tirée entre min et max.' },
];

function ConfigTab() {
  const [values, setValues]   = useState({});
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigOverrides().then(data => { setValues(data); setLoading(false); });
  }, []);

  const set_ = (key, val) => setValues(prev => ({ ...prev, [key]: val }));
  const reset = (key) => setValues(prev => { const n = { ...prev }; delete n[key]; return n; });

  const getVal = (key, type) => {
    if (values[key] !== undefined) return values[key];
    const base = GAME_CONFIG[key];
    return type === 'pct' ? Math.round(base * 100) : base;
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      // Store pct fields as decimals
      const toSave = {};
      CONFIG_FIELDS.forEach(({ key, type }) => {
        if (values[key] !== undefined) {
          toSave[key] = type === 'pct' ? values[key] / 100 : Number(values[key]);
        }
      });
      await saveConfigOverrides(toSave);
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch { setStatus('error'); setTimeout(() => setStatus(null), 3000); }
  };

  if (loading) return <div style={{ color: '#6b7c6b', textAlign: 'center', padding: 40 }}>Chargement…</div>;

  const modifiedCount = Object.keys(values).length;

  return (
    <>
      <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 20, background: 'rgba(27,107,68,.1)', border: '1px solid rgba(27,107,68,.25)', fontSize: 12, color: '#8ab89a' }}>
        ⚡ Les valeurs de config s'appliquent au démarrage des <strong>nouvelles parties</strong>. Les parties en cours ne sont pas affectées.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 24 }}>
        {CONFIG_FIELDS.map(({ key, label, type, hint }) => {
          const isModified = values[key] !== undefined;
          const defaultVal = type === 'pct' ? Math.round(GAME_CONFIG[key] * 100) : GAME_CONFIG[key];
          const currentVal = getVal(key, type);

          return (
            <div key={key} style={{ ...S.card, borderColor: isModified ? 'rgba(27,107,68,.5)' : '#2d3d2d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {label}
                    {isModified && <span style={S.badge}>modifié</span>}
                  </div>
                  <div style={{ fontSize: 9, color: '#3a4a3a', fontFamily: 'monospace', marginTop: 2 }}>{key}</div>
                </div>
                <button onClick={() => reset(key)} disabled={!isModified}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'transparent', border: `1px solid ${isModified ? '#c0392b44' : '#2d3d2d'}`, color: isModified ? '#e74c3c' : '#3a4a3a', cursor: isModified ? 'pointer' : 'default', flexShrink: 0 }}>
                  ↩
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="number"
                  step={type === 'pct' ? '0.1' : '1'}
                  value={currentVal}
                  onChange={e => set_(key, Number(e.target.value))}
                  style={{ ...S.input, flex: 1, fontWeight: 700, fontFamily: 'monospace', fontSize: 16 }}
                />
                {type === 'pct' && <span style={{ fontSize: 12, color: '#6b7c6b' }}>%</span>}
              </div>
              <div style={{ fontSize: 10, color: '#5a7a5a', lineHeight: 1.5, borderTop: '1px solid #1e2e1e', paddingTop: 7 }}>
                {hint}
              </div>
              {isModified && Number(currentVal) !== Number(defaultVal) && (
                <div style={{ fontSize: 9, color: '#6b7c6b', marginTop: 5 }}>
                  défaut : {defaultVal}{type === 'pct' ? ' %' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SaveBar status={status} onSave={handleSave} count={modifiedCount} noun="paramètre" />
    </>
  );
}

/* ── SaveBar ─────────────────────────────────────────── */
function SaveBar({ status, onSave, count, noun }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
      {status === 'saving' && <span style={{ fontSize: 12, color: '#6b7c6b' }}>Sauvegarde…</span>}
      {status === 'saved'  && <span style={{ fontSize: 12, color: '#1B6B44', fontWeight: 700 }}>✓ Sauvegardé dans Firebase</span>}
      {status === 'error'  && <span style={{ fontSize: 12, color: '#e74c3c' }}>❌ Erreur Firebase</span>}
      {!status && count > 0 && <span style={{ fontSize: 12, color: '#6b7c6b' }}>{count} {noun}{count > 1 ? 's' : ''} modifié{count > 1 ? 's' : ''}</span>}
      <button onClick={onSave} disabled={status === 'saving'}
        style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#1B6B44', color: '#fff', border: 'none', cursor: 'pointer', opacity: status === 'saving' ? 0.6 : 1 }}>
        💾 Sauvegarder
      </button>
    </div>
  );
}

/* ── Root ────────────────────────────────────────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab]       = useState('shop');

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>🏗️ Back-office</div>
            <div style={{ fontSize: 12, color: '#6b7c6b', marginTop: 2 }}>Brique par Brique — données Firebase</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTab('shop')}   style={S.btn(tab === 'shop')}>🛍️ Boutique</button>
            <button onClick={() => setTab('config')} style={S.btn(tab === 'config')}>⚙️ Config</button>
          </div>
        </div>

        {tab === 'shop'   && <ShopTab />}
        {tab === 'config' && <ConfigTab />}
      </div>
    </div>
  );
}
