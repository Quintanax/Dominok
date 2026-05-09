/* =========================================
   TOURNAMENTS PAGE — Multi-Modality System
   Modalidades: Parejas Rotativas | Parejas Fijas | Equipos
   ========================================= */
const TournamentsPage = {
  state: {
    view: 'list',          // 'list' | 'detail' | 'wizard'
    activeTournament: null,
    activeTab: 'overview', // 'overview' | 'groups' | 'rounds' | 'playoffs' | 'matches' | 'participants'
  },

  render() {
    if (this.state.view === 'list') return this._renderList();
    if (this.state.view === 'detail') return this._renderDetail();
    return '';
  },

  afterRender() {
    if (this.state.view === 'list') this._loadList();
    else if (this.state.view === 'detail') this._loadDetail();
  },

  // =========================================
  // NAVIGATION
  // =========================================
  showList() {
    this.state.view = 'list';
    this.state.activeTournament = null;
    App.navigate('tournaments');
  },

  showDetail(id) {
    this.state.view = 'detail';
    this.state.activeTournament = id;
    this.state.activeTab = 'overview';
    App.navigate('tournaments');
  },

  setTab(tab) {
    this.state.activeTab = tab;
    this._loadDetail();
  },

  // =========================================
  // LIST VIEW
  // =========================================
  _renderList() {
    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">🏆 Torneos</div>
          <div class="page-header-sub">Manage tournaments in three modalities</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="TournamentsPage.openNewTournament()">+ Nuevo Torneo</button>
        </div>
      </div>
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Modalidad</th>
                <th>Estado</th>
                <th>Fase</th>
                <th>Fechas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tournaments-list-tbody">
              <tr><td colspan="6"><div class="empty-state"><div class="spinner"></div></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  },

  _loadList() {
    const groupId = Auth.getGroupId();
    const tournaments = DB.getTournaments(groupId);
    const tbody = document.getElementById('tournaments-list-tbody');
    if (!tbody) return;

    const modalityLabel = { rotating: '🔄 Parejas Rotativas', fixed: '🤝 Parejas Fijas', teams: '🛡️ Equipos', league: '📋 Liga', knockout: '⚡ Eliminación', mixed: '🔀 Mixto' };
    const phaseLabel = { setup: '⚙️ Configuración', groups: '📊 Fase de Grupos', rounds: '🔄 Jornadas', playoffs: '🏆 Playoffs', finished: '✅ Finalizado' };
    const statusBadge = { active: 'badge-success', setup: 'badge-warning', finished: 'badge-muted' };

    tbody.innerHTML = tournaments.map(t => `
      <tr style="cursor:pointer" onclick="TournamentsPage.showDetail('${t.id}')">
        <td>
          <div style="font-weight:700;color:var(--text-primary)">${Utils.escHtml(t.name)}</div>
          ${t.description ? `<div class="text-xs text-muted">${Utils.escHtml(t.description)}</div>` : ''}
        </td>
        <td>${modalityLabel[t.modality || t.type] || '—'}</td>
        <td><span class="badge ${statusBadge[t.status] || 'badge-muted'}">${t.status === 'active' ? 'Activo' : t.status === 'setup' ? 'Configurando' : 'Finalizado'}</span></td>
        <td><span class="text-xs text-muted">${phaseLabel[t.phase || 'setup'] || '—'}</span></td>
        <td class="text-xs">${Utils.fmtDate(t.startDate)} — ${t.endDate ? Utils.fmtDate(t.endDate) : 'Presente'}</td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="row-action-btn" onclick="TournamentsPage.showDetail('${t.id}')" title="Abrir">➡️</button>
            <button class="row-action-btn" onclick="TournamentsPage.cloneTournament('${t.id}')" title="Clonar">📋</button>
            <button class="row-action-btn danger" onclick="TournamentsPage.deleteTournament('${t.id}')" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">No hay torneos. Crea uno para empezar.</div></div></td></tr>`;
  },

  // =========================================
  // DETAIL VIEW
  // =========================================
  _renderDetail() {
    const t = DB.getTournamentById(this.state.activeTournament);
    if (!t) { setTimeout(() => this.showList(), 0); return ''; }

    const tabs = this._getTabsForModality(t.modality || t.type);
    const tabsHtml = tabs.map(tab => `
      <div class="filter-pill ${this.state.activeTab === tab.id ? 'active' : ''}" onclick="TournamentsPage.setTab('${tab.id}')">${tab.label}</div>
    `).join('');

    const modalityBadge = { rotating: '🔄 Parejas Rotativas', fixed: '🤝 Parejas Fijas', teams: '🛡️ Equipos', league: '📋 Liga', knockout: '⚡ Eliminación' };
    const phaseBadge = { setup: '⚙️ Configuración', groups: '📊 Grupos', rounds: '🔄 Jornadas', playoffs: '🏆 Playoffs', finished: '✅ Finalizado' };

    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.showList()" style="margin-bottom:8px">← Torneos</button>
          <div class="page-header-title">🏆 ${Utils.escHtml(t.name)}</div>
          <div class="page-header-sub" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge ${t.status === 'active' ? 'badge-success' : 'badge-muted'}">${t.status === 'active' ? 'Activo' : 'Finalizado'}</span>
            <span class="badge badge-info">${modalityBadge[t.modality || t.type] || 'Torneo'}</span>
            <span class="text-xs text-muted">${phaseBadge[t.phase || 'setup'] || ''}</span>
          </div>
        </div>
        <div class="page-header-actions" id="tournament-detail-actions"></div>
      </div>
      <div class="filters-bar" style="margin-bottom:24px;overflow-x:auto;white-space:nowrap">
        ${tabsHtml}
      </div>
      <div id="tournament-tab-content"></div>
    </div>`;
  },

  _getTabsForModality(modality) {
    const common = [
      { id: 'overview', label: '📊 Resumen' },
      { id: 'participants', label: '👥 Participantes' },
      { id: 'matches', label: '🎮 Partidas' },
      { id: 'playoffs', label: '🏆 Playoffs' },
    ];
    if (modality === 'rotating') {
      return [common[0], common[1], { id: 'rounds', label: '🔄 Jornadas' }, { id: 'groups', label: '📋 Grupos' }, common[2], common[3]];
    } else if (modality === 'fixed') {
      return [common[0], { id: 'pairs', label: '🤝 Parejas' }, { id: 'groups', label: '📋 Grupos' }, common[2], common[3]];
    } else if (modality === 'teams') {
      return [common[0], { id: 'teams', label: '🛡️ Equipos' }, { id: 'groups', label: '📋 Grupos' }, common[2], { id: 'stats', label: '📈 Estadísticas' }, common[3]];
    }
    // Legacy fallback
    return [common[0], common[1], common[2], common[3]];
  },

  _loadDetail() {
    const tId = this.state.activeTournament;
    const t = DB.getTournamentById(tId);
    if (!t) return;

    const content = document.getElementById('tournament-tab-content');
    const actions = document.getElementById('tournament-detail-actions');
    if (!content || !actions) return;

    // Update pill visuals
    document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.filter-pill').forEach(el => {
      if (el.getAttribute('onclick')?.includes(`'${this.state.activeTab}'`)) el.classList.add('active');
    });

    const tab = this.state.activeTab;
    if (tab === 'overview') {
      actions.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.openEditTournament('${tId}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.exportResults('${tId}')">⬇ Exportar</button>
        ${t.phase !== 'finished' ? `<button class="btn btn-warning btn-sm" onclick="TournamentsPage.advancePhase('${tId}')">▶ Avanzar Fase</button>` : ''}
      `;
      content.innerHTML = this._renderOverview(t);
    } else if (tab === 'participants') {
      actions.innerHTML = `<button class="btn btn-primary" onclick="TournamentsPage.openManageParticipants('${tId}')">⚙️ Gestionar</button>`;
      content.innerHTML = this._renderParticipants(tId);
    } else if (tab === 'pairs') {
      actions.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.openImportPairs('${tId}')">📥 Importar Excel</button>
        <button class="btn btn-primary" onclick="TournamentsPage.openNewPair('${tId}')">+ Nueva Pareja</button>
      `;
      content.innerHTML = this._renderPairs(tId);
    } else if (tab === 'teams') {
      actions.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.openImportTeams('${tId}')">📥 Importar Excel</button>
        <button class="btn btn-primary" onclick="TournamentsPage.openNewTeam('${tId}')">+ Nuevo Equipo</button>
      `;
      content.innerHTML = this._renderTeams(tId);
    } else if (tab === 'rounds') {
      actions.innerHTML = `<button class="btn btn-primary" onclick="TournamentsPage.generateNextRound('${tId}')">🔄 Generar Jornada</button>`;
      content.innerHTML = this._renderRounds(tId);
    } else if (tab === 'groups') {
      actions.innerHTML = `<button class="btn btn-primary" onclick="TournamentsPage.openSetupGroups('${tId}')">⚙️ Configurar Grupos</button>`;
      content.innerHTML = this._renderGroups(tId);
    } else if (tab === 'stats') {
      actions.innerHTML = '';
      content.innerHTML = this._renderTeamStats(tId);
    } else if (tab === 'matches') {
      actions.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.openImportMatchesExcel('${tId}')">📥 Importar Excel</button>
        <button class="btn btn-primary" onclick="TournamentsPage.openNewMatch('${tId}')">+ Nueva Partida</button>`;
      content.innerHTML = this._renderMatches(tId);
    } else if (tab === 'playoffs') {
      actions.innerHTML = t.config?.playoffSetup
        ? `<button class="btn btn-ghost btn-sm" onclick="TournamentsPage.openSetupPlayoffs('${tId}')">⚙️ Reconfigurar</button>`
        : `<button class="btn btn-primary" onclick="TournamentsPage.openSetupPlayoffs('${tId}')">⚙️ Configurar Playoffs</button>`;
      content.innerHTML = this._renderPlayoffs(tId);
    }
  },

  // =========================================
  // OVERVIEW TAB
  // =========================================
  _renderOverview(t) {
    const tId = t.id;
    const players = DB.getTournamentPlayers(tId);
    const matches = DB.getTournamentMatches(tId);
    const teams = DB.getTournamentTeams(tId);
    const rounds = DB.getTournamentRounds(tId);
    const groups = DB.getTournamentGroups(tId);

    const modality = t.modality || t.type;
    const modalityLabel = { rotating: '🔄 Parejas Rotativas', fixed: '🤝 Parejas Fijas', teams: '🛡️ Equipos', league: 'Liga', knockout: 'Eliminación', mixed: 'Mixto' };
    const phaseLabel = { setup: '⚙️ Configuración inicial', groups: '📊 Fase de Grupos', rounds: '🔄 Fase de Jornadas', playoffs: '🏆 Playoffs', finished: '✅ Finalizado' };

    const mvp = modality !== 'teams' ? DB.getTournamentMVP(tId) : null;

    return `
    <div class="dashboard-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">
      <div class="kpi-card purple">
        <div class="kpi-label">Modalidad</div>
        <div class="kpi-value" style="font-size:1rem">${modalityLabel[modality] || '—'}</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Fase Actual</div>
        <div class="kpi-value" style="font-size:1rem">${phaseLabel[t.phase || 'setup'] || '—'}</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Participantes</div>
        <div class="kpi-value">${modality === 'teams' ? teams.length : players.length}</div>
      </div>
      <div class="kpi-card orange">
        <div class="kpi-label">Partidas</div>
        <div class="kpi-value">${matches.length}</div>
      </div>
      ${modality === 'rotating' ? `<div class="kpi-card blue"><div class="kpi-label">Jornadas</div><div class="kpi-value">${rounds.length}</div></div>` : ''}
      ${groups.length > 0 ? `<div class="kpi-card purple"><div class="kpi-label">Grupos</div><div class="kpi-value">${groups.length}</div></div>` : ''}
    </div>

    ${mvp ? `
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,var(--accent-primary) 0%,var(--accent-secondary) 100%);border:none">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="font-size:2.5rem">${Utils.avatarEl(mvp.name, 'xl')}</div>
        <div>
          <div style="font-size:0.8rem;opacity:0.8;text-transform:uppercase;letter-spacing:1px">🏆 MVP del Torneo</div>
          <div style="font-size:1.5rem;font-weight:800;color:#fff">${Utils.escHtml(mvp.name)}</div>
          <div style="font-size:0.85rem;opacity:0.85;color:#fff">${mvp.stats.wins}V · ${mvp.stats.eff}% EFF · ${Utils.fmtDiff(mvp.stats.pointDiff)} pts diff</div>
        </div>
      </div>
    </div>` : ''}

    ${t.description ? `<div class="card"><p style="margin:0;color:var(--text-secondary)">${Utils.escHtml(t.description)}</p></div>` : ''}

    ${t.config ? `
    <div class="card" style="margin-top:16px">
      <div class="card-title" style="margin-bottom:12px">⚙️ Configuración</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.9rem">
        ${t.config.numGroups ? `<div><span class="text-muted">Grupos:</span> <b>${t.config.numGroups}</b></div>` : ''}
        ${t.config.numRounds ? `<div><span class="text-muted">Jornadas:</span> <b>${t.config.numRounds}</b></div>` : ''}
        ${t.config.numVueltas ? `<div><span class="text-muted">Vueltas:</span> <b>${t.config.numVueltas} ${t.config.numVueltas === 1 ? '(solo ida)' : t.config.numVueltas === 2 ? '(ida y vuelta)' : ''}</b></div>` : ''}
        ${t.config.qualifiersPerGroup ? `<div><span class="text-muted">Clasificados/grupo:</span> <b>${t.config.qualifiersPerGroup}</b></div>` : ''}
        ${t.config.playoffFormat ? `<div><span class="text-muted">Playoff:</span> <b>${t.config.playoffFormat === 'single' ? 'Eliminación directa' : 'Doble eliminación'}</b></div>` : ''}
        ${t.config.matchesPerPair ? `<div><span class="text-muted">Partidas/pareja:</span> <b>${t.config.matchesPerPair}</b></div>` : ''}
      </div>
    </div>` : ''}

    ${modality === 'rotating' && players.length > 0 ? this._renderRankingTable(tId) : ''}
    ${modality === 'fixed' || modality === 'teams' ? this._renderTeamRankingTable(tId) : ''}
    `;
  },

  _renderRankingTable(tId) {
    const stats = DB.getAllTournamentPlayerStats(tId);
    if (!stats.length) return '<div class="empty-state"><div class="empty-text">Sin estadísticas aún.</div></div>';
    return `
    <div class="card" style="padding:0;margin-top:16px">
      <div style="padding:16px 16px 0"><div class="card-title">📊 Ranking Individual</div></div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Pos</th><th>Jugador</th>
            <th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">D</th>
            <th class="col-num">EFF%</th><th class="col-num">Dif</th><th class="col-num">Racha</th>
          </tr></thead>
          <tbody>
            ${stats.map((ps, i) => {
              const si = ps.stats;
              const streakIcon = si.currentStreakType === 'win' ? '🔥' : si.currentStreakType === 'loss' ? '🧊' : '';
              return `<tr>
                <td><div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i+1}</div></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    ${Utils.avatarEl(ps.name)}
                    <div>
                      <div style="font-weight:600">${Utils.escHtml(ps.name)}</div>
                      ${ps.alias ? `<div class="text-xs text-muted">${Utils.escHtml(ps.alias)}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td class="col-num">${si.played}</td>
                <td class="col-num text-success" style="font-weight:700">${si.wins}</td>
                <td class="col-num text-danger">${si.losses}</td>
                <td class="col-num" style="font-weight:800;color:var(--accent-primary)">${si.eff}%</td>
                <td class="col-num ${si.pointDiff > 0 ? 'text-success' : si.pointDiff < 0 ? 'text-danger' : ''}">${Utils.fmtDiff(si.pointDiff)}</td>
                <td class="col-num">${si.currentStreak > 0 ? `${streakIcon} ${si.currentStreak}` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  _renderTeamRankingTable(tId) {
    const stats = DB.getAllTournamentTeamStats(tId);
    if (!stats.length) return '';
    return `
    <div class="card" style="padding:0;margin-top:16px">
      <div style="padding:16px 16px 0"><div class="card-title">📊 Ranking de Equipos/Parejas</div></div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Pos</th><th>Equipo</th>
            <th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">D</th>
            <th class="col-num">PTS</th><th class="col-num">Dif</th><th class="col-num">EFF%</th>
          </tr></thead>
          <tbody>
            ${stats.map((t, i) => {
              const si = t.stats;
              const pts = si.wins * 3;
              return `<tr>
                <td><div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i+1}</div></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    ${t.color ? `<div style="width:14px;height:14px;border-radius:50%;background:${t.color};flex-shrink:0"></div>` : ''}
                    <div style="font-weight:700">${Utils.escHtml(t.name)}</div>
                  </div>
                </td>
                <td class="col-num">${si.played}</td>
                <td class="col-num text-success" style="font-weight:700">${si.wins}</td>
                <td class="col-num text-danger">${si.losses}</td>
                <td class="col-num" style="font-weight:800;color:var(--accent-primary)">${pts}</td>
                <td class="col-num ${si.pointDiff > 0 ? 'text-success' : si.pointDiff < 0 ? 'text-danger' : ''}">${Utils.fmtDiff(si.pointDiff)}</td>
                <td class="col-num">${si.eff}%</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  // =========================================
  // PARTICIPANTS TAB
  // =========================================
  _renderParticipants(tId) {
    const tPlayers = DB.getTournamentPlayers(tId);
    if (!tPlayers.length) return `
    <div class="empty-state">
      <div class="empty-icon">👥</div>
      <div class="empty-text">No hay participantes inscritos.</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="TournamentsPage.openManageParticipants('${tId}')">Agregar Participantes</button>
    </div>`;

    return `
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th></th><th>Nombre</th><th>Alias</th><th>Grupo</th><th>Ingreso</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            ${tPlayers.map(tp => {
              const p = DB.getPlayerById(tp.playerId);
              if (!p) return '';
              const group = tp.groupLabel || '—';
              return `<tr>
                <td>${Utils.avatarEl(p.name)}</td>
                <td style="font-weight:600">${Utils.escHtml(p.name)}</td>
                <td class="text-muted">${Utils.escHtml(p.alias || '—')}</td>
                <td><span class="badge badge-info" style="font-size:0.75rem">${group}</span></td>
                <td class="text-xs text-muted">${Utils.fmtDate(tp.joinedAt)}</td>
                <td>
                  <button class="btn btn-ghost btn-sm text-danger" onclick="TournamentsPage.removeParticipant('${tId}','${tp.playerId}')">Quitar</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  // =========================================
  // PAIRS TAB (Fixed Pairs modality)
  // =========================================
  _renderPairs(tId) {
    const teams = DB.getTournamentTeams(tId).filter(t => t.isPair);
    if (!teams.length) return `
    <div class="empty-state">
      <div class="empty-icon">🤝</div>
      <div class="empty-text">No hay parejas creadas. Crea parejas manualmente o impórtalas desde Excel.</div>
      <div style="display:flex;gap:12px;margin-top:16px;justify-content:center">
        <button class="btn btn-ghost" onclick="TournamentsPage.openImportPairs('${tId}')">📥 Importar Excel</button>
        <button class="btn btn-primary" onclick="TournamentsPage.openNewPair('${tId}')">+ Nueva Pareja</button>
      </div>
    </div>`;

    const stats = DB.getAllTournamentTeamStats(tId);
    return `
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Pareja</th><th>Jugador 1</th><th>Jugador 2</th><th>Grupo</th>
            <th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">Dif</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            ${teams.map(team => {
              const st = stats.find(s => s.id === team.id)?.stats || { played: 0, wins: 0, pointDiff: 0 };
              const p1 = team.playerIds?.[0] ? DB.getPlayerById(team.playerIds[0]) : null;
              const p2 = team.playerIds?.[1] ? DB.getPlayerById(team.playerIds[1]) : null;
              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    ${team.color ? `<div style="width:12px;height:12px;border-radius:50%;background:${team.color}"></div>` : ''}
                    <span style="font-weight:700">${Utils.escHtml(team.name)}</span>
                  </div>
                </td>
                <td>${p1 ? Utils.escHtml(p1.name) : '—'}</td>
                <td>${p2 ? Utils.escHtml(p2.name) : '—'}</td>
                <td><span class="badge badge-info" style="font-size:0.75rem">${team.groupLabel || '—'}</span></td>
                <td class="col-num">${st.played}</td>
                <td class="col-num text-success">${st.wins}</td>
                <td class="col-num ${st.pointDiff > 0 ? 'text-success' : st.pointDiff < 0 ? 'text-danger' : ''}">${Utils.fmtDiff(st.pointDiff)}</td>
                <td>
                  <div class="row-actions">
                    <button class="row-action-btn" onclick="TournamentsPage.openEditPair('${team.id}')" title="Editar">✏️</button>
                    <button class="row-action-btn danger" onclick="TournamentsPage.deletePair('${team.id}')" title="Eliminar">🗑️</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  // =========================================
  // TEAMS TAB (Teams modality)
  // =========================================
  _renderTeams(tId) {
    const tournament = DB.getTournamentById(tId);
    const numTeams = tournament?.config?.numTeams || null;
    const teams = DB.getTournamentTeams(tId).filter(t => !t.isPair);
    const registered = teams.length;

    // Progress bar when numTeams is set
    const progressBar = numTeams ? (() => {
      const pct = Math.min(100, Math.round((registered / numTeams) * 100));
      const complete = registered >= numTeams;
      const color = complete ? '#22c55e' : 'var(--accent-primary)';
      const statusText = complete
        ? `✅ Completo — ${registered} de ${numTeams} equipos`
        : `${registered} de ${numTeams} equipos registrados`;
      return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:0.85rem;color:var(--text-muted)">${statusText}</span>
        <span style="font-size:0.85rem;font-weight:700;color:${color}">${pct}%</span>
      </div>
      <div style="background:var(--bg-elevated);border-radius:999px;height:8px;margin-bottom:20px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:999px;transition:width 0.4s ease"></div>
      </div>`;
    })() : '';

    if (!registered) return `
    <div class="empty-state">
      <div class="empty-icon">🛡️</div>
      <div class="empty-text">No hay equipos creados. Crea equipos o impórtalos desde Excel.</div>
      ${numTeams ? `<div class="text-muted" style="font-size:0.85rem;margin-top:8px">Meta: <b>0 / ${numTeams} equipos</b></div>` : ''}
      <div style="display:flex;gap:12px;margin-top:16px;justify-content:center">
        <button class="btn btn-ghost" onclick="TournamentsPage.openImportTeams('${tId}')">📥 Importar Excel</button>
        <button class="btn btn-primary" onclick="TournamentsPage.openNewTeam('${tId}')">+ Nuevo Equipo</button>
      </div>
    </div>`;

    const allStats = DB.getAllTournamentTeamStats(tId);
    return `
    ${progressBar}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px">
      ${teams.map(team => {
        const st = allStats.find(s => s.id === team.id)?.stats || { played: 0, wins: 0, losses: 0, pointDiff: 0 };
        return `
        <div class="card" style="margin:0;padding:24px;display:flex;flex-direction:column;min-height:300px;position:relative;overflow:hidden;border:1px solid var(--border-color);border-radius:16px;background:linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-panel) 100%)">
          
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${team.color || 'var(--accent-primary)'};opacity:0.8"></div>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:48px;height:48px;border-radius:12px;background:${team.color || 'var(--accent-primary)'}1A;display:flex;align-items:center;justify-content:center;color:${team.color || 'var(--accent-primary)'};font-weight:800;font-size:1.5rem;flex-shrink:0;box-shadow:inset 0 0 0 1px ${team.color || 'var(--accent-primary)'}33">
                ${Utils.escHtml(team.name).charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:800;font-size:1.2rem;color:var(--text-primary);line-height:1.2;margin-bottom:6px;letter-spacing:-0.02em">${Utils.escHtml(team.name)}</div>
                <span style="font-size:0.68rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;background:var(--bg-app);padding:4px 8px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--border-color)">${team.groupLabel || 'Sin Grupo'}</span>
              </div>
            </div>
            
            <div class="row-actions" style="background:var(--bg-app);padding:4px;border-radius:8px;border:1px solid var(--border-color)">
              <button class="row-action-btn" onclick="TournamentsPage.openEditTeam('${team.id}')" title="Editar">✏️</button>
              <button class="row-action-btn danger" onclick="TournamentsPage.deleteTeam('${team.id}')" title="Eliminar">🗑️</button>
            </div>
          </div>

          <div style="flex:1">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.05em">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Plantilla
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${(team.playerIds || []).map(id => {
                const pName = DB.getPlayerById(id)?.name || '?';
                return '<span style="font-size:0.8rem;background:var(--bg-app);color:var(--text-secondary);padding:6px 10px;border-radius:8px;border:1px solid var(--border-color);white-space:nowrap;font-weight:500">' + Utils.escHtml(pName) + '</span>';
              }).join('') || '<span style="font-size:0.85rem;color:var(--text-muted);font-style:italic">Ningún jugador asignado</span>'}
            </div>
          </div>

          <div style="margin-top:24px;background:var(--bg-app);border-radius:12px;padding:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center;border:1px solid var(--border-color)">
            <div style="display:flex;flex-direction:column;gap:6px;position:relative">
              <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em">PJ</span>
              <span style="font-size:1.15rem;font-weight:800;font-family:var(--font-mono);color:var(--text-primary)">${st.played}</span>
              <div style="position:absolute;right:-6px;top:10%;bottom:10%;width:1px;background:var(--border-color)"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;position:relative">
              <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em">V - D</span>
              <span style="font-size:1.15rem;font-weight:800;font-family:var(--font-mono)"><span class="text-success">${st.wins}</span><span style="color:var(--text-muted);font-size:0.9rem;margin:0 2px">-</span><span class="text-danger">${st.losses}</span></span>
              <div style="position:absolute;right:-6px;top:10%;bottom:10%;width:1px;background:var(--border-color)"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;position:relative">
              <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em">PTS</span>
              <span style="font-size:1.15rem;font-weight:800;font-family:var(--font-mono);color:var(--accent-primary)">${st.wins * 3}</span>
              <div style="position:absolute;right:-6px;top:10%;bottom:10%;width:1px;background:var(--border-color)"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em">DIF</span>
              <span style="font-size:1.15rem;font-weight:800;font-family:var(--font-mono)" class="${st.pointDiff > 0 ? 'text-success' : st.pointDiff < 0 ? 'text-danger' : ''}">${Utils.fmtDiff(st.pointDiff)}</span>
            </div>
          </div>

        </div>`;
      }).join('')}
    </div>`;
  },

  // =========================================
  // GROUPS TAB
  // =========================================
  _renderGroups(tId) {
    const groups = DB.getTournamentGroups(tId);
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;

    if (!groups.length) return `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-text">No hay grupos configurados. Configura grupos para organizar la fase de grupos.</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="TournamentsPage.openSetupGroups('${tId}')">⚙️ Configurar Grupos</button>
    </div>`;

    const groupsHtml = groups.map(group => {
      const standings = DB.getGroupStandings(tId, group.id);
      const getMemberName = id => {
        if (modality === 'teams' || modality === 'fixed') {
          return DB.getTournamentTeamById(id)?.name || DB.getPlayerById(id)?.name || '?';
        }
        return DB.getPlayerById(id)?.name || '?';
      };

      return `
      <div class="card" style="margin:0;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div class="card-title" style="margin:0">📋 ${Utils.escHtml(group.name)}</div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Pos</th><th>Nombre</th>
              <th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">E</th><th class="col-num">D</th>
              <th class="col-num">PTS</th><th class="col-num">Dif</th>
            </tr></thead>
            <tbody>
              ${standings.length ? standings.map((row, i) => `<tr>
                <td><div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i+1}</div></td>
                <td style="font-weight:600">${Utils.escHtml(getMemberName(row.memberId))}</td>
                <td class="col-num">${row.played}</td>
                <td class="col-num text-success">${row.wins}</td>
                <td class="col-num">${row.draws}</td>
                <td class="col-num text-danger">${row.losses}</td>
                <td class="col-num" style="font-weight:800;color:var(--accent-primary)">${row.pts}</td>
                <td class="col-num ${row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-danger' : ''}">${Utils.fmtDiff(row.diff)}</td>
              </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-text">Sin partidas aún.</div></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('');
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(450px,1fr));gap:20px">${groupsHtml}</div>`;

  },

  // =========================================
  // ROUNDS TAB (Rotating Pairs modality)
  // =========================================
  _renderRounds(tId) {
    const rounds = DB.getTournamentRounds(tId);
    if (!rounds.length) return `
    <div class="empty-state">
      <div class="empty-icon">🔄</div>
      <div class="empty-text">No hay jornadas generadas. Genera la primera jornada para comenzar el torneo.</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="TournamentsPage.generateNextRound('${tId}')">🔄 Generar Jornada 1</button>
    </div>`;

    return rounds.map(round => {
      const pairs = round.pairs || [];
      return `
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div class="card-title" style="margin:0">🔄 Jornada ${round.roundNumber}</div>
          <div style="display:flex;gap:8px">
            <span class="badge ${round.status === 'completed' ? 'badge-success' : 'badge-warning'}">${round.status === 'completed' ? '✅ Completada' : '⏳ En curso'}</span>
            ${round.status !== 'completed' ? `<button class="btn btn-ghost btn-sm" onclick="TournamentsPage.markRoundComplete('${round.id}')">✅ Marcar completa</button>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">
          ${pairs.map((pair, idx) => {
            const p1 = DB.getPlayerById(pair[0]);
            const p2 = DB.getPlayerById(pair[1]);
            const matchKey = `round_${round.id}_pair_${idx}`;
            const existingMatch = (DB.getTournamentMatches(tId) || []).find(m => m.roundId === round.id && m.pairIndex === idx);
            return `
            <div class="card" style="background:var(--bg-elevated);padding:12px">
              <div style="text-align:center;font-weight:700;margin-bottom:8px;color:var(--text-muted);font-size:0.75rem">PAREJA ${idx+1}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="text-align:center;flex:1">
                  ${Utils.avatarEl(p1?.name || '?')}
                  <div style="font-size:0.85rem;font-weight:600;margin-top:4px">${Utils.escHtml(p1?.name || 'Libre')}</div>
                </div>
                <div style="padding:0 12px;color:var(--text-muted);font-weight:800">+</div>
                <div style="text-align:center;flex:1">
                  ${Utils.avatarEl(p2?.name || '?')}
                  <div style="font-size:0.85rem;font-weight:600;margin-top:4px">${Utils.escHtml(p2?.name || 'Libre')}</div>
                </div>
              </div>
              ${existingMatch ? `<div style="text-align:center;margin-top:8px"><span class="badge badge-success">✅ ${existingMatch.score.team1}:${existingMatch.score.team2}</span></div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');
  },

  // =========================================
  // MATCHES TAB
  // =========================================
  _renderMatches(tId) {
    const matches = DB.getTournamentMatches(tId);
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;

    if (!matches.length) return `
    <div class="empty-state">
      <div class="empty-icon">🎮</div>
      <div class="empty-text">No hay partidas registradas.</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="TournamentsPage.openNewMatch('${tId}')">+ Registrar Partida</button>
    </div>`;

    const groups = DB.getTournamentGroups(tId);
    const getGroupLabel = groupId => groups.find(g => g.id === groupId)?.name || 'Grupo';

    // 1. Agrupar por vuelta/fase
    const byVuelta = {};
    matches.forEach(m => {
      let vKey = 'Fase de Grupos';
      if (m.phase === 'playoffs') vKey = '🏆 Playoffs';
      else if (m.vuelta) vKey = 'Vuelta ' + m.vuelta;
      else if (m.roundId) vKey = '🔄 Jornada ' + (m.roundNumber || '');
      if (!byVuelta[vKey]) byVuelta[vKey] = [];
      byVuelta[vKey].push(m);
    });

    const vueltas = Object.keys(byVuelta).sort((a, b) => {
      if (a === '🏆 Playoffs') return 1;
      if (b === '🏆 Playoffs') return -1;
      return a.localeCompare(b);
    });

    const col1 = modality === 'teams' ? 'Equipo 1' : 'Pareja 1';
    const col2 = modality === 'teams' ? 'Equipo 2' : 'Pareja 2';

    const buildRow = m => {
      let t1Name, t2Name;
      if (m.team1Id) {
        t1Name = DB.getTournamentTeamById(m.team1Id)?.name || '?';
        t2Name = DB.getTournamentTeamById(m.team2Id)?.name || '?';
      } else {
        t1Name = (DB.getPlayerById(m.team1?.player1)?.name || '?') + ' & ' + (DB.getPlayerById(m.team1?.player2)?.name || '?');
        t2Name = (DB.getPlayerById(m.team2?.player1)?.name || '?') + ' & ' + (DB.getPlayerById(m.team2?.player2)?.name || '?');
      }
      const w1 = m.winner === 'team1';
      const w2 = m.winner === 'team2';
      const score1 = m.score?.team1 ?? '—';
      const score2 = m.score?.team2 ?? '—';
      return '<tr>' +
        '<td class="text-xs">' + Utils.fmtDate(m.date) + '</td>' +
        '<td><div style="font-weight:' + (w1?'800':'400') + ';color:' + (w1?'var(--text-success)':'var(--text-primary)') + '">' + Utils.escHtml(t1Name) + '</div></td>' +
        '<td><div style="font-weight:' + (w2?'800':'400') + ';color:' + (w2?'var(--text-success)':'var(--text-primary)') + '">' + Utils.escHtml(t2Name) + '</div></td>' +
        '<td class="col-num"><span style="font-family:var(--font-mono);font-weight:800;font-size:1rem">' +
          '<span class="' + (w1?'text-success':m.winner?'text-danger':'') + '">' + score1 + '</span>' +
          '<span style="opacity:0.4"> : </span>' +
          '<span class="' + (w2?'text-success':m.winner?'text-danger':'') + '">' + score2 + '</span>' +
        '</span></td>' +
        '<td><div class="row-actions">' +
          '<button class="row-action-btn" onclick="TournamentsPage.openEditMatch(\'' + m.id + '\')" title="Editar">✏️</button>' +
          '<button class="row-action-btn danger" onclick="TournamentsPage.deleteMatch(\'' + m.id + '\')" title="Eliminar">🗑️</button>' +
        '</div></td>' +
      '</tr>';
    };

    return vueltas.map((vKey, vi) => {
      const vMatches = byVuelta[vKey];
      const total = vMatches.length;
      const played = vMatches.filter(m => m.winner != null).length;
      const accordionId = 'vuelta-acc-' + vi;

      // 2. Sub-agrupar por grupo ID real
      const byGroup = {};
      vMatches.forEach(m => {
        const gId = m.groupId || (m.phase === 'playoffs' ? 'playoffs' : 'none');
        if (!byGroup[gId]) byGroup[gId] = [];
        byGroup[gId].push(m);
      });
      
      const groupKeys = Object.keys(byGroup).sort();

      const innerContent = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(450px,1fr));gap:24px">' + 
        groupKeys.map(gId => {
          const gMatches = byGroup[gId];
          let gLabel = '—';
          if (gId === 'playoffs') gLabel = '🏆 Playoffs';
          else if (gId !== 'none') {
            const found = groups.find(g => String(g.id) === String(gId));
            gLabel = found ? found.name : 'Grupo (Eliminado)';
          }
          
          const groupBlock = '<div>' +
            '<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);letter-spacing:0.06em;text-transform:uppercase;padding:0 0 6px;margin-bottom:4px;border-bottom:1px solid var(--border-color)">' + gLabel + '</div>' +
            '<div class="table-wrapper"><table class="data-table">' +
            '<thead><tr><th>Fecha</th><th>' + col1 + '</th><th>' + col2 + '</th><th class="col-num">Resultado</th><th>Acciones</th></tr></thead>' +
            '<tbody>' + gMatches.map(buildRow).join('') + '</tbody>' +
            '</table></div></div>';
          return groupBlock;
        }).join('') + 
      '</div>';

      const statusBadge = played === total
        ? '<span class="badge badge-success" style="font-size:0.75rem">✅ ' + played + '/' + total + ' completadas</span>'
        : '<span class="badge badge-warning" style="font-size:0.75rem">⏳ ' + played + '/' + total + ' jugadas</span>';

      return '<div class="card" style="padding:0;margin-bottom:12px">' +
        '<div id="hdr-' + accordionId + '" onclick="(function(){var c=document.getElementById(\'' + accordionId + '\');var open=c.style.display!==\'none\';c.style.display=open?\'none\':\'\';document.querySelector(\'#hdr-' + accordionId + ' .acc-chevron\').textContent=open?\'▶\':\'▼\';})()" ' +
        'style="padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;border-radius:inherit">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span class="acc-chevron" style="font-size:0.7rem;color:var(--text-muted)">▼</span>' +
            '<span style="font-weight:700;font-size:1rem">' + vKey + '</span>' +
          '</div>' +
          statusBadge +
        '</div>' +
        '<div id="' + accordionId + '" style="padding:0 16px 16px">' +
          innerContent +
        '</div>' +
      '</div>';
    }).join('');
  },

  // =========================================
  // PLAYOFFS TAB
  // =========================================
  _renderPlayoffs(tId) {
    const t = DB.getTournamentById(tId);
    const playoffConfig = t?.config?.playoffSetup;
    if (!playoffConfig) return `
    <div class="empty-state">
      <div class="empty-icon">🏆</div>
      <div class="empty-text">No hay playoffs configurados.</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="TournamentsPage.openSetupPlayoffs('${tId}')">⚙️ Configurar Playoffs</button>
    </div>`;

    const playoffMatches = (DB.getTournamentMatches(tId) || []).filter(m => m.phase === 'playoffs');
    const rounds = {};
    playoffMatches.forEach(m => {
      const r = m.playoffRound || 'Final';
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });

    const roundOrder = ['Cuartos de Final', 'Semifinal', 'Tercer Puesto', 'Final'];
    const displayRounds = [...new Set([...roundOrder, ...Object.keys(rounds)])].filter(r => rounds[r]);

    if (!playoffMatches.length) return `
    <div class="card">
      <div style="text-align:center;padding:20px">
        <div style="font-size:2rem;margin-bottom:12px">🏆</div>
        <div style="font-weight:700;margin-bottom:8px">Playoffs Configurados</div>
        <div class="text-muted text-sm" style="margin-bottom:20px">Formato: ${playoffConfig.format === 'single' ? 'Eliminación directa' : 'Doble eliminación'} · ${playoffConfig.participants} participantes</div>
        <button class="btn btn-primary" onclick="TournamentsPage.generatePlayoffBracket('${tId}')">🎲 Generar Llaves</button>
      </div>
    </div>`;

    return `
    <div style="display:flex;flex-direction:column;gap:24px">
      ${displayRounds.map(roundName => `
      <div>
        <div style="font-size:1rem;font-weight:800;color:var(--accent-primary);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">${roundName}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
          ${(rounds[roundName] || []).map(m => {
            let t1Name, t2Name;
            if (m.team1Id) {
              t1Name = DB.getTournamentTeamById(m.team1Id)?.name || 'TBD';
              t2Name = DB.getTournamentTeamById(m.team2Id)?.name || 'TBD';
            } else {
              t1Name = m.team1?.player1 ? `${DB.getPlayerById(m.team1.player1)?.name || '?'} & ${DB.getPlayerById(m.team1.player2)?.name || '?'}` : 'TBD';
              t2Name = m.team2?.player1 ? `${DB.getPlayerById(m.team2.player1)?.name || '?'} & ${DB.getPlayerById(m.team2.player2)?.name || '?'}` : 'TBD';
            }
            const hasResult = m.score && m.winner;
            const w1 = m.winner === 'team1';
            return `
            <div class="card" style="background:var(--bg-elevated);padding:16px;border:2px solid ${hasResult ? 'var(--accent-success)' : 'var(--border-color)'}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <div style="font-weight:${hasResult && w1 ? '800' : '500'};color:${hasResult && w1 ? 'var(--text-success)' : 'var(--text-primary)'}">${Utils.escHtml(t1Name)}</div>
                <div style="font-family:var(--font-mono);font-weight:800;font-size:1.1rem;min-width:40px;text-align:center">${hasResult ? m.score.team1 : '-'}</div>
              </div>
              <div style="height:1px;background:var(--border-color);margin:8px 0"></div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                <div style="font-weight:${hasResult && !w1 ? '800' : '500'};color:${hasResult && !w1 ? 'var(--text-success)' : 'var(--text-primary)'}">${Utils.escHtml(t2Name)}</div>
                <div style="font-family:var(--font-mono);font-weight:800;font-size:1.1rem;min-width:40px;text-align:center">${hasResult ? m.score.team2 : '-'}</div>
              </div>
              ${!hasResult ? `<button class="btn btn-primary btn-sm" style="width:100%;margin-top:12px" onclick="TournamentsPage.openEnterScore('${m.id}')">📝 Ingresar Resultado</button>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`).join('')}
    </div>`;
  },

  // =========================================
  // NEW TOURNAMENT WIZARD
  // =========================================
  openNewTournament() {
    App.openModal({
      title: '🏆 Nuevo Torneo — Seleccionar Modalidad',
      body: `
        <div style="display:grid;gap:12px">
          <p class="text-muted" style="margin:0 0 8px">Selecciona la modalidad de juego para este torneo:</p>

          <div class="card" style="background:var(--bg-elevated);cursor:pointer;border:2px solid var(--border-color);transition:border-color 0.2s" onclick="TournamentsPage.openWizardForModality('rotating')"
            onmouseenter="this.style.borderColor='var(--accent-primary)'" onmouseleave="this.style.borderColor='var(--border-color)'">
            <div style="display:flex;gap:16px;align-items:center">
              <div style="font-size:2rem">🔄</div>
              <div>
                <div style="font-weight:800;font-size:1rem">Parejas Rotativas</div>
                <div class="text-muted text-sm">Participantes individuales forman parejas aleatorias cada jornada. Ideal para torneos de dominó clásico.</div>
              </div>
            </div>
          </div>

          <div class="card" style="background:var(--bg-elevated);cursor:pointer;border:2px solid var(--border-color);transition:border-color 0.2s" onclick="TournamentsPage.openWizardForModality('fixed')"
            onmouseenter="this.style.borderColor='var(--accent-primary)'" onmouseleave="this.style.borderColor='var(--border-color)'">
            <div style="display:flex;gap:16px;align-items:center">
              <div style="font-size:2rem">🤝</div>
              <div>
                <div style="font-weight:800;font-size:1rem">Parejas Fijas</div>
                <div class="text-muted text-sm">Parejas predefinidas que permanecen juntas todo el torneo. Sistema round-robin o eliminación.</div>
              </div>
            </div>
          </div>

          <div class="card" style="background:var(--bg-elevated);cursor:pointer;border:2px solid var(--border-color);transition:border-color 0.2s" onclick="TournamentsPage.openWizardForModality('teams')"
            onmouseenter="this.style.borderColor='var(--accent-primary)'" onmouseleave="this.style.borderColor='var(--border-color)'">
            <div style="display:flex;gap:16px;align-items:center">
              <div style="font-size:2rem">🛡️</div>
              <div>
                <div style="font-weight:800;font-size:1rem">Equipos</div>
                <div class="text-muted text-sm">Múltiples jugadores por equipo. Ideal para ligas, copas y campeonatos por equipos.</div>
              </div>
            </div>
          </div>
        </div>
      `,
      footer: ''
    }, 'modal-md');
  },

  openWizardForModality(modality) {
    const labels = { rotating: 'Parejas Rotativas', fixed: 'Parejas Fijas', teams: 'Equipos' };
    App.openModal({
      title: `🏆 Configurar Torneo — ${labels[modality]}`,
      body: `
        <form id="new-tournament-form" onsubmit="TournamentsPage.saveNewTournament(event,'${modality}')">
          <div class="form-group">
            <label class="form-label">Nombre del Torneo *</label>
            <input type="text" id="nt-name" class="form-input" placeholder="Ej: Copa Carabobo 2026" required />
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea id="nt-desc" class="form-input" rows="2" placeholder="Descripción opcional..."></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Fecha de inicio</label>
              <input type="date" id="nt-start" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha de fin (opcional)</label>
              <input type="date" id="nt-end" class="form-input" />
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:8px">
            <div style="font-weight:700;margin-bottom:12px;color:var(--accent-primary)">⚙️ Configuración de la Modalidad</div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group">
                <label class="form-label">Número de grupos</label>
                <select id="nt-groups" class="form-select">
                  ${Array.from({length: 16}, (_, i) => `<option value="${i+1}">${i+1} Grupo${i > 0 ? 's' : ''}${i === 1 ? ' (A y B)' : i > 1 ? ` (A-${String.fromCharCode(65+i)})` : ''}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Clasificados por grupo</label>
                <input type="number" id="nt-qualifiers" class="form-input" min="1" max="16" value="2" />
              </div>
            </div>

            ${modality === 'rotating' ? `
            <div class="form-group">
              <label class="form-label">Número de Jornadas a jugar</label>
              <input type="number" id="nt-rounds" class="form-input" min="1" max="30" value="5" />
            </div>` : ''}

            ${modality === 'teams' ? `
            <div class="form-group">
              <label class="form-label">Número de equipos</label>
              <input type="number" id="nt-num-teams" class="form-input" min="2" max="128" value="8" />
              <div class="text-xs text-muted" style="margin-top:4px">Cuántos equipos participarán en el torneo</div>
            </div>` : ''}

            ${modality === 'fixed' || modality === 'teams' ? `
            <div class="form-group">
              <label class="form-label">Sistema de juego</label>
              <select id="nt-match-system" class="form-select">
                <option value="round_robin">Todos contra todos (Round-Robin)</option>
                <option value="fixed">Número fijo de partidos</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group">
                <label class="form-label">Número de Vueltas</label>
                <select id="nt-num-vueltas" class="form-select">
                  <option value="1">1 Vuelta (solo ida)</option>
                  <option value="2">2 Vueltas (ida y vuelta)</option>
                  <option value="3">3 Vueltas</option>
                  <option value="4">4 Vueltas</option>
                </select>
                <div class="text-xs text-muted" style="margin-top:4px">Cuántas veces se enfrentan entre sí</div>
              </div>
              <div class="form-group" id="nt-fixed-matches-group" style="display:none">
                <label class="form-label">Partidos por equipo/pareja</label>
                <input type="number" id="nt-matches-per" class="form-input" min="1" max="20" value="3" />
              </div>
            </div>` : ''}

            <div class="form-group">
              <label class="form-label">Formato de Playoffs</label>
              <select id="nt-playoff" class="form-select">
                <option value="single">Eliminación directa</option>
                <option value="double">Doble eliminación</option>
                <option value="none">Sin playoffs (solo grupo)</option>
              </select>
            </div>
          </div>

          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="TournamentsPage.openNewTournament()">← Atrás</button>
            <button type="submit" class="btn btn-primary">Crear Torneo ✓</button>
          </div>
        </form>
        <script>
          document.getElementById('nt-match-system')?.addEventListener('change', function() {
            document.getElementById('nt-fixed-matches-group').style.display = this.value === 'fixed' ? '' : 'none';
          });
        <\/script>
      `,
      footer: ''
    }, 'modal-lg');
  },

  saveNewTournament(e, modality) {
    e.preventDefault();
    const groupId = Auth.getGroupId();
    const name = document.getElementById('nt-name').value.trim();
    const desc = document.getElementById('nt-desc').value.trim();
    const startDate = document.getElementById('nt-start').value;
    const endDate = document.getElementById('nt-end').value || null;
    const numGroups = parseInt(document.getElementById('nt-groups').value) || 1;
    const qualifiersPerGroup = parseInt(document.getElementById('nt-qualifiers').value) || 2;
    const numRounds = document.getElementById('nt-rounds') ? parseInt(document.getElementById('nt-rounds').value) || 5 : null;
    const matchSystem = document.getElementById('nt-match-system')?.value || 'round_robin';
    const matchesPerPair = document.getElementById('nt-matches-per') ? parseInt(document.getElementById('nt-matches-per').value) || 3 : null;
    const numVueltas = parseInt(document.getElementById('nt-num-vueltas')?.value) || 1;
    const numTeams = document.getElementById('nt-num-teams') ? parseInt(document.getElementById('nt-num-teams').value) || null : null;
    const playoffFormat = document.getElementById('nt-playoff').value;

    const config = { numGroups, qualifiersPerGroup, playoffFormat, numVueltas };
    if (numRounds) config.numRounds = numRounds;
    if (matchSystem) config.matchSystem = matchSystem;
    if (matchesPerPair) config.matchesPerPair = matchesPerPair;
    if (numTeams) config.numTeams = numTeams;

    const t = DB.addTournament({
      name, description: desc, groupId, modality, type: modality,
      startDate, endDate, status: 'active', phase: 'setup', config
    });

    App.closeModal();
    Toast.success(`Torneo "${name}" creado. ¡Ahora agrega participantes!`);
    this.showDetail(t.id);
    this.setTab('participants');
  },

  // =========================================
  // EDIT TOURNAMENT
  // =========================================
  openEditTournament(tId) {
    const t = DB.getTournamentById(tId);
    if (!t) return;
    App.openModal({
      title: '✏️ Editar Torneo',
      body: `
        <form onsubmit="TournamentsPage.saveEditTournament(event,'${tId}')">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" id="et-name" class="form-input" value="${Utils.escHtml(t.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea id="et-desc" class="form-input" rows="2">${Utils.escHtml(t.description || '')}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Fecha inicio</label>
              <input type="date" id="et-start" class="form-input" value="${t.startDate || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha fin</label>
              <input type="date" id="et-end" class="form-input" value="${t.endDate || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select id="et-status" class="form-select">
              <option value="active" ${t.status === 'active' ? 'selected' : ''}>Activo</option>
              <option value="setup" ${t.status === 'setup' ? 'selected' : ''}>En configuración</option>
              <option value="finished" ${t.status === 'finished' ? 'selected' : ''}>Finalizado</option>
            </select>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      `,
      footer: ''
    });
  },

  saveEditTournament(e, tId) {
    e.preventDefault();
    DB.updateTournament(tId, {
      name: document.getElementById('et-name').value.trim(),
      description: document.getElementById('et-desc').value.trim(),
      startDate: document.getElementById('et-start').value,
      endDate: document.getElementById('et-end').value || null,
      status: document.getElementById('et-status').value,
    });
    Toast.success('Torneo actualizado');
    App.closeModal();
    this._loadDetail();
  },

  // =========================================
  // PARTICIPANTS MANAGEMENT
  // =========================================
  openManageParticipants(tId) {
    const groupId = Auth.getGroupId();
    const allPlayers = DB.getPlayers(groupId).sort((a, b) => a.name.localeCompare(b.name));
    const tPlayers = DB.getTournamentPlayers(tId);
    const tPlayerIds = new Set(tPlayers.map(tp => tp.playerId));

    App.openModal({
      title: '👥 Gestionar Participantes',
      body: `
        <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.importParticipantsExcel('${tId}')">📥 Importar Excel</button>
          <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.downloadParticipantTemplate()">⬇ Plantilla</button>
        </div>
        <div style="max-height:50vh;overflow-y:auto">
          ${allPlayers.length === 0 ? `<div class="empty-state"><div class="empty-text">No tienes jugadores en tu club. Ve a "Jugadores" primero.</div></div>` : `
          <div style="display:grid;gap:6px">
            ${allPlayers.map(p => `
            <label style="display:flex;align-items:center;gap:12px;padding:8px;border-radius:8px;cursor:pointer;border:1px solid var(--border-color);background:var(--bg-elevated)">
              <input type="checkbox" class="participant-chk" value="${p.id}" ${tPlayerIds.has(p.id) ? 'checked' : ''} style="width:18px;height:18px">
              ${Utils.avatarEl(p.name)}
              <div>
                <div style="font-weight:600">${Utils.escHtml(p.name)}</div>
                ${p.alias ? `<div class="text-xs text-muted">${Utils.escHtml(p.alias)}</div>` : ''}
              </div>
            </label>`).join('')}
          </div>`}
        </div>
        <div class="modal-footer" style="padding:0;margin-top:16px">
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="TournamentsPage.saveParticipants('${tId}')">💾 Guardar</button>
        </div>
      `,
      footer: ''
    }, 'modal-md');
  },

  saveParticipants(tId) {
    const groupId = Auth.getGroupId();
    const checked = Array.from(document.querySelectorAll('.participant-chk:checked')).map(c => c.value);
    const unchecked = Array.from(document.querySelectorAll('.participant-chk:not(:checked)')).map(c => c.value);

    checked.forEach(pid => DB.addTournamentPlayer({ tournamentId: tId, playerId: pid, groupId }));
    unchecked.forEach(pid => DB.removeTournamentPlayer(tId, pid));

    Toast.success('Participantes actualizados');
    App.closeModal();
    this._loadDetail();
  },

  removeParticipant(tId, playerId) {
    App.confirmDialog('¿Quitar participante?', 'Se quitará del torneo. Las partidas ya registradas no se eliminan.', () => {
      DB.removeTournamentPlayer(tId, playerId);
      Toast.success('Participante eliminado');
      this._loadDetail();
    });
  },

  importParticipantsExcel(tId) {
    App.openModal({
      title: '📥 Importar Participantes desde Excel',
      body: `
        <p class="text-muted text-sm">El archivo Excel debe tener una columna <b>nombre</b> (obligatorio), y opcionalmente <b>alias</b>.</p>
        <div class="dropzone" id="participants-excel-drop" onclick="document.getElementById('participants-excel-file').click()"
          ondragover="event.preventDefault();this.classList.add('dragover')"
          ondragleave="this.classList.remove('dragover')"
          ondrop="event.preventDefault();this.classList.remove('dragover');TournamentsPage._handleParticipantsExcel(event.dataTransfer.files[0],'${tId}')">
          <div class="dropzone-icon">📄</div>
          <div class="dropzone-text">Arrastra tu archivo Excel aquí</div>
          <div class="dropzone-hint">o haz click para seleccionar (.xlsx, .xls, .csv)</div>
          <input type="file" id="participants-excel-file" accept=".xlsx,.xls,.csv" class="hidden"
            onchange="TournamentsPage._handleParticipantsExcel(this.files[0],'${tId}')" />
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.downloadParticipantTemplate()">⬇ Descargar plantilla de ejemplo</button>
        </div>
      `,
      footer: ''
    });
  },

  _handleParticipantsExcel(file, tId) {
    if (!file) return;
    const groupId = Auth.getGroupId();
    const reader = new FileReader();
    reader.onload = e => {
      let rows = [];
      try {
        if (file.name.match(/\.xlsx?$/i)) {
          if (typeof XLSX === 'undefined') throw new Error('XLSX no cargado');
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws).map(r => {
            const norm = {};
            for (let k in r) norm[k.toLowerCase().trim()] = r[k];
            return norm;
          });
        } else {
          const text = new TextDecoder('utf-8').decode(e.target.result);
          rows = Utils.parseCSV(text);
        }
      } catch (err) {
        Toast.error('Error al leer el archivo: ' + err.message); return;
      }

      let added = 0, errors = 0;
      rows.forEach(row => {
        const name = (row.nombre || row.name || row['nombre completo'] || '').toString().trim();
        if (!name) { errors++; return; }
        // Check if player exists in group
        let player = DB.getPlayers(groupId).find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!player) {
          player = DB.addPlayer({ name, alias: row.alias || '', groupId, active: true, notes: '' });
        }
        DB.addTournamentPlayer({ tournamentId: tId, playerId: player.id, groupId });
        added++;
      });

      Toast.success(`${added} participantes importados${errors > 0 ? ` (${errors} filas omitidas)` : ''}`);
      App.closeModal();
      this._loadDetail();
    };
    reader.readAsArrayBuffer(file);
  },

  downloadParticipantTemplate() {
    const csv = 'nombre,alias\nJuan Pérez,Juancho\nMaría López,La Reina\nCarlos Ruiz,El Mago';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_participantes.csv'; a.click();
    URL.revokeObjectURL(url);
  },

  // =========================================
  // FIXED PAIRS — CRUD
  // =========================================
  openNewPair(tId) {
    const groupId = Auth.getGroupId();
    const tPlayers = DB.getTournamentPlayers(tId).map(tp => DB.getPlayerById(tp.playerId)).filter(Boolean);
    const opts = tPlayers.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');

    App.openModal({
      title: '🤝 Nueva Pareja Fija',
      body: `
        <form onsubmit="TournamentsPage.savePair(event,'${tId}')">
          <div class="form-group">
            <label class="form-label">Nombre de la Pareja *</label>
            <input type="text" id="pair-name" class="form-input" placeholder="Ej: Los Reyes" required />
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <input type="color" id="pair-color" class="form-input" value="#4361ee" style="height:40px;padding:4px" />
          </div>
          ${tPlayers.length < 2 ? `<div class="text-danger text-sm">Necesitas al menos 2 participantes inscritos en el torneo.</div>` : `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Jugador 1 *</label>
              <select id="pair-p1" class="form-select" required>${opts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Jugador 2 *</label>
              <select id="pair-p2" class="form-select" required>${opts}</select>
            </div>
          </div>`}
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" ${tPlayers.length < 2 ? 'disabled' : ''}>Crear Pareja</button>
          </div>
        </form>
      `,
      footer: ''
    });
  },

  savePair(e, tId) {
    e.preventDefault();
    const name = document.getElementById('pair-name').value.trim();
    const color = document.getElementById('pair-color').value;
    const p1 = document.getElementById('pair-p1').value;
    const p2 = document.getElementById('pair-p2').value;
    if (p1 === p2) { Toast.error('Los jugadores deben ser diferentes'); return; }
    DB.addTournamentTeam({ tournamentId: tId, name, color, playerIds: [p1, p2], isPair: true });
    Toast.success('Pareja creada');
    App.closeModal();
    this._loadDetail();
  },

  deletePair(id) {
    App.confirmDialog('¿Eliminar pareja?', 'Se eliminará del torneo.', () => {
      DB.deleteTournamentTeam(id);
      Toast.success('Pareja eliminada');
      this._loadDetail();
    });
  },

  openImportPairs(tId) {
    App.openModal({
      title: '📥 Importar Parejas desde Excel',
      body: `
        <p class="text-muted text-sm">El archivo debe tener columnas: <b>pareja</b>, <b>jugador1</b>, <b>jugador2</b></p>
        <div class="dropzone" onclick="document.getElementById('pairs-excel-file').click()"
          ondragover="event.preventDefault();this.classList.add('dragover')"
          ondragleave="this.classList.remove('dragover')"
          ondrop="event.preventDefault();this.classList.remove('dragover');TournamentsPage._handlePairsExcel(event.dataTransfer.files[0],'${tId}')">
          <div class="dropzone-icon">📄</div>
          <div class="dropzone-text">Arrastra tu archivo aquí</div>
          <div class="dropzone-hint">.xlsx, .xls, .csv</div>
          <input type="file" id="pairs-excel-file" accept=".xlsx,.xls,.csv" class="hidden"
            onchange="TournamentsPage._handlePairsExcel(this.files[0],'${tId}')" />
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="TournamentsPage.downloadPairsTemplate()">⬇ Descargar plantilla</button>
      `,
      footer: ''
    });
  },

  _handlePairsExcel(file, tId) {
    if (!file) return;
    const groupId = Auth.getGroupId();
    const reader = new FileReader();
    reader.onload = e => {
      let rows = [];
      try {
        if (file.name.match(/\.xlsx?$/i)) {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map(r => {
            const n = {}; for (let k in r) n[k.toLowerCase().trim()] = r[k]; return n;
          });
        } else {
          rows = Utils.parseCSV(new TextDecoder('utf-8').decode(e.target.result));
        }
      } catch { Toast.error('Error al leer el archivo'); return; }

      const allPlayers = DB.getPlayers(groupId);
      const findPlayer = name => allPlayers.find(p => p.name.toLowerCase() === (name || '').toString().toLowerCase().trim());
      let added = 0, errors = 0;

      rows.forEach(row => {
        const pairName = (row.pareja || row.pair || row.nombre || '').toString().trim();
        const name1 = (row.jugador1 || row['jugador 1'] || row.player1 || '').toString().trim();
        const name2 = (row.jugador2 || row['jugador 2'] || row.player2 || '').toString().trim();
        if (!pairName || !name1 || !name2) { errors++; return; }

        let p1 = findPlayer(name1);
        let p2 = findPlayer(name2);
        if (!p1) p1 = DB.addPlayer({ name: name1, alias: '', groupId, active: true, notes: '' });
        if (!p2) p2 = DB.addPlayer({ name: name2, alias: '', groupId, active: true, notes: '' });

        DB.addTournamentPlayer({ tournamentId: tId, playerId: p1.id, groupId });
        DB.addTournamentPlayer({ tournamentId: tId, playerId: p2.id, groupId });
        DB.addTournamentTeam({ tournamentId: tId, name: pairName, playerIds: [p1.id, p2.id], isPair: true });
        added++;
      });

      Toast.success(`${added} parejas importadas${errors > 0 ? ` (${errors} filas omitidas)` : ''}`);
      App.closeModal();
      this._loadDetail();
    };
    reader.readAsArrayBuffer(file);
  },

  downloadPairsTemplate() {
    const csv = 'pareja,jugador1,jugador2\nLos Reyes,Juan Pérez,María López\nLos Tigres,Carlos Ruiz,Ana Torres';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_parejas.csv'; a.click();
    URL.revokeObjectURL(url);
  },

  // =========================================
  // TEAMS — CRUD
  // =========================================
  openNewTeam(tId) {
    const groupId = Auth.getGroupId();
    const allPlayers = DB.getPlayers(groupId).sort((a, b) => a.name.localeCompare(b.name));

    // Build map of playerId -> team name for already-assigned players
    const existingTeams = DB.getTournamentTeams(tId).filter(t => !t.isPair);
    const assignedToTeam = {}; // playerId -> teamName
    existingTeams.forEach(team => {
      (team.playerIds || []).forEach(pid => { assignedToTeam[pid] = team.name; });
    });

    App.openModal({
      title: '🛡️ Nuevo Equipo',
      body: `
        <form onsubmit="TournamentsPage.saveTeam(event,'${tId}')">
          <div class="form-group">
            <label class="form-label">Nombre del Equipo *</label>
            <input type="text" id="team-name" class="form-input" placeholder="Ej: Los Invencibles" required />
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <input type="color" id="team-color" class="form-input" value="#4361ee" style="height:40px;padding:4px" />
          </div>
          <div class="form-group">
            <label class="form-label">Seleccionar Jugadores</label>
            <div style="max-height:240px;overflow-y:auto;background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:8px;padding:12px;display:grid;gap:6px">
              ${allPlayers.map(p => {
                const takenBy = assignedToTeam[p.id];
                const disabled = !!takenBy;
                return `
                <label style="display:flex;align-items:center;gap:8px;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? '0.45' : '1'}">
                  <input type="checkbox" class="team-player-chk" value="${p.id}" ${disabled ? 'disabled' : ''} style="width:16px;height:16px">
                  <span>${Utils.escHtml(p.name)}</span>
                  ${disabled ? `<span style="font-size:0.72rem;color:var(--text-muted);margin-left:auto;white-space:nowrap">🛡️ ${Utils.escHtml(takenBy)}</span>` : ''}
                </label>`;
              }).join('') || '<div class="text-muted text-sm">Sin jugadores en tu club.</div>'}
            </div>
            <div class="text-xs text-muted" style="margin-top:6px">🛡️ Jugadores ya asignados a otro equipo no son seleccionables.</div>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Crear Equipo</button>
          </div>
        </form>
      `,
      footer: ''
    });
  },

  saveTeam(e, tId) {
    e.preventDefault();
    const groupId = Auth.getGroupId();
    const name = document.getElementById('team-name').value.trim();
    const color = document.getElementById('team-color').value;
    const playerIds = Array.from(document.querySelectorAll('.team-player-chk:checked')).map(c => c.value);

    playerIds.forEach(pid => DB.addTournamentPlayer({ tournamentId: tId, playerId: pid, groupId }));
    DB.addTournamentTeam({ tournamentId: tId, name, color, playerIds, isPair: false });
    Toast.success('Equipo creado');
    App.closeModal();
    this._loadDetail();
  },

  openEditTeam(teamId) {
    const team = DB.getTournamentTeamById(teamId);
    if (!team) return;
    const tId = team.tournamentId;
    const groupId = Auth.getGroupId();
    const allPlayers = DB.getPlayers(groupId).sort((a, b) => a.name.localeCompare(b.name));
    const assignedIds = new Set(team.playerIds || []);

    // Build map of playerId -> team name for OTHER teams in this tournament
    const otherTeams = DB.getTournamentTeams(tId).filter(t => !t.isPair && t.id !== teamId);
    const assignedToOtherTeam = {};
    otherTeams.forEach(ot => {
      (ot.playerIds || []).forEach(pid => { assignedToOtherTeam[pid] = ot.name; });
    });

    App.openModal({
      title: `✏️ Editar Equipo: ${Utils.escHtml(team.name)}`,
      body: `
        <form onsubmit="TournamentsPage.updateTeam(event,'${teamId}')">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" id="eteam-name" class="form-input" value="${Utils.escHtml(team.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <input type="color" id="eteam-color" class="form-input" value="${team.color || '#4361ee'}" style="height:40px;padding:4px" />
          </div>
          <div class="form-group">
            <label class="form-label">Jugadores</label>
            <div style="max-height:240px;overflow-y:auto;background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:8px;padding:12px;display:grid;gap:6px">
              ${allPlayers.map(p => {
                const takenBy = assignedToOtherTeam[p.id];
                const disabled = !!takenBy;
                const checked = assignedIds.has(p.id);
                return `
                <label style="display:flex;align-items:center;gap:8px;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? '0.45' : '1'}">
                  <input type="checkbox" class="eteam-player-chk" value="${p.id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} style="width:16px;height:16px">
                  <span>${Utils.escHtml(p.name)}</span>
                  ${disabled ? `<span style="font-size:0.72rem;color:var(--text-muted);margin-left:auto;white-space:nowrap">🛡️ ${Utils.escHtml(takenBy)}</span>` : ''}
                </label>`;
              }).join('')}
            </div>
            <div class="text-xs text-muted" style="margin-top:6px">🛡️ Jugadores ya asignados a otro equipo no son seleccionables.</div>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      `,
      footer: ''
    });
  },

  updateTeam(e, teamId) {
    e.preventDefault();
    const team = DB.getTournamentTeamById(teamId);
    const groupId = Auth.getGroupId();
    const name = document.getElementById('eteam-name').value.trim();
    const color = document.getElementById('eteam-color').value;
    const playerIds = Array.from(document.querySelectorAll('.eteam-player-chk:checked')).map(c => c.value);
    playerIds.forEach(pid => DB.addTournamentPlayer({ tournamentId: team.tournamentId, playerId: pid, groupId }));
    DB.updateTournamentTeam(teamId, { name, color, playerIds });
    Toast.success('Equipo actualizado');
    App.closeModal();
    this._loadDetail();
  },

  deleteTeam(id) {
    App.confirmDialog('¿Eliminar equipo?', 'Se eliminará del torneo. Las partidas existentes no se borran.', () => {
      DB.deleteTournamentTeam(id);
      Toast.success('Equipo eliminado');
      this._loadDetail();
    });
  },

  openImportTeams(tId) {
    const groups = DB.getTournamentGroups(tId);
    App.openModal({
      title: '📥 Importar Equipos desde Excel',
      body: `
        <p class="text-muted text-sm">El archivo debe tener columnas: <b>nombreequipo</b>, <b>jugador1</b>, <b>jugador2</b>, jugador3, jugador4..., y opcionalmente <b>grupo</b> para asignar automáticamente al grupo.</p>
        ${groups.length > 0 ? `<p class="text-xs text-muted" style="margin-bottom:8px">Grupos existentes: <b>${groups.map(g => g.name).join(', ')}</b> — o escribe un nombre nuevo y se creará.</p>` : ''}
        <div class="dropzone" onclick="document.getElementById('teams-excel-file').click()"
          ondragover="event.preventDefault();this.classList.add('dragover')"
          ondragleave="this.classList.remove('dragover')"
          ondrop="event.preventDefault();this.classList.remove('dragover');TournamentsPage._handleTeamsExcel(event.dataTransfer.files[0],'${tId}')">
          <div class="dropzone-icon">📊</div>
          <div class="dropzone-text">Arrastra tu archivo Excel aquí</div>
          <div class="dropzone-hint">.xlsx, .xls, .csv</div>
          <input type="file" id="teams-excel-file" accept=".xlsx,.xls,.csv" class="hidden"
            onchange="TournamentsPage._handleTeamsExcel(this.files[0],'${tId}')" />
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="TournamentsPage.downloadTeamsTemplate()">⬇ Descargar plantilla</button>
      `,
      footer: ''
    });
  },

  _handleTeamsExcel(file, tId) {
    if (!file) return;
    const groupId = Auth.getGroupId();
    const reader = new FileReader();
    reader.onload = e => {
      let rows = [];
      try {
        if (file.name.match(/\.xlsx?$/i)) {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map(r => {
            const n = {}; for (let k in r) n[k.toLowerCase().replace(/\s+/g, '')] = r[k]; return n;
          });
        } else {
          rows = Utils.parseCSV(new TextDecoder('utf-8').decode(e.target.result));
        }
      } catch { Toast.error('Error al leer el archivo'); return; }

      const allPlayers = DB.getPlayers(groupId);
      const existingGroups = DB.getTournamentGroups(tId);
      const groupCache = {}; // groupName -> groupObject

      const findOrCreateGroup = name => {
        if (!name) return null;
        const n = name.toString().trim();
        if (!n) return null;
        if (groupCache[n]) return groupCache[n];
        let g = existingGroups.find(eg => eg.name.toLowerCase() === n.toLowerCase());
        if (!g) {
          g = DB.addTournamentGroup({ tournamentId: tId, name: n, memberIds: [] });
          existingGroups.push(g);
        }
        groupCache[n] = g;
        return g;
      };

      const findOrCreate = name => {
        if (!name) return null;
        const n = name.toString().trim();
        if (!n) return null;
        let p = allPlayers.find(x => x.name.toLowerCase() === n.toLowerCase());
        if (!p) { p = DB.addPlayer({ name: n, alias: '', groupId, active: true, notes: '' }); allPlayers.push(p); }
        return p;
      };
      let added = 0;

      rows.forEach(row => {
        const teamName = (row.nombreequipo || row.nombre || row.team || row.equipo || '').toString().trim();
        if (!teamName) return;
        const playerIds = [];
        for (let i = 1; i <= 10; i++) {
          const pName = row[`jugador${i}`] || row[`player${i}`];
          if (pName) {
            const p = findOrCreate(pName);
            if (p) {
              DB.addTournamentPlayer({ tournamentId: tId, playerId: p.id, groupId });
              playerIds.push(p.id);
            }
          }
        }
        const newTeam = DB.addTournamentTeam({ tournamentId: tId, name: teamName, playerIds, isPair: false });
        added++;

        // Assign to group if specified
        const rawGroupName = row.grupo || row.group || row.fase || '';
        if (rawGroupName) {
          const grp = findOrCreateGroup(rawGroupName);
          if (grp) {
            const currentIds = grp.memberIds || [];
            if (!currentIds.includes(newTeam.id)) {
              DB.updateTournamentGroup(grp.id, { memberIds: [...currentIds, newTeam.id] });
              grp.memberIds = [...currentIds, newTeam.id];
            }
          }
        }
      });

      Toast.success(`${added} equipos importados`);
      App.closeModal();
      this._loadDetail();
    };
    reader.readAsArrayBuffer(file);
  },

  downloadTeamsTemplate() {
    const csv = 'nombreequipo,jugador1,jugador2,jugador3,jugador4,grupo\nLos Tigres,Juan Pérez,María López,Carlos R.,Ana Torres,Grupo A\nLos Leones,Pedro Gómez,Laura Sosa,,,Grupo A\nLos Dragones,Miguel Díaz,Carmen Ruiz,,,Grupo B';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_equipos.csv'; a.click();
    URL.revokeObjectURL(url);
  },

  // =========================================
  // GROUP PHASE SETUP
  // =========================================
  openSetupGroups(tId) {
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;
    const numGroups = t?.config?.numGroups || 1;
    const existingGroups = DB.getTournamentGroups(tId);

    let members = [];
    if (modality === 'teams') {
      members = DB.getTournamentTeams(tId).filter(x => !x.isPair);
    } else if (modality === 'fixed') {
      members = DB.getTournamentTeams(tId).filter(x => x.isPair);
    } else {
      members = DB.getTournamentPlayers(tId).map(tp => DB.getPlayerById(tp.playerId)).filter(Boolean);
    }

    App.openModal({
      title: '⚙️ Configurar Grupos',
      body: `
        <div class="form-group">
          <label class="form-label">Número de grupos</label>
          <select id="sg-num-groups" class="form-select" onchange="TournamentsPage._renderGroupAssignment(${JSON.stringify(members.map(m => ({id: m.id, name: m.name}))).replace(/"/g,'&quot;')}, this.value, '${tId}')">
            ${Array.from({length: 16}, (_, i) => `<option value="${i+1}" ${numGroups === i+1 ? 'selected' : ''}>${i+1} Grupo${i > 0 ? 's' : ''}</option>`).join('')}
          </select>
        </div>
        <div id="group-assignment-area" style="margin-top:16px"></div>
        <div class="modal-footer" style="padding:0;margin-top:24px">
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-ghost" onclick="TournamentsPage.distributeRandom('${tId}')">🎲 Distribuir Aleatoriamente</button>
          <button class="btn btn-primary" onclick="TournamentsPage.saveGroups('${tId}')">💾 Guardar Grupos</button>
        </div>
      `,
      footer: ''
    }, 'modal-lg');

    setTimeout(() => this._renderGroupAssignment(members.map(m => ({id: m.id, name: m.name})), numGroups, tId), 50);
  },

  _renderGroupAssignment(members, numGroups, tId) {
    const area = document.getElementById('group-assignment-area');
    if (!area) return;
    numGroups = parseInt(numGroups) || 1;
    const existingGroups = DB.getTournamentGroups(tId);

    // Pre-assign existing members
    const memberGroupMap = {};
    existingGroups.forEach((g, gi) => {
      (g.memberIds || []).forEach(mid => { memberGroupMap[mid] = gi; });
    });

    const groupNames = numGroups === 1 ? ['Grupo Único'] : Array.from({length: numGroups}, (_, i) => `Grupo ${String.fromCharCode(65 + i)}`);

    area.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px">
      ${groupNames.map((gname, gi) => `
      <div class="card" style="background:var(--bg-elevated);padding:12px" id="group-drop-${gi}"
        ondragover="event.preventDefault()" ondrop="TournamentsPage._dropMember(event,${gi})">
        <div style="font-weight:700;margin-bottom:8px;color:var(--accent-primary)">${gname}</div>
        <div id="group-members-${gi}" style="min-height:80px;display:grid;gap:4px">
          ${members.filter(m => (memberGroupMap[m.id] !== undefined ? memberGroupMap[m.id] : -1) === gi).map(m => `
          <div class="badge badge-info" draggable="true" data-mid="${m.id}" data-mname="${Utils.escHtml(m.name)}"
            ondragstart="event.dataTransfer.setData('memberId',this.dataset.mid);event.dataTransfer.setData('memberName',this.dataset.mname)"
            style="cursor:grab;font-size:0.85rem;justify-content:flex-start;padding:6px 10px">
            ${Utils.escHtml(m.name)}
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>
    <div class="card" style="background:var(--bg-elevated);padding:12px;margin-top:12px"
      ondragover="event.preventDefault()" ondrop="TournamentsPage._dropMember(event,-1)">
      <div style="font-weight:600;margin-bottom:8px;color:var(--text-muted)">Sin asignar</div>
      <div id="group-members--1" style="min-height:40px;display:flex;flex-wrap:wrap;gap:4px">
        ${members.filter(m => memberGroupMap[m.id] === undefined).map(m => `
        <div class="badge badge-muted" draggable="true" data-mid="${m.id}" data-mname="${Utils.escHtml(m.name)}"
          ondragstart="event.dataTransfer.setData('memberId',this.dataset.mid);event.dataTransfer.setData('memberName',this.dataset.mname)"
          style="cursor:grab">
          ${Utils.escHtml(m.name)}
        </div>`).join('')}
      </div>
    </div>`;
  },

  _dropMember(event, groupIdx) {
    const memberId = event.dataTransfer.getData('memberId');
    const memberName = event.dataTransfer.getData('memberName');
    if (!memberId) return;

    // Remove from all containers
    document.querySelectorAll(`[data-mid="${memberId}"]`).forEach(el => el.remove());

    // Add to target container
    const targetId = groupIdx >= 0 ? `group-members-${groupIdx}` : 'group-members--1';
    const targetDiv = document.getElementById(targetId);
    if (!targetDiv) return;

    const el = document.createElement('div');
    el.className = groupIdx >= 0 ? 'badge badge-info' : 'badge badge-muted';
    el.draggable = true;
    el.dataset.mid = memberId;
    el.dataset.mname = memberName;
    el.style.cssText = 'cursor:grab;font-size:0.85rem;justify-content:flex-start;padding:6px 10px';
    el.textContent = memberName.replace(/&quot;/g, '"');
    el.ondragstart = e => { e.dataTransfer.setData('memberId', memberId); e.dataTransfer.setData('memberName', memberName); };
    targetDiv.appendChild(el);
  },

  distributeRandom(tId) {
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;
    const numGroups = parseInt(document.getElementById('sg-num-groups')?.value) || t?.config?.numGroups || 1;

    let members = [];
    if (modality === 'teams') members = DB.getTournamentTeams(tId).filter(x => !x.isPair);
    else if (modality === 'fixed') members = DB.getTournamentTeams(tId).filter(x => x.isPair);
    else members = DB.getTournamentPlayers(tId).map(tp => DB.getPlayerById(tp.playerId)).filter(Boolean);

    const shuffled = [...members].sort(() => Math.random() - 0.5);

    // Clear containers
    for (let i = 0; i < numGroups; i++) {
      const el = document.getElementById(`group-members-${i}`);
      if (el) el.innerHTML = '';
    }
    const unassigned = document.getElementById('group-members--1');
    if (unassigned) unassigned.innerHTML = '';

    // Distribute evenly
    shuffled.forEach((m, idx) => {
      const groupIdx = idx % numGroups;
      const targetDiv = document.getElementById(`group-members-${groupIdx}`);
      if (!targetDiv) return;
      const el = document.createElement('div');
      el.className = 'badge badge-info';
      el.draggable = true;
      el.dataset.mid = m.id;
      el.dataset.mname = m.name;
      el.style.cssText = 'cursor:grab;font-size:0.85rem;justify-content:flex-start;padding:6px 10px';
      el.textContent = m.name;
      el.ondragstart = e => { e.dataTransfer.setData('memberId', m.id); e.dataTransfer.setData('memberName', m.name); };
      targetDiv.appendChild(el);
    });
    Toast.success('Distribución aleatoria aplicada');
  },

  saveGroups(tId) {
    const t = DB.getTournamentById(tId);
    const numGroups = parseInt(document.getElementById('sg-num-groups')?.value) || 1;
    const groupNames = numGroups === 1 ? ['Grupo Único'] : Array.from({length: numGroups}, (_, i) => `Grupo ${String.fromCharCode(65 + i)}`);

    // Borrar grupos viejos
    DB.getTournamentGroups(tId).forEach(g => DB.deleteTournamentGroup(g.id));

    // Limpieza: Borrar partidas de grupos que NO se han jugado (evita choques de configuración)
    const allMatches = DB.getTournamentMatches(tId);
    allMatches.forEach(m => {
      if (m.phase === 'groups' && !m.winner && m.vuelta) {
        DB.deleteTournamentMatch(m.id);
      }
    });

    const createdGroups = [];
    for (let i = 0; i < numGroups; i++) {
      const container = document.getElementById(`group-members-${i}`);
      if (!container) continue;
      const memberIds = Array.from(container.querySelectorAll('[data-mid]')).map(el => el.dataset.mid);
      const group = DB.addTournamentGroup({ tournamentId: tId, name: groupNames[i], memberIds });
      createdGroups.push(group);
    }

    // Actualizar ID de grupo en partidas ya jugadas para no dejarlas huérfanas
    const updatedMatches = DB.getTournamentMatches(tId);
    updatedMatches.forEach(m => {
      if (m.phase === 'groups' && m.winner) {
        const newGroup = createdGroups.find(g => g.memberIds.includes(m.team1Id));
        if (newGroup && m.groupId !== newGroup.id) {
          DB.updateTournamentMatch(m.id, { groupId: newGroup.id });
        }
      }
    });

    // Update tournament phase and config
    DB.updateTournament(tId, {
      phase: 'groups',
      config: { ...(t.config || {}), numGroups }
    });

    // Auto-generar calendario para los nuevos grupos
    createdGroups.forEach(g => {
      if (g.memberIds && g.memberIds.length > 0) {
        this.generateRoundRobinForGroup(tId, g.id);
      }
    });

    Toast.success(`${createdGroups.length} grupos guardados y calendario sincronizado`);
    App.closeModal();
    this.setTab('groups');
  },

  generateRoundRobinForGroup(tId, groupId) {
    const group = DB.getTournamentGroupById(groupId);
    const t = DB.getTournamentById(tId);
    if (!group || !group.memberIds?.length) { Toast.error('El grupo no tiene miembros'); return; }

    const numVueltas = parseInt(t?.config?.numVueltas) || 1;
    const baseFixtures = DB.generateRoundRobin(group.memberIds); // [{team1Id, team2Id}]
    const date = new Date().toISOString().split('T')[0];

    // Build the full fixture list considering vueltas
    // Vuelta 1: A vs B
    // Vuelta 2: B vs A (reverse)
    // Vuelta 3: A vs B again, etc.
    const allFixtures = [];
    for (let v = 0; v < numVueltas; v++) {
      baseFixtures.forEach(f => {
        // Odd vueltas: original order; even vueltas: reversed
        const isReverse = v % 2 === 1;
        allFixtures.push({
          team1Id: isReverse ? f.team2Id : f.team1Id,
          team2Id: isReverse ? f.team1Id : f.team2Id,
          vuelta: v + 1
        });
      });
    }

    // Count already existing matches for this group to detect duplicates by vuelta
    const existingMatches = DB.getTournamentMatches(tId).filter(m => m.groupId === groupId);
    let added = 0, skipped = 0;

    allFixtures.forEach(f => {
      // Check if this exact fixture (same order, same vuelta) already exists
      const exists = existingMatches.some(m =>
        m.vuelta === f.vuelta && m.team1Id === f.team1Id && m.team2Id === f.team2Id
      );
      if (!exists) {
        DB.addTournamentMatch({
          tournamentId: tId, groupId,
          team1Id: f.team1Id, team2Id: f.team2Id,
          vuelta: f.vuelta,
          date,
          score: { team1: 0, team2: 0 }, winner: null, phase: 'groups',
          shoes: { team1Given: 0, team2Given: 0 }, notes: ''
        });
        added++;
      } else {
        skipped++;
      }
    });

    const vueltaLabel = numVueltas === 1 ? '1 vuelta' : `${numVueltas} vueltas`;
    Toast.success(`${added} partidos generados (${vueltaLabel} – ${group.name})${skipped > 0 ? ` · ${skipped} ya existían` : ''}`);
    this._loadDetail();
  },

  // =========================================
  // ROTATING PAIRS — ROUND GENERATION
  // =========================================
  generateNextRound(tId) {
    const t = DB.getTournamentById(tId);
    const tPlayers = DB.getTournamentPlayers(tId);
    if (tPlayers.length < 2) { Toast.error('Necesitas al menos 2 participantes'); return; }

    const allRounds = DB.getTournamentRounds(tId);
    const nextRoundNum = allRounds.length + 1;
    const maxRounds = t?.config?.numRounds || 99;

    if (nextRoundNum > maxRounds) {
      Toast.warning(`Ya se han generado todas las jornadas (${maxRounds})`);
      return;
    }

    // Build history of past pairs
    const pairHistory = [];
    allRounds.forEach(r => { (r.pairs || []).forEach(pair => { pairHistory.push(pair); }); });

    const playerIds = tPlayers.map(tp => tp.playerId);
    const pairs = DB.generateRotatingPairs(playerIds, pairHistory);

    // Check if odd number of players (one gets a bye)
    let byePlayerId = null;
    if (playerIds.length % 2 !== 0) {
      // Player not in any pair gets a bye
      const inPairs = new Set(pairs.flat());
      byePlayerId = playerIds.find(id => !inPairs.has(id));
    }

    DB.addTournamentRound({
      tournamentId: tId, roundNumber: nextRoundNum, pairs,
      byePlayerId, status: 'active'
    });

    DB.updateTournament(tId, { phase: 'rounds' });
    Toast.success(`Jornada ${nextRoundNum} generada con ${pairs.length} parejas`);
    this.setTab('rounds');
  },

  markRoundComplete(roundId) {
    DB.updateTournamentRound(roundId, { status: 'completed' });
    Toast.success('Jornada marcada como completada');
    this._loadDetail();
  },

  // =========================================
  // MATCHES — CRUD
  // =========================================

  openGroupMatch(tId, groupId) {
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;
    const group = DB.getTournamentGroupById(groupId);
    if (!group) return;

    // Get participants restricted to this group
    let participantOptions = '';
    if (modality === 'teams') {
      const memberIds = new Set(group.memberIds || []);
      const teams = DB.getTournamentTeams(tId).filter(te => !te.isPair && memberIds.has(te.id));
      participantOptions = teams.map(te => `<option value="${te.id}">${Utils.escHtml(te.name)}</option>`).join('');
    } else if (modality === 'fixed') {
      const memberIds = new Set(group.memberIds || []);
      const pairs = DB.getTournamentTeams(tId).filter(p => p.isPair && memberIds.has(p.id));
      participantOptions = pairs.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');
    } else {
      const memberIds = new Set(group.memberIds || []);
      participantOptions = Array.from(memberIds).map(pid => {
        const p = DB.getPlayerById(pid);
        return p ? `<option value="${p.id}">${Utils.escHtml(p.name)}</option>` : '';
      }).join('');
    }

    if (!participantOptions) { Toast.warning('El grupo no tiene participantes asignados'); return; }

    const isTeamBased = modality === 'teams' || modality === 'fixed';
    App.openModal({
      title: `📝 Registrar Partida — ${Utils.escHtml(group.name)}`,
      body: `
        <form onsubmit="TournamentsPage.saveGroupMatch(event,'${tId}','${groupId}','${modality}')">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">${isTeamBased ? 'Equipo 1' : 'Jugador 1'} *</label>
              <select id="gm-p1" class="form-select" required>${participantOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${isTeamBased ? 'Equipo 2' : 'Jugador 2'} *</label>
              <select id="gm-p2" class="form-select" required>${participantOptions}</select>
            </div>
          </div>
          ${!isTeamBased ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Compañero J1 *</label>
              <select id="gm-p1b" class="form-select" required>${participantOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Compañero J2 *</label>
              <select id="gm-p2b" class="form-select" required>${participantOptions}</select>
            </div>
          </div>` : ''}
          <div style="display:grid;grid-template-columns:1fr auto 1fr 1fr;gap:12px;align-items:center">
            <div class="form-group">
              <label class="form-label">Puntos equipo 1 *</label>
              <input type="number" id="gm-s1" class="form-input" min="0" value="200" required />
            </div>
            <div style="font-size:1.5rem;font-weight:800;opacity:0.3;padding-top:20px;text-align:center">:</div>
            <div class="form-group">
              <label class="form-label">Puntos equipo 2 *</label>
              <input type="number" id="gm-s2" class="form-input" min="0" value="150" required />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" id="gm-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notas</label>
            <input type="text" id="gm-notes" class="form-input" placeholder="Opcional..." />
          </div>
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">✅ Guardar Partida</button>
          </div>
        </form>
      `,
      footer: ''
    }, 'modal-md');
  },

  saveGroupMatch(e, tId, groupId, modality) {
    e.preventDefault();
    const s1 = parseInt(document.getElementById('gm-s1').value);
    const s2 = parseInt(document.getElementById('gm-s2').value);
    if (s1 === s2) { Toast.error('No puede haber empate (puntajes iguales)'); return; }
    if (s1 < 100 && s2 < 100) { Toast.error('Al menos uno debe llegar a 100 puntos para ganar.'); return; }
    if (s1 >= 100 && s2 >= 100) { Toast.error('Solo un equipo puede llegar a 100 o más. El otro debe quedarse bajo 100.'); return; }

    const isTeamBased = modality === 'teams' || modality === 'fixed';
    const date = document.getElementById('gm-date').value;
    const notes = document.getElementById('gm-notes').value;

    let matchData = {
      tournamentId: tId, groupId, phase: 'groups', date, notes,
      score: { team1: s1, team2: s2 }, winner: s1 > s2 ? 'team1' : 'team2',
      shoes: { team1Given: 0, team2Given: 0 }
    };

    if (isTeamBased) {
      const t1Id = document.getElementById('gm-p1').value;
      const t2Id = document.getElementById('gm-p2').value;
      if (t1Id === t2Id) { Toast.error('Los equipos deben ser diferentes'); return; }
      matchData.team1Id = t1Id;
      matchData.team2Id = t2Id;
    } else {
      matchData.team1 = { player1: document.getElementById('gm-p1').value, player2: document.getElementById('gm-p1b').value };
      matchData.team2 = { player1: document.getElementById('gm-p2').value, player2: document.getElementById('gm-p2b').value };
    }

    DB.addTournamentMatch(matchData);
    Toast.success('Partida registrada correctamente');
    App.closeModal();
    this._loadDetail();
  },

  openNewMatch(tId) {
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;
    const groups = DB.getTournamentGroups(tId);
    const rounds = DB.getTournamentRounds(tId);


    let participantOptions = '';
    if (modality === 'teams') {
      const teams = DB.getTournamentTeams(tId).filter(x => !x.isPair);
      participantOptions = teams.map(te => `<option value="${te.id}">${Utils.escHtml(te.name)}</option>`).join('');
    } else if (modality === 'fixed') {
      const pairs = DB.getTournamentTeams(tId).filter(x => x.isPair);
      participantOptions = pairs.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');
    } else {
      const players = DB.getTournamentPlayers(tId).map(tp => DB.getPlayerById(tp.playerId)).filter(Boolean);
      participantOptions = players.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');
    }

    const phaseOpts = `
      <option value="groups">📋 Fase de Grupos</option>
      <option value="playoffs">🏆 Playoffs</option>
      <option value="regular">🎮 Partido Regular</option>`;

    const isTeamBased = modality === 'teams' || modality === 'fixed';

    App.openModal({
      title: '🎮 Registrar Partida',
      body: `
        <form onsubmit="TournamentsPage.saveMatch(event,'${tId}','${modality}')">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">${isTeamBased ? 'Equipo/Pareja 1' : 'Jugador 1'} *</label>
              <select id="nm-p1" class="form-select" required>${participantOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${isTeamBased ? 'Equipo/Pareja 2' : 'Jugador 2'} *</label>
              <select id="nm-p2" class="form-select" required>${participantOptions}</select>
            </div>
          </div>
          ${!isTeamBased ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Compañero Jugador 1 *</label>
              <select id="nm-p1b" class="form-select" required>${participantOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Compañero Jugador 2 *</label>
              <select id="nm-p2b" class="form-select" required>${participantOptions}</select>
            </div>
          </div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Puntos equipo 1 *</label>
              <input type="number" id="nm-s1" class="form-input" min="0" value="200" required />
            </div>
            <div class="form-group">
              <label class="form-label">Puntos equipo 2 *</label>
              <input type="number" id="nm-s2" class="form-input" min="0" value="150" required />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" id="nm-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Fase</label>
              <select id="nm-phase" class="form-select">${phaseOpts}</select>
            </div>
            ${groups.length > 0 ? `
            <div class="form-group">
              <label class="form-label">Grupo</label>
              <select id="nm-group" class="form-select">
                <option value="">Sin grupo</option>
                ${groups.map(g => `<option value="${g.id}">${Utils.escHtml(g.name)}</option>`).join('')}
              </select>
            </div>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">👟 Zapatos dados (eq.1)</label>
              <input type="number" id="nm-sh1" class="form-input" min="0" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">👟 Zapatos dados (eq.2)</label>
              <input type="number" id="nm-sh2" class="form-input" min="0" value="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notas</label>
            <input type="text" id="nm-notes" class="form-input" placeholder="Observaciones opcionales..." />
          </div>
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">✅ Guardar Partida</button>
          </div>
        </form>
      `,
      footer: ''
    }, 'modal-lg');
  },

  saveMatch(e, tId, modality) {
    e.preventDefault();
    const s1 = parseInt(document.getElementById('nm-s1').value);
    const s2 = parseInt(document.getElementById('nm-s2').value);
    if (s1 === s2) { Toast.error('No puede haber empate (puntajes iguales)'); return; }
    if (s1 < 100 && s2 < 100) { Toast.error('Al menos uno debe llegar a 100 puntos para ganar.'); return; }
    if (s1 >= 100 && s2 >= 100) { Toast.error('Solo un equipo puede llegar a 100 o más. El otro debe quedarse bajo 100.'); return; }

    const isTeamBased = modality === 'teams' || modality === 'fixed';
    const phase = document.getElementById('nm-phase').value;
    const groupId = document.getElementById('nm-group')?.value || null;
    const date = document.getElementById('nm-date').value;
    const notes = document.getElementById('nm-notes').value;
    const sh1 = parseInt(document.getElementById('nm-sh1').value) || 0;
    const sh2 = parseInt(document.getElementById('nm-sh2').value) || 0;

    let matchData = { tournamentId: tId, date, phase, groupId, notes, score: { team1: s1, team2: s2 }, winner: s1 > s2 ? 'team1' : 'team2', shoes: { team1Given: sh1, team2Given: sh2 } };

    if (isTeamBased) {
      const t1Id = document.getElementById('nm-p1').value;
      const t2Id = document.getElementById('nm-p2').value;
      if (t1Id === t2Id) { Toast.error('Los equipos deben ser diferentes'); return; }
      matchData.team1Id = t1Id;
      matchData.team2Id = t2Id;
    } else {
      const p1 = document.getElementById('nm-p1').value;
      const p1b = document.getElementById('nm-p1b').value;
      const p2 = document.getElementById('nm-p2').value;
      const p2b = document.getElementById('nm-p2b').value;
      matchData.team1 = { player1: p1, player2: p1b };
      matchData.team2 = { player1: p2, player2: p2b };
    }

    DB.addTournamentMatch(matchData);
    Toast.success('Partida registrada');
    App.closeModal();
    this._loadDetail();
  },

  openEnterScore(matchId) {
    const m = DB.getTournamentMatchById(matchId);
    if (!m) return;

    const team1 = m.team1Id ? DB.getTournamentTeamById(m.team1Id) : null;
    const team2 = m.team2Id ? DB.getTournamentTeamById(m.team2Id) : null;

    // Names for display
    let t1Name = team1?.name || (m.team1 ? `${DB.getPlayerById(m.team1?.player1)?.name||'?'} & ${DB.getPlayerById(m.team1?.player2)?.name||'?'}` : '?');
    let t2Name = team2?.name || (m.team2 ? `${DB.getPlayerById(m.team2?.player1)?.name||'?'} & ${DB.getPlayerById(m.team2?.player2)?.name||'?'}` : '?');

    // Build player options for each team (only when team-based)
    const buildPlayerOpts = (team, prevP1, prevP2) => {
      if (!team?.playerIds?.length) return '';
      return team.playerIds.map(pid => {
        const p = DB.getPlayerById(pid);
        return p ? `<option value="${p.id}">${Utils.escHtml(p.name)}</option>` : '';
      }).join('');
    };

    const t1PlayerOpts = buildPlayerOpts(team1, m.team1pair?.player1, m.team1pair?.player2);
    const t2PlayerOpts = buildPlayerOpts(team2, m.team2pair?.player1, m.team2pair?.player2);
    const showPairSelect = !!(team1 && team2 && t1PlayerOpts && t2PlayerOpts);

    // Pre-select previously saved players
    const preP1a = m.team1pair?.player1 || '';
    const preP1b = m.team1pair?.player2 || '';
    const preP2a = m.team2pair?.player1 || '';
    const preP2b = m.team2pair?.player2 || '';

    const pairSection = showPairSelect ? `
      <div style="border-top:1px solid var(--border-color);margin:16px 0;padding-top:16px">
        <div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:12px">👥 PAREJAS QUE JUGARON</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-size:0.82rem;font-weight:600;color:var(--accent-primary);margin-bottom:6px">🛡️ ${Utils.escHtml(t1Name)}</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label">Jugador A</label>
              <select id="es-t1pa" class="form-select"><option value="">— Sin especificar —</option>${t1PlayerOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Jugador B</label>
              <select id="es-t1pb" class="form-select"><option value="">— Sin especificar —</option>${t1PlayerOpts}</select>
            </div>
          </div>
          <div>
            <div style="font-size:0.82rem;font-weight:600;color:var(--accent-primary);margin-bottom:6px">🛡️ ${Utils.escHtml(t2Name)}</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label">Jugador A</label>
              <select id="es-t2pa" class="form-select"><option value="">— Sin especificar —</option>${t2PlayerOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Jugador B</label>
              <select id="es-t2pb" class="form-select"><option value="">— Sin especificar —</option>${t2PlayerOpts}</select>
            </div>
          </div>
        </div>
      </div>` : '';

    App.openModal({
      title: '📝 Ingresar Resultado',
      body: `
        <div style="display:flex;justify-content:space-around;align-items:center;margin:20px 0">
          <div style="text-align:center">
            <div style="font-weight:700;font-size:1rem">${Utils.escHtml(t1Name)}</div>
            <input type="number" id="score-t1" class="form-input" style="width:90px;text-align:center;font-size:1.5rem;font-weight:800;margin-top:8px" value="${m.score?.team1 || 0}" min="0" />
          </div>
          <div style="font-size:2rem;opacity:0.4;font-weight:800">:</div>
          <div style="text-align:center">
            <div style="font-weight:700;font-size:1rem">${Utils.escHtml(t2Name)}</div>
            <input type="number" id="score-t2" class="form-input" style="width:90px;text-align:center;font-size:1.5rem;font-weight:800;margin-top:8px" value="${m.score?.team2 || 0}" min="0" />
          </div>
        </div>
        ${pairSection}
        <div class="modal-footer" style="padding:0;margin-top:16px">
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="TournamentsPage.saveScore('${matchId}')">💾 Guardar</button>
        </div>
      `,
      footer: ''
    }, showPairSelect ? 'modal-md' : '');

    // Setup pair selects: pre-fill saved values and wire mutual filtering
    if (showPairSelect) setTimeout(() => {
      const _syncPair = (selAId, selBId) => {
        const selA = document.getElementById(selAId);
        const selB = document.getElementById(selBId);
        if (!selA || !selB) return;

        const applyFilter = () => {
          const chosenA = selA.value;
          const chosenB = selB.value;
          // Rebuild B options excluding A's selection
          Array.from(selB.options).forEach(opt => {
            opt.hidden = chosenA && opt.value === chosenA && opt.value !== '';
          });
          // Rebuild A options excluding B's selection
          Array.from(selA.options).forEach(opt => {
            opt.hidden = chosenB && opt.value === chosenB && opt.value !== '';
          });
        };
        selA.addEventListener('change', applyFilter);
        selB.addEventListener('change', applyFilter);
        return applyFilter;
      };

      const applyT1 = _syncPair('es-t1pa', 'es-t1pb');
      const applyT2 = _syncPair('es-t2pa', 'es-t2pb');

      // Pre-set saved values then apply filters
      const vals = { 'es-t1pa': preP1a, 'es-t1pb': preP1b, 'es-t2pa': preP2a, 'es-t2pb': preP2b };
      Object.entries(vals).forEach(([id, val]) => {
        if (val) { const el = document.getElementById(id); if (el) el.value = val; }
      });
      if (applyT1) applyT1();
      if (applyT2) applyT2();
    }, 50);
  },

  saveScore(matchId) {
    const s1 = parseInt(document.getElementById('score-t1').value);
    const s2 = parseInt(document.getElementById('score-t2').value);
    if (s1 === s2) { Toast.error('No puede haber empate'); return; }
    if (s1 < 100 && s2 < 100) { Toast.error('Al menos uno debe llegar a 100 puntos para ganar.'); return; }
    if (s1 >= 100 && s2 >= 100) { Toast.error('Solo un equipo puede llegar a 100 o más. El otro debe quedarse bajo 100.'); return; }

    const update = { score: { team1: s1, team2: s2 }, winner: s1 > s2 ? 'team1' : 'team2' };

    // Save playing pairs if selectors are present
    const t1pa = document.getElementById('es-t1pa')?.value || null;
    const t1pb = document.getElementById('es-t1pb')?.value || null;
    const t2pa = document.getElementById('es-t2pa')?.value || null;
    const t2pb = document.getElementById('es-t2pb')?.value || null;

    // Validate: same player cannot be Jugador A and Jugador B in the same pair
    if (t1pa && t1pb && t1pa === t1pb) { Toast.error('Equipo 1: Jugador A y Jugador B deben ser diferentes.'); return; }
    if (t2pa && t2pb && t2pa === t2pb) { Toast.error('Equipo 2: Jugador A y Jugador B deben ser diferentes.'); return; }

    if (t1pa || t1pb) update.team1pair = { player1: t1pa, player2: t1pb };
    if (t2pa || t2pb) update.team2pair = { player1: t2pa, player2: t2pb };

    DB.updateTournamentMatch(matchId, update);
    Toast.success('Resultado guardado');
    App.closeModal();
    this._loadDetail();
  },



  openEditMatch(matchId) {
    const m = DB.getTournamentMatchById(matchId);
    if (!m) return;
    App.openModal({
      title: '✏️ Editar Resultado',
      body: `
        <div class="form-group">
          <label class="form-label">Puntos Equipo 1</label>
          <input type="number" id="em-s1" class="form-input" value="${m.score?.team1 || 0}" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Puntos Equipo 2</label>
          <input type="number" id="em-s2" class="form-input" value="${m.score?.team2 || 0}" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input type="date" id="em-date" class="form-input" value="${m.date || ''}" />
        </div>
        <div class="modal-footer" style="padding:0;margin-top:24px">
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="TournamentsPage.updateMatch('${matchId}')">Guardar</button>
        </div>
      `,
      footer: ''
    });
  },

  updateMatch(matchId) {
    const s1 = parseInt(document.getElementById('em-s1').value);
    const s2 = parseInt(document.getElementById('em-s2').value);
    const date = document.getElementById('em-date').value;
    if (s1 === s2) { Toast.error('No puede haber empate'); return; }
    if (s1 < 100 && s2 < 100) { Toast.error('Al menos uno debe llegar a 100 puntos para ganar.'); return; }
    if (s1 >= 100 && s2 >= 100) { Toast.error('Solo un equipo puede llegar a 100 o más. El otro debe quedarse bajo 100.'); return; }
    DB.updateTournamentMatch(matchId, { score: { team1: s1, team2: s2 }, winner: s1 > s2 ? 'team1' : 'team2', date });
    Toast.success('Partida actualizada');
    App.closeModal();
    this._loadDetail();
  },

  deleteMatch(matchId) {
    App.confirmDialog('¿Eliminar partida?', 'Esta acción no se puede deshacer.', () => {
      DB.deleteTournamentMatch(matchId);
      Toast.success('Partida eliminada');
      this._loadDetail();
    });
  },

  // =========================================
  // PLAYOFFS SETUP
  // =========================================
  openSetupPlayoffs(tId) {
    const t = DB.getTournamentById(tId);
    const maxParticipants = t?.config?.numGroups
      ? (parseInt(t.config.numGroups) * parseInt(t.config.qualifiersPerGroup || 2))
      : 8;

    App.openModal({
      title: '🏆 Configurar Playoffs',
      body: `
        <form onsubmit="TournamentsPage.savePlayoffConfig(event,'${tId}')">
          <div class="form-group">
            <label class="form-label">Formato de llave</label>
            <select id="po-format" class="form-select">
              <option value="single">Eliminación directa (simple)</option>
              <option value="double">Doble eliminación</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Número de participantes en playoffs</label>
            <input type="number" id="po-participants" class="form-input" min="2" max="32" value="${maxParticipants}" />
          </div>
          <div class="form-group">
            <label class="form-label">¿Incluir partido por tercer puesto?</label>
            <select id="po-third" class="form-select">
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:24px">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Configuración</button>
          </div>
        </form>
      `,
      footer: ''
    });
  },

  savePlayoffConfig(e, tId) {
    e.preventDefault();
    const t = DB.getTournamentById(tId);
    const format = document.getElementById('po-format').value;
    const participants = parseInt(document.getElementById('po-participants').value);
    const thirdPlace = document.getElementById('po-third').value === 'yes';

    DB.updateTournament(tId, {
      config: { ...(t.config || {}), playoffSetup: { format, participants, thirdPlace } }
    });
    Toast.success('Playoffs configurados');
    App.closeModal();
    this.setTab('playoffs');
  },

  generatePlayoffBracket(tId) {
    const t = DB.getTournamentById(tId);
    const playoffConfig = t?.config?.playoffSetup;
    if (!playoffConfig) { Toast.error('Configura los playoffs primero'); return; }

    const modality = t.modality || t.type;
    let memberIds = [];

    if (modality === 'teams') {
      const stats = DB.getAllTournamentTeamStats(tId);
      memberIds = stats.slice(0, playoffConfig.participants).map(s => s.id);
    } else if (modality === 'fixed') {
      const stats = DB.getAllTournamentTeamStats(tId);
      memberIds = stats.slice(0, playoffConfig.participants).map(s => s.id);
    } else {
      const stats = DB.getAllTournamentPlayerStats(tId);
      memberIds = stats.slice(0, playoffConfig.participants).map(s => s.id);
    }

    if (memberIds.length < 2) { Toast.error('No hay suficientes participantes con estadísticas'); return; }

    const n = memberIds.length;
    const roundNames = n <= 2 ? ['Final'] : n <= 4 ? ['Semifinal', 'Final'] : n <= 8 ? ['Cuartos de Final', 'Semifinal', 'Final'] : ['Octavos', 'Cuartos de Final', 'Semifinal', 'Final'];

    // Generate quarterfinal (or first-round) matchups: 1vs8, 2vs7, etc.
    const matchups = [];
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
      matchups.push([memberIds[i], memberIds[n - 1 - i]]);
    }

    const firstRound = roundNames[0];
    const date = new Date().toISOString().split('T')[0];

    matchups.forEach(m => {
      const data = {
        tournamentId: tId, date, phase: 'playoffs', playoffRound: firstRound,
        score: { team1: 0, team2: 0 }, winner: null,
        shoes: { team1Given: 0, team2Given: 0 }, notes: ''
      };
      if (modality === 'teams' || modality === 'fixed') {
        data.team1Id = m[0]; data.team2Id = m[1];
      } else {
        data.team1 = { player1: m[0], player2: null };
        data.team2 = { player1: m[1], player2: null };
      }
      DB.addTournamentMatch(data);
    });

    // Add third place match if enabled
    if (playoffConfig.thirdPlace && n >= 4) {
      const tpData = {
        tournamentId: tId, date, phase: 'playoffs', playoffRound: 'Tercer Puesto',
        score: { team1: 0, team2: 0 }, winner: null,
        shoes: { team1Given: 0, team2Given: 0 }, notes: 'Partido por tercer puesto'
      };
      if (modality === 'teams' || modality === 'fixed') {
        tpData.team1Id = null; tpData.team2Id = null;
      }
      DB.addTournamentMatch(tpData);
    }

    DB.updateTournament(tId, { phase: 'playoffs' });
    Toast.success(`Playoffs generados: ${matchups.length} encuentros en ${firstRound}`);
    this._loadDetail();
  },

  // =========================================
  // PHASE ADVANCE
  // =========================================
  advancePhase(tId) {
    const t = DB.getTournamentById(tId);
    const phases = ['setup', 'groups', 'rounds', 'playoffs', 'finished'];
    const modality = t.modality || t.type;
    const currentIdx = phases.indexOf(t.phase || 'setup');
    const nextPhase = phases[Math.min(currentIdx + 1, phases.length - 1)];

    const labels = { setup: 'Configuración', groups: 'Fase de Grupos', rounds: 'Jornadas', playoffs: 'Playoffs', finished: 'Finalizado' };
    App.confirmDialog(`¿Avanzar a ${labels[nextPhase]}?`, `El torneo pasará de "${labels[t.phase || 'setup']}" a "${labels[nextPhase]}".`, () => {
      DB.updateTournament(tId, { phase: nextPhase, status: nextPhase === 'finished' ? 'finished' : 'active' });
      Toast.success(`Fase avanzada a: ${labels[nextPhase]}`);
      this._loadDetail();
    });
  },

  // =========================================
  // LIST ACTIONS
  // =========================================
  deleteTournament(id) {
    App.confirmDialog('¿Eliminar torneo?', 'Se eliminarán todos los datos del torneo. Esta acción no se puede deshacer.', () => {
      DB.deleteTournament(id);
      Toast.success('Torneo eliminado');
      this._loadList();
    });
  },

  cloneTournament(id) {
    const newT = DB.cloneTournament(id);
    if (newT) {
      Toast.success(`Torneo clonado: "${newT.name}"`);
      this._loadList();
    }
  },

  // =========================================
  // TEAM STATISTICS TAB
  // =========================================
  _renderTeamStats(tId) {
    const t = DB.getTournamentById(tId);
    const teams = DB.getTournamentTeams(tId).filter(x => !x.isPair);
    const groups = DB.getTournamentGroups(tId);
    const matches = DB.getTournamentMatches(tId);

    if (!teams.length) return `<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">No hay equipos registrados aún.</div></div>`;

    // Per-group standings
    const groupSection = groups.length > 0 ? groups.map(group => {
      const standings = DB.getGroupStandings(tId, group.id);
      const getMemberName = id => DB.getTournamentTeamById(id)?.name || DB.getPlayerById(id)?.name || '?';
      const getMemberColor = id => DB.getTournamentTeamById(id)?.color || null;
      const groupMatches = matches.filter(m => m.groupId === group.id && m.winner);
      const played = groupMatches.length;
      const pending = matches.filter(m => m.groupId === group.id && !m.winner).length;
      return `
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div class="card-title" style="margin:0">📋 ${Utils.escHtml(group.name)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">
            <span class="badge badge-success">${played} jugadas</span>
            ${pending > 0 ? `<span class="badge badge-warning" style="margin-left:6px">${pending} pendientes</span>` : ''}
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Pos</th><th>Equipo</th>
              <th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">E</th><th class="col-num">D</th>
              <th class="col-num">PTS</th><th class="col-num">GF</th><th class="col-num">GC</th><th class="col-num">Dif</th><th class="col-num">EFF%</th>
            </tr></thead>
            <tbody>
              ${standings.length ? standings.map((row, i) => {
                const color = getMemberColor(row.memberId);
                const isQ = i < (t.config?.qualifiersPerGroup || 2);
                return `<tr style="${isQ ? 'background:rgba(0,229,160,0.05)' : ''}">
                  <td><div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i+1}</div></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      ${color ? `<div style="width:12px;height:12px;border-radius:50%;background:${color};flex-shrink:0"></div>` : ''}
                      <span style="font-weight:600">${Utils.escHtml(getMemberName(row.memberId))}</span>
                      ${isQ ? `<span class="badge badge-success" style="font-size:0.65rem;padding:2px 6px">✓ Clasifica</span>` : ''}
                    </div>
                  </td>
                  <td class="col-num">${row.played}</td>
                  <td class="col-num text-success" style="font-weight:700">${row.wins}</td>
                  <td class="col-num">${row.draws}</td>
                  <td class="col-num text-danger">${row.losses}</td>
                  <td class="col-pts">${row.pts}</td>
                  <td class="col-num">${row.ptsFor}</td>
                  <td class="col-num">${row.ptsAgainst}</td>
                  <td class="col-num ${row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-danger' : ''}">${Utils.fmtDiff(row.diff)}</td>
                  <td class="col-num ${row.eff > 50 ? 'col-eff-high' : row.eff < 30 ? 'col-eff-low' : ''}">${row.eff}%</td>
                </tr>`;
              }).join('') : `<tr><td colspan="11"><div class="empty-state"><div class="empty-text">Sin partidas en este grupo.</div></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('') : '';

    // Per-team detailed stats with member breakdown
    const allTeamStats = DB.getAllTournamentTeamStats(tId);
    const teamCards = allTeamStats.map((team, i) => {
      const s = team.stats;
      const pts = s.wins * 3;
      const group = groups.find(g => g.memberIds?.includes(team.id));
      // Member stats from tournament matches where this team played
      const teamMatches = matches.filter(m => m.team1Id === team.id || m.team2Id === team.id);
      const memberStats = {};
      teamMatches.forEach(m => {
        const isT1 = m.team1Id === team.id;
        const myPair = isT1 ? m.team1pair : m.team2pair;
        const won = m.winner === (isT1 ? 'team1' : 'team2');
        if (myPair) {
          [myPair.player1, myPair.player2].filter(Boolean).forEach(pid => {
            if (!memberStats[pid]) memberStats[pid] = { played: 0, wins: 0 };
            memberStats[pid].played++;
            if (won) memberStats[pid].wins++;
          });
        }
      });
      const memberRows = (team.playerIds || []).map(pid => {
        const p = DB.getPlayerById(pid);
        if (!p) return '';
        const ms = memberStats[pid] || { played: 0, wins: 0 };
        const mEff = ms.played > 0 ? ((ms.wins / ms.played) * 100).toFixed(0) : '—';
        return `<tr>
          <td style="padding:6px 8px">${Utils.avatarEl(p.name)}</td>
          <td style="padding:6px 8px;font-size:0.85rem">${Utils.escHtml(p.name)}${p.alias ? ` <span class="text-muted">(${Utils.escHtml(p.alias)})</span>` : ''}</td>
          <td class="col-num" style="padding:6px 8px;font-size:0.85rem">${ms.played}</td>
          <td class="col-num text-success" style="padding:6px 8px;font-size:0.85rem;font-weight:700">${ms.wins}</td>
          <td class="col-num" style="padding:6px 8px;font-size:0.85rem">${ms.played > 0 ? ms.played - ms.wins : '—'}</td>
          <td class="col-num" style="padding:6px 8px;font-size:0.85rem;font-weight:700;color:var(--accent-primary)">${mEff !== '—' ? mEff + '%' : '—'}</td>
        </tr>`;
      }).join('');

      return `
      <div class="card" style="border-left:4px solid ${team.color || 'var(--accent-primary)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:10px">
            ${team.color ? `<div style="width:18px;height:18px;border-radius:50%;background:${team.color};flex-shrink:0"></div>` : ''}
            <div>
              <div style="font-weight:800;font-size:1.1rem">${Utils.escHtml(team.name)}</div>
              ${group ? `<div class="text-xs text-muted">📋 ${Utils.escHtml(group.name)}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div class="kpi-card" style="min-width:0;padding:8px 14px;margin:0">
              <div class="kpi-label" style="font-size:0.7rem">PTS</div>
              <div class="kpi-value" style="font-size:1.2rem;color:var(--accent-primary)">${pts}</div>
            </div>
            <div class="kpi-card" style="min-width:0;padding:8px 14px;margin:0">
              <div class="kpi-label" style="font-size:0.7rem">V-D</div>
              <div class="kpi-value" style="font-size:1rem"><span class="text-success">${s.wins}</span>-<span class="text-danger">${s.losses}</span></div>
            </div>
            <div class="kpi-card" style="min-width:0;padding:8px 14px;margin:0">
              <div class="kpi-label" style="font-size:0.7rem">EFF</div>
              <div class="kpi-value" style="font-size:1.2rem">${s.eff}%</div>
            </div>
            <div class="kpi-card" style="min-width:0;padding:8px 14px;margin:0">
              <div class="kpi-label" style="font-size:0.7rem">DIF</div>
              <div class="kpi-value ${s.pointDiff > 0 ? 'text-success' : s.pointDiff < 0 ? 'text-danger' : ''}" style="font-size:1rem">${Utils.fmtDiff(s.pointDiff)}</div>
            </div>
          </div>
        </div>
        ${(team.playerIds || []).length > 0 ? `
        <div style="border-top:1px solid var(--border-color);padding-top:12px">
          <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:8px">👥 MIEMBROS</div>
          <div class="table-wrapper" style="border-radius:6px;overflow:hidden">
            <table class="data-table" style="margin:0">
              <thead><tr>
                <th></th><th>Jugador</th>
                <th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">D</th><th class="col-num">EFF%</th>
              </tr></thead>
              <tbody>${memberRows}</tbody>
            </table>
          </div>
        </div>` : ''}
      </div>`;
    });

    return `
    ${groupSection ? `<div style="margin-bottom:24px">
      <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);letter-spacing:0.08em;margin-bottom:16px;text-transform:uppercase">Posiciones por Grupo</div>
      ${groupSection}
    </div>` : ''}
    <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);letter-spacing:0.08em;margin-bottom:16px;text-transform:uppercase">Detalle por Equipo</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:16px">
      ${teamCards.join('')}
    </div>`;
  },

  // =========================================
  // IMPORT MATCHES FROM EXCEL
  // =========================================
  openImportMatchesExcel(tId) {
    const t = DB.getTournamentById(tId);
    const modality = t?.modality || t?.type;
    const isTeamBased = modality === 'teams' || modality === 'fixed';
    const groups = DB.getTournamentGroups(tId);

    App.openModal({
      title: '📥 Importar Partidas desde Excel',
      body: `
        <div style="margin-bottom:12px">
          <p class="text-muted text-sm" style="margin:0 0 8px">Columnas requeridas en el Excel:</p>
          <code style="font-size:0.78rem;background:var(--bg-elevated);padding:6px 10px;border-radius:6px;display:block;line-height:1.8">
            ${isTeamBased
              ? 'equipo1 | equipo2 | puntos1 | puntos2 | fecha (opcional) | grupo (opcional)'
              : 'jugador1 | jugador2 | jugador3 | jugador4 | puntos1 | puntos2 | fecha (opcional) | grupo (opcional)'}
          </code>
          ${groups.length > 0 ? `<p class="text-xs text-muted" style="margin-top:6px">Grupos disponibles: <b>${groups.map(g => g.name).join(', ')}</b></p>` : ''}
        </div>
        <div class="dropzone" id="matches-import-drop" onclick="document.getElementById('matches-import-file').click()"
          ondragover="event.preventDefault();this.classList.add('dragover')"
          ondragleave="this.classList.remove('dragover')"
          ondrop="event.preventDefault();this.classList.remove('dragover');TournamentsPage._handleMatchesExcel(event.dataTransfer.files[0],'${tId}','${modality}')">
          <div class="dropzone-icon">📊</div>
          <div class="dropzone-text">Arrastra tu archivo Excel aquí</div>
          <div class="dropzone-hint">.xlsx, .xls, .csv</div>
          <input type="file" id="matches-import-file" accept=".xlsx,.xls,.csv" class="hidden"
            onchange="TournamentsPage._handleMatchesExcel(this.files[0],'${tId}','${modality}')" />
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="TournamentsPage.downloadMatchesTemplate('${modality}')">⬇ Descargar plantilla</button>
        </div>
      `,
      footer: ''
    }, 'modal-md');
  },

  _handleMatchesExcel(file, tId, modality) {
    if (!file) return;
    const groupId = Auth.getGroupId();
    const t = DB.getTournamentById(tId);
    const groups = DB.getTournamentGroups(tId);
    const isTeamBased = modality === 'teams' || modality === 'fixed';
    const reader = new FileReader();

    reader.onload = ev => {
      let rows = [];
      try {
        if (file.name.match(/\.xlsx?$/i)) {
          if (typeof XLSX === 'undefined') throw new Error('XLSX no cargado');
          const wb = XLSX.read(ev.target.result, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map(r => {
            const n = {}; for (let k in r) n[k.toLowerCase().trim().replace(/\s+/g,'')] = r[k]; return n;
          });
        } else {
          rows = Utils.parseCSV(new TextDecoder('utf-8').decode(ev.target.result));
        }
      } catch (err) { Toast.error('Error al leer archivo: ' + err.message); return; }

      const findTeam = name => {
        const n = (name || '').toString().trim().toLowerCase();
        if (!n) return null;
        const teams = isTeamBased
          ? DB.getTournamentTeams(tId).filter(x => modality === 'teams' ? !x.isPair : x.isPair)
          : [];
        return teams.find(te => te.name.toLowerCase() === n) || null;
      };

      const allPlayers = DB.getPlayers(groupId);
      const findPlayer = name => {
        const n = (name || '').toString().trim().toLowerCase();
        if (!n) return null;
        return allPlayers.find(p => p.name.toLowerCase() === n) || null;
      };

      const findGroup = name => {
        if (!name) return null;
        const n = name.toString().trim().toLowerCase();
        return groups.find(g => g.name.toLowerCase() === n || g.name.toLowerCase().includes(n)) || null;
      };

      const today = new Date().toISOString().split('T')[0];
      let added = 0, errors = [];

      rows.forEach((row, idx) => {
        const rawDate = row.fecha || row.date || '';
        const dateVal = rawDate ? rawDate.toString().trim() : today;
        const s1 = parseInt(row.puntos1 || row.score1 || row.goles1 || 0);
        const s2 = parseInt(row.puntos2 || row.score2 || row.goles2 || 0);

        if (isNaN(s1) || isNaN(s2)) { errors.push(`Fila ${idx+2}: puntajes inválidos`); return; }
        if (s1 === s2) { errors.push(`Fila ${idx+2}: empate no permitido`); return; }

        const groupName = row.grupo || row.group || row.phase || '';
        const matchGroup = findGroup(groupName);

        let matchData = {
          tournamentId: tId,
          groupId: matchGroup?.id || null,
          phase: matchGroup ? 'groups' : 'regular',
          date: dateVal,
          score: { team1: s1, team2: s2 },
          winner: s1 > s2 ? 'team1' : 'team2',
          shoes: { team1Given: 0, team2Given: 0 },
          notes: row.notas || row.notes || ''
        };

        if (isTeamBased) {
          const t1Name = row.equipo1 || row.team1 || row.local || '';
          const t2Name = row.equipo2 || row.team2 || row.visitante || '';
          const team1 = findTeam(t1Name);
          const team2 = findTeam(t2Name);
          if (!team1 || !team2) { errors.push(`Fila ${idx+2}: equipos no encontrados ("${t1Name}" / "${t2Name}")`); return; }
          if (team1.id === team2.id) { errors.push(`Fila ${idx+2}: equipo contra sí mismo`); return; }
          matchData.team1Id = team1.id;
          matchData.team2Id = team2.id;
        } else {
          const p1 = findPlayer(row.jugador1 || row.player1 || '');
          const p2 = findPlayer(row.jugador2 || row.player2 || '');
          const p3 = findPlayer(row.jugador3 || row.player3 || '');
          const p4 = findPlayer(row.jugador4 || row.player4 || '');
          if (!p1 || !p2 || !p3 || !p4) { errors.push(`Fila ${idx+2}: jugadores no encontrados`); return; }
          matchData.team1 = { player1: p1.id, player2: p2.id };
          matchData.team2 = { player1: p3.id, player2: p4.id };
        }

        DB.addTournamentMatch(matchData);
        added++;
      });

      let msg = `${added} partidas importadas`;
      if (errors.length) msg += ` (${errors.length} omitidas)`;
      added > 0 ? Toast.success(msg) : Toast.error('Sin partidas importadas. ' + (errors[0] || ''));
      if (errors.length) console.warn('Errores de importación:', errors);
      App.closeModal();
      this._loadDetail();
    };
    reader.readAsArrayBuffer(file);
  },

  downloadMatchesTemplate(modality) {
    const isTeamBased = modality === 'teams' || modality === 'fixed';
    let csv;
    if (isTeamBased) {
      csv = 'equipo1,equipo2,puntos1,puntos2,fecha,grupo,notas\nLos Tigres,Los Leones,200,150,2026-05-10,Grupo A,\nLos Reyes,Los Dragones,180,200,2026-05-10,Grupo B,Partido intenso';
    } else {
      csv = 'jugador1,jugador2,jugador3,jugador4,puntos1,puntos2,fecha,grupo,notas\nJuan Pérez,María López,Carlos Ruiz,Ana Torres,200,150,2026-05-10,Grupo A,\nPedro Gómez,Laura Sosa,Miguel Díaz,Carmen Ruiz,160,200,2026-05-10,Grupo A,';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `plantilla_partidas_${modality}.csv`; a.click();
    URL.revokeObjectURL(url);
  },

  // =========================================
  // EXPORT
  // =========================================
  exportResults(tId) {
    const t = DB.getTournamentById(tId);
    const stats = DB.getAllTournamentPlayerStats(tId);
    const teamStats = DB.getAllTournamentTeamStats(tId);
    const matches = DB.getTournamentMatches(tId);

    let csv = `Torneo: ${t.name}\nFecha: ${t.startDate}\nModalidad: ${t.modality || t.type}\n\n`;

    if (stats.length > 0) {
      csv += 'RANKING INDIVIDUAL\n';
      csv += 'Pos,Jugador,PJ,V,D,EFF%,Dif\n';
      stats.forEach((s, i) => {
        csv += `${i+1},${s.name},${s.stats.played},${s.stats.wins},${s.stats.losses},${s.stats.eff}%,${s.stats.pointDiff}\n`;
      });
      csv += '\n';
    }

    if (teamStats.length > 0) {
      csv += 'RANKING EQUIPOS/PAREJAS\n';
      csv += 'Pos,Nombre,PJ,V,D,EFF%,Dif\n';
      teamStats.forEach((s, i) => {
        csv += `${i+1},${s.name},${s.stats.played},${s.stats.wins},${s.stats.losses},${s.stats.eff}%,${s.stats.pointDiff}\n`;
      });
      csv += '\n';
    }

    csv += 'PARTIDAS\n';
    csv += 'Fecha,Equipo1,Score1,Score2,Equipo2,Ganador,Fase\n';
    matches.forEach(m => {
      let t1n, t2n;
      if (m.team1Id) {
        t1n = DB.getTournamentTeamById(m.team1Id)?.name || '?';
        t2n = DB.getTournamentTeamById(m.team2Id)?.name || '?';
      } else {
        t1n = `${DB.getPlayerById(m.team1?.player1)?.name || '?'} & ${DB.getPlayerById(m.team1?.player2)?.name || '?'}`;
        t2n = `${DB.getPlayerById(m.team2?.player1)?.name || '?'} & ${DB.getPlayerById(m.team2?.player2)?.name || '?'}`;
      }
      const winner = m.winner === 'team1' ? t1n : m.winner === 'team2' ? t2n : 'N/A';
      csv += `${m.date},${t1n},${m.score?.team1 || 0},${m.score?.team2 || 0},${t2n},${winner},${m.phase || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `resultados_${t.name.replace(/\s+/g,'_')}.csv`; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Resultados exportados');
  },

  // =========================================
  // LEGACY COMPATIBILITY (old renamed methods)
  // =========================================
  openManagePlayers(tId) { this.openManageParticipants(tId || this.state.activeTournament); }
};

window.TournamentsPage = TournamentsPage;
