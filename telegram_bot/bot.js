require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const admin = require('firebase-admin');
const path = require('path');

// ─── 1. CONFIGURACIÓN ──────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
let DEFAULT_GROUP_ID = process.env.DEFAULT_GROUP_ID || 'dominostats_demo_group';

// Validación de variables obligatorias al arrancar
if (!TELEGRAM_TOKEN) { console.error('❌ FATAL: TELEGRAM_TOKEN no está definido en .env'); process.exit(1); }
if (!OPENROUTER_API_KEY) { console.error('❌ FATAL: OPENROUTER_API_KEY no está definido en .env'); process.exit(1); }


// ─── 2. INICIALIZAR FIREBASE ───────────────────────────────────
// Usa serviceAccountKey.json directamente — más fiable que parsear env vars
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin: Inicializado con archivo físico (Local)');
} catch (e) {
  console.warn('⚠️  Archivo físico no encontrado, usando variables de entorno...');
  try {
    const b64 = process.env.FIREBASE_BASE64;
    if (b64 && b64.trim().length > 100) {
      console.log('🔑 Firebase Admin: Usando FIREBASE_BASE64...');
      const decoded = Buffer.from(b64.trim(), 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decoded.trim());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin: Inicializado desde Base64 (Railway)');
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      console.log('🔑 Firebase Admin: Usando variables individuales (Legacy)...');
      let privateKey = process.env.FIREBASE_PRIVATE_KEY
        .trim()
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });
      console.log('✅ Firebase Admin: Inicializado con variables individuales');
    } else {
      throw new Error('No se encontró FIREBASE_BASE64 ni archivo JSON');
    }
  } catch (e2) {
    console.error('❌ Error FATAL iniciando Firebase:', e2.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Test de conexión inmediato
db.collection('groups').limit(1).get()
  .then(() => console.log('🚀 Firestore: Conexión de prueba EXITOSA'))
  .catch(err => {
    console.error('❌ Firestore: Conexión de prueba FALLIDA');
    console.error('Detalle:', err.message);
  });

// ─── 3. LLAMADA A OPENROUTER (Gemini 2.0 Flash — visión) ───────────────────
const OPENROUTER_TIMEOUT_MS = 40000;

async function callOpenRouter(prompt, base64Image) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('⏱ La IA tardó demasiado (>40s). Inténtalo de nuevo.')), OPENROUTER_TIMEOUT_MS)
  );

  const apiPromise = axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemini-2.0-flash-001',
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
      temperature: 0.1,
      max_tokens: 1024
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dominostats-pro.vercel.app',
        'X-Title': 'DominoStats Pro Bot'
      },
      timeout: OPENROUTER_TIMEOUT_MS
    }
  );

  const response = await Promise.race([apiPromise, timeoutPromise]);
  return response.data.choices[0].message.content;
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
    ctx.reply('⏳ Recibido. Analizando con Gemini 2.0 Flash (OpenRouter)...');
    console.log('📸 Foto recibida — procesando...');

    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
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

REGLA DE ORO: p1_pts y p2_pts son SIEMPRE los que aparecen en el CENTRO de la imagen, NUNCA los +/-2 de los lados.
IMPORTANTE: NO DEVUELVAS NINGÚN TEXTO ADICIONAL (ni saludos, ni explicaciones), SOLO EL OBJETO JSON PURO.`;

    console.log('🤖 Enviando imagen a OpenRouter (Gemini 2.0 Flash)...');
    const text = await callOpenRouter(prompt, base64Image);
    console.log('✅ OpenRouter respondió. Respuesta:', text);

    // Extractor de JSON inteligente
    let jsonString = '';
    const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    
    if (mdMatch) {
      // Si la IA usó un bloque markdown, tomamos exactamente el contenido interno
      jsonString = mdMatch[1];
    } else {
      // Si no usó markdown, extraemos estrictamente desde la primera { hasta la última }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = text.substring(firstBrace, lastBrace + 1);
      } else {
        jsonString = text;
      }
    }

    // Limpiamos los backticks perdidos por seguridad
    jsonString = jsonString.replace(/`/g, "'");

    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('❌ JSON inválido recibido de Groq:\n', jsonString);
      throw new Error(`La IA devolvió un JSON inválido: ${parseErr.message}`);
    }
    if (!data.partidas || data.partidas.length === 0) {
      return ctx.reply('❌ No pude encontrar partidas claras en esta foto.');
    }

    // ── Cargar datos del grupo desde Firestore ───────────────
    const groupRef = db.collection('groups').doc(DEFAULT_GROUP_ID);
    const doc = await groupRef.get();
    const groupData = doc.exists ? doc.data() : { players: [] };
    const players = groupData.players || [];

    // ── Utilidades Fuzzy Match ──
    const normalizeName = (str) => {
      if (!str) return '';
      return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    const levenshtein = (a, b) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };

    // ── Resolver ID de jugador por gameId, alias numérico o nombre ──
    const findId = (name, num) => {
      if (!name && !num) return null;
      const qNorm = normalizeName(name);
      const cleanNum = num ? String(num).trim() : null;

      // 1. Buscar por gameId (campo dedicado nuevo)
      if (cleanNum) {
        let p = players.find(x => x.gameId && String(x.gameId).trim() === cleanNum);
        if (p) return p.id;
      }

      // 2. Alias numérico o nombre exacto / alias exacto
      let p = players.find(x =>
        (cleanNum && String(x.alias) === cleanNum) ||
        (name && x.name && normalizeName(x.name) === qNorm) ||
        (name && x.alias && String(x.alias).split(',').map(a=>normalizeName(a)).includes(qNorm)) ||
        (name && Array.isArray(x.aliases) && x.aliases.map(a=>normalizeName(a)).includes(qNorm))
      );
      if (p) return p.id;

      // 3. Fuzzy Match si no se encontró exacto (solo si hay nombre)
      if (name && qNorm.length > 2) {
        let bestMatch = null;
        let minDistance = Infinity;
        players.forEach(x => {
          const distName = levenshtein(qNorm, normalizeName(x.name));
          if (distName < minDistance) { minDistance = distName; bestMatch = x; }
          const aliases = Array.isArray(x.aliases) ? x.aliases : (x.alias || '').split(',').map(a => a.trim()).filter(Boolean);
          aliases.forEach(a => {
            const distAlias = levenshtein(qNorm, normalizeName(a));
            if (distAlias < minDistance) { minDistance = distAlias; bestMatch = x; }
          });
        });
        if (minDistance <= 2) return bestMatch.id;
      }
      return null;
    };

    // Calcular la fecha basada en la hora del mensaje de Telegram (ajustada a UTC-4)
    const messageDate = new Date(ctx.message.date * 1000);
    messageDate.setHours(messageDate.getHours() - 4);
    const dateStr = messageDate.toISOString().split('T')[0];

    const newMatches = data.partidas.map(p => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      return {
        id,
        groupId: DEFAULT_GROUP_ID,
        type: 'friendly',
        date: dateStr,
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
        score: { team1: p.p1_pts, team2: p.p2_pts },
        winner: p.p1_pts > p.p2_pts ? 'team1' : 'team2',
        shoes: { team1Given: 0, team2Given: 0 },
        notes: 'Registrado vía Telegram (Gemini 2.0 Flash)'
      };
    });

    // Guardar las nuevas partidas en la subcolección 'matches' usando batch
    const batch = db.batch();
    for (const m of newMatches) {
      const mRef = groupRef.collection('matches').doc(m.id);
      batch.set(mRef, m);
    }
    await batch.commit();

    ctx.reply(`✅ ¡Éxito! Se registraron ${newMatches.length} partida(s) en el sistema.`);
    console.log(`💾 ${newMatches.length} partida(s) guardadas en la subcolección de Firestore para grupo: ${DEFAULT_GROUP_ID}`);

  } catch (error) {
    console.error('❌ Error procesando foto:', error);
    ctx.reply(`❌ Error procesando la imagen:\n${error.message}`);
  }
});

bot.launch()
  .then(() => console.log(`🤖 Bot de Telegram activo — Grupo por defecto: ${DEFAULT_GROUP_ID}`));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
