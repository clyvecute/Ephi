// src/pages/HellenisticPage.jsx
//
// Hellenistic Techniques Page — /hellenistic
// Displays Annual Profections, Firdaria, and Hermetic Lots.

import { useState, useEffect } from 'react';
import { calculateProfections, calculateFirdaria, calculateLots } from '../lib/hellenistic';
import { useNatal } from '../hooks/useNatal.js';

export default function HellenisticPage() {
  const { natalChart: natal } = useNatal();
  const [profection, setProfection] = useState(null);
  const [firdaria, setFirdaria] = useState([]);
  const [lots, setLots] = useState(null);
  const [isDayChart, setIsDayChart] = useState(true);

  useEffect(() => {
    const apply = (parsed) => {
      if (!parsed) {
        setProfection(null);
        setFirdaria([]);
        setLots(null);
        return;
      }

      const p = parsed.positions || {};
      const getLon = (key) => {
        const val = p[key] ?? p[key.charAt(0).toUpperCase() + key.slice(1)];
        if (val == null) return 0;
        return typeof val === 'object' ? val.longitude : val;
      };

      const ascLon = parsed.ascendant?.longitude ?? parsed.ascendant ?? getLon('sun');
      const birthDate = parsed.meta?.date;

      // Profections
      const prof = calculateProfections(ascLon, birthDate);
      setProfection({
        activatedHouse: prof.house,
        profectedSign: prof.sign,
        lordOfTheYear: prof.lord
      });

      // Determine if day/night chart (Sun above horizon)
      // In Equal houses, Sun in 7-12 is above horizon
      const sunLon = getLon('sun');
      const sunSignIdx = Math.floor(sunLon / 30);
      const ascSignIdx = Math.floor(ascLon / 30);
      const sunHouse = (sunSignIdx - ascSignIdx + 12) % 12 + 1;
      const day = sunHouse >= 7 && sunHouse <= 12;
      setIsDayChart(day);

      // Firdaria
      const fir = calculateFirdaria(birthDate, day);
      setFirdaria(fir);

      // Lots
      const hermeticLots = calculateLots(
        ascLon,
        getLon('sun'),
        getLon('moon'),
        getLon('mars'),
        getLon('jupiter'),
        getLon('saturn'),
        getLon('venus'),
        getLon('mercury'),
        day
      );
      setLots(hermeticLots);
    };

    apply(natal);
  }, [natal]);

  if (!natal) {
    return (
      <div className="page-wrap">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', gap: '12px' }}>
          <div style={{ fontSize: '2.5rem' }}>🏛️</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>Natal chart required</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.6 }}>Enter your birth data on the Transits page to view advanced Hellenistic insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Traditional</span>
        <h1 className="page-title">Hellenistic Astrology</h1>
        <p className="page-subtitle">Explore ancient time-lord systems and symbolic points of alignment.</p>
      </div>

      {profection && (
        <div className="ephi-card">
          <div className="ephi-card-title">Annual Profections</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, background: 'var(--bg-deep)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '0.25rem' }}>Activated House</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: '600' }}>House {profection.activatedHouse}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-deep)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '0.25rem' }}>Profected Sign</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: '600' }}>{profection.profectedSign}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-deep)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '0.25rem' }}>Lord of the Year</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: '600', textTransform: 'capitalize', color: 'var(--neutral)' }}>{profection.lordOfTheYear}</div>
            </div>
          </div>
        </div>
      )}

      {lots && (
        <div className="ephi-card">
          <div className="ephi-card-title">The 7 Hermetic Lots</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {Object.entries(lots).map(([name, info]) => (
              <div key={name} style={{ background: 'var(--bg-deep)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>{info.degree}° {info.sign}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {firdaria.length > 0 && (
        <div className="ephi-card">
          <div className="ephi-card-title">Firdaria Periods</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {firdaria.map((period, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-deep)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ages {period.startYear} - {period.endYear}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-dark)' }}>{period.planet.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
