/* =========================================
   MATCHES PAGE — Redesigned v2
   ========================================= */
const MatchesPage = {
  state: { page: 1, sort: 'date', dir: 'desc', filter: 'all', search: '', expanded: null },

  render() {
    return `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom:12px">
        <div class="page-header-left">
          <div class="page-header-title">🎮 Partidas</div>
          <div class="page-header-sub">Gestión y registro de partidas</div>
        </div>
        <div class="page-header-actions">
          <button id="btn-repair-names" class="btn btn-ghost btn-sm" style="color:var(--accent-danger); display:none" onclick="MatchesPage.openRepairModal()" title="Reparar Nombres OCR">🛠 Reparar Nombres</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--accent-warning)" onclick="MatchesPage.detectDuplicates()" title="Limpiar Duplicados">🧹 Limpiar Duplicados</button>
          <button class="btn btn-ghost btn-sm" onclick="MatchesPage.exportMatches()" title="Exportar">⬇</button>
          <button class="btn btn-secondary btn-sm" onclick="GeminiOCR.openUploadModal()" title="Cargar imagen">📷</button>
          <button class="btn btn-primary btn-sm" onclick="MatchesPage.openNew()">+ Nueva</button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filters-bar" style="margin-bottom:10px">
        <div class="filter-pill active" id="filter-all" onclick="MatchesPage.setFilter('all',this)">Todas</div>
        <div class="filter-pill" id="filter-today" onclick="MatchesPage.setFilter('today',this)">Hoy</div>
        <div class="filter-pill" id="filter-week" onclick="MatchesPage.setFilter('week',this)">Semana</div>
        <div class="filters-spacer"></div>
        <div class="search-bar" style="max-width:160px">
          <span class="search-icon">🔍</span>
          <input class="search-input" placeholder="Buscar..." oninput="MatchesPage.setSearch(this.value)" />
        </div>
      </div>

      <!-- Count -->
      <div style="padding:0 2px 8px">
        <span id="matches-count" style="font-size:0.8rem;color:var(--text-secondary);font-weight:500"></span>
      </div>

      <!-- Cards list -->
      <div id="matches-list" class="hs-list"></div>
      <div id="matches-pagination" style="padding:4px 0"></div>
    </div>`;
  },

  afterRender() { this.loadTable(); this.checkOrphans(); },

  checkOrphans() {
    const btn = document.getElementById('btn-repair-names');
    if (!btn) return;
    const orphans = this.getOrphanNames();
    if (orphans.length > 0) {
      btn.style.display = 'inline-flex';
      btn.innerHTML = `🛠 Reparar Nombres <span class="badge" style="margin-left:4px">${orphans.length}</span>`;
    } else {
      btn.style.display = 'none';
    }
  },

  getOrphanNames() {
    const groupId = Auth.getGroupId();
    const matches = DB.getMatches(groupId);
    const orphans = new Set();
    
    matches.forEach(m => {
      if (!m.team1.player1 && m.team1.player1Name) orphans.add(m.team1.player1Name);
      if (!m.team1.player2 && m.team1.player2Name) orphans.add(m.team1.player2Name);
      if (!m.team2.player1 && m.team2.player1Name) orphans.add(m.team2.player1Name);
      if (!m.team2.player2 && m.team2.player2Name) orphans.add(m.team2.player2Name);
    });
    
    return Array.from(orphans).sort();
  },

  openRepairModal() {
    const orphans = this.getOrphanNames();
    if (orphans.length === 0) {
      Toast.success('No hay nombres huérfanos que reparar.');
      this.checkOrphans();
      return;
    }
    
    const players = DB.getPlayers(Auth.getGroupId());
    const playerOptions = players.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');
    
    const orphanRow = orphans[0]; // Repair one by one
    
    App.openModal({
      title: '🛠 Reparar Nombre de Jugador',
      body: `
        <div style="margin-bottom:16px; font-size:0.95rem; color:var(--text-secondary)">
          Se ha encontrado un nombre importado por foto que no coincide con ningún jugador registrado. 
          Selecciona el jugador correcto y el sistema aprenderá a reconocerlo la próxima vez.
        </div>
        <div class="form-group">
          <label class="form-label">Nombre del OCR (No reconocido)</label>
          <input type="text" class="form-input" value="${Utils.escHtml(orphanRow)}" disabled style="color:var(--accent-danger); font-weight:bold; background:rgba(255,0,0,0.05)" />
        </div>
        <div class="form-group">
          <label class="form-label">Jugador Real (Registrado)</label>
          <select id="repair-player-select" class="form-select">
            <option value="" disabled selected>-- Seleccionar Jugador --</option>
            ${playerOptions}
          </select>
        </div>
        <div style="font-size:0.85rem; color:var(--accent-primary); margin-top:12px; background:rgba(108,99,255,0.1); padding:8px; border-radius:6px;">
          ℹ️ Al guardar, se corregirán todas las partidas con este nombre y se agregará como alias al jugador seleccionado.
        </div>
      `,
      footer: `
        <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="MatchesPage.applyRepair('${Utils.escHtml(orphanRow).replace(/'/g, "\\'")}')">💾 Guardar y Reparar</button>
      `
    });
  },

  applyRepair(orphanName) {
    const select = document.getElementById('repair-player-select');
    const playerId = select.value;
    if (!playerId) {
      Toast.error('Debes seleccionar un jugador.');
      return;
    }
    
    const groupId = Auth.getGroupId();
    const player = DB.getPlayerById(playerId);
    
    // 1. Añadir como alias al jugador
    let aliasesArray = Array.isArray(player.aliases) ? player.aliases : (player.alias || '').split(',').map(a => a.trim()).filter(Boolean);
    if (!aliasesArray.includes(orphanName)) {
      aliasesArray.push(orphanName);
      DB.updatePlayer(playerId, { 
        aliases: aliasesArray, 
        alias: aliasesArray.join(', ') // Backwards compatibility
      });
    }

    // 2. Ejecutar auto-reparación
    // Como el jugador ya tiene el alias, _autoRepairOrphanedMatches lo encontrará y reparará
    DB._autoRepairOrphanedMatches();
    
    if (typeof CloudDB !== 'undefined') CloudDB.syncToCloud();
    
    App.closeModal();
    Toast.success(`El nombre "${orphanName}" fue asignado a ${player.name} correctamente.`);
    
    this.loadTable();
    this.checkOrphans();
    
    // Si quedan más huérfanos, reabrir el modal
    setTimeout(() => {
      const remaining = this.getOrphanNames();
      if (remaining.length > 0) this.openRepairModal();
    }, 500);
  },

  detectDuplicates() {
    const groupId = Auth.getGroupId();
    const matches = DB.getMatches(groupId);

    // Helper: resuelve el nombre normalizado de un jugador por ID,
    // con fallback al nombre guardado en la propia partida
    const resolveName = (id, fallbackName) => {
      const p = id ? DB.getPlayerById(id) : null;
      return ((p ? p.name : fallbackName) || '').trim().toLowerCase();
    };

    const byHash = {};
    matches.forEach(m => {
      // Resolver nombres normalizados (no IDs) para cada posición
      const n1_t1 = resolveName(m.team1.player1, m.team1.player1Name);
      const n2_t1 = resolveName(m.team1.player2, m.team1.player2Name);
      const n1_t2 = resolveName(m.team2.player1, m.team2.player1Name);
      const n2_t2 = resolveName(m.team2.player2, m.team2.player2Name);

      // Ordenar jugadores dentro de cada equipo alfabéticamente
      const t1 = [n1_t1, n2_t1].sort();
      const t2 = [n1_t2, n2_t2].sort();

      // Ordenar los dos equipos para no depender de cuál fue Equipo1/Equipo2
      let teamA, teamB, scoreA, scoreB;
      if (t1.join('|') <= t2.join('|')) {
        teamA = t1; teamB = t2; scoreA = m.score.team1; scoreB = m.score.team2;
      } else {
        teamA = t2; teamB = t1; scoreA = m.score.team2; scoreB = m.score.team1;
      }

      // Hash basado en NOMBRES + fecha + marcador (no en IDs)
      const hash = `${m.date}|${teamA[0]}|${teamA[1]}|${teamB[0]}|${teamB[1]}|${scoreA}|${scoreB}`;
      if (!byHash[hash]) byHash[hash] = [];
      byHash[hash].push(m);
    });

    let duplicatesToRemove = [];
    Object.values(byHash).forEach(group => {
      if (group.length > 1) {
        // Ordenar por fecha de creación (los más antiguos primero)
        group.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        // Guardar todos excepto el primero (el original) para ser eliminados
        for (let i = 1; i < group.length; i++) {
          duplicatesToRemove.push(group[i]);
        }
      }
    });

    if (duplicatesToRemove.length === 0) {
      Toast.info('✅ No se encontraron partidas duplicadas.');
      return;
    }

    App.confirmDialog(
      '🧹 Partidas Duplicadas',
      `Se detectaron <b>${duplicatesToRemove.length}</b> partidas duplicadas (misma fecha, mismos jugadores y mismo resultado).<br><br>¿Deseas eliminarlas para sanear el historial?`,
      () => {
        duplicatesToRemove.forEach(m => DB.deleteMatch(m.id));
        Toast.success(`Se eliminaron ${duplicatesToRemove.length} partidas duplicadas.`);
        this.loadTable();
      }
    );
  },

  getFiltered() {
    const groupId = Auth.getGroupId();
    let matches = DB.getMatches(groupId);
    const { filter, search } = this.state;
    const today = Utils.getLocalISODate();
    const weekAgo = Utils.getLocalISODate(new Date(Date.now() - 7*86400000));

    if (filter === 'today') matches = matches.filter(m => m.date === today);
    if (filter === 'week') matches = matches.filter(m => m.date >= weekAgo);

    if (search) {
      const q = search.toLowerCase();
      matches = matches.filter(m => {
        const names = [
          m.team1.player1Name || Utils.playerName(m.team1.player1),
          m.team1.player2Name || Utils.playerName(m.team1.player2),
          m.team2.player1Name || Utils.playerName(m.team2.player1),
          m.team2.player2Name || Utils.playerName(m.team2.player2)
        ].map(n => n.toLowerCase());
        return names.some(n => n.includes(q));
      });
    }

    return Utils.sortArray(matches, this.state.sort, this.state.dir);
  },

  loadTable() {
    const filtered = this.getFiltered();
    const paged = Utils.paginate(filtered, this.state.page, 15);
    const listEl = document.getElementById('matches-list');
    const paginEl = document.getElementById('matches-pagination');
    const countEl = document.getElementById('matches-count');

    if (countEl) countEl.textContent = `${filtered.length} partida${filtered.length !== 1 ? 's' : ''}`;
    if (!listEl) return;

    if (!paged.items.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎮</div><div class="empty-text">No hay partidas que mostrar</div></div>`;
      if (paginEl) paginEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = paged.items.map(m => {
      const p1_t1 = Utils.playerName(m.team1.player1) !== 'Desconocido' ? Utils.playerName(m.team1.player1) : (m.team1.player1Name || '?');
      const p2_t1 = Utils.playerName(m.team1.player2) !== 'Desconocido' ? Utils.playerName(m.team1.player2) : (m.team1.player2Name || '?');
      const p1_t2 = Utils.playerName(m.team2.player1) !== 'Desconocido' ? Utils.playerName(m.team2.player1) : (m.team2.player1Name || '?');
      const p2_t2 = Utils.playerName(m.team2.player2) !== 'Desconocido' ? Utils.playerName(m.team2.player2) : (m.team2.player2Name || '?');
      const t1n = `${Utils.escHtml(p1_t1)} & ${Utils.escHtml(p2_t1)}`;
      const t2n = `${Utils.escHtml(p1_t2)} & ${Utils.escHtml(p2_t2)}`;
      const w1 = m.winner === 'team1';
      const shoesTotal = ((m.shoes && m.shoes.team1Given) || 0) + ((m.shoes && m.shoes.team2Given) || 0);
      const isOpen = this.state.expanded === m.id;

      return `
      <div class="hs-card match-card ${isOpen ? 'hs-card-open' : ''}">
        <!-- Main compact row -->
        <div class="hs-card-main" onclick="MatchesPage.toggleExpand('${m.id}')">
          <div class="hs-card-left">
            <div class="hs-date">${Utils.fmtDate(m.date)}</div>
            <div class="hs-teams">
              <span class="hs-team ${w1 ? 'hs-winner' : ''}">${t1n}</span>
              <span class="hs-vs">vs</span>
              <span class="hs-team ${!w1 ? 'hs-winner' : ''}">${t2n}</span>
            </div>
          </div>
          <div class="hs-card-right">
            <div class="hs-score">
              <span class="${w1 ? 'score-win' : 'score-lose'}">${m.score.team1}</span>
              <span class="hs-score-sep">:</span>
              <span class="${!w1 ? 'score-win' : 'score-lose'}">${m.score.team2}</span>
            </div>
            <div class="hs-winner-badge">${w1 ? 'P1 ✓' : 'P2 ✓'}</div>
          </div>
          <!-- Action buttons always visible -->
          <div class="match-actions" onclick="event.stopPropagation()">
            <button class="match-act-btn" onclick="MatchesPage.openEdit('${m.id}')" title="Editar">✏️</button>
            <button class="match-act-btn danger" onclick="MatchesPage.confirmDelete('${m.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>
        <!-- Expandable detail -->
        ${isOpen ? `
        <div class="hs-card-detail">
          <div class="hs-detail-row">
            <span class="hs-detail-label">Ganador</span>
            <span class="badge badge-success">✅ ${w1 ? 'Pareja 1' : 'Pareja 2'}</span>
          </div>
          <div class="hs-detail-row">
            <span class="hs-detail-label">Zapatos</span>
            <span>${shoesTotal > 0 ? `<span class="badge badge-warning">👟 ${shoesTotal}</span>` : '—'}</span>
          </div>
          ${m.notes ? `
          <div class="hs-detail-row">
            <span class="hs-detail-label">Notas</span>
            <span style="font-size:0.8rem;color:var(--text-secondary);flex:1;text-align:right">${Utils.escHtml(m.notes)}</span>
          </div>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    if (paginEl) paginEl.innerHTML = paged.total > 15 ? Utils.renderPagination(paged, 'MatchesPage.goPage') : '';
  },

  toggleExpand(id) {
    this.state.expanded = this.state.expanded === id ? null : id;
    this.loadTable();
  },

  goPage(p) { this.state.page = p; this.loadTable(); },
  setFilter(f, el) {
    this.state.filter = f; this.state.page = 1;
    document.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    this.loadTable();
  },
  setSearch(v) { this.state.search = v; this.state.page = 1; this.loadTable(); },
  setSort(key) {
    if (this.state.sort === key) this.state.dir = this.state.dir === 'asc' ? 'desc' : 'asc';
    else { this.state.sort = key; this.state.dir = 'desc'; }
    this.loadTable();
  },

  openNew() {
    const players = DB.getPlayers(Auth.getGroupId());
    if (players.length < 4) {
      Toast.warning('Necesitas al menos 4 jugadores para registrar una partida.');
      return;
    }
    App.openModal(this._matchForm(null, players), 'modal-lg');
  },

  openEdit(id) {
    const match = DB.getMatchById(id);
    if (!match) return;
    const players = DB.getPlayers(Auth.getGroupId());
    App.openModal(this._matchForm(match, players), 'modal-lg');
  },

  _matchForm(match, players) {
    const sel = (selected) => {
      let html = `<option value="" disabled ${!selected ? 'selected' : ''}>-- Seleccionar Jugador --</option>`;
      html += players.map(p =>
        `<option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${Utils.escHtml(p.name)} (${Utils.escHtml(p.alias || '—')})</option>`
      ).join('');
      return html;
    };
    const isEdit = !!match;

    return {
      title: isEdit ? '✏️ Editar Partida' : '🎮 Nueva Partida Amistosa',
      body: `
        <form id="match-form" onsubmit="MatchesPage.saveMatch(event, ${isEdit ? `'${match.id}'` : 'null'})">
          <div class="form-grid">
            ${isEdit ? `
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select id="m-type" class="form-select">
                <option value="friendly" ${match.type==='friendly'?'selected':''}>🎮 Amistoso</option>
                <option value="tournament" ${match.type==='tournament'?'selected':''}>🏆 Torneo</option>
              </select>
            </div>` : `<input type="hidden" id="m-type" value="friendly" />`}
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" id="m-date" class="form-input" value="${match?.date || Utils.getLocalISODate()}" required />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:end;margin-bottom:12px">
            <div>
              <div class="section-title" style="color:var(--accent-primary)">Pareja 1</div>
              <div class="form-group">
                <label class="form-label">Jugador 1</label>
                <select id="m-t1p1" class="form-select" required>${sel(match?.team1.player1)}</select>
              </div>
              <div class="form-group">
                <label class="form-label">Jugador 2</label>
                <select id="m-t1p2" class="form-select" required>${sel(match?.team1.player2)}</select>
              </div>
              <div class="form-group">
                <label class="form-label">Puntos P1</label>
                <input type="number" id="m-s1" class="form-input" value="${match?.score.team1 || ''}" min="0" max="999" required />
              </div>
            </div>
            <div style="text-align:center;padding-bottom:32px">
              <div style="font-size:1.5rem;font-weight:900;color:var(--text-muted)">VS</div>
            </div>
            <div>
              <div class="section-title" style="color:var(--accent-success)">Pareja 2</div>
              <div class="form-group">
                <label class="form-label">Jugador 1</label>
                <select id="m-t2p1" class="form-select" required>${sel(match?.team2.player1)}</select>
              </div>
              <div class="form-group">
                <label class="form-label">Jugador 2</label>
                <select id="m-t2p2" class="form-select" required>${sel(match?.team2.player2)}</select>
              </div>
              <div class="form-group">
                <label class="form-label">Puntos P2</label>
                <input type="number" id="m-s2" class="form-input" value="${match?.score.team2 || ''}" min="0" max="999" required />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notas (opcional)</label>
            <textarea id="m-notes" class="form-textarea" placeholder="Observaciones...">${match?.notes || ''}</textarea>
          </div>

          <div class="modal-footer" style="padding:0;margin-top:8px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isEdit ? '💾 Guardar' : '🎮 Registrar'}</button>
          </div>
        </form>`,
      footer: ''
    };
  },

  async saveMatch(e, existingId) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Guardando...';
    }

    const t1p1 = document.getElementById('m-t1p1').value;
    const t1p2 = document.getElementById('m-t1p2').value;
    const t2p1 = document.getElementById('m-t2p1').value;
    const t2p2 = document.getElementById('m-t2p2').value;
    const s1 = parseInt(document.getElementById('m-s1').value);
    const s2 = parseInt(document.getElementById('m-s2').value);

    const players = [t1p1, t1p2, t2p1, t2p2];
    if (new Set(players).size < 4) { 
      Toast.error('Los 4 jugadores deben ser diferentes.'); 
      if (btn) { btn.disabled = false; btn.innerHTML = existingId ? '💾 Guardar' : '🎮 Registrar'; }
      return; 
    }
    if (isNaN(s1) || isNaN(s2) || s1 === s2) { 
      Toast.error('El resultado no puede ser empate.'); 
      if (btn) { btn.disabled = false; btn.innerHTML = existingId ? '💾 Guardar' : '🎮 Registrar'; }
      return; 
    }

    let t1sh = 0, t2sh = 0;
    if (s1 > 0 && s2 === 0) t1sh = 1;
    if (s2 > 0 && s1 === 0) t2sh = 1;

    const matchData = {
      groupId: Auth.getGroupId(),
      type: document.getElementById('m-type').value,
      date: document.getElementById('m-date').value,
      team1: { player1: t1p1, player2: t1p2 },
      team2: { player1: t2p1, player2: t2p2 },
      score: { team1: s1, team2: s2 },
      winner: s1 > s2 ? 'team1' : 'team2',
      shoes: { team1Given: t1sh, team2Given: t2sh },
      notes: document.getElementById('m-notes').value
    };

    let savedMatchId = existingId;
    if (existingId) { DB.updateMatch(existingId, matchData); Toast.success('Partida actualizada localmente'); }
    else { const newMatch = DB.addMatch(matchData); savedMatchId = newMatch.id; Toast.success('Partida registrada localmente'); }

    // Bloquear el listener para este ID durante 8 seg y hacer
    // una actualización RÁPIDA solo de esta partida en Firebase.
    if (typeof CloudDB !== 'undefined' && CloudDB._getDb) {
      if (savedMatchId && CloudDB._markLocalWrite) CloudDB._markLocalWrite(savedMatchId);
      
      try {
        const db = CloudDB._getDb();
        if (db) {
          const matchToUpload = DB._store.matches.find(m => m.id === savedMatchId);
          if (matchToUpload) {
            await db.collection('groups').doc(Auth.getGroupId()).collection('matches').doc(savedMatchId).set(matchToUpload, { merge: true });
            Toast.success('✅ Guardado en la nube');
          }
        }
      } catch (e) {
        console.error('Error fast sync:', e);
        // Fallback
        if (CloudDB.syncToCloud) CloudDB.syncToCloud();
      }
    }

    App.closeModal();
    this.loadTable();
  },

  confirmDelete(id) {
    App.confirmDialog('¿Eliminar esta partida?', 'Esta acción no se puede deshacer.', () => {
      DB.deleteMatch(id);
      Toast.success('Partida eliminada');
      this.loadTable();
    });
  },

  exportMatches() {
    const matches = this.getFiltered();
    const data = matches.map(m => ({
      Fecha: m.date, Tipo: m.type,
      'Pareja 1 J1': Utils.playerName(m.team1.player1),
      'Pareja 1 J2': Utils.playerName(m.team1.player2),
      'Pareja 2 J1': Utils.playerName(m.team2.player1),
      'Pareja 2 J2': Utils.playerName(m.team2.player2),
      'Puntos P1': m.score.team1, 'Puntos P2': m.score.team2,
      Ganador: m.winner === 'team1' ? 'Pareja 1' : 'Pareja 2',
      'Zapatos P1': m.shoes.team1Given, 'Zapatos P2': m.shoes.team2Given,
    }));
    Utils.exportCSV(data, 'partidas.csv');
    Toast.success('Exportado a CSV');
  }
};
