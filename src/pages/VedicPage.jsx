import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UiIcon } from '../components/EphiIcons';
import VedicChart from '../components/VedicChart';
import { getPlanetPositions, PLANET_META, ALL_PLANETS, getZodiacInfo } from '../lib/ephemeris';
import { birthDataToDate } from '../lib/natal';
import { getPrecisionHouses } from '../lib/swe';
import { getNakshatra, getNavamsaSign, getVimshottariDasha, SIGNS, getBhavaLord, getPlanetDignity } from '../lib/vedic';
import { getPanchanga } from '../lib/jyotish/panchanga.js';
import { DASHA_MEANINGS, NAKSHATRA_MEANINGS } from '../lib/vedicInterpretations';
import { generateVedicReading, isGeminiConfigured } from '../lib/gemini.js';
import EphiMarkdown from '../components/EphiMarkdown';
import { useNatal } from '../hooks/useNatal.js';
import { store } from '../lib/store.js';

export default function VedicPage() {
  const { natalChart } = useNatal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vedicData, setVedicData] = useState(null);
  const [dashaData, setDashaData] = useState(null);
  const [showNavamsa, setShowNavamsa] = useState(false);
  const [natalName, setNatalName] = useState('');
  
  // AI Reading State
  const [aiReading, setAiReading] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [puristMode, setPuristMode] = useState(false);

  useEffect(() => {
    const settings = store.getJSON('ephi_settings') || {};
    setPuristMode(settings.puristMode || false);
  }, []);

  const calculateVedic = async () => {
    try {
      if (!natalChart || !natalChart.meta) {
        setError('Please set up your birth profile first.');
        setLoading(false);
        return;
      }

      const birthDate = birthDataToDate(natalChart.meta);
      
      // Calculate Ascendant in Sidereal (Lahiri)
      const houses = await getPrecisionHouses(birthDate, natalChart.meta.lat, natalChart.meta.lon, 'P', { sidereal: true });
      const ascLon = houses.ascendant;

      // Get Sidereal Planet Positions
      const rawPositions = await getPlanetPositions(birthDate, ascLon, { 
        sidereal: true, 
        lat: natalChart.meta.lat, 
        lon: natalChart.meta.lon 
      });

      // Prepare data for D-1 (Rasi) and D-9 (Navamsa)
      const d1Planets = [];
      const d9Planets = [];
      const nakshatras = {};
      const planetHouses = {};

      // Add Ascendant (Lagna)
      const ascSignIdx = Math.floor(ascLon / 30);
      d1Planets.push({
        key: 'asc',
        label: 'As',
        signIndex: ascSignIdx,
        color: 'var(--accent)'
      });

      const ascNavamsa = getNavamsaSign(ascLon);
      d9Planets.push({
        key: 'asc',
        label: 'As',
        signIndex: ascNavamsa.signIndex,
        color: 'var(--accent)'
      });

      nakshatras['asc'] = {
        ...getNakshatra(ascLon),
        zodiac: getZodiacInfo(ascLon)
      };

      // Add Planets
      ALL_PLANETS.forEach(key => {
        if (rawPositions[key] === undefined) return;
        
        const lon = rawPositions[key];
        const meta = PLANET_META[key] || { label: key, color: 'var(--text-primary)' };
        
        // D-1 (Rasi) calculation
        const d1SignIdx = Math.floor(lon / 30);
        const houseNum = (d1SignIdx - ascSignIdx + 12) % 12 + 1;
        planetHouses[key] = houseNum;

        d1Planets.push({
          key,
          label: meta.label,
          signIndex: d1SignIdx,
          color: meta.color
        });

        // D-9 (Navamsa) calculation
        const d9Sign = getNavamsaSign(lon);
        d9Planets.push({
          key,
          label: meta.label,
          signIndex: d9Sign.signIndex,
          color: meta.color
        });

        // Nakshatra calculation
        nakshatras[key] = {
           ...getNakshatra(lon),
           zodiac: getZodiacInfo(lon)
        };
      });

      // Calculate Current Vimshottari Dasha
      const moonLon = rawPositions.moon;
      const sunLon = rawPositions.sun;
      const dasha = getVimshottariDasha(moonLon, birthDate, new Date());
      const panchanga = getPanchanga(sunLon, moonLon, new Date());

      setVedicData({
        d1Planets,
        d9Planets,
        nakshatras,
        ascSignIndex: ascSignIdx,
        ascNavamsaIndex: ascNavamsa.signIndex,
        planetHouses,
        panchanga,
        rawPositions
      });

      setDashaData(dasha);
      setNatalName(natalChart.meta.name);
      setLoading(false);

    } catch (err) {
      setError(err.message || 'Failed to calculate Vedic chart.');
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    setAiReading('');
    calculateVedic();
  }, [natalChart]);

  const handleGenerateInsight = async () => {
    if (!isGeminiConfigured()) {
      setAiError('Gemini API key is not configured in .env');
      return;
    }
    
    setIsGenerating(true);
    setAiError('');
    try {
      const result = await generateVedicReading({
        name: natalName,
        mahadasha: dashaData.mahadasha,
        antardasha: dashaData.antardasha,
        pratyantardasha: dashaData.pratyantardasha,
        mahaEnd: dashaData.mahaEnd,
        antarEnd: dashaData.antarEnd,
        ascNakshatra: vedicData.nakshatras['asc'],
        moonNakshatra: vedicData.nakshatras['moon'],
        lagnaSign: SIGNS[vedicData.ascSignIndex],
        moonSign: SIGNS[Math.floor((vedicData.rawPositions.moon ?? 0) / 30)],
        sunSign: SIGNS[Math.floor((vedicData.rawPositions.sun ?? 0) / 30)],
        planetHouses: vedicData.planetHouses,
        planetSigns: Object.fromEntries(
          Object.entries(vedicData.planetHouses).map(([p]) => [
            p, SIGNS[Math.floor((vedicData.rawPositions[p] ?? 0) / 30)]
          ])
        ),
        planetDignities: Object.fromEntries(
          Object.entries(vedicData.planetHouses).map(([p]) => [
            p, getPlanetDignity(p, SIGNS[Math.floor((vedicData.rawPositions[p] ?? 0) / 30)])
          ])
        ),
        panchanga: vedicData.panchanga
      });
      setAiReading(result.text);
    } catch (err) {
      setAiError(err.message || 'Failed to generate Jyotish insight.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrap" style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Calculating Jyotish...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <UiIcon name="moon" size={48} color="var(--border-color)" />
          <h2 style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Profile Required</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <Link to="/dashboard?tab=natal" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Set Profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ maxWidth: '1100px' }}>
      <div className="page-header">
        <span className="page-label">Jyotish</span>
        <h1 className="page-title">Vedic Astrology</h1>
        <p className="page-subtitle">
          Sidereal calculations based on the ancient systems of India.
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: The Chart */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <button 
                onClick={() => setShowNavamsa(false)} 
                className="pill" 
                style={{ background: !showNavamsa ? 'var(--accent)' : 'var(--surface-sunken)', color: !showNavamsa ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                Rasi (D-1)
              </button>
              <button 
                onClick={() => setShowNavamsa(true)} 
                className="pill" 
                style={{ background: showNavamsa ? 'var(--accent)' : 'var(--surface-sunken)', color: showNavamsa ? '#fff' : 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                Navamsa (D-9)
              </button>
            </div>
            
            <VedicChart 
              planets={showNavamsa ? vedicData.d9Planets : vedicData.d1Planets} 
              ascendantSignIndex={showNavamsa ? vedicData.ascNavamsaIndex : vedicData.ascSignIndex}
              title={showNavamsa ? "Navamsa (D-9)" : "Rasi (D-1)"}
              subtitle={showNavamsa ? "Soul & Marriage" : "Physical Self"}
            />
          </div>
        </div>

        {/* Right Column: Analytics & Interpretations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div className="form-label" style={{ marginBottom: '1.5rem' }}>Bhava (House) Occupancy</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => {
                const signIdx = (vedicData.ascSignIndex + h - 1) % 12;
                const signName = SIGNS[signIdx];
                const lord = getBhavaLord(SIGNS[vedicData.ascSignIndex], h);
                const occupants = Object.entries(vedicData.planetHouses)
                  .filter(([_, house]) => house === h)
                  .map(([p]) => p);

                return (
                  <div key={h} className="ephi-card" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '0.25rem' }}>House {h}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {signName} • Lord: <span style={{textTransform:'capitalize'}}>{lord}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                      {occupants.length > 0 ? (
                        occupants.map(p => (
                          <span key={p} style={{ display: 'inline-block', marginRight: '0.5rem', textTransform: 'capitalize' }}>
                            {PLANET_META[p]?.label || p}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Empty</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {dashaData && dashaData.mahadasha && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
              <div className="form-label" style={{ marginBottom: '0.5rem', color: 'var(--accent)' }}>Vimshottari Dasha</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {dashaData.mahadasha} Mahadasha
                </span>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  • {dashaData.antardasha} Antardasha
                </span>
              </div>
              <div style={{ marginTop: '0.75rem', width: '100%', backgroundColor: 'var(--border-color)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${dashaData.progress * 100}%`, backgroundColor: 'var(--accent)', height: '100%' }}></div>
              </div>
              <div style={{ marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>Major Theme ({dashaData.mahadasha}):</strong> {DASHA_MEANINGS[dashaData.mahadasha]}</div>
                <div style={{ marginTop: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Current Focus ({dashaData.antardasha}):</strong> {DASHA_MEANINGS[dashaData.antardasha]}</div>
              </div>
              
              {!aiReading && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  {aiError && <div style={{ color: 'var(--tense)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{aiError}</div>}
                  <button 
                    className="btn btn-primary" 
                    onClick={handleGenerateInsight} 
                    disabled={isGenerating}
                    style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <UiIcon name="sparkle" size={16} />
                    {isGenerating ? 'Synthesizing with Gemini...' : 'Generate AI Jyotish Synthesis'}
                  </button>
                </div>
              )}
            </div>
          )}

          {aiReading && (
            <div className="card reading-body" style={{ padding: '2rem', borderTop: '4px solid var(--accent)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <span className="pill">AI Jyotish Synthesis</span>
                 <button className="btn btn-ghost" onClick={() => setAiReading('')} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Close</button>
               </div>
               <EphiMarkdown text={aiReading} />
            </div>
          )}

          <div className="card" style={{ padding: '2rem' }}>
            <div className="form-label" style={{ marginBottom: '1.5rem' }}>Nakshatra Placements</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {['sun', 'moon', 'asc', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu', 'ketu'].map(key => {
                 const actualKey = key === 'rahu' ? 'nnode' : key === 'ketu' ? 'snode' : key;
                 if (!vedicData.nakshatras[actualKey]) return null;
                 
                 const nak = vedicData.nakshatras[actualKey];
                 const meta = PLANET_META[actualKey] || { label: 'Ascendant', color: 'var(--accent)' };

                 return (
                   <div key={key} className="ephi-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, fontWeight: 'bold', fontSize: '0.65rem' }}>
                            {meta.label.substring(0, 2)}
                         </div>
                         <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.9rem' }}>{meta.label}</span>
                       </div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                         {nak.zodiac.displayStr}
                       </div>
                     </div>
                     <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
                       {nak.name} <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Pada {nak.pada})</span>
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                       Nakshatra Lord: <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: 500 }}>{nak.ruler}</span>
                     </div>
                     {NAKSHATRA_MEANINGS[nak.name] && (
                       <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: 'auto' }}>
                         "{NAKSHATRA_MEANINGS[nak.name]}"
                       </div>
                     )}
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
