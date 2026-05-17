/* =========================================
   PLAYERS PAGE — Manage Participants
   ========================================= */
const PlayersPage = {
  state: { page: 1, sort: 'name', dir: 'asc', search: '' },

  render() {
    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">👥 Jugadores</div>
          <div class="page-header-sub">Gestión de participantes</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" style="color:var(--accent-warning)" onclick="PlayersPage.detectDuplicates()">🧹 Limpiar Duplicados</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--accent-secondary)" onclick="PlayersPage.openMerge()">🔀 Fusionar Jugadores</button>
          <button class="btn btn-ghost btn-sm" onclick="PlayersPage.exportPlayers()">⬇ Exportar</button>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('import')">📂 Importar Excel/CSV</button>
          <button class="btn btn-primary" onclick="PlayersPage.openNew()">+ Nuevo Jugador</button>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input class="search-input" placeholder="Buscar por nombre o alias..." oninput="PlayersPage.setSearch(this.value)" />
        </div>
        <div class="filters-spacer"></div>
        <select class="form-select filters-select" onchange="PlayersPage.setSort(this.value)">
          <option value="name">Ordenar: Nombre</option>
          <option value="stats.wins">Victorias</option>
          <option value="stats.eff">Efectividad</option>
          <option value="createdAt">Fecha registro</option>
        </select>
      </div>

      <div id="players-grid" class="grid-auto"></div>
      <div id="players-pagination" style="margin-top:12px"></div>
    </div>`;
  },

  afterRender() { this.loadGrid(); },

  detectDuplicates() {
    const groupId = Auth.getGroupId();
    const players = DB.getAllPlayerStats(groupId);

    const byName = {};
    players.forEach(p => {
      const name = p.name.trim().toLowerCase();
      if (!byName[name]) byName[name] = [];
      byName[name].push(p);
    });

    let duplicatesToRemove = [];
    Object.values(byName).forEach(group => {
      if (group.length > 1) {
        // Ordenar: 1º más partidas jugadas, 2º más antiguo
        group.sort((a, b) => {
          if (b.stats.played !== a.stats.played) return b.stats.played - a.stats.played;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        // Conservar el primero, marcar el resto para borrar
        for (let i = 1; i < group.length; i++) {
          duplicatesToRemove.push(group[i]);
        }
      }
    });

    if (duplicatesToRemove.length === 0) {
      Toast.info('✅ No se encontraron jugadores duplicados.');
      return;
    }

    const listHtml = duplicatesToRemove.map(p => `<li><b>${Utils.escHtml(p.name)}</b> (ID: ${p.id.substring(0,5)}...)</li>`).join('');
    
    App.confirmDialog(
      '🧹 Detectados Duplicados',
      `Se detectaron <b>${duplicatesToRemove.length}</b> jugadores duplicados. Se conservará automáticamente el perfil con más partidas jugadas o el registro más antiguo.<br><br>
      <b>Se eliminarán permanentemente:</b><br>
      <ul style="max-height:150px;overflow-y:auto;text-align:left;font-size:0.85rem;margin-top:10px;background:var(--bg-elevated);padding:10px;border-radius:6px;list-style:inside">
        ${listHtml}
      </ul><br>¿Deseas eliminarlos ahora?`,
      () => {
        duplicatesToRemove.forEach(p => DB.deletePlayer(p.id));
        Toast.success(`Se eliminaron ${duplicatesToRemove.length} jugadores duplicados.`);
        this.loadGrid();
      }
    );
  },

  // Normaliza aliases: acepta array nuevo o string antiguo (backward compat)
  _getAliasArray(player) {
    if (!player) return [];
    if (Array.isArray(player.aliases)) return player.aliases.filter(Boolean);
    const raw = (player.aliases !== undefined && player.aliases !== null) ? String(player.aliases) : 
                (player.alias !== undefined && player.alias !== null) ? String(player.alias) : '';
    if (!raw) return [];
    return raw.split(',').map(a => a.trim()).filter(Boolean);
  },

  _aliasDisplay(player) {
    const arr = this._getAliasArray(player);
    return arr.length ? arr.join(', ') : '—';
  },

  getFiltered() {
    const groupId = Auth.getGroupId();
    let players = DB.getAllPlayerStats(groupId);
    if (this.state.search) {
      const q = this.state.search.toLowerCase();
      players = players.filter(p => {
        if (p.name.toLowerCase().includes(q)) return true;
        return this._getAliasArray(p).some(a => a.toLowerCase().includes(q));
      });
    }
    return Utils.sortArray(players, this.state.sort, this.state.dir);
  },

  loadGrid() {
    const filtered = this.getFiltered();
    const paged = Utils.paginate(filtered, this.state.page, 12);
    const grid = document.getElementById('players-grid');
    const paginEl = document.getElementById('players-pagination');
    if (!grid) return;

    grid.innerHTML = paged.items.map(ps => {
      const st = ps.stats;
      const aliasText = this._aliasDisplay(ps);
      const streakHtml = st.currentStreak > 1
        ? `<span class="streak-badge ${st.currentStreakType==='win'?'streak-win':'streak-loss'}">
            ${st.currentStreakType==='win'?'🔥':'❄️'} ${st.currentStreak}
           </span>` : '';
      return `<div class="card player-card" style="cursor:pointer" onclick="PlayersPage.openProfile('${ps.id}')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div class="avatar avatar-lg" style="background:${Utils.avatarColor(ps.name)}">${Utils.initials(ps.name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escHtml(ps.name)}</div>
            <div class="text-muted text-sm" title="${Utils.escHtml(aliasText)}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${Utils.escHtml(aliasText)}</div>
            ${streakHtml}
          </div>
          <div class="dropdown">
            <button class="btn-icon btn-ghost" onclick="event.stopPropagation();PlayersPage.toggleMenu('menu-${ps.id}')">⋯</button>
            <div class="dropdown-menu hidden" id="menu-${ps.id}">
              <button class="dropdown-item" onclick="event.stopPropagation();PlayersPage.openEdit('${ps.id}')">✏️ Editar</button>
              <button class="dropdown-item" onclick="event.stopPropagation();PlayersPage.openProfile('${ps.id}')">📊 Estadísticas</button>
              <hr />
              <button class="dropdown-item danger" onclick="event.stopPropagation();PlayersPage.confirmDelete('${ps.id}')">🗑️ Eliminar</button>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          <div style="text-align:center;background:var(--bg-elevated);border-radius:8px;padding:8px">
            <div style="font-weight:800;font-size:1.1rem;color:var(--accent-success)">${st.wins}</div>
            <div class="text-xs text-muted">Victorias</div>
          </div>
          <div style="text-align:center;background:var(--bg-elevated);border-radius:8px;padding:8px">
            <div style="font-weight:800;font-size:1.1rem;color:var(--accent-danger)">${st.losses}</div>
            <div class="text-xs text-muted">Derrotas</div>
          </div>
          <div style="text-align:center;background:var(--bg-elevated);border-radius:8px;padding:8px">
            <div style="font-weight:800;font-size:1.1rem;color:var(--accent-warning)">${st.shoesGiven}</div>
            <div class="text-xs text-muted">👟 Dados</div>
          </div>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span class="text-xs text-muted">Efectividad</span>
            <span class="text-xs semibold" style="color:var(--accent-primary)">${st.eff}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${st.eff>=60?'green':st.eff>=40?'':'red'}" style="width:${st.eff}%"></div>
          </div>
        </div>

        <div class="text-xs text-muted" style="margin-top:10px">📅 Desde ${Utils.fmtDate(ps.createdAt)}</div>
      </div>`;
    }).join('') || `<div style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No hay jugadores registrados</div><button class="btn btn-primary" onclick="PlayersPage.openNew()">+ Añadir Jugador</button></div></div>`;

    if (paginEl) paginEl.innerHTML = paged.total > 12 ? Utils.renderPagination(paged, 'PlayersPage.goPage') : '';
  },

  toggleMenu(id) {
    document.querySelectorAll('.dropdown-menu').forEach(m => { if (m.id !== id) m.classList.add('hidden'); });
    document.getElementById(id)?.classList.toggle('hidden');
  },

  goPage(p) { this.state.page = p; this.loadGrid(); },
  setSearch(v) { this.state.search = v; this.state.page = 1; this.loadGrid(); },
  setSort(v) { this.state.sort = v; this.loadGrid(); },

  openNew() {
    App.openModal({
      title: '+ Nuevo Jugador',
      body: this._playerForm(null),
      footer: `<button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
               <button class="btn btn-primary" onclick="PlayersPage.savePlayer(null)">Guardar</button>`
    });
  },

  openEdit(id) {
    const p = DB.getPlayerById(id);
    if (!p) return;
    App.openModal({
      title: '✏️ Editar Jugador',
      body: this._playerForm(p),
      footer: `<button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
               <button class="btn btn-primary" onclick="PlayersPage.savePlayer('${id}')">Guardar</button>`
    });
  },

  _playerForm(player) {
    const aliasVal = this._getAliasArray(player).join(', ');
    return `
      <div class="form-group">
        <label class="form-label">Nombre completo *</label>
        <input type="text" id="pl-name" class="form-input" value="${Utils.escHtml(player?.name||'')}" placeholder="Nombre Apellido" required />
      </div>
      <div class="form-group">
        <label class="form-label">Alias / Apodos <span class="text-muted text-xs">(separados por coma)</span></label>
        <input type="text" id="pl-aliases" class="form-input" value="${Utils.escHtml(aliasVal)}" placeholder="Toño, Tony, El Toro..." />
        <div class="text-xs text-muted" style="margin-top:4px">💡 La IA usará estos alias para identificar al jugador en las fotos automáticamente</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea id="pl-notes" class="form-textarea" placeholder="Observaciones...">${Utils.escHtml(player?.notes||'')}</textarea>
      </div>`;
  },

  savePlayer(existingId) {
    const name = document.getElementById('pl-name')?.value.trim();
    if (!name) { Toast.error('El nombre es requerido'); return; }
    const rawAliases = document.getElementById('pl-aliases')?.value || '';
    const aliases = rawAliases.split(',').map(a => a.trim()).filter(Boolean);
    const data = {
      name,
      aliases,
      alias: aliases[0] || '', // backward compat
      notes: document.getElementById('pl-notes')?.value.trim() || '',
      groupId: Auth.getGroupId()
    };
    if (existingId) { DB.updatePlayer(existingId, data); Toast.success('Jugador actualizado'); }
    else { DB.addPlayer(data); Toast.success('Jugador añadido'); }
    App.closeModal();
    this.loadGrid();
  },

  // ─── ELIMINADO: LÓGICA REDUNDANTE DE IMPORTACIÓN ───
  // La importación ahora se maneja centralizadamente en ImportPage (js/pages/import.js)

  /* ── FUSIÓN DE JUGADORES ────────────────────────────────── */
  openMerge() {
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId).sort((a, b) => a.name.localeCompare(b.name));
    if (players.length < 2) { Toast.warning('Necesitas al menos 2 jugadores para fusionar.'); return; }

    const opts = players.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');

    App.openModal({
      title: '🔀 Fusionar Jugadores',
      body: `
        <p class="text-muted text-sm" style="margin-bottom:16px">
          Selecciona dos jugadores que sean la misma persona. Todas sus partidas se unificarán bajo el nombre que elijas conservar. El otro perfil quedará eliminado.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">Jugador A</label>
            <select id="merge-p1" class="form-select" onchange="PlayersPage._renderMergePreview()">
              <option value="">— Seleccionar —</option>${opts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Jugador B</label>
            <select id="merge-p2" class="form-select" onchange="PlayersPage._renderMergePreview()">
              <option value="">— Seleccionar —</option>${opts}
            </select>
          </div>
        </div>
        <div id="merge-preview"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="PlayersPage._confirmMerge()">🔀 Fusionar</button>
      `
    }, 'modal-lg');
  },

  _renderMergePreview() {
    const id1 = document.getElementById('merge-p1')?.value;
    const id2 = document.getElementById('merge-p2')?.value;
    const preview = document.getElementById('merge-preview');
    if (!preview) return;
    if (!id1 || !id2 || id1 === id2) {
      preview.innerHTML = id1 && id2 && id1 === id2
        ? `<div class="text-danger text-sm" style="text-align:center">⚠️ Debes seleccionar dos jugadores distintos.</div>`
        : '';
      return;
    }
    const groupId = Auth.getGroupId();
    const st1 = DB.getPlayerStats(id1, groupId);
    const st2 = DB.getPlayerStats(id2, groupId);
    const p1 = DB.getPlayerById(id1);
    const p2 = DB.getPlayerById(id2);

    const card = (p, st, key) => `
      <div style="background:var(--bg-elevated);border-radius:10px;padding:14px;text-align:center;cursor:pointer;border:2px solid transparent;transition:border .2s"
           id="merge-pick-${key}" onclick="PlayersPage._selectMergeKeep('${p.id}','${key}')">
        <div class="avatar avatar-lg" style="background:${Utils.avatarColor(p.name)};margin:0 auto 8px">${Utils.initials(p.name)}</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">${Utils.escHtml(p.name)}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
          <div style="background:var(--bg-card);border-radius:6px;padding:6px">
            <div style="font-weight:800;color:var(--accent-success);font-size:1rem">${st.wins}</div><div class="text-xs text-muted">V</div>
          </div>
          <div style="background:var(--bg-card);border-radius:6px;padding:6px">
            <div style="font-weight:800;color:var(--accent-danger);font-size:1rem">${st.losses}</div><div class="text-xs text-muted">D</div>
          </div>
          <div style="background:var(--bg-card);border-radius:6px;padding:6px">
            <div style="font-weight:800;color:var(--accent-primary);font-size:1rem">${st.played}</div><div class="text-xs text-muted">PJ</div>
          </div>
        </div>
        <div style="font-size:0.85rem;color:var(--accent-primary);font-weight:600">Efectividad: ${st.eff}%</div>
        <div style="margin-top:10px">
          <span id="merge-pick-label-${key}" class="badge" style="font-size:0.75rem">Click para conservar este nombre</span>
        </div>
      </div>`;

    preview.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin-bottom:14px">
        ${card(p1, st1, 'A')}
        <div style="text-align:center;font-size:1.4rem;color:var(--text-muted)">🔀</div>
        ${card(p2, st2, 'B')}
      </div>
      <div id="merge-keep-info" style="text-align:center;font-size:0.85rem;color:var(--text-muted)">👆 Haz click en el jugador cuyo <b>nombre</b> quieres conservar</div>
    `;
    // Guardar estado
    preview.dataset.id1 = id1;
    preview.dataset.id2 = id2;
    preview.dataset.keepId = '';
  },

  _selectMergeKeep(keepId, key) {
    const preview = document.getElementById('merge-preview');
    if (!preview) return;
    preview.dataset.keepId = keepId;
    // Resaltar el seleccionado
    ['A','B'].forEach(k => {
      const card = document.getElementById(`merge-pick-${k}`);
      const label = document.getElementById(`merge-pick-label-${k}`);
      if (!card || !label) return;
      if (k === key) {
        card.style.borderColor = 'var(--accent-primary)';
        label.textContent = '✅ Este nombre se conservará';
        label.style.background = 'var(--accent-primary)';
        label.style.color = '#fff';
      } else {
        card.style.borderColor = 'transparent';
        label.textContent = 'Será eliminado';
        label.style.background = 'var(--accent-danger)';
        label.style.color = '#fff';
      }
    });
    const keepName = DB.getPlayerById(keepId)?.name || '';
    const info = document.getElementById('merge-keep-info');
    if (info) info.innerHTML = `✅ Se conservará el nombre: <b>${Utils.escHtml(keepName)}</b>. Las partidas de ambos perfiles quedarán unificadas.`;
  },

  _confirmMerge() {
    const preview = document.getElementById('merge-preview');
    if (!preview) return;
    const id1 = preview.dataset.id1;
    const id2 = preview.dataset.id2;
    const keepId = preview.dataset.keepId;

    if (!id1 || !id2 || id1 === id2) { Toast.error('Selecciona dos jugadores distintos.'); return; }
    if (!keepId) { Toast.warning('Debes elegir qué nombre conservar (haz click en uno de los jugadores).'); return; }

    const removeId = keepId === id1 ? id2 : id1;
    const keepPlayer = DB.getPlayerById(keepId);
    const removePlayer = DB.getPlayerById(removeId);

    App.confirmDialog(
      '⚠️ Confirmar Fusión',
      `Se van a unificar:<br><br>
       <b>${Utils.escHtml(keepPlayer?.name)}</b> + <b>${Utils.escHtml(removePlayer?.name)}</b><br><br>
       Todas las partidas de <b>${Utils.escHtml(removePlayer?.name)}</b> pasarán a contabilizarse bajo <b>${Utils.escHtml(keepPlayer?.name)}</b>.
       El perfil de <b>${Utils.escHtml(removePlayer?.name)}</b> será <span style="color:var(--accent-danger)">eliminado permanentemente</span>.<br><br>
       ¿Confirmas?`,
      () => {
        this._executeMerge(keepId, removeId);
      }
    );
  },

  _executeMerge(keepId, removeId) {
    const groupId = Auth.getGroupId();
    const matches = DB.getMatches(groupId);
    let updatedCount = 0;

    matches.forEach(m => {
      let changed = false;
      const upd = {};

      // Reemplazar en team1
      if (m.team1.player1 === removeId || m.team1.player2 === removeId) {
        upd.team1 = { ...m.team1 };
        if (upd.team1.player1 === removeId) upd.team1.player1 = keepId;
        if (upd.team1.player2 === removeId) upd.team1.player2 = keepId;
        changed = true;
      }
      // Reemplazar en team2
      if (m.team2.player1 === removeId || m.team2.player2 === removeId) {
        upd.team2 = { ...m.team2 };
        if (upd.team2.player1 === removeId) upd.team2.player1 = keepId;
        if (upd.team2.player2 === removeId) upd.team2.player2 = keepId;
        changed = true;
      }

      if (changed) {
        DB.updateMatch(m.id, upd);
        updatedCount++;
      }
    });

    // Eliminar el jugador duplicado
    DB.deletePlayer(removeId);
    DB._invalidateStatsCache(groupId);

    // Forzar sincronización inmediata a la nube para que Firestore
    // actualice el array de jugadores antes de que el listener lo restaure
    App.closeModal();
    Toast.info('🔄 Fusionando y sincronizando con la nube...');

    const doSync = async () => {
      if (typeof CloudDB !== 'undefined' && CloudDB.syncToCloud) {
        await CloudDB.syncToCloud();
      }
      DB._invalidateStatsCache(groupId);
      Toast.success(`✅ Fusión completada. ${updatedCount} partidas actualizadas.`);
      this.loadGrid();
      // Si el usuario está viendo la tabla de posiciones, refrescarla también
      if (typeof App !== 'undefined' && App.currentPage === 'rankings') {
        App.navigate('rankings');
      }
    };
    doSync();
  },


  confirmDelete(id) {
    const p = DB.getPlayerById(id);
    App.confirmDialog(`¿Eliminar a ${p?.name}?`, 'Sus estadísticas se conservarán en las partidas existentes.', () => {
      DB.deletePlayer(id);
      Toast.success('Jugador eliminado');
      this.loadGrid();
    });
  },

  openProfile(id) {
    const p = DB.getPlayerById(id);
    const groupId = Auth.getGroupId();
    const st = DB.getPlayerStats(id, groupId);
    const weekdayStats = DB.getWeekdayStats(id, groupId);
    const bestDay = weekdayStats.reduce((best, d) => d.wins > (best.wins||0) ? d : best, {});
    const playerMatches = DB.getMatchesForPlayer(id, groupId).slice(0, 5);
    const aliasDisplay = this._aliasDisplay(p);

    const partners = {};
    DB.getMatches(groupId).forEach(m => {
      const inT1 = m.team1.player1 === id || m.team1.player2 === id;
      const inT2 = m.team2.player1 === id || m.team2.player2 === id;
      if (!inT1 && !inT2) return;
      const partnerId = inT1
        ? (m.team1.player1 === id ? m.team1.player2 : m.team1.player1)
        : (m.team2.player1 === id ? m.team2.player2 : m.team2.player1);
      const myTeam = inT1 ? 'team1' : 'team2';
      if (!partners[partnerId]) partners[partnerId] = { wins: 0, played: 0 };
      partners[partnerId].played++;
      if (m.winner === myTeam) partners[partnerId].wins++;
    });
    const bestPartnerEntry = Object.entries(partners).sort((a, b) => (b[1].wins/Math.max(b[1].played,1)) - (a[1].wins/Math.max(a[1].played,1)))[0];
    const bestPartner = bestPartnerEntry ? DB.getPlayerById(bestPartnerEntry[0]) : null;

    App.openModal({
      title: `📊 Perfil — ${Utils.escHtml(p.name)}`,
      body: `
        <div class="profile-header">
          <div class="avatar avatar-xl" style="background:${Utils.avatarColor(p.name)}">${Utils.initials(p.name)}</div>
          <div>
            <div style="font-size:1.4rem;font-weight:800">${Utils.escHtml(p.name)}</div>
            ${aliasDisplay !== '—' ? `<div class="text-muted">🏷️ ${Utils.escHtml(aliasDisplay)}</div>` : ''}
            <div class="text-xs text-muted">Miembro desde ${Utils.fmtDate(p.createdAt, 'long')}</div>
            ${st.currentStreak > 1 ? `<span class="streak-badge ${st.currentStreakType==='win'?'streak-win':'streak-loss'}" style="margin-top:8px;display:inline-flex">
              ${st.currentStreakType==='win'?'🔥 Racha ganadora':'❄️ Racha perdedora'} de ${st.currentStreak}
            </span>` : ''}
          </div>
        </div>

        <div class="profile-stats-grid">
          <div class="profile-stat-card"><div class="profile-stat-val" style="color:var(--text-primary)">${st.played}</div><div class="profile-stat-lbl">Partidas</div></div>
          <div class="profile-stat-card"><div class="profile-stat-val" style="color:var(--accent-success)">${st.wins}</div><div class="profile-stat-lbl">Victorias</div></div>
          <div class="profile-stat-card"><div class="profile-stat-val" style="color:var(--accent-danger)">${st.losses}</div><div class="profile-stat-lbl">Derrotas</div></div>
          <div class="profile-stat-card"><div class="profile-stat-val" style="color:var(--accent-primary)">${st.eff}%</div><div class="profile-stat-lbl">Efectividad</div></div>
          <div class="profile-stat-card"><div class="profile-stat-val" style="color:var(--accent-warning)">${st.shoesGiven}</div><div class="profile-stat-lbl">👟 Dados</div></div>
          <div class="profile-stat-card"><div class="profile-stat-val" style="color:var(--accent-secondary)">${Utils.fmtDiff(st.pointDiff)}</div><div class="profile-stat-lbl">Dif. Puntos</div></div>
        </div>

        <div class="card" style="margin-bottom:12px">
          <div class="stat-row"><span class="stat-label">🏆 Mejor racha ganadora</span><span class="stat-value text-success">${st.maxWinStreak}</span></div>
          <div class="stat-row"><span class="stat-label">❄️ Peor racha perdedora</span><span class="stat-value text-danger">${st.maxLossStreak}</span></div>
          <div class="stat-row"><span class="stat-label">📅 Mejor día</span><span class="stat-value">${bestDay.day || '—'} (${bestDay.wins||0}V)</span></div>
          ${bestPartner ? `<div class="stat-row"><span class="stat-label">🤝 Mejor compañero</span><span class="stat-value">${Utils.escHtml(bestPartner.name)}</span></div>` : ''}
        </div>

        <div style="display:flex;justify-content:center;margin-bottom:12px"><div id="player-radar"></div></div>

        <div class="section-title">Últimas partidas</div>
        ${playerMatches.map(m => {
          const inT1 = m.team1.player1 === id || m.team1.player2 === id;
          const won = (inT1 && m.winner === 'team1') || (!inT1 && m.winner === 'team2');
          const myScore = inT1 ? m.score.team1 : m.score.team2;
          const oppScore = inT1 ? m.score.team2 : m.score.team1;
          const opp1 = inT1 ? m.team2.player1 : m.team1.player1;
          const opp2 = inT1 ? m.team2.player2 : m.team1.player2;
          return `<div class="match-mini">
            <div class="match-teams">
              <div class="match-team">vs ${Utils.escHtml(Utils.playerName(opp1))} &amp; ${Utils.escHtml(Utils.playerName(opp2))}</div>
              <div class="match-vs">${Utils.fmtDate(m.date)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:800;color:${won?'var(--accent-success)':'var(--accent-danger)'}">${won?'VICTORIA':'DERROTA'}</div>
              <div class="mono text-sm">${myScore} : ${oppScore}</div>
            </div>
          </div>`;
        }).join('') || '<div class="text-muted text-sm text-center">Sin partidas registradas</div>'}
      `,
      footer: `<button class="btn btn-ghost" onclick="App.closeModal()">Cerrar</button>`
    }, 'modal-lg');

    setTimeout(() => {
      Charts.renderRadar('player-radar', ['Efectividad', 'Victorias', 'Puntos', 'Zapatos', 'Racha'], [
        st.eff,
        Math.min((st.wins / Math.max(st.played, 1)) * 100, 100),
        Math.min((st.pointsFor / Math.max(st.played, 1)) / 5, 100),
        Math.min(st.shoesGiven * 10, 100),
        Math.min(st.maxWinStreak * 15, 100)
      ], { size: 200, max: 100 });
    }, 100);
  },

  exportPlayers() {
    const players = DB.getAllPlayerStats(Auth.getGroupId());
    const data = players.map(ps => ({
      Nombre: ps.name,
      Aliases: this._getAliasArray(ps).join(', '),
      Partidas: ps.stats.played, Victorias: ps.stats.wins, Derrotas: ps.stats.losses,
      Efectividad: ps.stats.eff + '%',
      'Puntos a favor': ps.stats.pointsFor,
      'Puntos en contra': ps.stats.pointsAgainst,
      'Dif. Puntos': ps.stats.pointDiff,
      'Zapatos dados': ps.stats.shoesGiven,
      'Zapatos recibidos': ps.stats.shoesReceived,
      'Racha max victorias': ps.stats.maxWinStreak,
      'Fecha registro': Utils.fmtDate(ps.createdAt)
    }));
    Utils.exportCSV(data, 'jugadores.csv');
    Toast.success('Exportado a CSV');
  }
};
