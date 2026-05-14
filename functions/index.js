const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Hardcode API Key via Firebase config, or env var
// e.g. firebase functions:config:set gemini.key="YOUR_API_KEY"
const getApiKey = () => functions.config().gemini?.key || process.env.GEMINI_API_KEY;

exports.generateReading = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // 1. Authenticate Request
    // Ensure the request comes from an authenticated Ephi user
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
    }

    // 2. Parse payload
    const { prompt, model = 'gemini-3.1-pro-preview', fileUri } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Bad Request: Missing prompt' });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API Key not configured in Firebase Functions');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 3. Build Gemini Request
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const parts = [{ text: prompt }];
    
    if (fileUri) {
      parts.push({
        fileData: {
          fileUri: fileUri,
          mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'text/plain'
        }
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
      ]
    };

    // 4. Proxy to Google API
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 404) {
        return res.status(404).json({ error: 404 });
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini API error ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Proxy Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});
