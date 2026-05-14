/**
 * src/components/NatalForm.jsx
 * Birth data entry form with city geocoding via OSM Nominatim.
 */
import { useState, useRef } from 'react';
import { geocodeCity } from '../lib/geocoding.js';
import EphiDatePicker from './EphiDatePicker.jsx';
import EphiTimePicker from './EphiTimePicker.jsx';
import { UiIcon } from './EphiIcons.jsx';

export default function NatalForm({ initialData, onSave, onCancel, loading, error, title = "Your Birth Chart", buttonText = "Generate Natal Chart" }) {
  const [form, setForm] = useState({
    name: initialData?.name || '', 
    date: initialData?.date || '', 
    time: initialData?.time || '', 
    city: initialData?.city || '', 
    lat: initialData?.lat || '', 
    lon: initialData?.lon || '', 
    utcOffset: initialData?.utcOffset || '',
    sidereal: initialData?.sidereal || false,
    gender: initialData?.gender || 'male'
  });
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState('');
  const searchTimer = useRef(null);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleCityInput(val) {
    setCityQuery(val);
    setCityError('');
    if (val.length < 2) { setCityResults([]); return; }

    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const results = await geocodeCity(val);
        setCityResults(results.slice(0, 5));
      } catch (e) {
        setCityError('Could not search cities. Check connection.');
      } finally {
        setCityLoading(false);
      }
    }, 400);
  }

  function selectCity(result) {
    set('city', result.city || result.display_name);
    set('lat', result.lat.toFixed(4));
    set('lon', result.lon.toFixed(4));
    set('utcOffset', Math.round(result.lon / 15).toString());
    setCityQuery(result.display_name.split(',').slice(0, 2).join(','));
    setCityResults([]);
  }

  async function handleGeolocate() {
    if (!navigator.geolocation) return;
    setCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        set('lat', lat.toFixed(4));
        set('lon', lon.toFixed(4));
        set('utcOffset', Math.round(lon / 15).toString());
        set('city', `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        setCityQuery(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
        setCityLoading(false);
      },
      () => { setCityLoading(false); setCityError('Location denied.'); }
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name: form.name,
      date: form.date,
      time: form.time,
      city: form.city || cityQuery,
      lat: parseFloat(form.lat),
      lon: parseFloat(form.lon),
      utcOffset: parseFloat(form.utcOffset),
      sidereal: form.sidereal,
      gender: form.gender
    });
  }

  return (
    <div className="card" style={{ maxWidth: 540 }}>
      <div className="card-title">{title}</div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            id="natal-name"
            className="form-input"
            placeholder="e.g. Solaris Moon"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Birth Date</label>
            <EphiDatePicker
              value={form.date}
              onChange={val => set('date', val)}
              placeholder="Select birth date..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Birth Time</label>
            <EphiTimePicker
              value={form.time}
              onChange={val => set('time', val)}
              placeholder="Select birth time..."
            />
          </div>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Birth City</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="natal-city"
              className="form-input"
              placeholder="Search city..."
              value={cityQuery}
              onChange={e => handleCityInput(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0.65rem 0.85rem', flexShrink: 0 }}
              onClick={handleGeolocate}
              title="Use my location"
            >
              <UiIcon name="pin" size={16} />
            </button>
          </div>
          {cityLoading && (
            <div style={{ position: 'absolute', right: 52, top: 40 }}>
              <div className="spinner" style={{ width: 14, height: 14 }} />
            </div>
          )}
          {cityResults.length > 0 && (
            <div className="search-results">
              {cityResults.map((r, i) => (
                <div key={i} className="search-result-item" onClick={() => selectCity(r)}>
                  {r.display_name}
                </div>
              ))}
            </div>
          )}
          {cityError && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>{cityError}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input
              id="natal-lat"
              className="form-input"
              placeholder="e.g. 14.5995"
              value={form.lat}
              onChange={e => set('lat', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input
              id="natal-lon"
              className="form-input"
              placeholder="e.g. 120.9842"
              value={form.lon}
              onChange={e => set('lon', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">UTC Offset (Hours)</label>
            <input
              id="natal-utc"
              type="number"
              step="0.5"
              className="form-input"
              placeholder="e.g. -5, 8"
              value={form.utcOffset}
              onChange={e => set('utcOffset', e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Zodiac System</label>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button 
              type="button" 
              className={`btn ${!form.sidereal ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '4px' }}
              onClick={() => set('sidereal', false)}
            >
              Tropical (Western)
            </button>
            <button 
              type="button" 
              className={`btn ${form.sidereal ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '4px' }}
              onClick={() => set('sidereal', true)}
            >
              Sidereal (Vedic / Lahiri)
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            {form.sidereal 
              ? 'Uses the Lahiri Ayanamsa to align signs with fixed constellations.' 
              : 'Uses the standard seasonal zodiac aligned with the Equinoxes.'}
          </p>
        </div>

        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Gender (for BaZi cycles)</label>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button 
              type="button" 
              className={`btn ${form.gender === 'male' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '4px' }}
              onClick={() => set('gender', 'male')}
            >
              Male
            </button>
            <button 
              type="button" 
              className={`btn ${form.gender === 'female' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '4px' }}
              onClick={() => set('gender', 'female')}
            >
              Female
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(248,113,113,0.08)', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
          )}
          <button
            id="natal-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ flex: 2, justifyContent: 'center' }}
          >
            {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Calculating...</> : <><UiIcon name="sparkle" size={16} /> {buttonText}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
