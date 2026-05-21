import { useState, useEffect } from 'react';
import { castHoraryChart, judgeChart, HOUSE_TOPICS } from '../lib/horary';
import { getHoraryStrictures } from '../lib/hellenistic';
import { UiIcon, PlanetIcon } from '../components/EphiIcons';
import ChartWheel from '../components/AstroChartWheel.jsx';
import { generateHoraryReading, continueHoraryReading, isOracleConfigured as isGeminiConfigured } from '../lib/oracle';
import EphiMarkdown from '../components/EphiMarkdown';
import { store } from '../lib/store';
import { analyzePrashna } from '../lib/jyotish/prashna.js';
import { getPrecisionPositions, getPrecisionHouses } from '../lib/swe.js';
import { getPanchanga } from '../lib/jyotish/panchanga.js';

export default function HoraryPage() {
  const [mode, setMode] = useState('western'); // 'western' | 'prashna'
  const [prashnaChart, setPrashnaChart] = useState(null);

  const [question, setQuestion] = useState('');
  const [city, setCity] = useState('');
  const [exactCoords, setExactCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState(null);
  const [judgment, setJudgment] = useState(null);
  const [strictures, setStrictures] = useState([]);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [aiReading, setAiReading] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [followUpMsg, setFollowUpMsg] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [puristMode, setPuristMode] = useState(false);

  useEffect(() => {
    const settings = store.getJSON('ephi_settings') || {};
    setPuristMode(settings.puristMode || false);

    try {
      const cached = store.getJSON('astro_horary_history');
      if (cached) setHistory(cached);
    } catch {}
  }, []);

  async function geocodeCity(cityName) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AstroApp/1.0' } });
    const data = await res.json();
    if (!data.length) throw new Error(`City not found: "${cityName}"`);
    return { 
      lat: parseFloat(data[0].lat), 
      lng: parseFloat(data[0].lon),
      name: data[0].display_name.split(',')[0] 
    };
  }

  async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AstroApp/1.0' } });
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || "Current Location";
  }

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setExactCoords({ lat: latitude, lng: longitude });
          const cityName = await reverseGeocode(latitude, longitude);
          setCity(cityName);
        } catch (err) {
          setError("Failed to resolve city name from GPS.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError("Location access denied or unavailable.");
      }
    );
  };

  const handleCast = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }

    setLoading(true);
    setError('');
    setAiReading(null);
    setAiError('');
    setChart(null);
    setJudgment(null);
    setPrashnaChart(null);
    setChatHistory([]);
    setFollowUpMsg('');

    try {
      let lat = 0;
      let lng = 0;

      if (exactCoords && city.trim()) {
        lat = exactCoords.lat;
        lng = exactCoords.lng;
      } else if (city.trim()) {
        const coords = await geocodeCity(city);
        lat = coords.lat;
        lng = coords.lng;
      } else {
        try {
          const natal = store.getJSON('astro_natal');
          if (natal?.meta?.lat && natal?.meta?.lng) {
            lat = natal.meta.lat;
            lng = natal.meta.lng;
          }
        } catch {}
      }

      if (mode === 'prashna') {
        const now = new Date();
        const positions = await getPrecisionPositions(now, { sidereal: true });
        const houses = await getPrecisionHouses(now, lat, lng, 'P', { sidereal: true });
        const sunLon = positions.sun.longitude;
        const moonLon = positions.moon.longitude;
        const panchanga = getPanchanga(sunLon, moonLon, now);

        const prashnaResult = analyzePrashna({
          question,
          siderealPositions: positions,
          lagnaLongitude: houses.ascendant,
          panchanga,
          questionTime: now,
        });

        setPrashnaChart(prashnaResult);
        
        const newHistoryItem = {
          id: Date.now(),
          mode: 'prashna',
          question,
          city,
          date: now,
          prashnaChart: prashnaResult,
          verdict: prashnaResult.verdict,
          chatHistory: []
        };
        const newHistory = [newHistoryItem, ...history].slice(0, 50);
        setHistory(newHistory);
        setCurrentHistoryIndex(0);
        store.setJSON('astro_horary_history', newHistory);

        setLoading(false);
        return;
      }

      const castedChart = await castHoraryChart(question, new Date(), lat, lng);
      const horaryJudgment = judgeChart(castedChart);
      
      const s = getHoraryStrictures(
        castedChart.asc.longitude, 
        castedChart.planets.moon.longitude,
        null, 
        null  
      );

      setChart(castedChart);
      setJudgment(horaryJudgment);
      setStrictures(s);

      // Save full data to history
      const newHistoryItem = {
        id: Date.now(),
        question,
        city,
        date: castedChart.date,
        chart: castedChart,
        judgment: horaryJudgment,
        strictures: s,
        verdict: horaryJudgment.verdict,
        chatHistory: []
      };
      
      const newHistory = [newHistoryItem, ...history].slice(0, 50);
      setHistory(newHistory);
      setCurrentHistoryIndex(0);
      store.setJSON('astro_horary_history', newHistory);
    } catch (err) {
      setError(err.message || 'Failed to cast horary chart.');
    } finally {
      setLoading(false);
    }
  };

  const handleAiReading = async () => {
    if (!chart || !judgment) return;
    setIsGenerating(true);
    setAiError('');
    try {
      const res = await generateHoraryReading({ chart, judgment });
      setAiReading(res.text);
      const newChat = [{ role: 'assistant', text: res.text }];
      setChatHistory(newChat);

      // Update current history item
      if (currentHistoryIndex !== -1) {
        const updatedHistory = [...history];
        updatedHistory[currentHistoryIndex] = {
          ...updatedHistory[currentHistoryIndex],
          aiReading: res.text,
          chatHistory: newChat
        };
        setHistory(updatedHistory);
        store.setJSON('astro_horary_history', updatedHistory);
      }
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI synthesis.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpMsg.trim() || isContinuing) return;

    const userMsg = followUpMsg.trim();
    setFollowUpMsg('');
    setIsContinuing(true);
    setAiError('');

    const newChat = [...chatHistory, { role: 'user', text: userMsg }];
    setChatHistory(newChat);

    try {
      const res = await continueHoraryReading({ 
        chart, 
        history: newChat, 
        userMessage: userMsg 
      });
      const finalChat = [...newChat, { role: 'assistant', text: res.text }];
      setChatHistory(finalChat);

      // Update current history item
      if (currentHistoryIndex !== -1) {
        const updatedHistory = [...history];
        updatedHistory[currentHistoryIndex] = {
          ...updatedHistory[currentHistoryIndex],
          chatHistory: finalChat
        };
        setHistory(updatedHistory);
        store.setJSON('astro_horary_history', updatedHistory);
      }
    } catch (err) {
      setAiError(err.message || 'The Oracle is silent. Try again.');
    } finally {
      setIsContinuing(false);
    }
  };

  const handleSelectHistory = (item, index) => {
    setQuestion(item.question);
    setCity(item.city || '');
    setMode(item.mode || 'western');
    if (item.mode === 'prashna') {
      setPrashnaChart(item.prashnaChart);
      setChart(null);
      setJudgment(null);
      setStrictures([]);
    } else {
      setPrashnaChart(null);
      setChart(item.chart);
      setJudgment(item.judgment);
      setStrictures(item.strictures || []);
    }
    setAiReading(item.aiReading || null);
    setChatHistory(item.chatHistory || []);
    setCurrentHistoryIndex(index);
    setAiError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'yes': return 'var(--harmonic)';
      case 'no': return 'var(--tense)';
      case 'unlikely': return 'var(--neutral)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Sacred Inquiry</span>
        <h1 className="page-title">Consultative Horary</h1>
        <p className="page-subtitle">
          Ask a specific, meaningful question. Traditional calculations yield direct indicators.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['western','prashna'].map(m => (
          <button key={m} onClick={() => { setMode(m); setChart(null); setPrashnaChart(null); }} className="pill" style={{
            background: mode === m ? 'var(--accent)' : 'var(--surface-sunken)',
            color: mode === m ? '#fff' : 'var(--text-primary)',
            border: 'none', cursor: 'pointer', textTransform: 'capitalize'
          }}>
            {m === 'western' ? 'Lilly (Western)' : 'Prashna (Jyotish)'}
          </button>
        ))}
      </div>

      <form onSubmit={handleCast}>
        <div className="ephi-card">
          <div className="form-group">
            <label className="form-label">Your Question</label>
            <input
              className="form-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Will I get the job offer?"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location of Question <span style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setExactCoords(null);
                }}
                placeholder="e.g., Manila"
                disabled={loading}
                style={{ paddingRight: '3rem' }}
                required
              />
              <button 
                type="button"
                onClick={handleLocate}
                className="btn-icon"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }}
                title="Use current location"
                disabled={loading}
              >
                <UiIcon name="pin" size={18} color="var(--accent)" />
              </button>
            </div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Horary charts must be cast for the exact place where the question is asked.</span>
          </div>

          {error && <div className="synastry-error-box">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            {loading ? 'Evaluating…' : 'Cast Chart'}
          </button>
        </div>
      </form>

      {mode === 'prashna' && prashnaChart && (
        <div className="card" style={{ padding: '2.5rem' }}>
          <div className="horary-verdict-bar">
            <span className="pill" style={{ 
              background: getVerdictColor(prashnaChart.verdict) + '15', 
              borderColor: getVerdictColor(prashnaChart.verdict), 
              color: getVerdictColor(prashnaChart.verdict) 
            }}>
              {prashnaChart.verdict.toUpperCase()}
            </span>
            <span className="horary-verdict-label">Confidence: {prashnaChart.confidence}</span>
          </div>
          <p className="horary-verdict-summary">{prashnaChart.summary}</p>
          <div className="horary-sig-grid">
            <div className="horary-sig-card">
              <div className="horary-sig-label">Lagna Lord (You)</div>
              <div className="horary-sig-planet" style={{ textTransform: 'capitalize' }}>
                <PlanetIcon name={prashnaChart.lagnaLord} size={18} style={{ marginRight: 6 }}/>
                {prashnaChart.lagnaLord}
              </div>
            </div>
            <div className="horary-sig-card">
              <div className="horary-sig-label">Target Lord (Topic)</div>
              <div className="horary-sig-planet" style={{ textTransform: 'capitalize' }}>
                <PlanetIcon name={prashnaChart.targetLord} size={18} style={{ marginRight: 6 }}/>
                {prashnaChart.targetLord}
              </div>
              <div className="horary-sig-sub">House {prashnaChart.targetHouse}: {prashnaChart.targetSign}</div>
            </div>
          </div>
          {prashnaChart.strictures.length > 0 && (
            <div className="horary-strictures" style={{ marginTop: '2rem' }}>
              <div className="horary-stricture-label">Strictures & Considerations</div>
              {prashnaChart.strictures.map((s, i) => (
                <div key={i} className="horary-stricture-item">
                   <UiIcon name="sparkle" size={12} /> {s.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'western' && judgment && chart && (
        <div className="card" style={{ padding: '2.5rem' }}>
          
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <ChartWheel 
              planets={chart.planets}
              aspects={chart.aspects}
              ascendant={chart.asc.longitude}
              houseCusps={chart.houseCusps}
              size={320}
              mode="natal"
            />
          </div>

          {strictures.length > 0 && (
            <div className="horary-strictures">
              <div className="horary-stricture-label">Strictures against Judgment</div>
              {strictures.map((s, i) => (
                <div key={i} className="horary-stricture-item">
                   <UiIcon name="sparkle" size={12} /> {s}
                </div>
              ))}
            </div>
          )}
          
          <div className="horary-verdict-bar">
            <span className="pill" style={{ 
              background: getVerdictColor(judgment.verdict) + '15', 
              borderColor: getVerdictColor(judgment.verdict), 
              color: getVerdictColor(judgment.verdict) 
            }}>
              {judgment.verdict.toUpperCase()}
            </span>
            <span className="horary-verdict-label">Confidence: {judgment.confidence}</span>
          </div>

          <p className="horary-verdict-summary">{judgment.summary}</p>

          <div className="horary-sig-grid">
            <div className="horary-sig-card">
              <div className="horary-sig-label">Querent (You)</div>
              <div className="horary-sig-planet" style={{ textTransform: 'capitalize' }}>
                <PlanetIcon name={chart.significators.querent.planet} size={18} style={{ marginRight: 6 }}/>
                {chart.significators.querent.planet}
              </div>
            </div>
            <div className="horary-sig-card">
              <div className="horary-sig-label">Quesited (Topic)</div>
              <div className="horary-sig-planet" style={{ textTransform: 'capitalize' }}>
                <PlanetIcon name={chart.significators.quesited.planet} size={18} style={{ marginRight: 6 }}/>
                {chart.significators.quesited.planet}
              </div>
              <div className="horary-sig-sub">House {chart.significators.quesited.house}: {chart.significators.quesited.topic}</div>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
            <div className="form-label" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Planetary Positions & Dignities</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              
              <div className="ephi-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>ASC</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>H1</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{chart.asc.sign} {Math.floor(chart.asc.degree)}°</div>
              </div>
              
              <div className="ephi-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>MC</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>H10</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{chart.mc.sign} {Math.floor(chart.mc.degree)}°</div>
              </div>

              {Object.entries(chart.planets).filter(([_, p]) => p.traditional).map(([key, p]) => (
                <div key={key} className="ephi-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <PlanetIcon name={key} size={14} color="var(--accent)" />
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {p.label}
                        {p.isRetrograde && <span style={{ color: 'var(--tense)', fontSize: '0.7rem' }}>Rx</span>}
                        {p.isCombust && !p.isCazimi && <span style={{ fontSize: '0.8rem' }} title="Combust (Burned by Sun)">🔥</span>}
                        {p.isCazimi && <span style={{ fontSize: '0.8rem' }} title="Cazimi (In the Heart of the Sun)">👑</span>}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>H{p.house}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.sign} {Math.floor(p.degree)}°</div>
                  {p.dignity !== 'peregrine' && (
                    <div style={{ fontSize: '0.7rem', color: p.dignity === 'domicile' || p.dignity === 'exaltation' ? 'var(--harmonic)' : 'var(--tense)', textTransform: 'uppercase', marginTop: '0.25rem', fontWeight: 600 }}>
                      {p.dignity}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
            <div className="form-label" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Active Aspects</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {chart.aspects.length > 0 ? chart.aspects.map((asp, i) => (
                <span key={i} className="pill" style={{ 
                  background: 'var(--surface-sunken)', 
                  border: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px'
                }}>
                  <PlanetIcon name={asp.planet1} size={12} />
                  <span style={{ margin: '0 4px', fontSize: '1rem' }}>
                    {asp.aspect === 'conjunction' ? '☌' : asp.aspect === 'sextile' ? '⚹' : asp.aspect === 'square' ? '□' : asp.aspect === 'trine' ? '△' : '☍'}
                  </span>
                  <PlanetIcon name={asp.planet2} size={12} />
                  <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{asp.orb.toFixed(1)}° {asp.applying ? 'App' : 'Sep'}</span>
                </span>
              )) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No major traditional aspects.</span>
              )}
            </div>
          </div>

          <div>
            <div className="form-label" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Chart Indicators</div>
            <div className="horary-indicator-list">
              {judgment.favorable.map((inf, i) => (
                <div key={`fav-${i}`} className="horary-indicator-item favorable">
                  {inf}
                </div>
              ))}
              {judgment.unfavorable.map((inf, i) => (
                <div key={`unfav-${i}`} className="horary-indicator-item unfavorable">
                  {inf}
                </div>
              ))}
              {judgment.neutral.map((inf, i) => (
                <div key={`neut-${i}`} className="horary-indicator-item">
                  {inf}
                </div>
              ))}
            </div>
          </div>

          {!puristMode && (
            <div className="horary-ai-reading-section" style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
              {!aiReading && !isGenerating && isGeminiConfigured() && (
                <div style={{ textAlign: 'center' }}>
                  <button className="btn btn-primary" onClick={handleAiReading} style={{ width: 'auto' }}>
                    <UiIcon name="sparkle" size={18} style={{ marginRight: 8 }} />
                    Synthesize Detailed Oracle Judgment
                  </button>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                    Gemini will analyze all technical indicators into a comprehensive essay.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-serif)', fontSize: '1.2rem' }}>
                    Consulting the Oracle…
                  </p>
                </div>
              )}

              {aiError && <div className="synastry-error-box" style={{ marginTop: '1rem' }}>{aiError}</div>}

              {aiReading && (
                <div className="horary-ai-reading-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div className="section-label" style={{ textAlign: 'left', marginBottom: 0 }}>Oracle Dialogue</div>
                    <button className="btn btn-ghost" onClick={() => window.print()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                      <UiIcon name="pin" size={12} style={{ marginRight: 6 }} />
                      Print to Grimoire
                    </button>
                  </div>
                  
                  <div className="horary-chat-thread">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`horary-chat-bubble ${msg.role}`}>
                        {msg.role === 'assistant' ? (
                          <EphiMarkdown text={msg.text} />
                        ) : (
                          <div className="user-followup-text">“{msg.text}”</div>
                        )}
                      </div>
                    ))}
                    
                    {isContinuing && (
                      <div className="horary-chat-bubble assistant">
                        <div className="spinner-small" style={{ marginBottom: '0.5rem' }} />
                        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>The Oracle is contemplating...</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleFollowUp} className="horary-followup-form" style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <input
                      type="text"
                      value={followUpMsg}
                      onChange={(e) => setFollowUpMsg(e.target.value)}
                      placeholder="Ask a follow-up question..."
                      autoComplete="off"
                    />
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={isContinuing || !followUpMsg.trim()}
                    >
                      {isContinuing ? '...' : 'Ask'}
                    </button>
                  </form>
                </div>
              )}
              
              {!isGeminiConfigured() && (
                <div className="synastry-error-box">
                  Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env to enable detailed AI judgments.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="horary-history-wrap">
          <div className="horary-history-label">Previous Inquiries</div>
          {history.map((h, i) => (
            <div
              key={h.id || i}
              className="horary-history-item"
              onClick={() => handleSelectHistory(h, i)}
            >
              <div className="horary-history-q">{h.question}</div>
              <div className="horary-history-v" style={{ color: getVerdictColor(h.verdict) }}>
                {h.verdict.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
