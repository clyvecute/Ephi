import { useState } from 'react';
import { UiIcon } from '../components/EphiIcons';

export default function FaqPage() {
  const faqs = [
    {
      q: "Is my data private?",
      a: "Yes. Ephi is a local-first application. Your birth data, uploaded books, and AI readings are stored entirely within your browser's LocalStorage. They are never sent to a central Ephi server. The only external communication is a secure link to Gemini for synthesis."
    },
    {
      q: "Can I use my own astrology books as references?",
      a: "Absolutely. In the 'Library' section under Tools, you can upload PDFs. You can even map specific books to specific tools (e.g., a Horary textbook for Horary readings). These files remain private to your local environment."
    },
    {
      q: "What is the difference between Natal and Transit modes?",
      a: "Natal mode focuses strictly on your internal psychological 'hard-wiring'—your soul's blueprint. Transit mode analyzes how the current planets in the sky are triggering that blueprint right now."
    },
    {
      q: "How accurate is the AI?",
      a: "The AI acts as a sophisticated synthesis engine. While the mathematical calculations are 100% precise (based on the Swiss Ephemeris), the interpretations are meant for reflection and personal insight. Always consult a professional for major life decisions."
    },
    {
      q: "Why are some tabs disabled?",
      a: "Most advanced features require a Natal Chart to be configured first. Set up your birth data on the main Transits (Dashboard) page to unlock the full power of Ephi."
    }
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Help</span>
        <h1 className="page-title">Frequently Asked Questions</h1>
        <p className="page-subtitle">Understanding the privacy, technology, and methodology of Ephi.</p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {faqs.map((faq, idx) => (
          <FaqItem key={idx} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div 
      className="ephi-card" 
      style={{ padding: '1.25rem', cursor: 'pointer' }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{q}</h3>
        <UiIcon name={open ? 'gear' : 'sparkle'} size={16} color="var(--accent)" />
      </div>
      {open && (
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          {a}
        </div>
      )}
    </div>
  );
}
