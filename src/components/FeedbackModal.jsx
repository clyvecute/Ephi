import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UiIcon } from './EphiIcons';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const { currentUser } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-feedback', handleOpen);
    return () => window.removeEventListener('open-feedback', handleOpen);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || 'anonymous',
        content: text,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        path: window.location.pathname
      });
      setText('');
      setIsOpen(false);
      toast('Thank you for your feedback! The Oracle has received your message.');
    } catch (err) {
      console.error('Feedback failed:', err);
      toast('Failed to send feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="reading-modal-overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 9999 }}>
      <div className="reading-modal-content card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UiIcon name="sparkle" size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-serif)' }}>Divine Feedback</h3>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Have a suggestion, found a bug, or want to share your experience? 
          Your insights help shape the evolution of Ephi.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            className="reading-inquiry-box"
            placeholder="Describe your thoughts or issue here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            required
            style={{ minHeight: '120px', marginBottom: '1.5rem' }}
          />

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !text.trim()} 
            style={{ width: '100%', padding: '1rem' }}
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16, margin: '0 auto' }} /> : 'Send Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
