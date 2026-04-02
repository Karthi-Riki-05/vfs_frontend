import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#4CAF50',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      padding: 16,
      boxSizing: 'border-box',
    }}>
      {/* Card */}
      <div className="auth-card" style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        padding: '32px 28px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img
            src="/images/image.png"
            alt="Value Charts"
            style={{ height: 64, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {children}
      </div>

      <style>{`
        @media (max-width: 380px) {
          .auth-card {
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
