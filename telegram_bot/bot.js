require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const admin = require('firebase-admin');
const Groq = require('groq-sdk');

// 1. CONFIGURACIÓN
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
let DEFAULT_GROUP_ID = process.env.DEFAULT_GROUP_ID || 'dominostats_demo_group'; 

// 2. INICIALIZAR FIREBASE
const firebaseConfig = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY
};

// Limpieza ultra-profunda de la llave para Railway
if (firebaseConfig.private_key) {
    firebaseConfig.private_key = firebaseConfig.private_key.trim().replace(/^["']|["']$/g, '');
    if (firebaseConfig.private_key.includes('\\n')) {
        firebaseConfig.private_key = firebaseConfig.private_key.replace(/\\n/g, '\n');
    }
    if (!firebaseConfig.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        firebaseConfig.private_key = `-----BEGIN PRIVATE KEY-----\n${firebaseConfig.private_key}`;
    }
    if (!firebaseConfig.private_key.includes('-----END PRIVATE KEY-----')) {
        firebaseConfig.private_key = `${firebaseConfig.private_key}\n-----END PRIVATE KEY-----\n`;
    }
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: firebaseConfig.project_id,
      client_email: firebaseConfig.client_email,
      private_key: firebaseConfig.private_key
    })
  });
} catch (e) {
  console.error('❌ Error Init Firebase:', e.message);
}
const db = admin.firestore();

// 3. INICIALIZAR GROQ
const groq = new Groq({ apiKey: GROQ_API_KEY });

async function callGroq(prompt, base64Image) {
  const chatCompletion = await groq.chat.completions.create({
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": prompt
          },
          {
            "type": "image_url",
            "image_url": {
              "url": `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "temperature": 0.1,
    "max_tokens": 1024,
    "top_p": 1,
    "stream": false,
    "stop": null
  });

  return chatCompletion.choices[0].message.content;
}

// 4. BOT DE TELEGRAM
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
    ctx.reply('⏳ Recibido. Analizando en la NUBE con Groq (Llama 3.2 Vision)...');
    console.log('📸 Recibida foto para procesar...');

    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');

    const prompt = `Analiza esta imagen de resultados de dominó y extrae la información de la partida.

ESTRUCTURA VISUAL DE LA IMAGEN:
1. En los extremos laterales están los jugadores con sus puntos de ranking (+2 o -2). IGNORA COMPLETAMENTE ESTOS NÚMEROS (+2, -2, etc.).
2. En el centro exacto de la imagen, hay un logo "VS".
3. Justo debajo o al lado del logo "VS", dice "Puntos Totales".
4. Debajo de "Puntos Totales" hay dos números separados por ":" (ejemplo: 41 : 116). ESTOS SON LOS ÚNICOS PUNTOS VÁLIDOS DEL PARTIDO.

Devuelve SOLO un JSON con esta estructura exacta:
{
  "partidas": [
    {
      "p1_j1": "nombre del jugador 1 (izquierda)",
      "p1_j1_num": "número/ID debajo del nombre (ej: 3879478)",
      "p1_j2": "nombre del jugador 2 (izquierda)",
      "p1_j2_num": "número/ID debajo del nombre",
      "p2_j1": "nombre del jugador 1 (derecha)",
      "p2_j1_num": "número/ID debajo del nombre",
      "p2_j2": "nombre del jugador 2 (derecha)",
      "p2_j2_num": "número/ID debajo del nombre",
      "p1_pts": 41, 
      "p2_pts": 116
    }
  ]
}

REGLA DE ORO: p1_pts y p2_pts son SIEMPRE los que aparecen en el CENTRO de la imagen, NUNCA los +/-2 de los lados.`;

    console.log('🤖 Enviando a Groq...');
    const text = await callGroq(prompt, base64Image);
    console.log('✅ Groq respondió correctamente');
    console.log('📝 Respuesta de IA:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se detectó formato JSON en la respuesta de la IA');
    
    const data = JSON.parse(jsonMatch[0]);
    
    if (!data.partidas || data.partidas.length === 0) {
      return ctx.reply('❌ No pude encontrar partidas claras en esta foto.');
    }

    const groupRef = db.collection('groups').doc(DEFAULT_GROUP_ID);
    const doc = await groupRef.get();
    const groupData = doc.exists ? doc.data() : { matches: [], players: [] };
    const players = groupData.players || [];

    // Función para encontrar ID de jugador por nombre o número (alias)
    const findId = (name, num) => {
      const p = players.find(x => 
        (num && String(x.alias) === String(num)) || 
        (x.name.toLowerCase() === name?.toLowerCase()) ||
        (x.alias?.toLowerCase() === name?.toLowerCase())
      );
      return p ? p.id : null;
    };

    const newMatches = data.partidas.map(p => {
      const p1_j1_id = findId(p.p1_j1, p.p1_j1_num);
      const p1_j2_id = findId(p.p1_j2, p.p1_j2_num);
      const p2_j1_id = findId(p.p2_j1, p.p2_j1_num);
      const p2_j2_id = findId(p.p2_j2, p.p2_j2_num);

      return {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        groupId: DEFAULT_GROUP_ID,
        type: 'friendly',
        date: new Date().toISOString().split('T')[0],
        team1: { 
          player1: p1_j1_id, 
          player2: p1_j2_id,
          player1Name: p.p1_j1,
          player2Name: p.p1_j2
        },
        team2: { 
          player1: p2_j1_id, 
          player2: p2_j2_id,
          player1Name: p.p2_j1,
          player2Name: p.p2_j2
        },
        score: { team1: p.p1_pts, team2: p.p2_pts },
        winner: p.p1_pts > p.p2_pts ? 'team1' : 'team2',
        shoes: { team1Given: 0, team2Given: 0 },
        notes: 'Registrado vía Telegram (Groq)'
      };
    });

    groupData.matches = [...(groupData.matches || []), ...newMatches];
    await groupRef.set(groupData, { merge: true });

    ctx.reply(`✅ ¡Éxito! Se han registrado ${newMatches.length} partidas nuevas en el sistema.`);

  } catch (error) {
    console.error('Error detallado:', error);
    ctx.reply(`❌ Hubo un error procesando la imagen con Groq:\n${error.message}`);
  }
});

bot.launch().then(() => console.log('🤖 Bot de Telegram con Groq en línea...'));
