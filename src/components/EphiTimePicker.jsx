/**
 * src/components/EphiTimePicker.jsx
 * Custom scrollable time picker for Ephi.
 * Features: hour/minute dials, AM/PM toggle, smooth scroll, 
 * wisteria palette, keyboard support.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

export default function EphiTimePicker({ value, onChange, placeholder = 'Select time...' }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);

  // Parse value (HH:MM 24h string)
  const parsed = (() => {
    if (!value) return null;
    const [h, m] = value.split(':').map(Number);
    return { hour24: h, minute: m };
  })();

  const [hour, setHour] = useState(() => {
    if (parsed) {
      const h12 = parsed.hour24 % 12 || 12;
      return h12;
    }
    return 12;
  });
  const [minute, setMinute] = useState(() => parsed?.minute ?? 0);
  const [period, setPeriod] = useState(() => {
    if (parsed) return parsed.hour24 >= 12 ? 'PM' : 'AM';
    return 'AM';
  });

  // Sync from external value
  useEffect(() => {
    if (parsed) {
      const h12 = parsed.hour24 % 12 || 12;
      setHour(h12);
      setMinute(parsed.minute);
      setPeriod(parsed.hour24 >= 12 ? 'PM' : 'AM');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function commit(h = hour, m = minute, p = period) {
    let h24 = h;
    if (p === 'AM' && h === 12) h24 = 0;
    else if (p === 'PM' && h !== 12) h24 = h + 12;
    const val = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(val);
  }

  function adjustHour(dir) {
    let next = hour + dir;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setHour(next);
    commit(next, minute, period);
  }

  function adjustMinute(dir) {
    let next = minute + dir * 5;
    if (next >= 60) next = 0;
    if (next < 0) next = 55;
    setMinute(next);
    commit(hour, next, period);
  }

  function togglePeriod() {
    const next = period === 'AM' ? 'PM' : 'AM';
    setPeriod(next);
    commit(hour, minute, next);
  }

  // Display
  const displayValue = parsed ? (
    <>
      <span>{String(hour).padStart(2, '0')}</span>
      <span className="ephi-time-colon">:</span>
      <span>{String(minute).padStart(2, '0')}</span>
      <span style={{ marginLeft: '0.35rem', fontSize: '0.82em', opacity: 0.85 }}>{period}</span>
    </>
  ) : null;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropUp(spaceBelow < 360);
          }
          setOpen(!open);
        }}
        style={{
          width: '100%',
          background: 'var(--bg-deep)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          color: displayValue ? 'var(--text-primary)' : 'var(--text-muted)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9rem',
          padding: '0.65rem 0.875rem',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: open ? '0 0 0 3px rgba(201,160,220,0.12)' : 'none',
        }}
      >
        <span className="ephi-time-display">{displayValue || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          ...(dropUp
            ? { bottom: 'calc(100% + 6px)' }
            : { top: 'calc(100% + 6px)' }),
          left: 0,
          zIndex: 100,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
          padding: '20px 16px',
          animation: 'ephiDatePickerIn 0.2s ease-out',
          width: '240px',
        }}>
          {/* Time Display Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.02em',
          }}>
            <span style={{ color: 'var(--accent-dark)' }}>{hour}</span>
            <span style={{ color: 'var(--text-muted)', animation: 'ephiBlink 1.2s infinite' }}>:</span>
            <span style={{ color: 'var(--accent-dark)' }}>{String(minute).padStart(2, '0')}</span>
            <span style={{ fontSize: '0.9rem', marginLeft: '6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{period}</span>
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}>
            {/* Hour dial */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <button type="button" onClick={() => adjustHour(1)} style={dialBtnStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <div style={dialValueStyle}>{String(hour).padStart(2, '0')}</div>
              <button type="button" onClick={() => adjustHour(-1)} style={dialBtnStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div style={dialLabelStyle}>Hour</div>
            </div>

            {/* Separator */}
            <div style={{
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              marginTop: '-18px',
            }}>:</div>

            {/* Minute dial */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <button type="button" onClick={() => adjustMinute(1)} style={dialBtnStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <div style={dialValueStyle}>{String(minute).padStart(2, '0')}</div>
              <button type="button" onClick={() => adjustMinute(-1)} style={dialBtnStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div style={dialLabelStyle}>Min</div>
            </div>

            {/* AM/PM toggle */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginLeft: '8px',
              marginTop: '-18px',
            }}>
              <button
                type="button"
                onClick={() => { setPeriod('AM'); commit(hour, minute, 'AM'); }}
                style={{
                  ...ampmBtnStyle,
                  background: period === 'AM' ? 'var(--accent)' : 'none',
                  color: period === 'AM' ? '#fff' : 'var(--text-muted)',
                  fontWeight: period === 'AM' ? 700 : 500,
                  border: `1px solid ${period === 'AM' ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >AM</button>
              <button
                type="button"
                onClick={() => { setPeriod('PM'); commit(hour, minute, 'PM'); }}
                style={{
                  ...ampmBtnStyle,
                  background: period === 'PM' ? 'var(--accent)' : 'none',
                  color: period === 'PM' ? '#fff' : 'var(--text-muted)',
                  fontWeight: period === 'PM' ? 700 : 500,
                  border: `1px solid ${period === 'PM' ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >PM</button>
            </div>
          </div>

          {/* Quick presets */}
          <div style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            marginTop: '14px',
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Midnight', h: 0, m: 0 },
              { label: 'Noon', h: 12, m: 0 },
              { label: 'Now', h: null, m: null },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  let h24, min;
                  if (preset.h === null) {
                    const now = new Date();
                    h24 = now.getHours();
                    min = now.getMinutes();
                  } else {
                    h24 = preset.h;
                    min = preset.m;
                  }
                  const h12 = h24 % 12 || 12;
                  const p = h24 >= 12 ? 'PM' : 'AM';
                  setHour(h12);
                  setMinute(min);
                  setPeriod(p);
                  commit(h12, min, p);
                  setOpen(false);
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.target.style.borderColor = 'var(--accent)';
                  e.target.style.color = 'var(--accent-dark)';
                  e.target.style.background = 'var(--accent-subtle)';
                }}
                onMouseLeave={e => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.background = 'none';
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Done button */}
          <button
            type="button"
            onClick={() => { commit(); setOpen(false); }}
            style={{
              width: '100%',
              marginTop: '12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.target.style.background = 'var(--accent-dark)'}
            onMouseLeave={e => e.target.style.background = 'var(--accent)'}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

const dialBtnStyle = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  width: '36px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  transition: 'all 0.15s',
};

const dialValueStyle = {
  width: '52px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontFamily: 'var(--font-sans)',
  fontSize: '1.35rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  letterSpacing: '0.02em',
};

const dialLabelStyle = {
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontFamily: 'var(--font-sans)',
};

const ampmBtnStyle = {
  padding: '6px 14px',
  borderRadius: '8px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'all 0.15s',
};
