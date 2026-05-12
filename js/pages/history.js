/* =========================================
   HISTORY PAGE — Redesigned v2
   ========================================= */
const HistoryPage = {
  state: { page: 1, player: '', type: '', dateFrom: '', dateTo: '', expanded: null, filtersOpen: false },

  render() {
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId);
    const playerOpts = players.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');

    return `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom:12px">
        <div class="page-header-left">
          <div class="page-header-title">📚 Historial</div>
          <div class="page-header-sub">Registro completo de partidas</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="HistoryPage.toggleFilters()" id="filters-toggle-btn">🔍 Filtros</button>
          <button class="btn btn-ghost btn-sm" onclick="HistoryPage.exportHistory()" title="Exportar">⬇</button>
        </div>
      </div>

      <!-- Filters collapsible -->
      <div class="hs-filters-panel" id="hs-filters-panel" style="display:none">
        <div class="hs-filters-grid">
          <div class="form-group">
            <label class="form-label">Jugador</label>
            <select id="h-player" class="form-select" onchange="HistoryPage.applyFilters()">
              <option value="">Todos</option>
              ${playerOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select id="h-type" class="form-select" onchange="HistoryPage.applyFilters()">
              <option value="">Todos</option>
              <option value="friendly">Amistosos</option>
              <option value="tournament">Torneos</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input type="date" id="h-from" class="form-input" onchange="HistoryPage.applyFilters()" />
          </div>
          <div class="form-group">
            <label class="form-label">Hasta</label>
            <input type="date" id="h-to" class="form-input" onchange="HistoryPage.applyFilters()" />
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="HistoryPage.clearFilters()">✕ Limpiar</button>
      </div>

      <!-- Count bar -->
      <div class="hs-count-bar">
        <span id="history-count" class="hs-count-text">Cargando...</span>
      </div>

      <!-- Cards list -->
      <div id="history-list" class="hs-list"></div>
      <div id="history-pagination" style="padding:4px 0"></div>
    </div>`;
  },

  afterRender() { this.applyFilters(); },

  toggleFilters() {
    this.state.filtersOpen = !this.state.filtersOpen;
    const panel = document.getElementById('hs-filters-panel');
    const btn = document.getElementById('filters-toggle-btn');
    if (panel) panel.style.display = this.state.filtersOpen ? 'block' : 'none';
    if (btn) btn.textContent = this.state.filtersOpen ? '✕ Cerrar' : '🔍 Filtros';
  },

  toggleExpand(id) {
    this.state.expanded = this.state.expanded === id ? null : id;
    this.loadTable();
  },

  getFiltered() {
    const groupId = Auth.getGroupId();
    let matches = DB.getMatches(groupId);
    const { player, type, dateFrom, dateTo } = this.state;
    if (player) matches = matches.filter(m =>
      m.team1.player1 === player || m.team1.player2 === player ||
      m.team2.player1 === player || m.team2.player2 === player
    );
    if (type) matches = matches.filter(m => m.type === type);
    if (dateFrom) matches = matches.filter(m => m.date >= dateFrom);
    if (dateTo) matches = matches.filter(m => m.date <= dateTo);
    return matches;
  },

  applyFilters() {
    this.state.player = document.getElementById('h-player')?.value || '';
    this.state.type = document.getElementById('h-type')?.value || '';
    this.state.dateFrom = document.getElementById('h-from')?.value || '';
    this.state.dateTo = document.getElementById('h-to')?.value || '';
    this.state.page = 1;
    this.loadTable();
  },

  clearFilters() {
    this.state = { ...this.state, player: '', type: '', dateFrom: '', dateTo: '' };
    ['h-player','h-type','h-from','h-to'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.loadTable();
  },

  loadTable() {
    const filtered = this.getFiltered();
    const paged = Utils.paginate(filtered, this.state.page, 20);
    const listEl = document.getElementById('history-list');
    const paginEl = document.getElementById('history-pagination');
    const countEl = document.getElementById('history-count');

    if (countEl) countEl.textContent = `${filtered.length} partida${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`;
    if (!listEl) return;

    if (!paged.items.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">Sin partidas que coincidan</div></div>`;
      return;
    }

    listEl.innerHTML = paged.items.map(m => {
      const t1n = `${Utils.escHtml(Utils.playerName(m.team1.player1))} & ${Utils.escHtml(Utils.playerName(m.team1.player2))}`;
      const t2n = `${Utils.escHtml(Utils.playerName(m.team2.player1))} & ${Utils.escHtml(Utils.playerName(m.team2.player2))}`;
      const w1 = m.winner === 'team1';
      const shoesTotal = (m.shoes?.team1Given || 0) + (m.shoes?.team2Given || 0);
      const isOpen = this.state.expanded === m.id;
      const typeChip = m.type === 'tournament'
        ? `<span class="chip chip-success" style="font-size:0.65rem;padding:1px 7px">🏆 Torneo</span>`
        : `<span class="chip chip-primary" style="font-size:0.65rem;padding:1px 7px">🎮 Amistoso</span>`;

      return `
      <div class="hs-card ${isOpen ? 'hs-card-open' : ''}">
        <div class="hs-card-main" onclick="HistoryPage.toggleExpand('${m.id}')">
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
          <div class="rk-chevron">${isOpen ? '▲' : '▼'}</div>
        </div>
        ${isOpen ? `
        <div class="hs-card-detail">
          <div class="hs-detail-row">
            <span class="hs-detail-label">Tipo</span>
            ${typeChip}
          </div>
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

    if (paginEl) paginEl.innerHTML = paged.total > 20 ? Utils.renderPagination(paged, 'HistoryPage.goPage') : '';
  },

  goPage(p) { this.state.page = p; this.loadTable(); },

  exportHistory() {
    const filtered = this.getFiltered();
    const data = filtered.map(m => ({
      Fecha: m.date, Tipo: m.type,
      'P1 J1': Utils.playerName(m.team1.player1), 'P1 J2': Utils.playerName(m.team1.player2),
      'P2 J1': Utils.playerName(m.team2.player1), 'P2 J2': Utils.playerName(m.team2.player2),
      'Score P1': m.score.team1, 'Score P2': m.score.team2,
      Ganador: m.winner === 'team1' ? 'Pareja 1' : 'Pareja 2',
      Notas: m.notes || ''
    }));
    Utils.exportCSV(data, 'historial.csv');
    Toast.success('Historial exportado');
  }
};
