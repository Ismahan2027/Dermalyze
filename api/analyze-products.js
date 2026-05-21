// /api/analyze-products.js — Analyzes current product routine vs skin profile
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { skinType, concerns, products } = req.body;
    if (!products) return res.status(400).json({ error: 'No products provided' });

    const productList = Object.entries(products)
      .filter(([_, v]) => v && v.trim())
      .map(([k, v]) => `${k}: ${v}`).join('\n');

    const concernsList = (concerns || []).map(c => `${c.name} (${c.severity})`).join(', ');

    const prompt = `You are a dermatologist. A user with ${skinType} skin, dealing with: ${concernsList}, is currently using these products:

${productList}

Analyze each product and return ONLY valid JSON in this exact format:
{
  "summary": "<2 sentence overview of their routine fit>",
  "overall": "<honest bottom-line verdict — is their routine helping or hurting overall?>",
  "products": [
    { "category": "<Cleanser|Serum|Moisturizer|Sunscreen|Other>", "name": "<product name>", "verdict": "<good|neutral|bad>", "reason": "<specific reason>", "suggestion": "<optional swap or null>" }
  ]
}

Rules:
- verdict "good" = actively helping their concerns
- verdict "neutral" = fine but not optimized
- verdict "bad" = likely worsening their concerns
- Be specific about ingredients. Mention WHY for each verdict.
- Only include products they actually listed.`;

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
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
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
