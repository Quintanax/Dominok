const axios = require('axios');

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB8m5fNjtQA5mKxoU9wQ--kQdsnUCFayhI';

async function testGemini() {
    console.log("Probando Gemini con la llave del usuario...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hola, ¿estás ahí?" }] }]
        });
        console.log("✅ ÉXITO. Respuesta de Gemini:", response.data.candidates[0].content.parts[0].text);
    } catch (e) {
        console.log("❌ ERROR:", e.response ? e.response.status : e.message);
        if (e.response && e.response.data) {
            console.log(JSON.stringify(e.response.data, null, 2));
        }
    }
}

testGemini();
