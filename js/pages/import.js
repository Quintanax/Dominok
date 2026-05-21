/* =========================================
   IMPORT PAGE
   ========================================= */
const ImportPage = {
  render() {
    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">📂 Importación de Datos</div>
          <div class="page-header-sub">Importa jugadores y partidas desde archivos CSV o Excel</div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Import Players -->
        <div class="card">
          <div class="card-title" style="margin-bottom:8px">👥 Importar Jugadores</div>
          <div class="card-subtitle" style="margin-bottom:12px">Formato CSV o Excel: nombre, alias, notas</div>

          <div class="dropzone" id="players-drop" onclick="document.getElementById('players-file').click()"
            ondragover="ImportPage.onDragOver(event,'players-drop')"
            ondragleave="ImportPage.onDragLeave('players-drop')"
            ondrop="ImportPage.onDrop(event,'players')">
            <div class="dropzone-icon">📄</div>
            <div class="dropzone-text">Arrastra tu archivo CSV o Excel aquí</div>
            <div class="dropzone-hint">o haz click para seleccionar</div>
            <input type="file" id="players-file" accept=".csv, .xlsx, .xls" class="hidden" onchange="ImportPage.handleFile(this,'players')" />
          </div>

          <div id="players-preview" class="hidden" style="margin-top:12px">
            <div class="section-title">Vista previa</div>
            <div class="import-preview" id="players-preview-content"></div>
            <div id="players-import-info" style="margin:12px 0;font-size:0.85rem;color:var(--text-secondary)"></div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn btn-ghost btn-sm" onclick="ImportPage.clearPreview('players')">Cancelar</button>
              <button class="btn btn-success btn-sm" id="players-import-btn" onclick="ImportPage.importPlayers()">✅ Confirmar importación</button>
            </div>
          </div>

          <div style="margin-top:12px;padding-top:16px;border-top:1px solid var(--border-color)">
            <div class="text-xs text-muted" style="margin-bottom:8px">📥 Descargar plantilla:</div>
            <button class="btn btn-ghost btn-sm" onclick="ImportPage.downloadTemplate('players')">Plantilla Jugadores.csv</button>
          </div>
        </div>

        <!-- Import Matches -->
        <div class="card">
          <div class="card-title" style="margin-bottom:8px">🎮 Importar Partidas</div>
          <div class="card-subtitle" style="margin-bottom:12px">Formato CSV o Excel: fecha, tipo, j1, j2, j3, j4, score1, score2</div>

          <div class="dropzone" id="matches-drop" onclick="document.getElementById('matches-file').click()"
            ondragover="ImportPage.onDragOver(event,'matches-drop')"
            ondragleave="ImportPage.onDragLeave('matches-drop')"
            ondrop="ImportPage.onDrop(event,'matches')">
            <div class="dropzone-icon">📊</div>
            <div class="dropzone-text">Arrastra tu archivo CSV o Excel aquí</div>
            <div class="dropzone-hint">o haz click para seleccionar</div>
            <input type="file" id="matches-file" accept=".csv, .xlsx, .xls" class="hidden" onchange="ImportPage.handleFile(this,'matches')" />
          </div>

          <div id="matches-preview" class="hidden" style="margin-top:12px">
            <div class="section-title">Vista previa</div>
            <div class="import-preview" id="matches-preview-content"></div>
            <div id="matches-import-info" style="margin:12px 0;font-size:0.85rem;color:var(--text-secondary)"></div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn btn-ghost btn-sm" onclick="ImportPage.clearPreview('matches')">Cancelar</button>
              <button class="btn btn-success btn-sm" onclick="ImportPage.importMatches()">✅ Confirmar importación</button>
            </div>
          </div>

          <div style="margin-top:12px;padding-top:16px;border-top:1px solid var(--border-color)">
            <div class="text-xs text-muted" style="margin-bottom:8px">📥 Descargar plantilla:</div>
            <button class="btn btn-ghost btn-sm" onclick="ImportPage.downloadTemplate('matches')">Plantilla Partidas.csv</button>
          </div>
        </div>
      </div>

      <!-- Backup -->
      <div class="card" style="margin-top:12px">
        <div class="card-title" style="margin-bottom:12px">💾 Backup y Restauración</div>
        <div class="grid-2">
          <div>
            <div style="font-size:0.9rem;font-weight:600;margin-bottom:8px">Exportar backup completo</div>
            <div class="text-xs text-muted" style="margin-bottom:12px">Descarga todos los datos en formato JSON</div>
            <button class="btn btn-secondary" onclick="ImportPage.exportBackup()">📤 Exportar Backup</button>
          </div>
          <div>
            <div style="font-size:0.9rem;font-weight:600;margin-bottom:8px">Restaurar desde backup</div>
            <div class="text-xs text-muted" style="margin-bottom:12px">Importa un archivo de backup JSON</div>
            <input type="file" id="backup-file" accept=".json" class="hidden" onchange="ImportPage.restoreBackup(this)" />
            <button class="btn btn-warning" onclick="document.getElementById('backup-file').click()">📥 Restaurar Backup</button>
          </div>
        </div>
      </div>

      <!-- Reparar Zapatos -->
      <div class="card" style="margin-top:12px;border-color:rgba(245,158,11,0.3)">
        <div class="card-title" style="margin-bottom:6px">👟 Reparar Zapatos</div>
        <div class="text-xs text-muted" style="margin-bottom:14px">
          Si importaste partidas sin zapatos detectados, este botón los recalcula automáticamente
          según la regla: <b>perder con 0 puntos = zapato propinado al perdedor</b>.
        </div>
        <button class="btn btn-warning btn-sm" onclick="ImportPage.repairShoes()">🔧 Recalcular zapatos en partidas existentes</button>
      </div>
    </div>`;
  },

  afterRender() {},

  _parsedPlayers: null,
  _parsedMatches: null,

  onDragOver(e, id) {
    e.preventDefault();
    document.getElementById(id)?.classList.add('dragover');
  },
  onDragLeave(id) {
    document.getElementById(id)?.classList.remove('dragover');
  },
  onDrop(e, type) {
    e.preventDefault();
    const id = type === 'players' ? 'players-drop' : 'matches-drop';
    document.getElementById(id)?.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) this._processFile(file, type);
  },

  handleFile(input, type) {
    const file = input.files[0];
    if (!file) return;
    this._processFile(file, type);
  },

  _processFile(file, type) {
    const isExcel = file.name.match(/\.(xlsx|xls)$/i);
    const reader = new FileReader();

    reader.onload = (e) => {
      let data = [];
      try {
        if (isExcel) {
          if (typeof XLSX === 'undefined') throw new Error("La librería de Excel no está cargada.");
          const arrayBuffer = e.target.result;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(firstSheet);
          
          // Convert keys to lowercase to match CSV behavior
          data = rawData.map(row => {
            const newRow = {};
            for (let key in row) {
              if (row.hasOwnProperty(key)) {
                newRow[key.toLowerCase().trim()] = row[key];
              }
            }
            return newRow;
          });
        } else {
          // Fallback to text for CSV
          const text = new TextDecoder("utf-8").decode(e.target.result);
          data = Utils.parseCSV(text);
        }
      } catch (err) {
        console.error("Error al procesar el archivo:", err);
        if (typeof Toast !== 'undefined') Toast.error("Error al leer el archivo. Verifica el formato o si es un archivo de Excel válido.");
        return;
      }
      
      const previewEl = document.getElementById(`${type}-preview`);
      const contentEl = document.getElementById(`${type}-preview-content`);
      const infoEl = document.getElementById(`${type}-import-info`);

      if (type === 'players') {
        this._parsedPlayers = data;
        if (contentEl) contentEl.textContent = data.slice(0, 5).map(r => JSON.stringify(r)).join('\n');
        if (infoEl) infoEl.innerHTML = `<span class="badge badge-info">${data.length} jugadores encontrados</span>`;
      } else {
        this._parsedMatches = data;
        if (contentEl) contentEl.textContent = data.slice(0, 5).map(r => JSON.stringify(r)).join('\n');
        if (infoEl) infoEl.innerHTML = `<span class="badge badge-info">${data.length} partidas encontradas</span>`;
      }
      previewEl?.classList.remove('hidden');
    };

    // Need array buffer for excel parsing
    reader.readAsArrayBuffer(file);
  },

  clearPreview(type) {
    document.getElementById(`${type}-preview`)?.classList.add('hidden');
    if (type === 'players') this._parsedPlayers = null;
    else this._parsedMatches = null;
  },

  importPlayers() {
    if (!this._parsedPlayers) return;
    const groupId = Auth.getGroupId();

    // ── Batch mode: suspend per-save syncs ──────────────────
    const originalSave = DB.save.bind(DB);
    DB.save = () => {}; // no-op durante el batch

    const imported = DB.importPlayers(this._parsedPlayers, groupId);

    // Restaurar y guardar una sola vez
    DB.save = originalSave;
    DB.save();
    if (typeof CloudDB !== 'undefined') CloudDB.syncToCloud();
    // ────────────────────────────────────────────────────────

    Toast.success(`✅ ${imported.length} jugadores importados correctamente`);
    this.clearPreview('players');
  },

  importMatches() {
    if (!this._parsedMatches) return;
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId);
    let success = 0, errors = 0;

    // ── Batch mode: suspender saves/syncs durante la importación ──
    const originalSave = DB.save.bind(DB);
    DB.save = () => {}; // no-op durante el batch

    // Pre-construir mapa nombre/alias → jugador para lookup O(1)
    const playerMap = {};
    players.forEach(p => {
      playerMap[p.name.toLowerCase().trim()] = p;
      const aliases = Array.isArray(p.aliases)
        ? p.aliases
        : (p.alias || '').split(',').map(a => a.trim()).filter(Boolean);
      aliases.forEach(a => { if (a) playerMap[a.toLowerCase()] = p; });
    });
    const getOrCreatePlayer = (rawName) => {
      if (!rawName) return null;
      const nameStr = String(rawName).trim();
      if (!nameStr) return null;
      const key = nameStr.toLowerCase();
      if (playerMap[key]) return playerMap[key];
      
      // Auto-registrar al jugador si no se encuentra
      const newPlayer = DB.addPlayer({ 
        name: nameStr, 
        aliases: [], 
        alias: '', 
        groupId, 
        notes: 'Auto-registrado desde importación' 
      });
      playerMap[key] = newPlayer;
      return newPlayer;
    };

    const errorDetails = [];

    for (let i = 0; i < this._parsedMatches.length; i++) {
      const row = this._parsedMatches[i];
      const rowNum = i + 2; // Fila real en Excel/CSV (cabecera = fila 1)

      const rawJ1 = row.jugador1 || row.j1 || row['jugador 1'];
      const rawJ2 = row.jugador2 || row.j2 || row['jugador 2'];
      const rawJ3 = row.jugador3 || row.j3 || row['jugador 3'];
      const rawJ4 = row.jugador4 || row.j4 || row['jugador 4'];

      const p1 = getOrCreatePlayer(rawJ1);
      const p2 = getOrCreatePlayer(rawJ2);
      const p3 = getOrCreatePlayer(rawJ3);
      const p4 = getOrCreatePlayer(rawJ4);
      const s1 = parseInt(row.score1 || row.puntos1 || row['puntos 1']);
      const s2 = parseInt(row.score2 || row.puntos2 || row['puntos 2']);
      const date = row.fecha || row.date || new Date().toISOString().split('T')[0];
      const type = (row.tipo || row.type || 'friendly').toLowerCase().includes('torneo') ? 'tournament' : 'friendly';

      let failReason = null;
      if (!rawJ1 || !rawJ2 || !rawJ3 || !rawJ4) failReason = 'Falta el nombre de 1 o más jugadores';
      else if (!p1 || !p2 || !p3 || !p4) failReason = 'Error al registrar o buscar jugadores';
      else if (isNaN(s1) || isNaN(s2)) failReason = 'Puntuación no válida o celda vacía';
      else if (s1 === s2) failReason = `Empate no válido en dominó (${s1}-${s2})`;

      if (failReason) {
        errorDetails.push(`Fila ${rowNum}: ${failReason} | Datos crudos: ${JSON.stringify(row)}`);
        errors++;
        continue;
      }

      // Detectar zapatos: perder con 0 puntos = zapato recibido
      // team1Given: team1 propinó zapato a team2 (team2 quedó en 0)
      // team2Given: team2 propinó zapato a team1 (team1 quedó en 0)
      const t1Given = (s1 > 0 && s2 === 0) ? 1 : 0;
      const t2Given = (s2 > 0 && s1 === 0) ? 1 : 0;

      // Push directo al store — sin notificaciones ni logs para no saturar
      DB._store.matches.push({
        id: DB._uuid(),
        createdAt: new Date().toISOString(),
        groupId, type, date,
        team1: { player1: p1.id, player2: p2.id },
        team2: { player1: p3.id, player2: p4.id },
        score: { team1: s1, team2: s2 },
        winner: s1 > s2 ? 'team1' : 'team2',
        shoes: { team1Given: t1Given, team2Given: t2Given },
        notes: ''
      });
      success++;
    }

    // Restaurar, persistir y sincronizar UNA sola vez al final
    DB.save = originalSave;
    // ⚠️ FIX: invalidar caché de stats para que el ranking refleje las nuevas partidas
    DB._invalidateStatsCache(groupId);
    DB.save();
    if (typeof CloudDB !== 'undefined') CloudDB.syncToCloud();
    // ─────────────────────────────────────────────────────────────

    if (success > 0) Toast.success(`✅ ${success} partidas importadas`);
    
    if (errors > 0) {
      Toast.warning(`⚠️ ${errors} filas con errores omitidas`);
      this._lastErrors = errorDetails;
      
      const errorHtml = errorDetails.slice(0, 30).map(e => `<div style="font-size:0.75rem;margin-bottom:6px;color:var(--accent-danger);border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;word-break:break-all">${Utils.escHtml(e)}</div>`).join('');
      const moreText = errorDetails.length > 30 ? `<div style="font-weight:bold;margin-top:10px;text-align:center">...y ${errorDetails.length - 30} errores más.</div>` : '';
      
      const modalContent = `
        <div style="margin-bottom:12px;font-size:0.9rem">Se omitieron <b>${errors}</b> filas por tener datos incompletos o inválidos. Aquí están los detalles:</div>
        <div style="background:var(--bg-card);padding:12px;border:1px solid var(--border-color);border-radius:6px;max-height:350px;overflow-y:auto;margin-bottom:16px;font-family:monospace">
          ${errorHtml}
          ${moreText}
        </div>
        <button class="btn btn-secondary" style="width:100%" onclick="ImportPage.downloadErrorReport()">📥 Descargar reporte completo (.txt)</button>
      `;
      App.openModal({
        title: '⚠️ Detalle de Errores',
        body: modalContent,
        footer: ''
      });
    }
    
    this.clearPreview('matches');
  },


  downloadErrorReport() {
    if (!this._lastErrors || this._lastErrors.length === 0) return;
    const reportText = "REPORTE DE ERRORES DE IMPORTACIÓN\n=================================\n\n" + this._lastErrors.join('\n\n');
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Reporte_Errores_${new Date().toISOString().split('T')[0]}.txt`; a.click();
    URL.revokeObjectURL(url);
  },

  downloadTemplate(type) {
    const templates = {
      players: 'nombre,alias,notas\nJuan Pérez,Juancho,Jugador experimentado\nMaría López,La Reina,',
      matches: 'fecha,tipo,jugador1,jugador2,jugador3,jugador4,score1,score2\n2025-01-15,amistoso,Juan Pérez,María López,Carlos Ruiz,Ana Torres,200,150'
    };
    const blob = new Blob([templates[type]], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `plantilla_${type}.csv`; a.click();
    URL.revokeObjectURL(url);
  },

  exportBackup() {
    const json = DB.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_dominostats_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Backup exportado');
  },

  restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;
    App.confirmDialog('¿Restaurar backup?', 'Esto reemplazará TODOS los datos actuales. Esta acción no se puede deshacer.', () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const ok = DB.importBackup(e.target.result);
        if (ok) { Toast.success('Backup restaurado correctamente'); setTimeout(() => location.reload(), 1500); }
        else Toast.error('Error al restaurar el backup. Verifica el archivo.');
      };
      reader.readAsText(file);
    });
  },

  // ── Reparar zapatos en partidas ya importadas ─────────────────────
  // Recorre todas las partidas del grupo y asigna zapatos donde
  // el perdedor quedó en 0 puntos (regla oficial de dominó).
  repairShoes() {
    const groupId = Auth.getGroupId();
    const matches = DB._store.matches.filter(m => m.groupId === groupId);
    let fixed = 0;

    // Batch: no persistir en cada iteración
    const originalSave = DB.save.bind(DB);
    DB.save = () => {};

    matches.forEach(m => {
      const s1 = m.score?.team1 ?? -1;
      const s2 = m.score?.team2 ?? -1;
      if (s1 < 0 || s2 < 0) return;

      // team1Given = team1 propinó zapato (team2 quedó en 0)
      // team2Given = team2 propinó zapato (team1 quedó en 0)
      const t1Given = (s1 > 0 && s2 === 0) ? 1 : 0;
      const t2Given = (s2 > 0 && s1 === 0) ? 1 : 0;
      const curT1 = m.shoes?.team1Given ?? 0;
      const curT2 = m.shoes?.team2Given ?? 0;

      if (curT1 !== t1Given || curT2 !== t2Given) {
        m.shoes = { team1Given: t1Given, team2Given: t2Given };
        fixed++;
      }
    });

    // Restaurar y guardar una sola vez
    DB.save = originalSave;
    if (fixed > 0) {
      DB._invalidateStatsCache(groupId);
      DB.save();
      if (typeof CloudDB !== 'undefined') CloudDB.syncToCloud();
      Toast.success(`👟 ${fixed} partidas corregidas con zapatos recalculados`);
    } else {
      Toast.success('✅ Todas las partidas ya tienen los zapatos correctos');
    }
  }
};
