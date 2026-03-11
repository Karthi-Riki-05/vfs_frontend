"use client";

import React, { useState } from 'react';
import { message } from 'antd';
import { authApi } from '@/api/auth.api';

const GREEN = '#4CAF50';

const inputBase: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 46,
  paddingLeft: 36,
  paddingRight: 12,
  backgroundColor: '#EFF6FF',
  border: '1.5px solid #DBEAFE',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  color: '#1a1a2e',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s, background-color 0.2s',
};

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to send reset email';
      message.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = GREEN;
    e.currentTarget.style.backgroundColor = '#F0FDF4';
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#DBEAFE';
    e.currentTarget.style.backgroundColor = '#EFF6FF';
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#E8F5E9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <svg style={{ width: 28, height: 28, color: GREEN }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Check your email</h1>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          We sent a password reset link to <strong style={{ color: '#374151' }}>{email}</strong>.
          Check your inbox and follow the link.
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 24 }}>Didn&apos;t receive it? Check your spam folder.</p>
        <a href="/login" style={{ fontSize: 14, color: GREEN, fontWeight: 600, textDecoration: 'none' }}>
          &larr; Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: '#E8F5E9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg style={{ width: 24, height: 24, color: GREEN }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Forgot your password?</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>No worries. Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ width: '100%', marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email address</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#9CA3AF', pointerEvents: 'none', display: 'flex', alignItems: 'center',
            }}>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={inputBase}
              onFocus={focusHandler} onBlur={blurHandler}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px',
          }}>
            <svg style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading}
          style={{
            width: '100%', height: 46, borderRadius: 12,
            color: '#fff', fontWeight: 600, fontSize: 15, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#9CA3AF' : GREEN,
            transition: 'opacity 0.2s', fontFamily: 'inherit',
            opacity: loading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading ? (
            <>
              <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Reset Link
            </>
          )}
        </button>
      </form>

      {/* Back link */}
      <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 20, marginBottom: 0 }}>
        <a href="/login" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>
          &larr; Back to sign in
        </a>
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
