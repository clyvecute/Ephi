import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * AdSlot Component
 * A flexible wrapper for advertisements. 
 * Can be used for Google AdSense or custom banners.
 * 
 * @param {string} type - 'banner', 'sidebar', or 'inline'
 * @param {string} slotId - The ad slot ID (e.g. from AdSense)
 * @param {object} style - Custom styles
 */
export default function AdSlot({ type = 'banner', slotId, style }) {
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
          setAdsEnabled(snap.data().adsEnabled !== false);
        }
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.warn('AdSlot sync error:', err);
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Failed to listen to global ad settings:', err);
    }
  }, []);

  const AD_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT;
  if (!adsEnabled || !slotId || !AD_CLIENT) return null;
  // Placeholder logic - shows a subtle box if no ad script is active
  // In production, you would replace this with your actual ad network script
  
  const getStyles = () => {
    switch (type) {
      case 'banner':
        return {
          width: '100%',
          minHeight: '90px',
          margin: '2rem 0',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          ...style
        };
      case 'sidebar':
        return {
          width: '300px',
          minHeight: '250px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          ...style
        };
      default:
        return {
          width: '100%',
          minHeight: '50px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          ...style
        };
    }
  };

  return (
    <div 
      className="ad-slot-wrapper" 
      style={getStyles()}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* 
        DEVELOPER NOTE: 
        For Google AdSense, you would normally place your <ins> tag here:
        
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot={slotId}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      */}
      <span>Advertisement</span>
    </div>
  );
}
