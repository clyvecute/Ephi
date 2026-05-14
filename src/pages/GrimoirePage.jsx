import { useState, useEffect } from 'react';
import { getLibrary, saveToLibrary, removeFromLibrary, TOOL_LABELS } from '../lib/library';
import { getCacheStats, clearAllReadings } from '../lib/readingCache';
import { UiIcon } from '../components/EphiIcons';
import { useToast } from '../components/Toast';
import { isGeminiConfigured } from '../lib/gemini';
import EphiMarkdown from '../components/EphiMarkdown';
import { useAuth } from '../contexts/AuthContext';

export default function GrimoirePage() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [lib, setLib] = useState(getLibrary());
  const [stats, setStats] = useState(getCacheStats());
  const [manualUri, setManualUri] = useState('');
  const [selectedTool, setSelectedTool] = useState('global');
  const [importStatus, setImportStatus] = useState('');
  const [persona, setPersona] = useState(localStorage.getItem('ephi_persona') || 'stoic');
  const toast = useToast();

  if (!currentUser) {
    return (
      <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="ephi-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <UiIcon name="gear" size={40} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>Restricted Archive</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            The Grimoire is currently sealed. You must log in to access your private reference management and Oracle settings.
          </p>
          <button onClick={loginWithGoogle} className="btn btn-primary" style={{ width: '100%' }}>
            Log in with Google
          </button>
        </div>
      </div>
    );
  }

  const handleClearCache = () => {
    if (window.confirm('Wipe all local reading history? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExport = () => {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      backup[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ephi-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast('Archive exported to JSON.');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
        toast('Archive restored. Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  // --- Monitoring Logic ---
  const [monitor, setMonitor] = useState({
    latency: null,
    status: 'idle',
    storageUsed: 0,
    apiQuota: 'Unknown'
  });

  const runDiagnostic = async () => {
    setMonitor(prev => ({ ...prev, status: 'scanning' }));
    try {
      const { testApi } = await import('../lib/gemini');
      const { latency, status } = await testApi();
      
      // Calc storage
      let _lsTotal = 0, _xLen, _x;
      for (_x in localStorage) {
        if (!localStorage.hasOwnProperty(_x)) continue;
        _xLen = ((localStorage[_x].length + _x.length) * 2);
        _lsTotal += _xLen;
      }
      const kb = (_lsTotal / 1024).toFixed(2);

      setMonitor({
        latency,
        status,
        storageUsed: kb,
        apiQuota: 'Optimal'
      });
      toast('System diagnostic complete.');
    } catch (err) {
      setMonitor(prev => ({ ...prev, status: 'degraded', apiQuota: 'Limited/Error' }));
      toast('System check failed: ' + (err.message || 'API Timeout'));
    }
  };

  useEffect(() => {
    if (currentUser) runDiagnostic();
  }, [currentUser]);

  const handleSaveUri = (e) => {
    e.preventDefault();
    if (!manualUri.trim()) return;

    saveToLibrary(selectedTool, { 
      name: manualUri.split('/').pop() || 'Remote Reference', 
      uri: manualUri.trim() 
    });
    setLib(getLibrary());
    setManualUri('');
    toast(`Reference bound to ${TOOL_LABELS[selectedTool]}`);
  };

  const handleFileChange = (toolKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Simulation of file handling
    // Since we are local-first, we'd normally use the Gemini File API here.
    // We'll mark it as pending so the user knows they need to provide a URI for RAG to work.
    saveToLibrary(toolKey, { name: file.name, uri: 'pending_upload' });
    setLib(getLibrary());
    toast(`Local file "${file.name}" set for ${TOOL_LABELS[toolKey]}.`);
  };

  const handlePersonaChange = async (p) => {
    setPersona(p);
    localStorage.setItem('ephi_persona', p);
    
    if (currentUser) {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { 'settings.persona': p }).catch(console.error);
    }

    toast(`Oracle voice set to: ${PERSONAS[p].label}`);
  };

  const PERSONAS = {
    stoic: { label: 'The Stoic Sage', desc: 'Professional, technical, and grounded analysis.', icon: 'gear' },
    mystic: { label: 'The Mystic Oracle', desc: 'Poetic, esoteric, and soul-focused narrative.', icon: 'sparkle' },
    analyst: { label: 'The Modern Analyst', desc: 'Psychological, practical, and solution-oriented.', icon: 'star' },
    jurist: { label: 'The Hellenistic Jurist', desc: 'Traditional, objective, and verdict-driven logic.', icon: 'pin' }
  };

  return (
    <div className="page-wrap" style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <div className="page-header" style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <span className="section-label">Archive</span>
        <h1 className="page-title" style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>The Grimoire</h1>
        <p className="page-subtitle" style={{ opacity: 0.7, maxWidth: '600px', margin: '0 auto' }}>
          Manage your private reference materials. Uploaded documents serve as the authoritative logic for AI interpretations.
        </p>
        <div style={{ marginTop: '2rem' }}>
          <a href="/admin" className="btn btn-ghost" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <UiIcon name="gear" size={14} style={{ marginRight: 8 }} />
            Open Admin Dashboard
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        
        {/* Left Column: Library */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="ephi-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <UiIcon name="pin" size={20} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em' }}>Bound References</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(TOOL_LABELS).map(([key, label]) => (
                <div key={key} style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                      {label}
                    </span>
                    {lib[key] && (
                      <button 
                        onClick={() => { removeFromLibrary(key); setLib(getLibrary()); }}
                        style={{ background: 'none', border: 'none', color: 'var(--tense)', fontSize: '0.7rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >
                        Unbind
                      </button>
                    )}
                  </div>

                  {lib[key] ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '8px', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <UiIcon name="sparkle" size={14} color="var(--accent)" />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lib[key].name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lib[key].uri}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '8px 16px', cursor: 'pointer' }}>
                        Set File
                        <input 
                          type="file" 
                          accept=".pdf" 
                          onChange={(e) => handleFileChange(key, e)}
                          style={{ display: 'none' }} 
                        />
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No reference bound</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Config & Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Manual URI Binding */}
          <div className="ephi-card" style={{ padding: '2rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <UiIcon name="gear" size={20} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em' }}>Gemini RAG Binding</h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              If you have uploaded a PDF to the Gemini File API via script, paste the <strong>File URI</strong> below to bind it to a specific tool.
            </p>

            <form onSubmit={handleSaveUri}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Target Tool</label>
                <select 
                  value={selectedTool} 
                  onChange={(e) => setSelectedTool(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {Object.entries(TOOL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>File URI</label>
                <input 
                  type="text" 
                  value={manualUri}
                  onChange={(e) => setManualUri(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com/v1beta/files/..."
                  style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Bind Reference
              </button>
            </form>
          </div>

          {/* Oracle Persona */}
          <div className="ephi-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <UiIcon name="sparkle" size={20} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em' }}>Oracle Persona</h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Choose the archetypal voice and tone for your AI interpretations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(PERSONAS).map(([id, p]) => (
                <button
                  key={id}
                  onClick={() => handlePersonaChange(id)}
                  className={`card ${persona === id ? 'active' : ''}`}
                  style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    background: persona === id ? 'rgba(255,255,255,0.03)' : 'transparent',
                    borderColor: persona === id ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <UiIcon name={p.icon} size={14} color={persona === id ? 'var(--accent)' : 'var(--text-muted)'} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.label}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Storage Management */}
          <div className="ephi-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>Memory & Privacy</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Local Cache Size:</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{stats.total} readings</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Bindings:</span>
                <span style={{ fontWeight: 800 }}>{Object.keys(lib).length}</span>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={handleExport}
                >
                  <UiIcon name="pin" size={14} style={{ marginRight: 8 }} />
                  Export Archive (JSON)
                </button>
                
                <label className="btn btn-ghost" style={{ width: '100%', cursor: 'pointer' }}>
                  <UiIcon name="gear" size={14} style={{ marginRight: 8 }} />
                  Restore from Backup
                  <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </label>

                <button 
                  className="btn btn-ghost" 
                  style={{ width: '100%', color: 'var(--tense)', borderColor: 'var(--tense)', marginTop: '1rem' }}
                  onClick={handleClearCache}
                >
                  Clear All Data & Logout
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- System Observatory (Monitoring) --- */}
      <div style={{ marginTop: '4rem', paddingTop: '4rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', margin: 0 }}>System Observatory</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>Real-time telemetry and infrastructure health monitoring.</p>
          </div>
          <button className="btn btn-ghost" onClick={runDiagnostic} disabled={monitor.status === 'scanning'}>
            <UiIcon name="refresh" size={14} style={{ marginRight: 8 }} />
            Run Diagnostic
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          
          {/* AI Pulse */}
          <div className="ephi-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: monitor.status === 'healthy' ? 'var(--harmonic)' : (monitor.status === 'degraded' ? 'var(--tense)' : 'var(--border)') }} />
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>AI Oracle Pulse</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>{monitor.latency ? `${monitor.latency}ms` : '--'}</span>
              <span style={{ fontSize: '0.8rem', color: monitor.status === 'healthy' ? 'var(--harmonic)' : 'var(--text-muted)' }}>
                {monitor.status === 'healthy' ? 'Active' : 'Standby'}
              </span>
            </div>
            <div style={{ marginTop: '1rem', height: '4px', background: 'var(--bg-deep)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: monitor.status === 'healthy' ? '100%' : '0%', height: '100%', background: 'var(--harmonic)', transition: 'width 1s ease' }} />
            </div>
          </div>

          {/* Traffic Monitor */}
          <div className="ephi-card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Traffic Load</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>{monitor.apiQuota}</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Gemini 1.5 Flash limits apply. High traffic may cause 429 errors.</p>
          </div>

          {/* Storage Pressure */}
          <div className="ephi-card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Storage Pressure</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>{monitor.storageUsed}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>KB</span>
            </div>
            <div style={{ marginTop: '1rem', height: '4px', background: 'var(--bg-deep)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((monitor.storageUsed / 5120) * 100, 100)}%`, height: '100%', background: 'var(--accent)', transition: 'width 1s ease' }} />
            </div>
          </div>

          {/* RAG Integrity */}
          <div className="ephi-card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Reference Integrity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(lib).length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No references bound.</span>
              ) : (
                Object.entries(lib).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.uri === 'pending_upload' ? 'var(--tense)' : 'var(--harmonic)' }} />
                    <span style={{ fontWeight: 600 }}>{TOOL_LABELS[k]}:</span>
                    <span style={{ color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>{v.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
