'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTemplates, fetchTemplateXml, TemplateItem } from '@/lib/templates';

interface TemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (xml: string, name: string) => void;
  initialCategory?: string;
}

export default function TemplateBrowser({ isOpen, onClose, onInsert, initialCategory }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TemplateItem | null>(null);
  const [inserting, setInserting] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearch('');
    if (initialCategory) setActiveCategory(initialCategory);
    else setActiveCategory('All');

    fetchTemplates()
      .then((data) => {
        setTemplates(data.templates);
        setCategories(data.categories);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, initialCategory]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, selected]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setSelected(null);
      onClose();
    }, 220);
  }, [onClose]);

  async function handleInsert(template: TemplateItem) {
    setInserting(true);
    try {
      const xml = await fetchTemplateXml(template.url);
      onInsert(xml, template.name);
      setSelected(null);
      handleClose();
    } catch (err) {
      console.error('Failed to fetch template XML:', err);
    } finally {
      setInserting(false);
    }
  }

  // Filter by category + search
  const filtered = templates.filter((t) => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (!isOpen && !closing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1000,
          animation: closing ? 'tmplFadeOut 0.22s ease forwards' : 'tmplFadeIn 0.18s ease forwards',
        }}
      />

      {/* Main modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: 900,
            maxWidth: '95vw',
            height: 620,
            maxHeight: '90vh',
            pointerEvents: 'all',
            animation: closing
              ? 'tmplModalOut 0.22s cubic-bezier(0.4,0,1,1) forwards'
              : 'tmplModalIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #f0f0f0',
              flexShrink: 0,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1a1a2e' }}>Templates</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>
                Choose a template to start with
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#999',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left sidebar — categories */}
            <div
              style={{
                width: 180,
                flexShrink: 0,
                borderRight: '1px solid #f0f0f0',
                paddingTop: 12,
                overflowY: 'auto',
              }}
            >
              {/* Search */}
              <div style={{ padding: '0 12px', marginBottom: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#f8f8f8',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    padding: '6px 10px',
                  }}
                >
                  <svg width={14} height={14} fill="none" stroke="#999" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 12,
                      color: '#333',
                    }}
                  />
                </div>
              </div>

              {/* Category list */}
              {categories.map((cat) => {
                const count = cat === 'All' ? templates.length : templates.filter((t) => t.category === cat).length;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      fontSize: 13,
                      border: 'none',
                      background: isActive ? '#f0faf4' : 'transparent',
                      color: isActive ? '#2e7d32' : '#555',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      borderRight: isActive ? '2px solid #3CB371' : '2px solid transparent',
                      transition: 'all 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat}
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0, marginLeft: 4 }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right — template grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: '2px solid #3CB371',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'tmplSpin 0.6s linear infinite',
                    }}
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#999',
                    fontSize: 14,
                  }}
                >
                  No templates found
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 14,
                  }}
                >
                  {filtered.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => setSelected(template)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              background: '#fafafa',
            }}
          >
            <span style={{ fontSize: 12, color: '#aaa' }}>
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleClose}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                color: '#666',
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {selected && (
        <TemplatePreview
          template={selected}
          inserting={inserting}
          onClose={() => setSelected(null)}
          onInsert={() => handleInsert(selected)}
        />
      )}

      <style>{`
        @keyframes tmplFadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tmplFadeOut  { from { opacity: 1 } to { opacity: 0 } }
        @keyframes tmplModalIn  { from { opacity: 0; transform: scale(0.94) translateY(12px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes tmplModalOut { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.94) translateY(8px) } }
        @keyframes tmplSpin     { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

/* ── Template card ──────────────────────────────────────────────── */
function TemplateCard({ template, onClick }: { template: TemplateItem; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: hovered ? '1px solid #3CB371' : '1px solid #e8e8e8',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#fff',
        boxShadow: hovered ? '0 4px 12px rgba(60,179,113,0.15)' : 'none',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: 120,
          background: '#f8f9fa',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!imgError ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            onError={() => setImgError(true)}
            style={{
              width: '90%',
              height: '90%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div style={{ color: '#ccc', fontSize: 12 }}>No preview</div>
        )}

        {/* Hover overlay with zoom icon */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(60,179,113,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <svg width={14} height={14} fill="none" stroke="#3CB371" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{ padding: '8px 10px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: '#1a1a2e',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {template.name}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 11,
            color: '#aaa',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {template.category}
        </p>
      </div>
    </div>
  );
}

/* ── Preview modal — renders actual XML via local draw.io viewer ── */
function TemplatePreview({
  template,
  inserting,
  onClose,
  onInsert,
}: {
  template: TemplateItem;
  inserting: boolean;
  onClose: () => void;
  onInsert: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [xmlLoaded, setXmlLoaded] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  // Fetch the template XML and load it into the local draw.io viewer iframe
  useEffect(() => {
    let cancelled = false;

    async function loadXml() {
      try {
        const xml = await fetchTemplateXml(template.url);
        if (cancelled) return;
        setXmlLoaded(true);

        // Wait for iframe to be ready, then send the XML via postMessage
        function sendToIframe() {
          if (cancelled) return;
          const iframe = iframeRef.current;
          if (!iframe?.contentWindow) {
            setTimeout(sendToIframe, 100);
            return;
          }
          // The draw.io embed protocol: send a 'load' action with the XML
          iframe.contentWindow.postMessage(JSON.stringify({
            action: 'load',
            xml: xml,
            autosave: 0,
          }), '*');
        }

        // Start trying to send once iframe signals ready (init event)
        // or after a delay as fallback
        if (iframeReady) {
          sendToIframe();
        }
      } catch (err) {
        console.error('Failed to load template XML for preview:', err);
      }
    }

    loadXml();
    return () => { cancelled = true; };
  }, [template.url, iframeReady]);

  // Listen for draw.io init event
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'init' && iframeRef.current &&
            event.source === iframeRef.current.contentWindow) {
          setIframeReady(true);
        }
      } catch { /* ignore non-JSON */ }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1100,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1101,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: 820,
            maxWidth: '94vw',
            height: 600,
            maxHeight: '90vh',
            pointerEvents: 'all',
            animation: 'tmplModalIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid #f0f0f0',
              flexShrink: 0,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
                {template.name}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>
                {template.category}
                {template.tags.length > 0 && ` \u2022 ${template.tags.slice(0, 4).join(', ')}`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: '#666',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                Cancel
              </button>
              <button
                onClick={onInsert}
                disabled={inserting}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: inserting ? '#9ACD9A' : '#3CB371',
                  border: 'none',
                  borderRadius: 10,
                  cursor: inserting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!inserting) e.currentTarget.style.background = '#2E8B57';
                }}
                onMouseLeave={(e) => {
                  if (!inserting) e.currentTarget.style.background = '#3CB371';
                }}
              >
                {inserting ? (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid #fff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'tmplSpin 0.6s linear infinite',
                    }}
                  />
                ) : (
                  <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                )}
                {inserting ? 'Loading...' : 'Use Template'}
              </button>
            </div>
          </div>

          {/* Preview area — draw.io iframe renders crisp vector diagram */}
          <div
            style={{
              flex: 1,
              background: '#f8f9fa',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 440,
            }}
          >
            {/* Loading spinner — shown until iframe renders */}
            {!iframeReady && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  background: '#f8f9fa',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    border: '2px solid #3CB371',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'tmplSpin 0.6s linear infinite',
                  }}
                />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src="/draw_io/index.html?embed=1&proto=json&spin=0&chrome=0&lightbox=1&layers=1&nav=0&grid=0"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Template preview"
            />
          </div>
        </div>
      </div>
    </>
  );
}
