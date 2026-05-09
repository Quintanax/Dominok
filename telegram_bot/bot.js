require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const admin = require('firebase-admin');

// 1. CONFIGURACIÓN
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let DEFAULT_GROUP_ID = process.env.DEFAULT_GROUP_ID || 'dominostats_demo_group'; 

// 2. INICIALIZAR FIREBASE
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 3. GEMINI — llamada directa REST para evitar problemas de versión de SDK
async function callGemini(prompt, base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
      ]
    }]
  };
  const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
  return res.data.candidates[0].content.parts[0].text;
}

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) => ctx.reply('👋 ¡Hola! Envíame una foto de la hoja de resultados.\n\n⚠️ IMPORTANTE: Primero configura tu grupo con el comando:\n/group TU_ID_DE_GRUPO'));

bot.command('group', (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length > 1) {
    DEFAULT_GROUP_ID = args[1];
    ctx.reply(`✅ ID de Grupo configurado a: ${DEFAULT_GROUP_ID}`);
  } else {
    ctx.reply(`❌ Uso: /group TU_ID_DE_GRUPO\n\nTu ID actual es: ${DEFAULT_GROUP_ID}`);
  }
});

bot.on('photo', async (ctx) => {
  try {
    ctx.reply('⏳ Recibido. Analizando imagen con IA...');
    console.log('📸 Recibida foto para procesar...');

    // Obtener la URL de la foto de mayor resolución
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // Descargar imagen y convertir a base64
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');

    // Prompt para Gemini
    const prompt = `Analiza esta imagen de resultados de dominó. Extrae todas las partidas amistosas.
    Devuelve un JSON con esta estructura:
    {
      "partidas": [
        {
          "p1_j1": "nombre", "p1_j2": "nombre", "p1_pts": 0,
          "p2_j1": "nombre", "p2_j2": "nombre", "p2_pts": 0
        }
      ]
    }`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    };

    // Llamada a Gemini (sin reintentos automáticos para evitar timeouts)
    let text;
    try {
      console.log('🤖 Enviando a Gemini...');
      text = await callGemini(prompt, base64Image);
      console.log('✅ Gemini respondió correctamente');
    } catch (e) {
      const status = e.response?.status;
      const errMsg = e.response?.data?.error?.message || e.message;
      console.error('❌ Error Gemini:', errMsg);
      if (status === 429) {
        return ctx.reply('⏳ La IA está ocupada (límite de peticiones). Espera 1 minuto y vuelve a enviar la foto.');
      }
      throw e;
    }

    console.log('📝 Respuesta de IA:', text);

    // Limpiar y parsear JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se detectó formato JSON en la respuesta de la IA');
    
    const data = JSON.parse(jsonMatch[0]);
    
    if (!data.partidas || data.partidas.length === 0) {
      return ctx.reply('❌ No pude encontrar partidas claras en esta foto.');
    }

    // GUARDAR EN FIREBASE
    const groupRef = db.collection('groups').doc(DEFAULT_GROUP_ID);
    const doc = await groupRef.get();
    const groupData = doc.exists ? doc.data() : { matches: [], players: [] };

    const newMatches = data.partidas.map(p => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      groupId: DEFAULT_GROUP_ID,
      date: new Date().toISOString().split('T')[0],
      team1: { player1Name: p.p1_j1, player2Name: p.p1_j2 },
      team2: { player1Name: p.p2_j1, player2Name: p.p2_j2 },
      score: { team1: p.p1_pts, team2: p.p2_pts },
      winner: p.p1_pts > p.p2_pts ? 'team1' : 'team2',
      notes: 'Registrado vía Telegram'
    }));

    groupData.matches = [...(groupData.matches || []), ...newMatches];
    await groupRef.set(groupData, { merge: true });

    ctx.reply(`✅ ¡Éxito! Se han registrado ${newMatches.length} partidas nuevas en el sistema.`);

  } catch (error) {
    console.error(error);
    ctx.reply('❌ Hubo un error procesando la imagen: ' + error.message);
  }
});

bot.launch().then(() => console.log('🤖 Bot de Telegram en línea...'));
