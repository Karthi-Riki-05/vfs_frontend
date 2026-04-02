"use client";

import React, { useState, Suspense } from 'react';
import { message } from 'antd';
import { authApi } from '@/api/auth.api';
import { useSearchParams } from 'next/navigation';

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

const iconWrap: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9CA3AF',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
};

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { message.error('Invalid or missing reset token'); return; }
    if (!password || password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to reset password';
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

  if (success) {
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Password reset successfully</h1>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          You can now log in with your new password.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 32px', borderRadius: 12,
            color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none',
            background: GREEN,
          }}
        >
          Go to Login
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Reset your password</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Enter your new password below</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* New Password */}
        <div style={{ width: '100%', marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>New Password</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={iconWrap}>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
              style={{ ...inputBase, paddingRight: 44 }} onFocus={focusHandler} onBlur={blurHandler}
            />
            <button type="button" onClick={() => setShowPassword(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex', alignItems: 'center' }}>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ width: '100%', marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Confirm Password</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={iconWrap}>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
              style={inputBase} onFocus={focusHandler} onBlur={blurHandler}
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
              Resetting...
            </>
          ) : 'Reset Password'}
        </button>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <svg style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: GREEN }} fill="none" viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
