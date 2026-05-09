/* =========================================
   MATCHES PAGE — Register & Manage Matches
   ========================================= */
const MatchesPage = {
  state: { page: 1, sort: 'date', dir: 'desc', filter: 'all', search: '' },

  render() {
    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">🎮 Partidas</div>
          <div class="page-header-sub">Gestión y registro de partidas</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="MatchesPage.exportMatches()">⬇ Exportar</button>
          <button class="btn btn-secondary btn-sm" onclick="GeminiOCR.openUploadModal()" title="Cargar resultados desde imagen">📷 Cargar Imagen</button>
          <button class="btn btn-primary" onclick="MatchesPage.openNew()">+ Nueva Partida</button>
        </div>
      </div>

      <div class="filters-bar">
        <div class="filter-pill active" id="filter-all" onclick="MatchesPage.setFilter('all',this)">Todas</div>
        <div class="filter-pill" id="filter-today" onclick="MatchesPage.setFilter('today',this)">Hoy</div>
        <div class="filter-pill" id="filter-week" onclick="MatchesPage.setFilter('week',this)">Esta semana</div>
        <div class="filters-spacer"></div>
        <div class="search-bar" style="max-width:200px">
          <span class="search-icon">🔍</span>
          <input class="search-input" placeholder="Buscar..." oninput="MatchesPage.setSearch(this.value)" />
        </div>
      </div>

      <!-- Table -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrapper">
          <table class="data-table" id="matches-table">
            <thead>
              <tr>
                <th onclick="MatchesPage.setSort('date')" class="sorted">Fecha ▾</th>
                <th>Pareja 1</th>
                <th>Pareja 2</th>
                <th class="col-num">Resultado</th>
                <th>Ganador</th>
                <th class="col-num">👟</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="matches-tbody">
              <tr><td colspan="8"><div class="empty-state"><div class="spinner"></div></div></td></tr>
            </tbody>
          </table>
        </div>
        <div style="padding:0 16px" id="matches-pagination"></div>
      </div>
    </div>`;
  },

  afterRender() { this.loadTable(); },

  getFiltered() {
    const groupId = Auth.getGroupId();
    let matches = DB.getMatches(groupId).filter(m => m.type === 'friendly' || !m.type);
    const { filter, search } = this.state;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];

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
    const tbody = document.getElementById('matches-tbody');
    const paginEl = document.getElementById('matches-pagination');
    if (!tbody) return;

    tbody.innerHTML = paged.items.map(m => {
      const p1_t1 = m.team1.player1Name || Utils.playerName(m.team1.player1);
      const p2_t1 = m.team1.player2Name || Utils.playerName(m.team1.player2);
      const p1_t2 = m.team2.player1Name || Utils.playerName(m.team2.player1);
      const p2_t2 = m.team2.player2Name || Utils.playerName(m.team2.player2);
      const t1n = `${Utils.escHtml(p1_t1)} & ${Utils.escHtml(p2_t1)}`;
      const t2n = `${Utils.escHtml(p1_t2)} & ${Utils.escHtml(p2_t2)}`;
      const w1 = m.winner === 'team1';
      const shoesInfo = ((m.shoes && m.shoes.team1Given) || 0) + ((m.shoes && m.shoes.team2Given) || 0);
      return `<tr>
        <td>${Utils.fmtDate(m.date)}</td>
        <td>
          <div class="match-pair">${t1n}</div>
        </td>
        <td>
          <div class="match-pair">${t2n}</div>
        </td>
        <td class="col-num">
          <span class="${w1 ? 'score-win' : 'score-lose'}" style="font-weight:800;font-family:var(--font-mono)">${m.score.team1}</span>
          <span style="color:var(--text-muted)"> : </span>
          <span class="${!w1 ? 'score-win' : 'score-lose'}" style="font-weight:800;font-family:var(--font-mono)">${m.score.team2}</span>
        </td>
        <td><span class="badge badge-success">✅ ${w1 ? 'Pareja 1' : 'Pareja 2'}</span></td>
        <td class="col-num">${shoesInfo > 0 ? `<span class="badge badge-warning">👟 ${shoesInfo}</span>` : '—'}</td>
        <td>
          <div class="row-actions">
            <button class="row-action-btn" onclick="MatchesPage.openEdit('${m.id}')" title="Editar">✏️</button>
            <button class="row-action-btn danger" onclick="MatchesPage.confirmDelete('${m.id}')" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🎮</div><div class="empty-text">No hay partidas que mostrar</div></div></td></tr>`;

    if (paginEl) paginEl.innerHTML = paged.total > 15 ? Utils.renderPagination(paged, 'MatchesPage.goPage') : '';
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
    const sel = (selected) => players.map(p =>
      `<option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${Utils.escHtml(p.name)} (${Utils.escHtml(p.alias || '—')})</option>`
    ).join('');
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
              <input type="date" id="m-date" class="form-input" value="${match?.date || new Date().toISOString().split('T')[0]}" required />
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
                <label class="form-label">Puntos Pareja 1</label>
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
                <label class="form-label">Puntos Pareja 2</label>
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
            <button type="submit" class="btn btn-primary">${isEdit ? '💾 Guardar' : '🎮 Registrar Amistoso'}</button>
          </div>
        </form>`,
      footer: ''
    };
  },

  saveMatch(e, existingId) {
    e.preventDefault();
    const t1p1 = document.getElementById('m-t1p1').value;
    const t1p2 = document.getElementById('m-t1p2').value;
    const t2p1 = document.getElementById('m-t2p1').value;
    const t2p2 = document.getElementById('m-t2p2').value;
    const s1 = parseInt(document.getElementById('m-s1').value);
    const s2 = parseInt(document.getElementById('m-s2').value);

    const players = [t1p1, t1p2, t2p1, t2p2];
    if (new Set(players).size < 4) { Toast.error('Los 4 jugadores deben ser diferentes.'); return; }
    if (isNaN(s1) || isNaN(s2) || s1 === s2) { Toast.error('El resultado no puede ser empate. Verifica los puntos.'); return; }

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

    if (existingId) { DB.updateMatch(existingId, matchData); Toast.success('Partida actualizada'); }
    else { DB.addMatch(matchData); Toast.success('Partida registrada'); }

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
      Fecha: m.date,
      Tipo: m.type,
      'Pareja 1 J1': Utils.playerName(m.team1.player1),
      'Pareja 1 J2': Utils.playerName(m.team1.player2),
      'Pareja 2 J1': Utils.playerName(m.team2.player1),
      'Pareja 2 J2': Utils.playerName(m.team2.player2),
      'Puntos P1': m.score.team1,
      'Puntos P2': m.score.team2,
      Ganador: m.winner === 'team1' ? 'Pareja 1' : 'Pareja 2',
      'Zapatos P1': m.shoes.team1Given,
      'Zapatos P2': m.shoes.team2Given,
    }));
    Utils.exportCSV(data, 'partidas.csv');
    Toast.success('Exportado a CSV');
  }
};
