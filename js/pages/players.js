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
