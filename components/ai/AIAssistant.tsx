"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button, Spin } from 'antd';
import {
  SendOutlined,
  CloseOutlined,
  ExpandOutlined,
  CompressOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAi } from '@/hooks/useAi';
import { useIsMobile } from '@/hooks/useMediaQuery';
import AIConsentModal from './AIConsentModal';

type ViewState = 'collapsed' | 'half' | 'fullscreen';

const PRIMARY = '#3CB371';

const BrainIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
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
    startNewConversation,
    refreshContext,
  } = useAi();
  const isMobile = useIsMobile();

  const [state, setState] = useState<ViewState>('collapsed');
  const [input, setInput] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleChips = useMemo(() => {
    const shuffled = [...SUGGESTION_CHIPS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, []);

  useEffect(() => {
    if (state === 'half' || state === 'fullscreen') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state]);

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
    await sendMessage(text);
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
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask me anything..."
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
            <BrainIcon size={22} />
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
            {/* AI response */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: PRIMARY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <BrainIcon size={14} />
              </div>
              <div style={{
                flex: 1,
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
                  {response.openTemplate && response.templateName ? (
                    <>
                      {response.message || 'Here is your diagram:'}{' '}
                      <span style={{ color: PRIMARY, fontWeight: 600 }}>{response.templateName}</span>
                    </>
                  ) : (
                    response.message
                  )}
                </p>
              </div>
            </div>

            {/* Template card */}
            {response.openTemplate && (
              <div style={{
                marginLeft: 42,
                background: '#fff',
                borderRadius: 12,
                padding: isFS ? 16 : 12,
                border: '1px solid #F0F0F0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#595959', fontSize: 13, fontWeight: 500 }}>{response.templateName}</span>
                  <Button
                    type="primary"
                    size="small"
                    style={{
                      borderRadius: 8,
                      backgroundColor: PRIMARY,
                      borderColor: PRIMARY,
                      fontWeight: 500,
                      fontSize: 12,
                    }}
                    onClick={() => {
                      if (response.drawioXml) {
                        sessionStorage.setItem('ai_generated_xml', response.drawioXml);
                        sessionStorage.setItem('ai_generated_name', response.templateName || 'AI Generated Flow');
                      }
                      window.open('/dashboard/flows/new?source=ai', '_blank');
                      handleCollapse();
                    }}
                  >
                    Open in Editor &rarr;
                  </Button>
                </div>
                <div style={{
                  height: isFS ? 140 : 90,
                  background: '#FAFAFA',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #F0F0F0',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 2 }}>&#128202;</div>
                    <span style={{ fontSize: 11, color: '#8C8C8C' }}>{response.templateName}</span>
                  </div>
                </div>

                {response.suggestedSteps && response.suggestedSteps.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0F0F0' }}>
                    {response.suggestedSteps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#595959', marginBottom: 4 }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: '50%', background: '#E8F5E9', color: PRIMARY,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          fontSize: 9, fontWeight: 600, marginTop: 1,
                        }}>{i + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              <BrainIcon size={14} />
            </div>
            <span>Hi, I&apos;m Value Charts AI. I am here to help you...</span>
          </button>
          </div>
        )}

        {/* MOBILE: fixed FAB at bottom-right */}
        {isMobile && (
          <button
            onClick={handlePillClick}
            aria-label="Open AI Assistant"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 20,
              zIndex: 200,
              width: 56,
              height: 56,
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
            <BrainIcon size={24} />
          </button>
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
              : { bottom: 0, left: contentLeft, right: contentRight }
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
            transition: 'left 0.2s, right 0.2s',
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
            left: contentLeft,
            right: contentRight,
            zIndex: 100,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'left 0.2s, right 0.2s',
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
