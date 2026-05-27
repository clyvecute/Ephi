import { useState, useEffect } from 'react';
import {
  requestPermission, getPermissionStatus,
  getPreferences, savePreferences,
  getAlertLog, checkNow, isSupported
} from '../lib/notifications';
import { PlanetIcon, UiIcon } from '../components/EphiIcons.jsx';
import EphiTimePicker from '../components/EphiTimePicker.jsx';

const PLANETS = [
  { id: 'sun', label: 'Sun' },
  { id: 'moon', label: 'Moon' },
  { id: 'mercury', label: 'Mercury' },
  { id: 'venus', label: 'Venus' },
  { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'saturn', label: 'Saturn' },
  { id: 'uranus', label: 'Uranus' },
  { id: 'neptune', label: 'Neptune' },
  { id: 'pluto', label: 'Pluto' },
];

function PlanetPill({ planet, selected, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`alerts-pill ${selected ? 'selected' : ''}`}
    >
      <PlanetIcon name={planet.id} size={14} />
      {planet.label}
    </span>
  );
}

export default function AlertsPage() {
  const [supported, setSupported] = useState(true);
  const [perm, setPerm] = useState('default');
  const [prefs, setPrefs] = useState(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    setSupported(isSupported());
    if (isSupported()) {
      setPerm(getPermissionStatus());
      setPrefs(getPreferences());
      setLog(getAlertLog());
    }
  }, []);

  if (!supported) {
    return (
      <div className="page-wrap">
        <div className="empty-state">
           <UiIcon name="sparkle" size={40} color="var(--tense)" />
           <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>Your browser does not support push notifications.</p>
        </div>
      </div>
    );
  }

  if (!prefs) return null;

  const handleEnable = async () => {
    const res = await requestPermission();
    setPerm(res);
    if (res === 'granted') {
      updatePref('enabled', true);
    }
  };

  const updatePref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    savePreferences(next);
  };

  const toggleArray = (key, val) => {
    let arr = [...prefs[key]];
    if (arr.includes(val)) arr = arr.filter(x => x !== val);
    else arr.push(val);
    updatePref(key, arr);
  };

  const handleTest = async () => {
    await checkNow();
    setLog(getAlertLog());
  };

  const isActive = perm === 'granted' && prefs.enabled;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Notifications</span>
        <h1 className="page-title">Transit Alerts</h1>
        <p className="page-subtitle">Get push notifications when planets form significant aspects to your natal chart.</p>
      </div>

      {/* Status */}
      <div className="card" style={{ padding: '2rem' }}>
        <div className="alerts-status-wrap">
          <div className="alerts-status-main">
            <div className="alerts-status-text" style={{ color: isActive ? 'var(--harmonic)' : 'var(--tense)' }}>
              {isActive ? 'Alerts Active' : 'Alerts Disabled'}
            </div>
            <div className="alerts-status-sub">
              {perm === 'denied' 
                ? 'Notifications are blocked by your browser settings.' 
                : 'Background monitor scans the sky every 10 minutes.'}
            </div>
          </div>
          <div className="alerts-status-actions">
            {perm !== 'granted' ? (
              <button className="btn btn-primary" onClick={handleEnable}>Enable System</button>
            ) : (
              <button className={`btn ${prefs.enabled ? 'btn-ghost' : 'btn-primary'}`} onClick={() => updatePref('enabled', !prefs.enabled)}>
                {prefs.enabled ? 'Pause Monitor' : 'Resume Monitor'}
              </button>
            )}
          </div>
        </div>
      </div>

      {perm === 'granted' && (
        <>
          {/* Preferences */}
          <div className="card">
            <div className="card-title">Alert Configuration</div>
            
            <div className="alerts-range-wrap">
              <label className="form-label">Orb Threshold: <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{prefs.orbThreshold}°</span></label>
              <input 
                type="range" 
                min="0.1" 
                max="5" 
                step="0.1" 
                value={prefs.orbThreshold}
                className="alerts-range-input"
                onChange={e => updatePref('orbThreshold', parseFloat(e.target.value))} 
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>A tighter orb results in more precise but less frequent notifications.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
              <div>
                <label className="form-label">Transiting Bodies</label>
                <div className="alerts-planet-grid">
                  {PLANETS.map(p => (
                    <PlanetPill key={p.id} planet={p} selected={prefs.transitPlanets.includes(p.id)} onClick={() => toggleArray('transitPlanets', p.id)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Natal sensitive points</label>
                <div className="alerts-planet-grid">
                  {PLANETS.map(p => (
                    <PlanetPill key={p.id} planet={p} selected={prefs.natalPlanets.includes(p.id)} onClick={() => toggleArray('natalPlanets', p.id)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quiet Hours (DND)</label>
              <div className="alerts-quiet-wrap">
                <label className="alerts-quiet-check">
                  <input 
                    type="checkbox" 
                    checked={prefs.quietHoursEnabled} 
                    onChange={e => updatePref('quietHoursEnabled', e.target.checked)} 
                    style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} 
                  />
                  Enable blackout period
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', opacity: prefs.quietHoursEnabled ? 1 : 0.5, pointerEvents: prefs.quietHoursEnabled ? 'auto' : 'none' }}>
                  <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
                    <EphiTimePicker value={prefs.quietStart} onChange={v => updatePref('quietStart', v)} />
                  </div>
                  <span className="ephi-time-sep" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>until</span>
                  <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
                    <EphiTimePicker value={prefs.quietEnd} onChange={v => updatePref('quietEnd', v)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div className="card-title" style={{ margin: 0 }}>Notification Log</div>
              <button className="btn btn-ghost" style={{ fontSize: '0.75rem', height: '32px' }} onClick={handleTest}>Force Check</button>
            </div>
            
            {log.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 0', background: 'var(--bg-surface)', borderRadius: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No alerts have been triggered yet.</p>
              </div>
            ) : (
              <div className="alerts-history-list">
                {log.map(entry => (
                  <div key={entry.id} className="alerts-history-item">
                    <div className="alerts-history-title">{entry.title}</div>
                    <div className="alerts-history-body">{entry.body.split('\n')[0]}</div>
                    <div className="alerts-history-date">{new Date(entry.firedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
