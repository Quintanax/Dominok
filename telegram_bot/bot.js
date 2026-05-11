require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const admin = require('firebase-admin');
const Groq = require('groq-sdk');
const path = require('path');

// ─── 1. CONFIGURACIÓN ──────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY   = process.env.GROQ_API_KEY;
let DEFAULT_GROUP_ID = process.env.DEFAULT_GROUP_ID || 'dominostats_demo_group';

// Validación de variables obligatorias al arrancar
if (!TELEGRAM_TOKEN) { console.error('❌ FATAL: TELEGRAM_TOKEN no está definido en .env'); process.exit(1); }
if (!GROQ_API_KEY)   { console.error('❌ FATAL: GROQ_API_KEY no está definido en .env'); process.exit(1); }

// ─── 2. INICIALIZAR FIREBASE ───────────────────────────────────
// Usa serviceAccountKey.json directamente — más fiable que parsear env vars
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin inicializado con serviceAccountKey.json');
} catch (e) {
  // Fallback: intentar con variables de entorno (para Railway/producción sin el JSON)
  console.warn('⚠️  serviceAccountKey.json no encontrado, intentando con variables de entorno...');
  try {
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
    console.log('✅ Firebase Admin inicializado con variables de entorno');
  } catch (e2) {
    console.error('❌ Error iniciando Firebase:', e2.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// ─── 3. INICIALIZAR GROQ ──────────────────────────────────────
const groq = new Groq({ apiKey: GROQ_API_KEY });

async function callGroq(prompt, base64Image) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }
        ]
      }
    ],
    model: 'llama-3.2-11b-vision-preview',
    temperature: 0.1,
    max_tokens: 1024,
    top_p: 1,
    stream: false,
    stop: null
  });
  return chatCompletion.choices[0].message.content;
}

// ─── 4. BOT DE TELEGRAM ───────────────────────────────────────
const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) =>
  ctx.reply(
    '👋 ¡Hola! Envíame una foto de la hoja de resultados.\n\n' +
    '⚠️ IMPORTANTE: Configura tu grupo con:\n/group TU_ID_DE_GRUPO\n\n' +
    `📌 Grupo actual: ${DEFAULT_GROUP_ID}`
  )
);

bot.command('group', (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length > 1) {
    DEFAULT_GROUP_ID = args[1];
    ctx.reply(`✅ ID de Grupo configurado a: ${DEFAULT_GROUP_ID}`);
  } else {
    ctx.reply(`ℹ️ Uso: /group TU_ID_DE_GRUPO\n\nGrupo actual: ${DEFAULT_GROUP_ID}`);
  }
});

bot.on('photo', async (ctx) => {
  try {
    ctx.reply('⏳ Recibido. Analizando con Groq (Llama 3.2 Vision)...');
    console.log('📸 Foto recibida — procesando...');

    const fileId   = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');

    const prompt = `Analiza esta imagen de resultados de dominó y extrae la información de la partida.

ESTRUCTURA VISUAL DE LA IMAGEN:
1. En los extremos laterales están los jugadores con sus puntos de ranking (+2 o -2). IGNORA COMPLETAMENTE ESTOS NÚMEROS.
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

    console.log('🤖 Enviando imagen a Groq...');
    const text = await callGroq(prompt, base64Image);
    console.log('✅ Groq respondió. Respuesta:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se detectó formato JSON en la respuesta de la IA');

    const data = JSON.parse(jsonMatch[0]);
    if (!data.partidas || data.partidas.length === 0) {
      return ctx.reply('❌ No pude encontrar partidas claras en esta foto.');
    }

    // ── Cargar datos del grupo desde Firestore ───────────────
    const groupRef  = db.collection('groups').doc(DEFAULT_GROUP_ID);
    const doc       = await groupRef.get();
    const groupData = doc.exists ? doc.data() : { matches: [], players: [] };
    const players   = groupData.players || [];

    // ── Resolver ID de jugador por nombre o alias numérico ──
    const findId = (name, num) => {
      const p = players.find(x =>
        (num  && String(x.alias) === String(num)) ||
        (name && x.name.toLowerCase()  === name.toLowerCase()) ||
        (name && x.alias?.toLowerCase() === name.toLowerCase())
      );
      return p ? p.id : null;
    };

    const newMatches = data.partidas.map(p => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      groupId: DEFAULT_GROUP_ID,
      type: 'friendly',
      date: new Date().toISOString().split('T')[0],
      team1: {
        player1: findId(p.p1_j1, p.p1_j1_num),
        player2: findId(p.p1_j2, p.p1_j2_num),
        player1Name: p.p1_j1,
        player2Name: p.p1_j2
      },
      team2: {
        player1: findId(p.p2_j1, p.p2_j1_num),
        player2: findId(p.p2_j2, p.p2_j2_num),
        player1Name: p.p2_j1,
        player2Name: p.p2_j2
      },
      score:  { team1: p.p1_pts, team2: p.p2_pts },
      winner: p.p1_pts > p.p2_pts ? 'team1' : 'team2',
      shoes:  { team1Given: 0, team2Given: 0 },
      notes:  'Registrado vía Telegram (Groq)'
    }));

    groupData.matches = [...(groupData.matches || []), ...newMatches];
    await groupRef.set(groupData, { merge: true });

    ctx.reply(`✅ ¡Éxito! Se registraron ${newMatches.length} partida(s) en el sistema.`);
    console.log(`💾 ${newMatches.length} partida(s) guardadas en Firestore para grupo: ${DEFAULT_GROUP_ID}`);

  } catch (error) {
    console.error('❌ Error procesando foto:', error);
    ctx.reply(`❌ Error procesando la imagen:\n${error.message}`);
  }
});

bot.launch()
  .then(() => console.log(`🤖 Bot de Telegram activo — Grupo por defecto: ${DEFAULT_GROUP_ID}`));

// Graceful shutdown
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
