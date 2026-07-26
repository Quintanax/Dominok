export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dominostats-pro.vercel.app',
        'X-Title': 'DominoStats Pro'
      },
      body: JSON.stringify(req.body)
    });

    const data = await orRes.json();
    res.status(orRes.status).json(data);
  } catch (error) {
    console.error("Error proxying to OpenRouter:", error);
    res.status(500).json({ error: error.message });
  }
}
