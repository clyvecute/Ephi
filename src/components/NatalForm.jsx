/**
 * src/components/NatalForm.jsx
 * Birth data entry form — improved UX with stepped layout,
 * auto-timezone from city geocoding, and a live preview panel.
 */
import { useState, useRef, useMemo } from 'react';
import { geocodeCity } from '../lib/geocoding.js';
import { UiIcon } from './EphiIcons.jsx';

// ─── Timezone auto-detect from longitude ─────────────────────────────────────
function guessTimezoneFromCoords(lat, lon) {
  // Use the browser's Intl API with a heuristic offset
  // A proper solution would use geotz, but this covers most cases
  try {
    const offset = Math.round(lon / 15);
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset).toString().padStart(2, '0');
    // Try to find a real IANA timezone from the offset
    const zones = Intl.supportedValuesOf('timeZone');
    // Find zones that contain the rough offset in their name or match continent
    // Prefer named zones to Etc/GMT offsets
    const etcZone = `Etc/GMT${offset !== 0 ? (offset > 0 ? `-${offset}` : `+${Math.abs(offset)}`) : ''}`;
    return zones.includes(etcZone) ? etcZone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

// ─── Sign from date helper (rough, just for preview) ─────────────────────────
function getSunSignPreview(dateStr) {
  if (!dateStr) return null;
  const [, m, d] = dateStr.split('-').map(Number);
  const SIGNS = [
    [3,21,'Aries'],[4,20,'Taurus'],[5,21,'Gemini'],[6,21,'Cancer'],
    [7,23,'Leo'],[8,23,'Virgo'],[9,23,'Libra'],[10,23,'Scorpio'],
    [11,22,'Sagittarius'],[12,22,'Capricorn'],[1,20,'Aquarius'],[2,19,'Pisces'],
  ];
  for (const [sm, sd, sign] of SIGNS) {
    if (m === sm && d >= sd) return sign;
  }
  // Default: first of the next group
  for (const [sm, sd, sign] of SIGNS) {
    if (m === sm) return SIGNS[(SIGNS.findIndex(s => s[2] === sign) + 11) % 12][2];
  }
  return null;
}

const SIGN_GLYPHS = {
  Aries:'♈',Taurus:'♉',Gemini:'♊',Cancer:'♋',Leo:'♌',Virgo:'♍',
  Libra:'♎',Scorpio:'♏',Sagittarius:'♐',Capricorn:'♑',Aquarius:'♒',Pisces:'♓',
};

const HOUSE_SYSTEMS = [
  { id: 'P', label: 'Placidus', desc: 'Most popular in Western astrology' },
  { id: 'W', label: 'Whole Sign', desc: 'Ancient Hellenistic — 1 sign = 1 house' },
  { id: 'K', label: 'Koch', desc: 'Common in German-speaking countries' },
  { id: 'O', label: 'Porphyry', desc: 'Simple trisection of quadrants' },
  { id: 'R', label: 'Regiomontanus', desc: 'Traditional horary choice' },
];

export default function NatalForm({
  initialData,
  onSave,
  onCancel,
  loading,
  error,
  title = 'Your Birth Chart',
  buttonText = 'Generate Natal Chart',
}) {
  const [form, setForm] = useState({
    name:       initialData?.name      || '',
    date:       initialData?.date      || '',
    time:       initialData?.time      || '',
    city:       initialData?.city      || '',
    lat:        initialData?.lat       || '',
    lon:        initialData?.lon       || '',
    timezone:   initialData?.timezone  || Intl.DateTimeFormat().resolvedOptions().timeZone,
    sidereal:   initialData?.sidereal  || false,
    gender:     initialData?.gender    || 'male',
    houseSystem:initialData?.houseSystem || 'P',
    precision:  true,
  });

  const [cityQuery,   setCityQuery]   = useState(initialData?.city || '');
  const [cityResults, setCityResults] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError,   setCityError]   = useState('');
  const [cityPinned,  setCityPinned]  = useState(!!(initialData?.lat && initialData?.city));
  const [showTzPicker, setShowTzPicker] = useState(false);
  const searchTimer = useRef(null);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleCityInput(val) {
    setCityQuery(val);
    setCityPinned(false);
    setCityError('');
    set('city', val);
    if (val.length < 2) { setCityResults([]); return; }

    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const results = await geocodeCity(val);
        setCityResults(results.slice(0, 6));
      } catch {
        setCityError('Could not search cities. Check connection.');
      } finally {
        setCityLoading(false);
      }
    }, 400);
  }

  function selectCity(result) {
    const lat = result.lat.toFixed(4);
    const lon = result.lon.toFixed(4);
    const displayCity = result.display_name.split(',').slice(0, 2).join(', ');
    set('city', displayCity);
    set('lat', lat);
    set('lon', lon);
    // Auto-detect timezone from coordinates
    const tz = guessTimezoneFromCoords(parseFloat(lat), parseFloat(lon));
    set('timezone', tz);
    setCityQuery(displayCity);
    setCityResults([]);
    setCityPinned(true);
  }

  async function handleGeolocate() {
    if (!navigator.geolocation) return;
    setCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const latStr = lat.toFixed(4);
        const lonStr = lon.toFixed(4);
        set('lat', latStr);
        set('lon', lonStr);
        set('city', 'Current Location');
        const tz = guessTimezoneFromCoords(lat, lon);
        set('timezone', tz);
        setCityQuery('Current Location');
        setCityPinned(true);
        setCityLoading(false);
      },
      () => { setCityLoading(false); setCityError('Location access denied.'); }
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name:        form.name,
      date:        form.date,
      time:        form.time,
      city:        form.city || cityQuery,
      lat:         parseFloat(form.lat),
      lon:         parseFloat(form.lon),
      timezone:    form.timezone,
      sidereal:    form.sidereal,
      gender:      form.gender,
      houseSystem: form.houseSystem,
      precision:   true,
    });
  }

  const sunSignPreview = useMemo(() => getSunSignPreview(form.date), [form.date]);
  const isReadyForPreview = form.date && form.time && cityPinned;

  return (
    <div className="card" style={{ maxWidth: 600, width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '0.4rem' }}>
          Birth Chart Generator
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>{title}</div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Section 1: Identity ─────────────────────────────────── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '16px', height: '1px', background: 'var(--border)' }} />
            Identity
          </div>
          <input
            id="natal-name"
            className="form-input"
            placeholder="Full name or alias..."
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* ── Section 2: Time ─────────────────────────────────────── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '16px', height: '1px', background: 'var(--border)' }} />
            Date &amp; Time of Birth
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Birth Date</label>
              <input
                id="natal-date"
                type="date"
                className="form-input"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
                style={{ colorScheme: 'dark', marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>
                Birth Time
                <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>(use 12:00 if unknown)</span>
              </label>
              <input
                id="natal-time"
                type="time"
                className="form-input"
                value={form.time}
                onChange={e => set('time', e.target.value)}
                required
                style={{ colorScheme: 'dark', marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Location ─────────────────────────────────── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '16px', height: '1px', background: 'var(--border)' }} />
            Birth Location
          </div>

          {/* City search */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  id="natal-city"
                  className="form-input"
                  placeholder="Search city or place..."
                  value={cityQuery}
                  onChange={e => handleCityInput(e.target.value)}
                  autoComplete="off"
                  style={{
                    marginBottom: 0,
                    paddingRight: cityPinned ? '2.5rem' : undefined,
                    borderColor: cityPinned ? 'var(--harmonic)' : undefined,
                  }}
                />
                {cityPinned && (
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--harmonic)', fontSize: '0.9rem' }}>✓</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.65rem 0.85rem', flexShrink: 0 }}
                onClick={handleGeolocate}
                title="Use my current location"
              >
                <UiIcon name="pin" size={16} />
              </button>
            </div>

            {cityLoading && (
              <div style={{ position: 'absolute', right: 52, top: 12 }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
              </div>
            )}

            {cityResults.length > 0 && (
              <div className="search-results" style={{ zIndex: 100 }}>
                {cityResults.map((r, i) => (
                  <div key={i} className="search-result-item" onClick={() => selectCity(r)}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.display_name.split(',').slice(0, 2).join(', ')}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.display_name}</span>
                  </div>
                ))}
              </div>
            )}
            {cityError && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>{cityError}</div>}
          </div>

          {/* Coordinates (shown only when pinned) */}
          {cityPinned && form.lat && form.lon && (
            <div style={{
              display: 'flex', gap: '0.75rem', padding: '0.65rem 1rem',
              background: 'var(--bg-deep)', borderRadius: '8px',
              border: '1px solid var(--border)', fontSize: '0.75rem',
              color: 'var(--text-secondary)', marginBottom: '0.75rem',
              flexWrap: 'wrap', alignItems: 'center'
            }}>
              <span>📍 <strong>{parseFloat(form.lat).toFixed(3)}°{parseFloat(form.lat) >= 0 ? 'N' : 'S'}</strong></span>
              <span><strong>{parseFloat(form.lon).toFixed(3)}°{parseFloat(form.lon) >= 0 ? 'E' : 'W'}</strong></span>
              <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 600 }}>🕒 {form.timezone}</span>
            </div>
          )}

          {/* Manual lat/lon override */}
          <details style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <summary style={{ userSelect: 'none', marginBottom: '0.5rem' }}>Override coordinates manually</summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <input id="natal-lat" className="form-input" placeholder="Latitude (e.g. 14.5995)" value={form.lat}
                onChange={e => { set('lat', e.target.value); setCityPinned(true); }} style={{ marginBottom: 0 }} />
              <input id="natal-lon" className="form-input" placeholder="Longitude (e.g. 120.9842)" value={form.lon}
                onChange={e => { set('lon', e.target.value); setCityPinned(true); }} style={{ marginBottom: 0 }} />
            </div>
          </details>
        </div>

        {/* ── Section 4: Astrological Options ─────────────────────── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '16px', height: '1px', background: 'var(--border)' }} />
            Chart Options
          </div>

          {/* Zodiac System */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Zodiac System</label>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button type="button"
                className={`btn ${!form.sidereal ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '7px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => set('sidereal', false)}
              >
                🌞 Tropical (Western)
              </button>
              <button type="button"
                className={`btn ${form.sidereal ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '7px', fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => set('sidereal', true)}
              >
                ⭐ Sidereal (Vedic)
              </button>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' }}>
              {form.sidereal ? 'Lahiri Ayanamsa — aligns signs with fixed constellations.' : 'Seasonal zodiac aligned with the Spring Equinox.'}
            </p>
          </div>

          {/* House System */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>House System</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {HOUSE_SYSTEMS.map(hs => (
                <button
                  key={hs.id}
                  type="button"
                  title={hs.desc}
                  className={`btn ${form.houseSystem === hs.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '5px 12px', fontSize: '0.72rem', borderRadius: '4px' }}
                  onClick={() => set('houseSystem', hs.id)}
                >
                  {hs.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' }}>
              {HOUSE_SYSTEMS.find(h => h.id === form.houseSystem)?.desc}
            </p>
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Gender (for BaZi &amp; Hellenistic cycles)</label>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {['male','female','non-binary'].map(g => (
                <button
                  key={g}
                  type="button"
                  className={`btn ${form.gender === g ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, padding: '7px', fontSize: '0.72rem', borderRadius: '4px', textTransform: 'capitalize' }}
                  onClick={() => set('gender', g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live Preview Panel ────────────────────────────────────── */}
        {isReadyForPreview && (
          <div style={{
            padding: '1rem 1.25rem', marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, rgba(201,160,220,0.07), rgba(99,130,255,0.05))',
            border: '1px solid var(--accent)',
            borderRadius: '12px', display: 'flex', gap: '1.5rem', alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', flex: '0 0 100%' }}>
              ✦ Chart Preview
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>{sunSignPreview ? SIGN_GLYPHS[sunSignPreview] : '?'}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sunSignPreview || '—'} Sun</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>🌙</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Moon (calc)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>↑</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Rising (calc)</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div>{form.date} at {form.time}</div>
              <div>{form.city}</div>
              <div style={{ color: 'var(--accent-dark)', marginTop: '0.2rem' }}>{form.sidereal ? 'Sidereal' : 'Tropical'} · {HOUSE_SYSTEMS.find(h=>h.id===form.houseSystem)?.label}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
          )}
          <button
            id="natal-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !cityPinned}
            style={{ flex: 2, justifyContent: 'center', padding: '0.9rem' }}
          >
            {loading
              ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Calculating…</>
              : <><UiIcon name="sparkle" size={16} /> {buttonText}</>
            }
          </button>
        </div>
        {!cityPinned && form.date && form.time && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            Search and select a city above to enable chart generation.
          </p>
        )}
      </form>
    </div>
  );
}
