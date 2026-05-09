require('dotenv').config();
const axios = require('axios');

const KEY = process.env.GEMINI_API_KEY;
const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

async function testModel(model) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
    const res = await axios.post(url, {
      contents: [{ parts: [{ text: 'Di hola en una palabra.' }] }]
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
    console.log(`✅ ${model}: FUNCIONA → "${res.data.candidates[0].content.parts[0].text.trim()}"`);
  } catch (e) {
    const code = e.response?.status;
    const msg = e.response?.data?.error?.message || e.message;
    console.log(`❌ ${model}: Error ${code} → ${msg.slice(0, 120)}`);
  }
}

(async () => {
  console.log(`\n🔑 Probando llave: ${KEY?.slice(0, 20)}...\n`);
  for (const m of MODELS) await testModel(m);
  console.log('\n✅ Diagnóstico completo.');
})();
