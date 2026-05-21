// /api/analyze.js — Vercel Serverless Function
// Receives a base64 image, calls Anthropic, returns the JSON skin analysis.
// Your API key lives in Vercel environment variables — never exposed to the browser.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb', // accept large face photos
    },
  },
};

const PROMPT = `You are a board-certified dermatologist conducting a real skin analysis. Look at this specific facial photograph extremely carefully and produce a UNIQUE assessment based on what you actually see.

CRITICAL: Do not produce generic or default scores. Every face is different. Two people should rarely get the same score. Use the FULL 0–100 range based on actual observation.

SCORING RUBRIC (use the full range):
- 90–100: Exceptional skin — even tone, no visible concerns, hydrated, youthful, clear
- 80–89:  Excellent skin — minor imperfections only, healthy overall
- 70–79:  Good skin — 1–2 noticeable concerns, but generally healthy
- 60–69:  Average skin — 2–3 visible concerns of mild–moderate severity
- 50–59:  Below average — multiple concerns or one significant concern
- 40–49:  Poor — multiple moderate–significant concerns
- Below 40: Severe — active acne, significant damage, or multiple compounding issues

OBSERVE & SCORE THESE SPECIFICALLY:
1. Skin tone evenness (uneven = lower score)
2. Visible blemishes, acne, breakouts (more = lower)
3. Hydration & barrier health (dry/flaky = lower)
4. Texture (rough, bumpy, pores = lower)
5. Pigmentation (dark spots, redness, post-acne marks = lower)
6. Aging signs (fine lines, wrinkles, sagging — context-dependent)
7. Oiliness or shine (excessive = lower)
8. Overall radiance / clarity

Return ONLY valid JSON in this exact structure:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentences>",
  "skinType": "<Normal|Oily|Dry|Combination|Sensitive>",
  "concerns": [
    { "name": "<concern>", "severity": "<Mild|Moderate|Significant>", "pct": <0-100>, "description": "<observation>" }
  ],
  "positives": ["<positive>", "<positive>"],
  "avoidIngredients": ["<ingredient and why>"]
}

RULES:
- Mention SPECIFIC locations (forehead, T-zone, cheeks, jawline, around eyes).
- Vary your numbers — avoid round numbers like 60, 65, 70 unless truly accurate.
- Identify 2–5 concerns based on what you actually see.
- If clear, healthy skin, give HIGH score (85+). If significant issues, give LOW score.
- If image is too dark, blurry, or no face detected, return score: 0 and explain.
- Educational — not a medical diagnosis.`;

export default async function handler(req, res) {
  // CORS headers — adjust the origin to your actual frontend domain in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: err?.error?.message || `API error ${r.status}` });
    }

    const data = await r.json();
    const raw = data.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Could not parse AI response.' });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Analysis failed' });
  }
}
