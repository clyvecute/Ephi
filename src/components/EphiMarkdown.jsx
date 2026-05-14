import React from 'react';

/**
 * EphiMarkdown
 * 
 * A reusable component to parse Gemini's markdown-lite text into Ephi's
 * editorial design system HTML. Handles section headers, bold text, and bullet points.
 */
export default function EphiMarkdown({ text }) {
  if (!text) return null;

  const parsedContent = text.split('\n').map((line, i) => {
    // Section headers: **Title**
    const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (headerMatch) {
      return (
        <div key={i} className="reading-section-header">
          {headerMatch[1]}
        </div>
      );
    }
    
    // Numbered sections: 1. **Title** or 1. Title
    const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*[:\s]*(.*)/);
    if (numberedMatch) {
      return (
        <div key={i} className="reading-section-header">
          {numberedMatch[1]}
          {numberedMatch[2] && <span className="reading-section-sub"> — {numberedMatch[2]}</span>}
        </div>
      );
    }
    
    // Bullet points
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return (
        <div key={i} className="reading-bullet">
          <span className="reading-bullet-dot">·</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }
    
    // Empty line → spacer
    if (!line.trim()) {
      return <div key={i} className="reading-spacer" />;
    }
    
    // Regular paragraph — handle inline **bold**
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i} className="reading-para">
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} className="reading-bold">{part}</strong>
            : part
        )}
      </p>
    );
  });

  return (
    <div className="ephi-markdown-container">
      {parsedContent}
      
      <div style={{
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        lineHeight: 1.5,
        textAlign: 'center'
      }}>
        <strong>Disclaimer:</strong> This interpretation is synthesized by an AI language model trained on classical astrological principles. While it offers a profound structural analysis of your chart, AI cannot replace the intuition, lived experience, and spiritual lineage of a professional human astrologer who has spent years mastering this craft. Please use this as a tool for self-reflection, not absolute certainty.
      </div>
    </div>
  );
}
