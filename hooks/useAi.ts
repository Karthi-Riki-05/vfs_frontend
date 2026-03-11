import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { aiApi } from '@/api/ai.api';
import { useSession } from 'next-auth/react';

interface AiResponse {
  message: string;
  templateName: string | null;
  openTemplate: boolean;
  drawioXml: string | null;
  suggestedSteps: string[];
}

export function useAi() {
  const { data: session } = useSession();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const userContextRef = useRef<any>(null);

  // Check consent on mount
  useEffect(() => {
    if (session) {
      aiApi
        .getConsent()
        .then((res) => {
          const d = res.data?.data || res.data || {};
          setHasConsent(!!d.consented);
        })
        .catch(() => setHasConsent(false));
    }
  }, [session]);

  // Fetch user context when consent is confirmed
  useEffect(() => {
    if (session && hasConsent) {
      aiApi
        .getContext()
        .then((res) => {
          const d = res.data?.data || res.data || {};
          userContextRef.current = d;
        })
        .catch(() => {
          userContextRef.current = null;
        });
    }
  }, [session, hasConsent]);

  const acceptConsent = useCallback(async () => {
    try {
      await aiApi.setConsent(true);
      setHasConsent(true);
    } catch {
      message.error('Failed to save consent');
    }
  }, []);

  const declineConsent = useCallback(async () => {
    try {
      await aiApi.setConsent(false);
      setHasConsent(false);
    } catch {
      message.error('Failed to save consent');
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return null;

    setLoading(true);
    setResponse(null);

    try {
      const res = await aiApi.chat(text.trim(), conversationId || undefined, userContextRef.current);
      const d = res.data?.data || res.data || {};
      setConversationId(d.conversationId || null);
      setResponse(d.response || null);
      return d.response;
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'CONSENT_REQUIRED') {
        setHasConsent(false);
        return null;
      }
      setResponse({
        message: 'Something went wrong. Please try again.',
        templateName: null,
        openTemplate: false,
        drawioXml: null,
        suggestedSteps: [],
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setResponse(null);
  }, []);

  const deleteAllData = useCallback(async () => {
    try {
      await aiApi.deleteData();
      setHasConsent(null);
      setConversationId(null);
      setResponse(null);
      userContextRef.current = null;
      message.success('All AI data deleted');
    } catch {
      message.error('Failed to delete AI data');
    }
  }, []);

  // Refresh context (e.g., when AI panel opens)
  const refreshContext = useCallback(async () => {
    if (!session || !hasConsent) return;
    try {
      const res = await aiApi.getContext();
      const d = res.data?.data || res.data || {};
      userContextRef.current = d;
    } catch {
      // silently ignore
    }
  }, [session, hasConsent]);

  return {
    hasConsent,
    loading,
    response,
    conversationId,
    acceptConsent,
    declineConsent,
    sendMessage,
    startNewConversation,
    deleteAllData,
    refreshContext,
  };
}
