// api/oracle.js
// Vercel Serverless Function — Secure Gemini API Proxy
// GEMINI_API_KEY is read per-request (not at module load) to ensure
// Vercel env vars are always available even after cold starts.

const PRIMARY_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

async function callGemini(model, apiKey, { prompt, fileUri, fileUris }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt }];

  if (fileUris && Array.isArray(fileUris)) {
    for (const uri of fileUris) {
      if (uri) parts.push({ fileData: { fileUri: uri, mimeType: uri.endsWith('.pdf') ? 'application/pdf' : 'text/plain' } });
    }
  } else if (fileUri) {
    parts.push({ fileData: { fileUri, mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'text/plain' } });
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
  // ── CORS preflight ───────────────────────────────────────────────────────────
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Health / diagnostic check ────────────────────────────────────────────────
  // GET /api/oracle returns env var presence without exposing the value
  if (req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY;
    return res.status(200).json({
      status: 'ok',
      gemini_key_set: Boolean(key),
      gemini_key_length: key ? key.length : 0,
      gemini_key_prefix: key ? key.slice(0, 8) + '...' : 'NOT SET',
      model: PRIMARY_MODEL,
      node_env: process.env.NODE_ENV,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Read key per-request (not at module load) ────────────────────────────────
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.error('[oracle] GEMINI_API_KEY is not set in environment');
    return res.status(500).json({
      error: 'Server config error: GEMINI_API_KEY environment variable is not set.',
      hint: 'Add GEMINI_API_KEY (no VITE_ prefix) in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }

  // ── Authentication ───────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing Bearer token' });
  }
  try {
    const idToken = authHeader.split('Bearer ')[1];
    const [, payloadB64] = idToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || payload.exp < now) return res.status(401).json({ error: 'Unauthorized: token expired' });
    if (!payload.iss?.includes('securetoken.google.com')) return res.status(401).json({ error: 'Unauthorized: invalid token issuer' });
  } catch {
    return res.status(401).json({ error: 'Unauthorized: malformed token' });
  }

  // ── Payload ──────────────────────────────────────────────────────────────────
  const { prompt, fileUri, fileUris } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const MAX_PROMPT_CHARS = 32000;
  if (prompt.length > MAX_PROMPT_CHARS) return res.status(400).json({ error: 'Prompt too large' });

  // ── Proxy to Gemini ──────────────────────────────────────────────────────────
  try {
    let { response, status } = await callGemini(PRIMARY_MODEL, GEMINI_KEY, { prompt, fileUri, fileUris });

    if (status === 404 || status === 400) {
      ({ response, status } = await callGemini(FALLBACK_MODEL, GEMINI_KEY, { prompt, fileUri, fileUris }));
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[oracle] Gemini error:', status, err);
      return res.status(status).json({ error: err?.error?.message || `Gemini error ${status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[oracle] Proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
