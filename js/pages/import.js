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
    const imported = DB.importPlayers(this._parsedPlayers, groupId);
    Toast.success(`✅ ${imported.length} jugadores importados correctamente`);
    this.clearPreview('players');
  },

  importMatches() {
    if (!this._parsedMatches) return;
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId);
    let success = 0, errors = 0;

    for (const row of this._parsedMatches) {
      const findPlayer = (name) => {
        if (!name) return null;
        const n = name.toLowerCase().trim();
        return players.find(p => p.name.toLowerCase() === n || (p.alias||'').toLowerCase() === n);
      };
      const p1 = findPlayer(row.jugador1 || row.j1 || row['jugador 1']);
      const p2 = findPlayer(row.jugador2 || row.j2 || row['jugador 2']);
      const p3 = findPlayer(row.jugador3 || row.j3 || row['jugador 3']);
      const p4 = findPlayer(row.jugador4 || row.j4 || row['jugador 4']);
      const s1 = parseInt(row.score1 || row.puntos1 || row['puntos 1']);
      const s2 = parseInt(row.score2 || row.puntos2 || row['puntos 2']);
      const date = row.fecha || row.date || new Date().toISOString().split('T')[0];
      const type = (row.tipo || row.type || 'friendly').toLowerCase().includes('torneo') ? 'tournament' : 'friendly';

      if (!p1 || !p2 || !p3 || !p4 || isNaN(s1) || isNaN(s2) || s1 === s2) { errors++; continue; }

      DB.addMatch({
        groupId, type, date,
        team1: { player1: p1.id, player2: p2.id },
        team2: { player1: p3.id, player2: p4.id },
        score: { team1: s1, team2: s2 },
        winner: s1 > s2 ? 'team1' : 'team2',
        shoes: { team1Given: 0, team2Given: 0 }, notes: ''
      });
      success++;
    }
    if (success > 0) Toast.success(`✅ ${success} partidas importadas`);
    if (errors > 0) Toast.warning(`⚠️ ${errors} filas con errores omitidas`);
    this.clearPreview('matches');
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
  }
};
