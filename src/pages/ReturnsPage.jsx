// src/pages/ReturnsPage.jsx
//
// Solar & Lunar Returns Page — /returns

import { useState, useEffect } from 'react';
import { findSolarReturn, findLunarReturn, getSecondaryProgressions } from '../lib/returns';
import { TransitWheel } from '../components/AstroChartWheel';
import { PlanetIcon, UiIcon } from '../components/EphiIcons.jsx';
import { generateReturnReading, isOracleConfigured as isGeminiConfigured } from '../lib/oracle.js';
import EphiMarkdown from '../components/EphiMarkdown.jsx';
import { store } from '../lib/store';

export default function ReturnsPage() {
  const [natal, setNatal] = useState(null);
  const [mode, setMode] = useState('solar');
  const [year, setYear] = useState(new Date().getFullYear());
  const [returnChart, setReturnChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiReading, setAiReading] = useState('');

  useEffect(() => {
    try {
      const cached = store.getJSON('astro_natal');
      if (cached) setNatal(cached);
    } catch {}
  }, []);

  const calculateReturn = async () => {
    if (!natal?.positions?.sun) {
      setError('Please configure your natal chart first.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let result;
      const isSidereal = !!natal.meta.sidereal;

      if (mode === 'solar') {
        const sunLon = natal.positions.sun.longitude ?? natal.positions.sun;
        result = await findSolarReturn(sunLon, parseInt(year), natal.meta.lat, natal.meta.lon, isSidereal);
      } else if (mode === 'lunar') {
        const moonLon = natal.positions.moon.longitude ?? natal.positions.moon;
        result = await findLunarReturn(moonLon, new Date(), isSidereal);
      } else if (mode === 'progressed') {
        const birthDate = new Date(natal.meta.date + ' ' + natal.meta.time);
        const natalAsc = natal.ascendant?.longitude ?? null;
        result = await getSecondaryProgressions(birthDate, new Date(), natalAsc, isSidereal);
        result.type = 'Secondary Progression';
      }
      setReturnChart(result);
      setAiReading(''); // Reset reading on new chart
    } catch (err) {
      setError('Error computing chart.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!isGeminiConfigured()) {
      setAiError('Gemini API key is not configured in .env');
      return;
    }
    
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generateReturnReading({
        natal,
        returnChart,
        mode
      });
      setAiReading(result.text);
    } catch (err) {
      setAiError(err.message || 'Failed to generate cycle insight.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (natal) calculateReturn();
  }, [natal, mode, year]);

  if (!natal) {
    return (
      <div className="page-wrap">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', gap: '12px' }}>
          <div style={{ marginBottom: '0.5rem' }}><PlanetIcon name="sun" size={36} color="var(--accent)" /></div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>Natal chart required</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.6 }}>Configure your primary birth data to compute custom return charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Cycles</span>
        <h1 className="page-title">Return Charts</h1>
        <p className="page-subtitle">Locate solar and lunar degree recurrence across specified windows.</p>
      </div>

      <div className="ephi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${mode === 'solar' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => setMode('solar')}>Solar Return</button>
          <button className={`btn ${mode === 'lunar' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => setMode('lunar')}>Lunar Return</button>
          <button className={`btn ${mode === 'progressed' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => setMode('progressed')}>Progressions</button>
        </div>

        {mode === 'solar' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Year</label>
            <input type="number" className="form-input" style={{ width: '90px', textAlign: 'center' }} value={year} onChange={(e) => setYear(e.target.value)} min="1900" max="2100" />
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent)' }}>Evaluating placements…</div>
      ) : error ? (
        <div style={{ color: 'var(--tense)', padding: '1rem', textAlign: 'center' }}>{error}</div>
      ) : returnChart && (
        <div className="ephi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: '600' }}>{returnChart.type}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(returnChart.date).toLocaleString()}</div>
          </div>

          <TransitWheel natal={natal} transits={returnChart} size={400} />

          <div style={{ marginTop: '1.5rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The <strong>Inner ring</strong> displays original Natal placements. The <strong>Outer ring</strong> maps the return alignment.
            </p>
          </div>

          {/* AI Generation Section */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '1rem' }}>Cycle Synthesis</h3>
            
            {aiReading ? (
              <div className="ephi-markdown-container">
                <EphiMarkdown text={aiReading} />
              </div>
            ) : (
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {aiLoading ? (
                    <><div className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> Generating deep cycle analysis...</>
                  ) : (
                    <><UiIcon name="sparkle" size={16} color="#fff" /> Generate AI Cycle Synthesis</>
                  )}
                </button>
                {aiError && <div style={{ color: 'var(--tense)', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>{aiError}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
