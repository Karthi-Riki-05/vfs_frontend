"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { message as antdMessage } from 'antd';

const PRIMARY = '#3CB371';

interface DiagramPreviewProps {
  xml: string;
  aiMessage: string;
  prompt: string;
  isInEditor: boolean;
  onInsert: (xml: string) => void;
  onReload: (prompt: string) => void;
}

/**
 * Builds a self-contained HTML page that renders draw.io XML
 * using the diagrams.net viewer library — no editor chrome.
 */
function buildViewerHtml(xml: string): string {
  const escaped = xml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #FAFAFA;
  overflow: hidden;
}
.mxgraph { max-width: 100%; }
</style>
</head>
<body>
<div class="mxgraph" style="max-width:100%;border:none;" data-mxgraph='${JSON.stringify({
    highlight: '#000000',
    nav: false,
    resize: true,
    toolbar: '',
    edit: '_blank',
    xml: escaped,
  }).replace(/'/g, '&#39;')}'>
</div>
<script type="text/javascript" src="https://viewer.diagrams.net/js/viewer-static.min.js"><\/script>
</body>
</html>`;
}

export default function DiagramPreview({
  xml,
  aiMessage,
  prompt,
  isInEditor,
  onInsert,
  onReload,
}: DiagramPreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs for viewer iframes
  const thumbIframeRef = useRef<HTMLIFrameElement>(null);
  const fullIframeRef = useRef<HTMLIFrameElement>(null);
  const thumbBlobUrl = useRef<string | null>(null);
  const fullBlobUrl = useRef<string | null>(null);

  // Load viewer HTML into iframe via blob URL
  const loadViewer = useCallback(
    (iframe: HTMLIFrameElement | null, blobRef: React.MutableRefObject<string | null>) => {
      if (!iframe || !xml) return;
      // Revoke old blob
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      const html = buildViewerHtml(xml);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      iframe.src = url;
    },
    [xml]
  );

  // Load thumbnail viewer
  useEffect(() => {
    loadViewer(thumbIframeRef.current, thumbBlobUrl);
    return () => {
      if (thumbBlobUrl.current) URL.revokeObjectURL(thumbBlobUrl.current);
    };
  }, [loadViewer]);

  // Load full viewer when preview opens
  useEffect(() => {
    if (previewOpen) {
      // Small delay to ensure DOM is rendered
      requestAnimationFrame(() => {
        loadViewer(fullIframeRef.current, fullBlobUrl);
      });
    }
    return () => {
      if (!previewOpen && fullBlobUrl.current) {
        URL.revokeObjectURL(fullBlobUrl.current);
        fullBlobUrl.current = null;
      }
    };
  }, [previewOpen, loadViewer]);

  function handleInsert() {
    onInsert(xml);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  }

  function handleShare() {
    navigator.clipboard.writeText(xml);
    setCopied(true);
    antdMessage.success('Diagram XML copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReload() {
    setInserted(false);
    onReload(prompt);
  }

  function closePreview() {
    setPreviewClosing(true);
    setTimeout(() => {
      setPreviewOpen(false);
      setPreviewClosing(false);
    }, 200);
  }

  return (
    <>
      {/* ── DIAGRAM CARD IN CHAT ── */}
      <div
        style={{
          marginTop: 12,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #E8E8E8',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* AI message above preview */}
        <div style={{ padding: '12px 14px 8px' }}>
          <p
            style={{
              fontSize: 12,
              color: '#595959',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {aiMessage}
          </p>
        </div>

        {/* ── DIAGRAM PREVIEW (clickable thumbnail) ── */}
        <div
          style={{
            position: 'relative',
            margin: '0 12px',
            background: '#FAFAFA',
            border: '1px solid #F0F0F0',
            borderRadius: 8,
            overflow: 'hidden',
            height: 200,
            cursor: 'pointer',
          }}
          onClick={() => setPreviewOpen(true)}
          title="Click to preview full diagram"
        >
          <iframe
            ref={thumbIframeRef}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none',
            }}
            title="Diagram thumbnail"
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Hover overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(0,0,0,0.04)';
              const label = e.currentTarget.querySelector(
                '[data-preview-label]'
              ) as HTMLElement;
              if (label) label.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              const label = e.currentTarget.querySelector(
                '[data-preview-label]'
              ) as HTMLElement;
              if (label) label.style.opacity = '0';
            }}
          >
            <div
              data-preview-label=""
              style={{
                opacity: 0,
                transition: 'opacity 0.2s',
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: '#595959',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
              Preview
            </div>
          </div>
        </div>

        {/* ── ACTION TOOLBAR ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderTop: '1px solid #F0F0F0',
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Reload */}
            <ActionBtn onClick={handleReload} title="Regenerate diagram">
              <svg
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </ActionBtn>

            {/* Share / Copy */}
            <ActionBtn
              onClick={handleShare}
              title={copied ? 'Copied!' : 'Copy diagram XML'}
            >
              {copied ? (
                <svg
                  width={16}
                  height={16}
                  fill="none"
                  stroke={PRIMARY}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              )}
            </ActionBtn>

            {/* Zoom / Preview */}
            <ActionBtn
              onClick={() => setPreviewOpen(true)}
              title="Preview full diagram"
            >
              <svg
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </ActionBtn>
          </div>

          {/* Insert / Open button */}
          <button
            onClick={handleInsert}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: inserted
                ? '#E8F5E9'
                : isInEditor
                  ? PRIMARY
                  : '#1A1A2E',
              color: inserted ? PRIMARY : '#fff',
            }}
          >
            {inserted ? (
              <>
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Inserted!
              </>
            ) : (
              <>
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {isInEditor ? 'Insert' : 'Open in Editor'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── FULL SCREEN PREVIEW MODAL ── */}
      {previewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            animation: previewClosing
              ? 'diagramFadeOut 0.2s ease forwards'
              : 'diagramSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Modal header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #E8E8E8',
              background: '#fff',
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1A1A2E',
                  margin: 0,
                }}
              >
                Diagram Preview
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#8C8C8C',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 300,
                }}
              >
                {prompt}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Insert from modal */}
              <button
                onClick={() => {
                  handleInsert();
                  closePreview();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: PRIMARY,
                  color: '#fff',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#2EA060';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = PRIMARY;
                }}
              >
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {isInEditor ? 'Insert' : 'Open in Editor'}
              </button>

              {/* Close */}
              <button
                onClick={closePreview}
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
                  color: '#8C8C8C',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#F5F5F5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    'transparent';
                }}
              >
                <svg
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Full diagram viewer */}
          <div style={{ flex: 1, background: '#FAFAFA', overflow: 'hidden' }}>
            <iframe
              ref={fullIframeRef}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Full diagram preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes diagramSlideUp {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes diagramFadeOut {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }
      `}</style>
    </>
  );
}

// Small icon button component
function ActionBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        color: '#8C8C8C',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = '#F5F5F5';
        (e.currentTarget as HTMLElement).style.color = '#595959';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = '#8C8C8C';
      }}
    >
      {children}
    </button>
  );
}
