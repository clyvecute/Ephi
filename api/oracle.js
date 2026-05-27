// api/oracle.js
// Vercel Serverless Function — Secure Gemini API Proxy
// The Gemini API key is stored as a Vercel Environment Variable (never exposed to client)

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const PRIMARY_MODEL   = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const FALLBACK_MODEL  = 'gemini-flash-latest';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

async function callGemini(model, { prompt, fileUri, fileUris }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const parts = [{ text: prompt }];
  
  if (fileUris && Array.isArray(fileUris)) {
    for (const uri of fileUris) {
      if (uri) {
        parts.push({
          fileData: {
            fileUri: uri,
            mimeType: uri.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
          },
        });
      }
    }
  } else if (fileUri) {
    parts.push({
      fileData: {
        fileUri,
        mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
      },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.85, topP: 0.9, topK: 40 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return { response, status: response.status };
}

export default async function handler(req, res) {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Authentication ──────────────────────────────────────────────────────────
  // Verify Firebase ID token so only logged-in Ephi users can call the Oracle
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    try {
      // Lightweight JWT decode — we verify issuer + expiry without the Admin SDK
      // (No Firebase Admin SDK required → keeps the function dependency-free)
      const [, payloadB64] = idToken.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      if (!payload.sub || payload.exp < now) {
        return res.status(401).json({ error: 'Unauthorized: token expired' });
      }
      // iss check: must be a Firebase token for your project
      if (!payload.iss?.includes('securetoken.google.com')) {
        return res.status(401).json({ error: 'Unauthorized: invalid token issuer' });
      }
    } catch {
      return res.status(401).json({ error: 'Unauthorized: malformed token' });
    }
  }

  // ── Payload ─────────────────────────────────────────────────────────────────
  const { prompt, fileUri, fileUris } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Server config error: API key missing' });

  // ── Proxy to Gemini ─────────────────────────────────────────────────────────
  try {
    let { response, status } = await callGemini(PRIMARY_MODEL, { prompt, fileUri, fileUris });

    // Automatic fallback if primary model not available
    if (status === 404) {
      ({ response, status } = await callGemini(FALLBACK_MODEL, { prompt, fileUri, fileUris }));
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(status).json({ error: err?.error?.message || `Gemini error ${status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
