import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '18px 0',
      marginTop: 'auto',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ fontWeight: '500' }}>
          AuthentiQ
        </div>
        <div>
          Smart India Hackathon (SIH)
        </div>
      </div>
    </footer>
  );
}
