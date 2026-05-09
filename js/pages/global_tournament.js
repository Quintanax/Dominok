/* =========================================
   GLOBAL TOURNAMENT — Copa Inter-Grupos
   ========================================= */
const GlobalTournamentPage = {
  render() {
    return `
    <div class="page-enter">
      <div class="card" style="margin-bottom:20px;background:var(--bg-elevated);border-left:4px solid var(--accent-warning)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin:0 0 10px">🌍 Copa Inter-Grupos (Torneos Globales)</h2>
            <p style="color:var(--text-muted);margin:0;font-size:0.9rem">
              Crea y gestiona torneos donde los participantes no son jugadores individuales, sino los <strong>Grupos/Equipos</strong> de la plataforma.
            </p>
          </div>
          <button class="btn btn-warning" onclick="GlobalTournamentPage.openCreateModal()">🌍 Nuevo Torneo Global</button>
        </div>
      </div>
      
      <div id="global-tournaments-list" style="display:flex;flex-direction:column;gap:16px"></div>
    </div>`;
  },

  afterRender() {
    this._renderTournaments();
  },

  _renderTournaments() {
    // We use a special groupId "GLOBAL" for inter-group tournaments
    const tournaments = DB.getTournaments().filter(t => t.isGlobal === true);
    const el = document.getElementById('global-tournaments-list');
    
    if (!tournaments.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌍</div>
          <div class="empty-text">No hay torneos globales activos</div>
          <p class="text-sm text-muted">Haz clic en "Nuevo Torneo Global" para iniciar una Copa Inter-Grupos.</p>
        </div>`;
      return;
    }

    el.innerHTML = tournaments.map(t => {
      const teams = DB.getTournamentTeams(t.id);
      const matches = DB.getTournamentMatches(t.id);
      const completed = matches.filter(m => m.status === 'completed').length;
      return `
      <div class="card" style="border:1px solid var(--border-color)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px">
          <div>
            <h3 style="margin:0 0 4px;display:flex;align-items:center;gap:8px">🏆 ${Utils.escHtml(t.name)}</h3>
            <span class="badge ${t.status==='active'?'badge-success':'badge-gray'}">${t.status==='active'?'En Curso':'Finalizado'}</span>
            <span class="text-xs text-muted" style="margin-left:8px">${t.format === 'league' ? 'Liga' : 'Eliminatoria'}</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="GlobalTournamentPage.viewTournament('${t.id}')">Ver Torneo &rarr;</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;text-align:center">
          <div><div class="text-xs text-muted">GRUPOS</div><div style="font-weight:900;font-size:1.2rem">${teams.length}</div></div>
          <div><div class="text-xs text-muted">JUEGOS</div><div style="font-weight:900;font-size:1.2rem">${completed} / ${matches.length}</div></div>
          <div><div class="text-xs text-muted">PROGRESO</div><div style="font-weight:900;font-size:1.2rem">${matches.length?Math.round(completed/matches.length*100):0}%</div></div>
        </div>
      </div>`;
    }).join('');
  },

  openCreateModal() {
    const groups = DB.getGroups().filter(g => g.active);
    App.openModal({
      title: '🌍 Crear Copa Inter-Grupos',
      body: `
        <form id="form-create-global-tournament" onsubmit="GlobalTournamentPage.createTournament(event)">
          <div class="form-group">
            <label class="form-label">Nombre del Torneo Múltiple</label>
            <input type="text" id="gt-name" class="form-input" required placeholder="Ej. Copa Mundial DominoStats 2026">
          </div>
          <div class="form-group">
            <label class="form-label">Formato</label>
            <select id="gt-format" class="form-select">
              <option value="league">Liga (Todos contra todos)</option>
              <option value="knockout">Eliminatoria Directa</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Selecciona los Grupos/Equipos Participantes</label>
            <div style="background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:6px;max-height:200px;overflow-y:auto;padding:12px">
              ${groups.map(g => `
                <div style="display:flex;align-items:center;margin-bottom:8px">
                  <input type="checkbox" id="gt-g-${g.id}" value="${g.id}" style="margin-right:8px" checked>
                  <label for="gt-g-${g.id}">${Utils.escHtml(g.name)}</label>
                </div>
              `).join('')}
            </div>
            <p class="text-xs text-muted" style="margin-top:6px">Se requiere un mínimo de 2 grupos para crear el torneo.</p>
          </div>
        </form>`,
      footer: `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button type="submit" form="form-create-global-tournament" class="btn btn-warning">Crear Copa</button>`
    });
  },

  createTournament(e) {
    e.preventDefault();
    const name = document.getElementById('gt-name').value;
    const format = document.getElementById('gt-format').value;
    const selectedGroupIds = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);

    if (selectedGroupIds.length < 2) {
      return Toast.error('Selecciona al menos 2 grupos para participar.');
    }

    const t = DB.addTournament({
      name,
      format,
      type: 'teams',
      status: 'active',
      isGlobal: true, 
      groupId: 'GLOBAL',
      startDate: new Date().toISOString().split('T')[0]
    });

    // Create a tournament team for each selected Group
    selectedGroupIds.forEach(gid => {
      const groupData = DB.getGroupById(gid);
      DB.addTournamentTeam({
        tournamentId: t.id,
        name: groupData.name,
        color: '#ffb800', // Default global gold
        isGroupRef: true,
        groupIdRef: gid
      });
    });

    // Auto-generate matches
    const teams = DB.getTournamentTeams(t.id);
    if (format === 'league') {
      const fixtures = DB.generateRoundRobin(teams.map(x=>x.id));
      fixtures.forEach(f => {
        DB.addTournamentMatch({
          tournamentId: t.id,
          team1Id: f.team1Id,
          team2Id: f.team2Id,
          status: 'pending'
        });
      });
    } else {
      const rounds = DB.generateBracket(teams.map(x=>x.id));
      rounds.forEach(round => {
        round.forEach(m => {
          DB.addTournamentMatch({
            tournamentId: t.id,
            team1Id: m.team1Id,
            team2Id: m.team2Id,
            status: 'pending',
            round: m.roundNumber
          });
        });
      });
    }

    App.closeModal();
    Toast.success('Copa Inter-Grupos iniciada');
    this._renderTournaments();
  },

  viewTournament(id) {
    // Navigate to tournament detail using the standard tournaments module,
    // which operates dynamically based on the passed ID.
    App.navigate('tournaments');
    setTimeout(() => {
        if(window.TournamentsPage && window.TournamentsPage.showDetail) {
            window.TournamentsPage.showDetail(id);
        }
    }, 100);
  }
};
