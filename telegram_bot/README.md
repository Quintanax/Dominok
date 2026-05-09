# Bot de Telegram - DominoStats Pro 🤖

Este bot permite subir fotos de resultados directamente desde Telegram y registrarlas en tu sistema en la nube.

## Requisitos
1. Tener instalado [Node.js](https://nodejs.org/).
2. El archivo `serviceAccountKey.json` de Firebase.

## Configuración paso a paso

1. **Obtener la clave de Firebase:**
   - Ve a tu consola de Firebase.
   - Haz clic en el icono del engranaje ⚙️ -> **Configuración del proyecto**.
   - Pestaña **Cuentas de servicio**.
   - Haz clic en el botón azul **"Generar nueva clave privada"**.
   - Se descargará un archivo `.json`. Cámbiale el nombre a `serviceAccountKey.json` y colócalo dentro de esta carpeta (`telegram_bot/`).

2. **Configurar el Group ID:**
   - Abre el archivo `bot.js`.
   - Busca la línea `const DEFAULT_GROUP_ID = 'tu_group_id_aqui';`.
   - Reemplaza ese texto con el ID de tu grupo (lo puedes ver en la consola del navegador al iniciar sesión en tu web).

3. **Instalar y Correr:**
   - Abre una terminal en esta carpeta.
   - Ejecuta: `npm install`
   - Luego ejecuta: `npm start`

¡Listo! El bot estará escuchando. Cuando le mandes una foto, aparecerá mágicamente en tu web.
