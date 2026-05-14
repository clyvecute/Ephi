/**
 * Groq AI Provider for Ephi
 * 
 * Groq provides extremely low-latency inference for open models 
 * like Llama 3 and Mixtral. Their free tier is highly generous.
 */

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function generateReading({ prompt, model = 'llama3-70b-8192' }) {
  if (!API_KEY) throw new Error('Groq API key not found.');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are Ephi, a master astrologer providing professional, technical readings.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || 'Groq API error');
  }

  const data = await res.json();
  return {
    text: data.choices[0].message.content,
    model: model,
    provider: 'groq'
  };
}

export function isGroqConfigured() {
  return !!API_KEY;
}
