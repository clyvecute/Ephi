import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { UiIcon } from '../components/EphiIcons';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPage() {
  const { currentUser } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardened Admin Check: Uses the unique Firebase UID for absolute security
  const isAdmin = currentUser && currentUser.uid === import.meta.env.VITE_ADMIN_UID; 

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Feedback
        const feedbackSnap = await getDocs(query(collection(db, 'feedback'), orderBy('timestamp', 'desc'), limit(50)));
        setFeedback(feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Analytics
        const analyticsSnap = await getDocs(query(collection(db, 'analytics'), orderBy('timestamp', 'desc'), limit(50)));
        setAnalytics(analyticsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  if (!currentUser) {
    return (
      <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p>Please log in to access the Admin Panel.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p>Access Denied: You do not have administrative privileges.</p>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Management</span>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Monitor user feedback and system analytics.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Feedback Section */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <UiIcon name="sparkle" size={20} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-serif)' }}>User Feedback</h2>
          </div>
          
          <div className="ephi-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading feedback...</div>
            ) : feedback.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No feedback received yet.</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ background: 'var(--bg-deep)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Content</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map(f => (
                      <tr key={f.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{f.userEmail}</td>
                        <td style={{ padding: '12px' }}>{f.content}</td>
                        <td style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {f.timestamp?.toDate().toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Analytics Section */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <UiIcon name="star" size={20} color="var(--neutral)" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-serif)' }}>Recent Events</h2>
          </div>
          
          <div className="ephi-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading events...</div>
            ) : analytics.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No events logged yet.</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: 'var(--bg-deep)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Event</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Path</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map(a => (
                      <tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent)' }}>{a.event}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{a.url}</td>
                        <td style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {a.timestamp?.toDate().toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
