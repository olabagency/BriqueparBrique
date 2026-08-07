import React, { useState, useEffect } from 'react';
import catalog from '../data/luxury_items.json';

const STORAGE_KEY = 'bbq_admin_overrides';
const PASSWORD    = '2257';

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}

function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/* ── Auth screen ─────────────────────────────────────── */
function LoginScreen({ onAuth }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (pw === PASSWORD) { onAuth(); }
    else { setErr(true); setPw(''); setTimeout(() => setErr(false), 1500); }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1410', fontFamily: "'Inter', sans-serif",
    }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 300 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center' }}>🔐 Admin</div>
        <div style={{ fontSize: 12, color: '#6b7c6b', textAlign: 'center' }}>Brique par Brique — back-office</div>
        <input
          type="password"
          autoFocus
          placeholder="Mot de passe"
          value={pw}
          onChange={e => setPw(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 10, fontSize: 15,
            background: '#1a221a', border: `1px solid ${err ? '#c0392b' : '#2d3d2d'}`,
            color: '#fff', outline: 'none', transition: 'border .2s',
          }}
        />
        {err && <div style={{ color: '#e74c3c', fontSize: 12, textAlign: 'center' }}>Mot de passe incorrect</div>}
        <button
          type="submit"
          style={{
            padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14,
            background: '#1B6B44', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          Accéder →
        </button>
      </form>
    </div>
  );
}

/* ── Main admin ──────────────────────────────────────── */
const CATEGORIES = ['Toutes', 'Montres', 'Voitures', 'Avions', 'Bateaux', 'Art', 'Bijoux', 'Mode', 'Vins & Spiritueux', 'Instruments'];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [filterCat, setFilterCat] = useState('Toutes');
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { setOverrides(loadOverrides()); }, []);

  const handleSave = () => {
    saveOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = (id) => {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
  };

  const setField = (id, field, val) => {
    setOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: val },
    }));
  };

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  const displayed = catalog.filter(item => {
    if (filterCat !== 'Toutes' && item.category !== filterCat) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasChanges = JSON.stringify(overrides) !== JSON.stringify(loadOverrides());
  const modifiedCount = Object.keys(overrides).length;

  return (
    <div style={{
      minHeight: '100dvh', background: '#0f1410', fontFamily: "'Inter', sans-serif",
      color: '#e8ede8', padding: '24px 20px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>🏪 Gestion boutique</div>
            <div style={{ fontSize: 12, color: '#6b7c6b', marginTop: 2 }}>
              {modifiedCount} article{modifiedCount !== 1 ? 's' : ''} modifié{modifiedCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 12, color: '#1B6B44', fontWeight: 700 }}>✓ Sauvegardé</span>}
            <button
              onClick={handleSave}
              style={{
                padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                background: '#1B6B44', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              💾 Sauvegarder
            </button>
          </div>
        </div>

        {/* Info notice */}
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(27,107,68,.12)', border: '1px solid rgba(27,107,68,.3)',
          fontSize: 12, color: '#8ab89a',
        }}>
          Les modifications sont appliquées immédiatement en jeu après sauvegarde. Les champs vides utilisent les valeurs par défaut du catalogue.
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12,
              background: '#1a221a', border: '1px solid #2d3d2d', color: '#fff', outline: 'none',
              minWidth: 180,
            }}
          />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: filterCat === cat ? '#1B6B44' : '#1a221a',
                border: `1px solid ${filterCat === cat ? '#1B6B44' : '#2d3d2d'}`,
                color: filterCat === cat ? '#fff' : '#8ab89a',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(item => {
            const ov = overrides[item.id] ?? {};
            const isModified = !!overrides[item.id];
            const currentPrice = ov.price !== undefined ? ov.price : item.price;
            const currentImage = ov.image !== undefined ? ov.image : (item.image ?? '');

            return (
              <div
                key={item.id}
                style={{
                  background: '#1a221a',
                  border: `1px solid ${isModified ? 'rgba(27,107,68,.5)' : '#2d3d2d'}`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 3fr auto',
                  gap: 12, alignItems: 'center',
                }}
              >
                {/* Identity */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    {isModified && <span style={{ fontSize: 9, background: '#1B6B44', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>modifié</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7c6b', marginTop: 2 }}>{item.brand} · {item.category}</div>
                  <div style={{ fontSize: 10, color: '#4a5a4a', marginTop: 1, fontFamily: 'monospace' }}>{item.id}</div>
                </div>

                {/* Price */}
                <div>
                  <div style={{ fontSize: 10, color: '#6b7c6b', marginBottom: 4 }}>Prix (k€)</div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={currentPrice}
                    onChange={e => setField(item.id, 'price', Number(e.target.value))}
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                      background: '#0f1410', border: '1px solid #2d3d2d', color: '#fff',
                      outline: 'none', fontFamily: 'monospace',
                    }}
                  />
                  {isModified && ov.price !== undefined && ov.price !== item.price && (
                    <div style={{ fontSize: 9, color: '#6b7c6b', marginTop: 2 }}>défaut : {item.price} k€</div>
                  )}
                </div>

                {/* Image URL */}
                <div>
                  <div style={{ fontSize: 10, color: '#6b7c6b', marginBottom: 4 }}>URL image</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {currentImage && (
                      <img
                        src={currentImage}
                        alt=""
                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#0f1410' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <input
                      type="text"
                      placeholder="https://…"
                      value={currentImage}
                      onChange={e => setField(item.id, 'image', e.target.value)}
                      style={{
                        flex: 1, padding: '6px 8px', borderRadius: 7, fontSize: 11,
                        background: '#0f1410', border: '1px solid #2d3d2d', color: '#a0c0a0',
                        outline: 'none', fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => handleReset(item.id)}
                  disabled={!isModified}
                  style={{
                    padding: '6px 10px', borderRadius: 7, fontSize: 11,
                    background: 'transparent',
                    border: `1px solid ${isModified ? '#c0392b44' : '#2d3d2d'}`,
                    color: isModified ? '#e74c3c' : '#3a4a3a',
                    cursor: isModified ? 'pointer' : 'default',
                  }}
                  title="Réinitialiser aux valeurs par défaut"
                >
                  ↩
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer save */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '11px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              background: '#1B6B44', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            💾 Sauvegarder les modifications
          </button>
        </div>
      </div>
    </div>
  );
}
