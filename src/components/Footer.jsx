import { Link } from 'react-router-dom';
import { UiIcon } from './EphiIcons';
import { useAuth } from '../contexts/AuthContext';

export default function Footer() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser && currentUser.uid === import.meta.env.VITE_ADMIN_UID;

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.section}>
          <div style={styles.brand}>
            <UiIcon name="sparkle" size={20} color="var(--accent)" />
            <span style={styles.brandName}>Ephi Jyotish</span>
          </div>
          <p style={styles.text}>
            Personalized AI Astrology for the conscious researcher.
          </p>
        </div>

        <div style={styles.links}>
          <Link to="/about" style={styles.link}>About Ephi</Link>
          {isAdmin && <Link to="/admin" style={styles.link}>Admin Panel</Link>}
          <Link to="/support" style={styles.link}>Support Project</Link>
          <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-feedback')); }} style={styles.link}>Feedback</a>
        </div>

        <div style={styles.contact}>
          <div style={styles.contactItem}>
            <UiIcon name="gear" size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem' }}>v1.2.0 Stable</span>
          </div>
          <div style={styles.contactItem}>
            <UiIcon name="star" size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem' }}>support@ephi-astrology.com</span>
          </div>
        </div>
      </div>
      
      <div style={styles.disclaimer}>
        © 2026 Ephi Astrology. For reflection only. Consult professional practitioners for major life decisions.
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    background: '#060411', // Even deeper midnight for footer
    borderTop: '1px solid var(--glass-border)',
    padding: '4rem 1.5rem 4rem', 
    marginTop: 'auto',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '3rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  brandName: {
    fontFamily: 'var(--font-serif)',
    fontWeight: '600',
    fontSize: '1.2rem',
    letterSpacing: '-0.02em',
    color: '#ffffff', // High contrast white
  },
  text: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    maxWidth: '240px',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  link: {
    fontSize: '0.85rem',
    color: 'var(--accent)',
    textDecoration: 'none',
    transition: 'var(--transition)',
    fontWeight: '500',
  },
  contact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: 'var(--text-secondary)',
  },
  disclaimer: {
    maxWidth: '1200px',
    margin: '3rem auto 0',
    paddingTop: '2rem',
    borderTop: '1px solid var(--glass-border)',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.8,
    letterSpacing: '0.05em',
  }
};
