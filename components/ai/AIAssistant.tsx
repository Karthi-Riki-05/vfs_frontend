"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Spin, message as antdMessage } from 'antd';
import {
  SendOutlined,
  CloseOutlined,
  ExpandOutlined,
  CompressOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAi } from '@/hooks/useAi';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { usePathname } from 'next/navigation';
import AIConsentModal from './AIConsentModal';
import DiagramPreview from './DiagramPreview';
import { flowsApi } from '@/api/flows.api';

type ViewState = 'collapsed' | 'half' | 'fullscreen';

const PRIMARY = '#3CB371';

const GeminiIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12Z" />
  </svg>
);

const SUGGESTION_CHIPS = [
  'Generate a system workflow chart',
  'How do I invite team members?',
  'Create a decision-making flowchart',
  'How do I share a flow with my team?',
  'Design a project management flow',
  'How does the Pro plan work?',
  'Create a data structure flowchart',
  'I forgot my password, what do I do?',
];

const DIAGRAM_KEYWORDS = [
  'flowchart', 'flow chart', 'diagram', 'chart', 'map', 'process flow',
  'workflow', 'schema', 'er diagram', 'org chart', 'vsm', 'value stream',
  'sequence diagram', 'swimlane', 'bpmn', 'network diagram', 'architecture',
  'class diagram', 'mind map', 'create a', 'generate a', 'draw a', 'make a',
  'design a', 'show me a', 'build a',
];

function isDiagramRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const hasDiagramWord = DIAGRAM_KEYWORDS.some(kw => lower.includes(kw));
  // Exclude pure informational questions
  const isPureQuestion = /^(what is|what are|why|who|where|when|explain|tell me about|how does|how do i|how can i|what does)/i.test(message.trim());
  return hasDiagramWord && !isPureQuestion;
}

interface AIAssistantProps {
  contentLeft?: number;
  contentRight?: number;
}

export default function AIAssistant({ contentLeft = 0, contentRight = 0 }: AIAssistantProps) {
  const {
    hasConsent,
    loading,
    response,
    acceptConsent,
    declineConsent,
    sendMessage,
    generateDiagram,
    generateDiagramFromDocument,
    startNewConversation,
    refreshContext,
  } = useAi();
  const isMobile = useIsMobile();
  const pathname = usePathname() || '';

  const [state, setState] = useState<ViewState>('collapsed');
  const [input, setInput] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect if we're in the editor page
  const isInEditor = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(pathname);

  // Get the XML from response (supports both formats)
  const responseXml = response?.xml || response?.drawioXml || null;

  const visibleChips = useMemo(() => {
    const shuffled = [...SUGGESTION_CHIPS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, []);

  // Dispatch AI panel open/close events for FAB hide/show
  useEffect(() => {
    if (state === 'half' || state === 'fullscreen') {
      window.dispatchEvent(new CustomEvent('aiPanelOpened'));
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      window.dispatchEvent(new CustomEvent('aiPanelClosed'));
    }
  }, [state]);

  // Mobile greeting bubble — show once per session
  useEffect(() => {
    if (!isMobile) return;
    const seen = sessionStorage.getItem('ai_greeting_seen');
    if (seen) return;
    const showTimer = setTimeout(() => setShowGreeting(true), 1000);
    const hideTimer = setTimeout(() => {
      setShowGreeting(false);
      sessionStorage.setItem('ai_greeting_seen', '1');
    }, 11000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [isMobile]);

  // Listen for openAIAssistant event from EditorFABs
  useEffect(() => {
    function handleOpenEvent() {
      if (hasConsent === false || hasConsent === null) {
        setShowConsentModal(true);
        return;
      }
      refreshContext();
      setState('half');
    }

    window.addEventListener('openAIAssistant', handleOpenEvent);
    return () => {
      window.removeEventListener('openAIAssistant', handleOpenEvent);
    };
  }, [hasConsent, refreshContext]);

  function handlePillClick() {
    if (hasConsent === false || hasConsent === null) {
      setShowConsentModal(true);
      return;
    }
    refreshContext();
    setState('half');
  }

  function handleExpand() {
    setState('fullscreen');
  }

  function handleCompress() {
    setState('half');
  }

  function handleCollapse() {
    setState('collapsed');
    startNewConversation();
    setLastUserMessage('');
  }

  async function handleSubmit(message?: string) {
    const text = message || input.trim();
    if (!text || loading) return;
    setLastUserMessage(text);
    setInput('');

    // Detect diagram intent — use dedicated endpoint for better XML quality
    if (isDiagramRequest(text)) {
      await generateDiagram(text);
    } else {
      await sendMessage(text);
    }
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setLastUserMessage(`Analyzing "${file.name}"...`);
    await generateDiagramFromDocument(file);
  }

  async function handleInsertDiagram(xml: string) {
    console.log('[AIAssistant] handleInsertDiagram called, isInEditor:', isInEditor, 'pathname:', pathname, 'xml length:', xml?.length);
    if (isInEditor) {
      // Inject into live canvas
      console.log('[AIAssistant] Dispatching aiXmlReady event');
      window.dispatchEvent(new CustomEvent('aiXmlReady', { detail: { xml } }));
      antdMessage.success('Diagram applied to canvas');
    } else {
      // Create a new flow and open the editor with the AI XML preloaded
      try {
        const name = response?.templateName || 'AI Generated Flow';
        sessionStorage.setItem('ai_generated_xml', xml);
        sessionStorage.setItem('ai_generated_name', name);
        const res = await flowsApi.create({ name });
        const newFlow = res.data?.data || res.data;
        if (!newFlow?.id) throw new Error('No flow ID returned');
        window.open(`/dashboard/flows/${newFlow.id}`, '_blank');
      } catch {
        antdMessage.error('Failed to create flow. Please try again.');
      }
    }
  }

  function handleReloadDiagram(prompt: string) {
    handleSubmit(prompt);
  }

  async function handleConsentAccept() {
    await acceptConsent();
    setShowConsentModal(false);
    setState('half');
  }

  function handleConsentDecline() {
    declineConsent();
    setShowConsentModal(false);
  }

  // ---- Shared: Input bar ----
  const renderInputBar = (isFS = false) => (
    <div style={{
      padding: isFS ? '12px 24px' : '10px 16px',
      borderTop: '1px solid #F0F0F0',
      flexShrink: 0,
      background: '#fff',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#F8F9FA',
        border: '1px solid #E8E8E8',
        borderRadius: 12,
        padding: '8px 12px',
        maxWidth: isFS ? 800 : undefined,
        margin: isFS ? '0 auto' : undefined,
        transition: 'border-color 0.2s',
      }}>
        {/* Document upload button — only in editor */}
        {isInEditor && (
          <label
            style={{
              cursor: 'pointer',
              color: '#BFBFBF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'color 0.2s',
            }}
            title="Upload document to generate diagram"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = PRIMARY; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#BFBFBF'; }}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.txt,.md,.docx,.doc"
              onChange={handleDocumentUpload}
            />
            <FileTextOutlined style={{ fontSize: 15 }} />
          </label>
        )}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={isInEditor ? "Describe a diagram or ask anything..." : "Ask me anything..."}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#1A1A2E',
            fontSize: 13,
          }}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !input.trim()}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: 'none',
            background: PRIMARY,
            color: '#fff',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading || !input.trim() ? 0.4 : 1,
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <SendOutlined style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  );

  // ---- Shared: Header bar ----
  const renderHeader = (isFS = false) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isFS ? '12px 24px' : '10px 16px',
      borderBottom: '1px solid #F0F0F0',
      flexShrink: 0,
      background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/images/image.png" alt="Value Charts" style={{ height: 32, width: 'auto' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 4 }}>
        {/* Hide expand/compress on mobile — half view is already full screen */}
        {!isMobile && (
          <button
            onClick={state === 'fullscreen' ? handleCompress : handleExpand}
            title={state === 'fullscreen' ? 'Minimize' : 'Full screen'}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'transparent', color: '#8C8C8C', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {state === 'fullscreen' ? <CompressOutlined style={{ fontSize: 14 }} /> : <ExpandOutlined style={{ fontSize: 14 }} />}
          </button>
        )}
        <button
          onClick={handleCollapse}
          title="Close"
          style={{
            width: isMobile ? 40 : 30, height: isMobile ? 40 : 30,
            borderRadius: isMobile ? 12 : 8, border: 'none',
            background: 'transparent', color: '#8C8C8C', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <CloseOutlined style={{ fontSize: isMobile ? 16 : 13 }} />
        </button>
      </div>
    </div>
  );

  // ---- Shared: Suggestion chips ----
  const renderChips = (isFS = false) => (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isFS ? '0 24px' : '0 16px',
    }}>
      {isFS && (
        <>
          <div style={{
            width: 48, height: 48, borderRadius: 16, background: PRIMARY,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, boxShadow: '0 4px 12px rgba(60,179,113,0.3)',
          }}>
            <GeminiIcon size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
            Hi, I&apos;m Value Charts AI.
          </h1>
          <p style={{ fontSize: 14, color: '#8C8C8C', marginBottom: 28 }}>
            What flow would you like to create today?
          </p>
        </>
      )}
      {!isFS && (
        <p style={{ fontSize: 11, color: '#BFBFBF', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Suggested questions
        </p>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: isFS ? 10 : 8,
        width: '100%',
        maxWidth: isFS ? 640 : 500,
      }}>
        {visibleChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSubmit(chip)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isFS ? '14px 16px' : '10px 12px',
              borderRadius: 12,
              background: '#FAFAFA',
              border: '1px solid #F0F0F0',
              color: '#595959',
              fontSize: isFS ? 13 : 12,
              textAlign: 'left' as const,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0FFF4';
              e.currentTarget.style.borderColor = '#B7EB8F';
              e.currentTarget.style.color = '#1A1A2E';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FAFAFA';
              e.currentTarget.style.borderColor = '#F0F0F0';
              e.currentTarget.style.color = '#595959';
            }}
          >
            <SearchOutlined style={{ color: PRIMARY, fontSize: 12, flexShrink: 0 }} />
            {chip}
          </button>
        ))}
      </div>
    </div>
  );

  // ---- Shared: Response content ----
  const renderResponseContent = (isFS = false) => (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: isFS ? '16px 24px' : '12px 16px',
      background: '#FAFAFA',
    }}>
      <div style={{ maxWidth: isFS ? 800 : undefined, margin: isFS ? '0 auto' : undefined }}>
        {/* User message bubble */}
        {lastUserMessage && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <div style={{
              background: PRIMARY,
              borderRadius: '12px 12px 2px 12px',
              padding: '8px 14px',
              color: '#fff',
              fontSize: 13,
              maxWidth: isFS ? 400 : 260,
              wordBreak: 'break-word' as const,
            }}>
              {lastUserMessage}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#E8F5E9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Spin size="small" />
            </div>
            <span style={{ fontSize: 13, color: '#8C8C8C' }}>Value Charts AI is thinking...</span>
          </div>
        ) : response ? (
          <div>
            {/* AI response bubble (text part) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: responseXml ? 0 : 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: PRIMARY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <GeminiIcon size={14} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                {/* Text message — hide when diagram preview is shown (it displays its own message) */}
                {!responseXml && !(response.openTemplate && response.drawioXml) && (
                  <div style={{
                    background: '#fff',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '10px 14px',
                    border: '1px solid #F0F0F0',
                  }}>
                    <p style={{
                      color: '#1A1A2E',
                      fontSize: isFS ? 14 : 13,
                      lineHeight: 1.7,
                      margin: 0,
                      whiteSpace: 'pre-wrap' as const,
                    }}>
                      {response.message}
                    </p>
                  </div>
                )}

                {/* ── DIAGRAM PREVIEW with visual thumbnail ── */}
                {responseXml ? (
                  <DiagramPreview
                    xml={responseXml}
                    aiMessage={response.message || 'Here is your diagram.'}
                    prompt={lastUserMessage}
                    isInEditor={isInEditor}
                    onInsert={handleInsertDiagram}
                    onReload={handleReloadDiagram}
                  />
                ) : response.openTemplate && response.drawioXml ? (
                  /* Legacy chat responses that contain drawioXml */
                  <DiagramPreview
                    xml={response.drawioXml}
                    aiMessage={response.message || 'Here is your diagram.'}
                    prompt={lastUserMessage}
                    isInEditor={isInEditor}
                    onInsert={handleInsertDiagram}
                    onReload={handleReloadDiagram}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  // ===============================================================
  // COLLAPSED — desktop: centered pill, mobile: FAB bottom-right
  // ===============================================================
  if (state === 'collapsed') {
    return (
      <>
        {/* DESKTOP: centered pill at bottom of content area */}
        {!isMobile && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            left: contentLeft,
            right: contentRight,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
          <button
            onClick={handlePillClick}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              borderRadius: 999,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              background: '#fff',
              color: '#595959',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid #E8E8E8',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.16)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <GeminiIcon size={14} color="#fff" />
            </div>
            <span>Hi, I&apos;m Value Charts AI. I am here to help you...</span>
          </button>
          </div>
        )}

        {/* MOBILE: fixed FAB at bottom-right with greeting bubble */}
        {isMobile && (
          <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 200 }}>
            {/* Greeting bubble */}
            <div
              style={{
                position: 'absolute',
                bottom: 56,
                right: 0,
                background: '#fff',
                borderRadius: 16,
                padding: '10px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                border: '1px solid #E8E8E8',
                whiteSpace: 'nowrap',
                fontSize: 13,
                fontWeight: 500,
                color: '#1A1A2E',
                opacity: showGreeting ? 1 : 0,
                transform: showGreeting ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                pointerEvents: showGreeting ? 'auto' : 'none',
              }}
              onClick={() => {
                setShowGreeting(false);
                sessionStorage.setItem('ai_greeting_seen', '1');
                handlePillClick();
              }}
            >
              Hi, I am Value Chart AI 👋
              {/* Arrow pointing down */}
              <span style={{
                position: 'absolute',
                bottom: -6,
                right: 20,
                width: 12,
                height: 12,
                background: '#fff',
                border: '1px solid #E8E8E8',
                borderTop: 'none',
                borderLeft: 'none',
                transform: 'rotate(45deg)',
              }} />
            </div>
            <button
              onClick={handlePillClick}
              aria-label="Open AI Assistant"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: PRIMARY,
                color: '#fff',
                border: 'none',
                boxShadow: '0 4px 16px rgba(60,179,113,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <GeminiIcon size={20} />
            </button>
          </div>
        )}

        <AIConsentModal
          open={showConsentModal}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      </>
    );
  }

  // ===============================================================
  // HALF VIEW — full screen on mobile, 40vh panel on desktop
  // ===============================================================
  if (state === 'half') {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            ...(isMobile
              ? { top: 56, bottom: 0, left: 0, right: 0 }
              : {
                  bottom: 0,
                  left: `calc(${contentLeft}px + (100% - ${contentLeft}px - ${contentRight}px - 460px) / 2)`,
                  width: 460,
                }
            ),
            zIndex: isMobile ? 200 : 100,
            height: isMobile ? undefined : '40vh',
            display: 'flex',
            flexDirection: 'column',
            borderTopLeftRadius: isMobile ? 0 : 16,
            borderTopRightRadius: isMobile ? 0 : 16,
            overflow: 'hidden',
            boxShadow: isMobile ? 'none' : '0 -4px 24px rgba(0,0,0,0.1)',
            background: '#fff',
            borderTop: isMobile ? 'none' : '1px solid #F0F0F0',
            transition: 'left 0.2s, right 0.2s, width 0.2s',
          }}
        >
          {renderHeader(isMobile)}

          {/* Content */}
          {!response && !loading && !lastUserMessage
            ? renderChips(isMobile)
            : renderResponseContent(isMobile)
          }

          {renderInputBar(isMobile)}
        </div>
        <AIConsentModal
          open={showConsentModal}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      </>
    );
  }

  // ===============================================================
  // FULLSCREEN — covers content area only
  // ===============================================================
  if (state === 'fullscreen') {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 56,
            bottom: 0,
            left: `calc(${contentLeft}px + (100% - ${contentLeft}px - ${contentRight}px - 480px) / 2)`,
            width: 480,
            zIndex: 100,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'left 0.2s, width 0.2s',
            boxShadow: '0 0 24px rgba(0,0,0,0.08)',
          }}
        >
          {renderHeader(true)}

          {/* Content */}
          {!response && !loading && !lastUserMessage
            ? renderChips(true)
            : (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {renderResponseContent(true)}
              </div>
            )
          }

          {renderInputBar(true)}
        </div>
        <AIConsentModal
          open={showConsentModal}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      </>
    );
  }

  return null;
}
