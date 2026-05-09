/* =========================================
   HISTORY PAGE
   ========================================= */
const HistoryPage = {
  state: { page: 1, player: '', pair: '', type: '', dateFrom: '', dateTo: '' },

  render() {
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId);
    const playerOpts = players.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)}</option>`).join('');

    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">📚 Historial</div>
          <div class="page-header-sub">Historial completo de partidas con filtros avanzados</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="HistoryPage.exportHistory()">⬇ Exportar</button>
        </div>
      </div>

      <!-- Advanced Filters -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-title" style="margin-bottom:12px">🔍 Filtros Avanzados</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Jugador</label>
            <select id="h-player" class="form-select" onchange="HistoryPage.applyFilters()">
              <option value="">Todos los jugadores</option>
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
        <button class="btn btn-ghost btn-sm" onclick="HistoryPage.clearFilters()">✕ Limpiar filtros</button>
      </div>

      <!-- Results -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:8px 12px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between">
          <span id="history-count" style="font-size:0.875rem;color:var(--text-secondary)">Cargando...</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table" id="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pareja 1</th>
                <th>Pareja 2</th>
                <th class="col-num">Resultado</th>
                <th>Ganador</th>
                <th>Tipo</th>
                <th class="col-num">👟</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody id="history-tbody"></tbody>
          </table>
        </div>
        <div style="padding:0 16px" id="history-pagination"></div>
      </div>
    </div>`;
  },

  afterRender() { this.applyFilters(); },

  getFiltered() {
    const groupId = Auth.getGroupId();
    let matches = DB.getMatches(groupId);
    const { player, type, dateFrom, dateTo } = this.state;

    if (player) {
      matches = matches.filter(m =>
        m.team1.player1 === player || m.team1.player2 === player ||
        m.team2.player1 === player || m.team2.player2 === player
      );
    }
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
    document.getElementById('h-player').value = '';
    document.getElementById('h-type').value = '';
    document.getElementById('h-from').value = '';
    document.getElementById('h-to').value = '';
    this.loadTable();
  },

  loadTable() {
    const filtered = this.getFiltered();
    const paged = Utils.paginate(filtered, this.state.page, 20);
    const tbody = document.getElementById('history-tbody');
    const paginEl = document.getElementById('history-pagination');
    const countEl = document.getElementById('history-count');

    if (countEl) countEl.textContent = `${filtered.length} partidas encontradas`;

    if (!tbody) return;
    tbody.innerHTML = paged.items.map(m => {
      const t1n = `${Utils.escHtml(Utils.playerName(m.team1.player1))} & ${Utils.escHtml(Utils.playerName(m.team1.player2))}`;
      const t2n = `${Utils.escHtml(Utils.playerName(m.team2.player1))} & ${Utils.escHtml(Utils.playerName(m.team2.player2))}`;
      const w1 = m.winner === 'team1';
      const shoesTotal = (m.shoes.team1Given || 0) + (m.shoes.team2Given || 0);
      return `<tr>
        <td style="white-space:nowrap">${Utils.fmtDate(m.date)}</td>
        <td><span style="font-weight:${w1?700:400};color:${w1?'var(--accent-success)':'inherit'}">${t1n}</span></td>
        <td><span style="font-weight:${!w1?700:400};color:${!w1?'var(--accent-success)':'inherit'}">${t2n}</span></td>
        <td class="col-num">
          <span style="font-family:var(--font-mono);font-weight:800">
            <span class="${w1?'score-win':'score-lose'}">${m.score.team1}</span> : <span class="${!w1?'score-win':'score-lose'}">${m.score.team2}</span>
          </span>
        </td>
        <td><span class="badge badge-success">✅ ${w1?'P1':'P2'}</span></td>
        <td><span class="chip ${m.type==='tournament'?'chip-success':'chip-primary'}">${m.type==='tournament'?'🏆':'🎮'} ${m.type==='tournament'?'Torneo':'Amistoso'}</span></td>
        <td class="col-num">${shoesTotal > 0 ? `<span class="badge badge-warning">👟 ${shoesTotal}</span>` : '—'}</td>
        <td class="wrap" style="max-width:200px;font-size:0.78rem;color:var(--text-secondary)">${Utils.escHtml(m.notes || '—')}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">Sin partidas que coincidan con los filtros</div></div></td></tr>`;

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
