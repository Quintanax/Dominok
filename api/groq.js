export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await groqRes.json();
    res.status(groqRes.status).json(data);
  } catch (error) {
    console.error("Error proxying to Groq:", error);
    res.status(500).json({ error: error.message });
  }
}
