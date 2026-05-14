import React from 'react';
import { UiIcon } from '../components/EphiIcons';

export default function AboutPage() {
  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">The Vision</span>
        <h1 className="page-title">Beyond the Stars</h1>
        <p className="page-subtitle">
          Ephi was born from the intersection of ancient hermetic wisdom and modern 
          computational intelligence.
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="ephi-card" style={{ padding: '3rem', marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--accent)', marginBottom: '1.5rem' }}>Our Philosophy</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            We believe that astrology is not just about prediction, but a symbolic language for 
            understanding the self and the cycles of time. In a world of increasing noise, 
            Ephi provides a silent, midnight space for reflection.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.1rem' }}>
            By utilizing the **Swiss Ephemeris** for precision and **Large Language Models** 
            for synthesis, we provide tools that help you translate mathematical geometry 
            into human insight.
          </p>
        </div>

        <div className="responsive-grid-2">
          <div className="ephi-card" style={{ padding: '2rem' }}>
            <UiIcon name="sparkle" size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Local-First Privacy</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Your birth data and readings are stored entirely in your browser. We don't sell 
              your soul's blueprint to third parties.
            </p>
          </div>
          <div className="ephi-card" style={{ padding: '2rem' }}>
            <UiIcon name="star" size={24} color="var(--neutral)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Academic Rigor</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              From Hellenistic profections to Vedic Dashas, Ephi is built on time-tested 
              astrological frameworks.
            </p>
          </div>
        </div>

        <div className="ephi-card" style={{ marginTop: '3rem', padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: '#fff', marginBottom: '1rem' }}>Support the Journey</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Ephi is an independent project. Your support keeps the servers running and the oracle evolving.
          </p>
          <a href="/support" className="btn btn-primary">Visit Support Hub</a>
        </div>
      </div>
    </div>
  );
}
