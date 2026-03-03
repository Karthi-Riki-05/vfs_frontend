import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>ValueChart</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0' }}>AI-Powered Diagramming</p>
        </div>
        {children}
      </div>
    </div>
  );
}
