/* =========================================
   GEMINI OCR — Extracción de Partidas por Imagen (Modo Lote)
   ========================================= */
const GeminiOCR = {
  _selectedFiles: [],
  _isAnalyzing: false,

  // ─── CONFIGURACIÓN ───────────────────────────────────────────
  getApiKey() {
    return localStorage.getItem('gemini_ocr_api_key') || '';
  },

  setApiKey(key) {
    localStorage.setItem('gemini_ocr_api_key', key.trim());
  },

  // ─── MODAL PRINCIPAL DE CARGA ─────────────────────────────────
  openUploadModal() {
    const apiKey = this.getApiKey();
    this._selectedFiles = [];
    
    App.openModal({
      title: '📷 Cargar Resultados por Imagen',
      body: `
        <div id="ocr-container">
          ${!apiKey ? `
          <div class="ocr-alert ocr-alert-warn">
            <span>⚠️</span>
            <div>
              <strong>API Key no configurada.</strong><br>
              <small>Ingresa tu clave de OpenRouter para continuar.</small>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">OpenRouter API Key</label>
            <div style="display:flex;gap:8px">
              <input type="password" id="ocr-api-key-input" class="form-input" placeholder="sk-or-v1-..." style="flex:1" />
              <button class="btn btn-secondary btn-sm" onclick="GeminiOCR._saveApiKey()">Guardar</button>
            </div>
          </div>` : ''}

          <div class="ocr-drop-zone" id="ocr-drop-zone"
            onclick="document.getElementById('ocr-file-input').click()"
            ondragover="GeminiOCR._onDragOver(event)"
            ondragleave="GeminiOCR._onDragLeave(event)"
            ondrop="GeminiOCR._onDrop(event)">
            <div class="ocr-drop-icon">📸</div>
            <div class="ocr-drop-text">
              <strong>Selecciona una o varias imágenes</strong><br>
              <span>Arrastra los archivos o haz clic aquí</span>
            </div>
            <small style="color:#6B7280;margin-top:8px">JPG, PNG, WEBP — Recomendado lotes de max. 10</small>
          </div>

          <input type="file" id="ocr-file-input" accept="image/*" multiple style="display:none"
            onchange="GeminiOCR._onFilesSelected(this.files)" />

          <div id="ocr-files-list" style="display:none;margin-top:16px;max-height:200px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px">
          </div>

          <div id="ocr-status" style="display:none;margin-top:12px"></div>
        </div>`,
      footer: `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="ocr-analyze-btn" onclick="GeminiOCR.analyzeBatch()" disabled>
          🔍 Analizar Lote
        </button>`
    }, 'modal-lg');
  },

  _saveApiKey() {
    const val = document.getElementById('ocr-api-key-input')?.value?.trim();
    if (!val || !val.startsWith('sk-or-')) { Toast.error('Clave no válida. Debe empezar con sk-or-'); return; }
    this.setApiKey(val);
    Toast.success('API Key de OpenRouter guardada');
    this.openUploadModal();
  },

  _onDragOver(e) { e.preventDefault(); document.getElementById('ocr-drop-zone').classList.add('drag-over'); },
  _onDragLeave(e) { document.getElementById('ocr-drop-zone').classList.remove('drag-over'); },
  _onDrop(e) {
    e.preventDefault();
    document.getElementById('ocr-drop-zone').classList.remove('drag-over');
    this._onFilesSelected(e.dataTransfer.files);
  },

  _onFilesSelected(fileList) {
    const files = Array.from(fileList);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length === 0) { Toast.error('Por favor selecciona solo imágenes.'); return; }
    
    this._selectedFiles = validFiles;
    this._renderFilesList();
    
    const btn = document.getElementById('ocr-analyze-btn');
    if (btn) btn.disabled = false;
  },

  _renderFilesList() {
    const listEl = document.getElementById('ocr-files-list');
    if (!listEl) return;
    listEl.style.display = 'block';
    listEl.innerHTML = `
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;display:flex;justify-content:space-between">
        <span>Archivos seleccionados: <strong>${this._selectedFiles.length}</strong></span>
        <button class="btn-link" onclick="GeminiOCR._clearFiles()" style="color:var(--accent-danger)">Limpiar</button>
      </div>
      ${this._selectedFiles.map((f, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px;border-bottom:1px solid rgba(255,255,255,0.05)">
          <div style="font-size:12px;color:var(--text-muted);width:20px">${i+1}</div>
          <div style="flex:1;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escHtml(f.name)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${(f.size/1024).toFixed(0)}KB</div>
        </div>
      `).join('')}
    `;
  },

  _clearFiles() {
    this._selectedFiles = [];
    document.getElementById('ocr-files-list').style.display = 'none';
    document.getElementById('ocr-analyze-btn').disabled = true;
  },

  // ─── ANÁLISIS POR LOTES (vía OpenRouter — Gemini 2.0 Flash) ─────────────
  async analyzeBatch() {
    if (this._isAnalyzing) return;
    const apiKey = this.getApiKey();
    if (!apiKey) return;
    
    this._isAnalyzing = true;
    const btn = document.getElementById('ocr-analyze-btn');
    const status = document.getElementById('ocr-status');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Procesando...'; }
    
    let allDetectedPartidas = [];
    let errors = [];

    const prompt = `Eres un asistente que analiza imágenes de hojas de resultados de dominó.
Extrae TODAS las partidas que aparecen en la imagen.

MUY IMPORTANTE — CRITERIO DE IDENTIFICACIÓN:
Cada jugador tiene su NOMBRE y debajo un NÚMERO DE ID (ejemplo: Paulo / 2561584).
USA EL NÚMERO DE ID como identificador PRINCIPAL de cada jugador.
Si no puedes leer el ID claramente, usa el nombre como respaldo.

Devuelve SOLAMENTE un JSON válido con esta estructura exacta:
{
  "partidas": [
    {
      "pareja1": {
        "jugador1": "nombre",
        "id1": "numero_id_del_jugador1",
        "jugador2": "nombre",
        "id2": "numero_id_del_jugador2",
        "puntos": 0
      },
      "pareja2": {
        "jugador1": "nombre",
        "id1": "numero_id_del_jugador1",
        "jugador2": "nombre",
        "id2": "numero_id_del_jugador2",
        "puntos": 0
      }
    }
  ]
}

El campo "puntos" debe ser el cambio de puntos (positivo para victoria, negativo para derrota).
Si ves "+2" extrae 2, si ves "-2" extrae -2.
Los ids son los números que aparecen debajo de cada nombre en la imagen.`;

    try {
      for (let i = 0; i < this._selectedFiles.length; i++) {
        const file = this._selectedFiles[i];
        if (status) {
          status.style.display = 'block';
          status.innerHTML = `
            <div class="ocr-alert ocr-alert-info">
              <div class="spinner-sm"></div>
              <span>Analizando foto <strong>${i + 1} de ${this._selectedFiles.length}</strong> con Gemini 2.0 Flash...<br><small>${Utils.escHtml(file.name)}</small></span>
            </div>`;
        }

        try {
          const base64Data = await this._toBase64(file);
          const mimeType = file.type || 'image/jpeg';

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'DominoStats Pro'
            },
            body: JSON.stringify({
              model: 'google/gemini-2.0-flash-001',
              temperature: 0.1,
              max_tokens: 1024,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                  ]
                }
              ]
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Error HTTP ${res.status}`);
          }

          const data = await res.json();
          const rawText = data.choices[0].message.content;

          // Extraer JSON — soporta markdown code fences y texto libre
          let jsonString = '';
          const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
          if (mdMatch) {
            jsonString = mdMatch[1].trim();
          } else {
            const firstBrace = rawText.indexOf('{');
            const lastBrace = rawText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
              jsonString = rawText.substring(firstBrace, lastBrace + 1);
            }
          }

          if (jsonString) {
            try {
              const parsed = JSON.parse(jsonString);
              if (parsed.partidas && parsed.partidas.length > 0) {
                allDetectedPartidas = allDetectedPartidas.concat(parsed.partidas);
              }
            } catch (jsonErr) {
              console.warn('JSON parse error en archivo:', file.name, jsonErr.message);
              errors.push(`${file.name}: JSON inválido de la IA`);
            }
          }
        } catch (fileErr) {
          console.error(`Error en archivo ${file.name}:`, fileErr);
          errors.push(`${file.name}: ${fileErr.message}`);
        }
      }

      if (allDetectedPartidas.length === 0) {
        throw new Error('No se detectaron partidas en ninguna de las imágenes.');
      }

      App.closeModal();
      this._isAnalyzing = false;
      this._showReviewModal(allDetectedPartidas);

    } catch (err) {
      this._isAnalyzing = false;
      if (status) {
        status.innerHTML = `
          <div class="ocr-alert ocr-alert-error">
            <span>❌</span>
            <div><strong>Error en el proceso:</strong><br><small>${Utils.escHtml(err.message)}</small></div>
          </div>`;
      }
      if (btn) { btn.disabled = false; btn.textContent = '🔍 Reintentar lote'; }
    }
  },

  _showReviewModal(partidas) {
    const players = DB.getPlayers(Auth.getGroupId());
    const today = new Date().toISOString().split('T')[0];

    const mapped = partidas.map((p, idx) => ({
      idx,
      pareja1: {
        jugador1: this._matchPlayer(p.pareja1.jugador1, players, p.pareja1.id1),
        jugador2: this._matchPlayer(p.pareja1.jugador2, players, p.pareja1.id2),
        nombre1: p.pareja1.jugador1, nombre2: p.pareja1.jugador2,
        gameId1: p.pareja1.id1 || '', gameId2: p.pareja1.id2 || '',
        puntos: p.pareja1.puntos
      },
      pareja2: {
        jugador1: this._matchPlayer(p.pareja2.jugador1, players, p.pareja2.id1),
        jugador2: this._matchPlayer(p.pareja2.jugador2, players, p.pareja2.id2),
        nombre1: p.pareja2.jugador1, nombre2: p.pareja2.jugador2,
        gameId1: p.pareja2.id1 || '', gameId2: p.pareja2.id2 || '',
        puntos: p.pareja2.puntos
      },
      fecha: today
    }));

    const playerOpts = (selectedId) => players.map(p =>
      `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${Utils.escHtml(p.name)}</option>`
    ).join('');

    const autoTag = (id) => id
      ? `<span style="display:inline-block;background:rgba(16,185,129,0.15);color:#34D399;border:1px solid rgba(16,185,129,0.3);font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">AUTO ✓</span>`
      : `<span style="display:inline-block;background:rgba(245,158,11,0.12);color:#FCD34D;border:1px solid rgba(245,158,11,0.3);font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">MANUAL</span>`;

    App.openModal({
      title: `🤖 Revisión IA — ${mapped.length} partida${mapped.length!==1?'s':''} detectada${mapped.length!==1?'s':''}`,
      body: `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="display:flex;gap:16px;font-size:12px">
            <span><span style="color:#34D399">●</span> Auto-detectado</span>
            <span><span style="color:#FCD34D">●</span> Requiere selección</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">${mapped.filter(m=>m.pareja1.jugador1&&m.pareja1.jugador2&&m.pareja2.jugador1&&m.pareja2.jugador2).length} / ${mapped.length} listas</div>
        </div>
        <div id="ocr-review-list" class="ocr-review-list">
          ${mapped.map((m, i) => {
            const allMatched = m.pareja1.jugador1 && m.pareja1.jugador2 && m.pareja2.jugador1 && m.pareja2.jugador2;
            return `
            <div class="ocr-match-card ${allMatched?'ocr-card-ok':'ocr-card-warn'}" id="ocr-match-${i}">
              <div class="ocr-match-header">
                <div class="ocr-match-badge">${i+1}</div>
                <span class="ocr-match-num">Partida</span>
                <div style="flex:1"></div>
                <input type="date" class="form-input form-input-sm" id="ocr-fecha-${i}" value="${m.fecha}" style="width:130px" />
                <button class="btn-icon btn-ghost" onclick="GeminiOCR._removeMatch(${i})" title="Eliminar"
                  style="padding:4px 8px;font-size:16px;opacity:0.5">✕</button>
              </div>
              <div class="ocr-match-body">

                <!-- PAREJA 1 -->
                <div class="ocr-team ocr-team-1">
                  <div class="ocr-team-label" style="color:#818CF8">⚡ Pareja 1</div>
                  <div class="ocr-player-row">
                    <div class="ocr-detected-name">
                      <span style="color:#6B7280;font-size:11px">Detectado:</span>
                      <strong style="color:#E5E7EB">${Utils.escHtml(m.pareja1.nombre1||'?')}</strong>
                      ${m.pareja1.gameId1 ? `<span style="display:inline-block;background:rgba(99,102,241,0.15);color:#A5B4FC;border:1px solid rgba(99,102,241,0.3);font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">ID: ${Utils.escHtml(m.pareja1.gameId1)}</span>` : ''}
                      ${autoTag(m.pareja1.jugador1)}
                    </div>
                    <select class="form-select ocr-select ${m.pareja1.jugador1?'select-ok':'select-warn'}" id="ocr-p1-j1-${i}">
                      <option value="">— Seleccionar —</option>
                      ${playerOpts(m.pareja1.jugador1)}
                    </select>
                  </div>
                  <div class="ocr-player-row">
                    <div class="ocr-detected-name">
                      <span style="color:#6B7280;font-size:11px">Detectado:</span>
                      <strong style="color:#E5E7EB">${Utils.escHtml(m.pareja1.nombre2||'?')}</strong>
                      ${m.pareja1.gameId2 ? `<span style="display:inline-block;background:rgba(99,102,241,0.15);color:#A5B4FC;border:1px solid rgba(99,102,241,0.3);font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">ID: ${Utils.escHtml(m.pareja1.gameId2)}</span>` : ''}
                      ${autoTag(m.pareja1.jugador2)}
                    </div>
                    <select class="form-select ocr-select ${m.pareja1.jugador2?'select-ok':'select-warn'}" id="ocr-p1-j2-${i}">
                      <option value="">— Seleccionar —</option>
                      ${playerOpts(m.pareja1.jugador2)}
                    </select>
                  </div>
                  <div class="ocr-score-badge">
                    <span style="color:#A5B4FC;font-size:12px;font-weight:700">PUNTOS</span>
                    <input type="number" class="form-input ocr-score-input" id="ocr-s1-${i}" value="${m.pareja1.puntos??''}" min="0" max="999" />
                  </div>
                </div>

                <!-- VS -->
                <div class="ocr-vs-col">
                  <div class="ocr-vs-bubble">VS</div>
                </div>

                <!-- PAREJA 2 -->
                <div class="ocr-team ocr-team-2">
                  <div class="ocr-team-label" style="color:#34D399">⚡ Pareja 2</div>
                  <div class="ocr-player-row">
                    <div class="ocr-detected-name">
                      <span style="color:#6B7280;font-size:11px">Detectado:</span>
                      <strong style="color:#E5E7EB">${Utils.escHtml(m.pareja2.nombre1||'?')}</strong>
                      ${m.pareja2.gameId1 ? `<span style="display:inline-block;background:rgba(99,102,241,0.15);color:#A5B4FC;border:1px solid rgba(99,102,241,0.3);font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">ID: ${Utils.escHtml(m.pareja2.gameId1)}</span>` : ''}
                      ${autoTag(m.pareja2.jugador1)}
                    </div>
                    <select class="form-select ocr-select ${m.pareja2.jugador1?'select-ok':'select-warn'}" id="ocr-p2-j1-${i}">
                      <option value="">— Seleccionar —</option>
                      ${playerOpts(m.pareja2.jugador1)}
                    </select>
                  </div>
                  <div class="ocr-player-row">
                    <div class="ocr-detected-name">
                      <span style="color:#6B7280;font-size:11px">Detectado:</span>
                      <strong style="color:#E5E7EB">${Utils.escHtml(m.pareja2.nombre2||'?')}</strong>
                      ${m.pareja2.gameId2 ? `<span style="display:inline-block;background:rgba(99,102,241,0.15);color:#A5B4FC;border:1px solid rgba(99,102,241,0.3);font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">ID: ${Utils.escHtml(m.pareja2.gameId2)}</span>` : ''}
                      ${autoTag(m.pareja2.jugador2)}
                    </div>
                    <select class="form-select ocr-select ${m.pareja2.jugador2?'select-ok':'select-warn'}" id="ocr-p2-j2-${i}">
                      <option value="">— Seleccionar —</option>
                      ${playerOpts(m.pareja2.jugador2)}
                    </select>
                  </div>
                  <div class="ocr-score-badge">
                    <span style="color:#6EE7B7;font-size:12px;font-weight:700">PUNTOS</span>
                    <input type="number" class="form-input ocr-score-input" id="ocr-s2-${i}" value="${m.pareja2.puntos??''}" min="0" max="999" />
                  </div>
                </div>

              </div>
            </div>`;
          }).join('')}
        </div>`,
      footer: `
        <div style="display:flex;align-items:center;flex:1">
          <span class="text-xs text-muted">💡 Puedes editar cualquier campo antes de guardar</span>
        </div>
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="GeminiOCR.saveAllMatches(${mapped.length})">
          💾 Guardar ${mapped.length} partida${mapped.length!==1?'s':''}
        </button>`
    }, 'modal-lg');
  },


  _removeMatch(i) {
    const el = document.getElementById(`ocr-match-${i}`);
    if (el) el.remove();
  },

  saveAllMatches(total) {
    let saved = 0, errors = 0;
    for (let i = 0; i < total; i++) {
      const el = document.getElementById(`ocr-match-${i}`);
      if (!el) continue;

      const t1p1 = document.getElementById(`ocr-p1-j1-${i}`)?.value;
      const t1p2 = document.getElementById(`ocr-p1-j2-${i}`)?.value;
      const t2p1 = document.getElementById(`ocr-p2-j1-${i}`)?.value;
      const t2p2 = document.getElementById(`ocr-p2-j2-${i}`)?.value;
      const s1 = parseInt(document.getElementById(`ocr-s1-${i}`)?.value);
      const s2 = parseInt(document.getElementById(`ocr-s2-${i}`)?.value);
      const fecha = document.getElementById(`ocr-fecha-${i}`)?.value;

      if (!t1p1 || !t1p2 || !t2p1 || !t2p2 || isNaN(s1) || isNaN(s2) || s1 === s2) { errors++; continue; }

      DB.addMatch({
        groupId: Auth.getGroupId(), type: 'friendly', date: fecha,
        team1: { player1: t1p1, player2: t1p2 }, team2: { player1: t2p1, player2: t2p2 },
        score: { team1: s1, team2: s2 }, winner: s1 > s2 ? 'team1' : 'team2',
        shoes: { team1Given: (s1>0&&s2===0)?1:0, team2Given: (s2>0&&s1===0)?1:0 },
        notes: 'Cargado por Lote (OCR)'
      });
      saved++;
    }
    App.closeModal();
    if (saved > 0) {
      // ⚠️ FIX: invalidar caché de stats para que el ranking refleje los nuevos resultados
      const groupId = Auth.getGroupId();
      if (typeof DB !== 'undefined' && DB._invalidateStatsCache) DB._invalidateStatsCache(groupId);
      Toast.success(`✅ ${saved} partidas guardadas correctamente.`);
    }
    if (typeof MatchesPage !== 'undefined' && App.currentPage === 'matches') MatchesPage.loadTable();
    // Refrescar ranking si está abierto
    if (typeof RankingsPage !== 'undefined' && App.currentPage === 'rankings') RankingsPage.renderTab();
  },

  _matchPlayer(name, players, gameId) {
    if (!players.length) return '';

    // ── CRITERIO 1: Buscar por ID de juego (número debajo del nombre) ─────
    if (gameId) {
      const cleanId = String(gameId).trim();
      const byGameId = players.find(p => {
        // Buscar en el campo gameId del jugador
        if (p.gameId && String(p.gameId).trim() === cleanId) return true;
        // Buscar también en aliases (por si el ID fue guardado como alias)
        const aliases = Array.isArray(p.aliases) ? p.aliases :
          (p.alias ? String(p.alias).split(',').map(a => a.trim()) : []);
        return aliases.some(a => String(a).trim() === cleanId);
      });
      if (byGameId) return byGameId.id;
    }

    // ── CRITERIO 2: Buscar por nombre / alias (fallback) ──────────────────
    if (!name) return '';
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const target = norm(name);
    const getAliases = (p) => {
      if (Array.isArray(p.aliases)) return p.aliases;
      if (p.alias) return p.alias.split(',').map(a => a.trim());
      return [];
    };
    let match = players.find(p => norm(p.name) === target || getAliases(p).some(a => norm(a) === target));
    if (match) return match.id;
    match = players.find(p => norm(p.name).includes(target) || target.includes(norm(p.name).split(' ')[0]));
    return match ? match.id : '';
  },

  _toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
