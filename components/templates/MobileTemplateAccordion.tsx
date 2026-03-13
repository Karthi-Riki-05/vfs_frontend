'use client';
import { useState } from 'react';

interface Category {
  id: string;
  label: string;
  category: string;
  color: string;
  iconColor: string;
  icon: (color: string) => React.ReactNode;
}

interface Template {
  id: string;
  name: string;
}

export default function MobileTemplateAccordion({
  categories,
  onOpenBrowser,
}: {
  categories: Category[];
  onOpenBrowser: (category: string, templateId?: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [catData, setCatData] = useState<Record<string, Template[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggle(cat: Category) {
    if (openId === cat.id) { setOpenId(null); return; }
    setOpenId(cat.id);

    if (!catData[cat.id]) {
      setLoading(cat.id);
      try {
        const res = await fetch(`/api/templates?category=${encodeURIComponent(cat.category)}`);
        const data = await res.json();
        const templates = data.templates || data.data?.templates || [];
        setCatData(prev => ({ ...prev, [cat.id]: templates.slice(0, 5) }));
      } catch {
        setCatData(prev => ({ ...prev, [cat.id]: [] }));
      } finally {
        setLoading(null);
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {categories.map(cat => {
        const isOpen = openId === cat.id;
        const isLoading = loading === cat.id;
        const items = catData[cat.id] || [];

        return (
          <div key={cat.id} style={{
            background: '#fff',
            border: '1px solid #F0F0F0',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* Accordion Header */}
            <button
              onClick={() => handleToggle(cat)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: cat.color,
              }}>
                {cat.icon(cat.iconColor)}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#333' }}>{cat.label}</span>
              <svg
                style={{
                  width: 16,
                  height: 16,
                  color: '#999',
                  flexShrink: 0,
                  transition: 'transform 0.22s ease',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {/* Accordion Body */}
            {isOpen && (
              <div style={{
                borderTop: '1px solid #F5F5F5',
                padding: '4px 12px 12px',
                animation: 'accordionSlide 0.2s ease forwards',
              }}>
                {isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      border: '2px solid #3CB371',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'tmplSpin 0.6s linear infinite',
                    }}/>
                  </div>
                ) : items.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '16px 0' }}>
                    No templates found
                  </p>
                ) : (
                  <>
                    {items.map(tmpl => (
                      <button
                        key={tmpl.id}
                        onClick={() => onOpenBrowser(cat.category, tmpl.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 8px',
                          borderRadius: 12,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0FFF4'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          backgroundColor: cat.color,
                        }}>
                          {cat.icon(cat.iconColor)}
                        </div>
                        <span style={{
                          flex: 1,
                          fontSize: 13,
                          color: '#555',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {tmpl.name}
                        </span>
                        <svg style={{ width: 14, height: 14, color: '#ccc', flexShrink: 0 }}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    ))}
                    <button
                      onClick={() => onOpenBrowser(cat.category)}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#3CB371',
                        padding: '10px 0',
                        marginTop: 4,
                        borderTop: '1px solid #F5F5F5',
                        background: 'transparent',
                        border: 'none',
                        borderTopStyle: 'solid',
                        borderTopWidth: 1,
                        borderTopColor: '#F5F5F5',
                        cursor: 'pointer',
                      }}
                    >
                      See all {cat.label} templates →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Browse All */}
      <button
        onClick={() => onOpenBrowser('All')}
        style={{
          width: '100%',
          padding: '14px 0',
          fontSize: 14,
          fontWeight: 600,
          color: '#3CB371',
          border: '2px solid #D1FAE5',
          borderRadius: 16,
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0FFF4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        Browse All Templates →
      </button>

      <style>{`
        @keyframes accordionSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tmplSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
