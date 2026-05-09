const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function checkModels() {
    console.log("🔍 Verificando modelos disponibles para la llave...");
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        console.log("✅ Conexión exitosa. Modelos disponibles:");
        response.data.models.forEach(m => console.log(` - ${m.name}`));
    } catch (e) {
        console.log("❌ Error al verificar modelos:");
        if (e.response) {
            console.log(` Estado: ${e.response.status}`);
            console.log(` Mensaje: ${JSON.stringify(e.response.data)}`);
        } else {
            console.log(` Mensaje: ${e.message}`);
        }
    }
}

checkModels();
