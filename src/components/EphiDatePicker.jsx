/**
 * src/components/EphiDatePicker.jsx
 * Custom calendar-style date picker for Ephi.
 * Features: full month grid, year/month selectors, animated transitions,
 * wisteria palette, keyboard navigation.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function EphiDatePicker({ value, onChange, placeholder = 'Select date...' }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
  const [animDir, setAnimDir] = useState(null); // 'left' | 'right' | null
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);

  // Parse value (YYYY-MM-DD string)
  const selected = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }, [value]);

  const [viewYear, setViewYear] = useState(() => selected?.year || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selected?.month ?? new Date().getMonth());
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const y = selected?.year || new Date().getFullYear();
    return y - (y % 12);
  });

  // Sync view when value changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.year);
      setViewMonth(selected.month);
    }
  }, [selected]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = useCallback(() => {
    setAnimDir('right');
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setTimeout(() => setAnimDir(null), 250);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    setAnimDir('left');
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setTimeout(() => setAnimDir(null), 250);
  }, [viewMonth]);

  function selectDay(day) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function selectMonth(m) {
    setViewMonth(m);
    setView('days');
  }

  function selectYear(y) {
    setViewYear(y);
    setView('months');
  }

  // Format display
  const displayValue = selected
    ? `${MONTHS[selected.month]} ${selected.day}, ${selected.year}`
    : '';

  const isToday = (day) => {
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  };

  const isSelected = (day) => {
    return selected && day === selected.day && viewMonth === selected.month && viewYear === selected.year;
  };

  // Build days grid
  const daysGrid = useMemo(() => {
    const cells = [];
    // Previous month trailing days
    const prevDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: prevDays - firstDay + i + 1, outside: true });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, outside: false });
    }
    // Next month leading days
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, outside: true });
    }
    return cells;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  // Years range (12 years grid)
  const yearsRange = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) arr.push(yearRangeStart + i);
    return arr;
  }, [yearRangeStart]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger input */}
      <button
        type="button"
        onClick={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropUp(spaceBelow < 420);
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
        <span>{displayValue || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {/* Dropdown Calendar */}
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
          width: '310px',
          padding: '16px',
          animation: 'ephiDatePickerIn 0.2s ease-out',
          overflow: 'hidden',
        }}>
          {/* Header navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <button type="button" onClick={() => {
              if (view === 'days') prevMonth();
              else if (view === 'years') setYearRangeStart(s => s - 12);
            }} style={navBtnStyle}>
              ‹
            </button>

            <button
              type="button"
              onClick={() => {
                if (view === 'days') setView('months');
                else if (view === 'months') setView('years');
                else setView('days');
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-serif)',
                fontSize: view === 'days' ? '1rem' : '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                padding: '4px 10px',
                borderRadius: '6px',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = 'var(--accent-subtle)'; e.target.style.color = 'var(--accent-dark)'; }}
              onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = 'var(--text-primary)'; }}
            >
              {view === 'days' && `${MONTHS[viewMonth]} ${viewYear}`}
              {view === 'months' && `${viewYear}`}
              {view === 'years' && `${yearRangeStart} – ${yearRangeStart + 11}`}
            </button>

            <button type="button" onClick={() => {
              if (view === 'days') nextMonth();
              else if (view === 'years') setYearRangeStart(s => s + 12);
            }} style={navBtnStyle}>
              ›
            </button>
          </div>

          {/* Days View */}
          {view === 'days' && (
            <div style={{ animation: animDir ? `ephiSlide${animDir === 'left' ? 'Left' : 'Right'} 0.22s ease-out` : undefined }}>
              {/* Weekday headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                marginBottom: '4px',
              }}>
                {WEEKDAYS.map(w => (
                  <div key={w} style={{
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 0',
                  }}>{w}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px',
              }}>
                {daysGrid.map((cell, i) => {
                  const sel = !cell.outside && isSelected(cell.day);
                  const today = !cell.outside && isToday(cell.day);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={cell.outside}
                      onClick={() => !cell.outside && selectDay(cell.day)}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: sel
                          ? 'var(--accent)'
                          : 'none',
                        color: sel
                          ? '#fff'
                          : cell.outside
                            ? 'var(--text-muted)'
                            : 'var(--text-primary)',
                        border: today && !sel ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: sel ? 700 : today ? 600 : 400,
                        fontFamily: 'var(--font-sans)',
                        cursor: cell.outside ? 'default' : 'pointer',
                        opacity: cell.outside ? 0.3 : 1,
                        transition: 'all 0.15s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!cell.outside && !sel) {
                          e.target.style.background = 'var(--accent-subtle)';
                          e.target.style.borderColor = 'var(--accent)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!cell.outside && !sel) {
                          e.target.style.background = 'none';
                          e.target.style.borderColor = today ? 'var(--accent)' : 'transparent';
                        }
                      }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <button type="button" onClick={() => {
                  const now = new Date();
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                  selectDay(now.getDate());
                }} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-dark)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.target.style.background = 'var(--accent-subtle)'}
                onMouseLeave={e => e.target.style.background = 'none'}
                >
                  Today
                </button>
              </div>
            </div>
          )}

          {/* Months View */}
          {view === 'months' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              animation: 'ephiDatePickerIn 0.18s ease-out',
            }}>
              {MONTHS_SHORT.map((m, i) => {
                const isCurrent = selected && i === selected.month && viewYear === selected.year;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMonth(i)}
                    style={{
                      padding: '12px 8px',
                      background: isCurrent ? 'var(--accent)' : 'none',
                      color: isCurrent ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.85rem',
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isCurrent) {
                        e.target.style.background = 'var(--accent-subtle)';
                        e.target.style.color = 'var(--accent-dark)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isCurrent) {
                        e.target.style.background = 'none';
                        e.target.style.color = 'var(--text-primary)';
                      }
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Years View */}
          {view === 'years' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              animation: 'ephiDatePickerIn 0.18s ease-out',
            }}>
              {yearsRange.map(y => {
                const isCurrent = selected && y === selected.year;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    style={{
                      padding: '12px 8px',
                      background: isCurrent ? 'var(--accent)' : 'none',
                      color: isCurrent ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.85rem',
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isCurrent) {
                        e.target.style.background = 'var(--accent-subtle)';
                        e.target.style.color = 'var(--accent-dark)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isCurrent) {
                        e.target.style.background = 'none';
                        e.target.style.color = 'var(--text-primary)';
                      }
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.4rem',
  color: 'var(--text-secondary)',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  transition: 'background 0.15s, color 0.15s',
};
