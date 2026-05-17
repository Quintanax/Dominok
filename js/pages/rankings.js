/* =========================================
   RANKINGS PAGE — Redesigned v2
   ========================================= */
const RankingsPage = {
  state: { tab: 'local', sort: 'eff', dir: 'desc', expanded: null, mobileTab: 'individual' },

  render() {
    return `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom:14px;">
        <div class="page-header-left">
          <div class="page-header-title">🏆 Rankings</div>
          <div class="page-header-sub">Tabla de posiciones</div>
        </div>
        <div class="page-header-actions" style="gap:6px">
          ${Auth.isAdmin() ? `
          <div class="rk-tabs">
            <button class="rk-tab active" id="tab-local" onclick="RankingsPage.setTab('local',this)">🏠 Grupo</button>
            <button class="rk-tab" id="tab-global" onclick="RankingsPage.setTab('global',this)">🌍 Global</button>
          </div>
          ` : ''}
          <button class="btn btn-ghost btn-sm" onclick="RankingsPage.exportRankings()" title="Exportar">⬇</button>
        </div>
      </div>
      <div id="rankings-content"></div>
    </div>`;
  },

  afterRender() { this.renderTab(); },

  setTab(tab, el) {
    this.state.tab = tab;
    this.state.expanded = null;
    document.querySelectorAll('.rk-tab').forEach(b => b.classList.remove('active'));
    el?.classList.add('active');
    this.renderTab();
  },

  renderTab() {
    const el = document.getElementById('rankings-content');
    if (!el) return;
    if (this.state.tab === 'local') {
      const mt = this.state.mobileTab || 'individual';
      el.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:16px;background:var(--bg-elevated);padding:6px;border-radius:var(--radius-lg);width:fit-content">
          <button class="btn btn-sm ${mt==='individual'?'btn-primary':'btn-ghost'}" style="border-radius:var(--radius-md)" onclick="RankingsPage.setMobileTab('individual')">👤 Individual</button>
          <button class="btn btn-sm ${mt==='pairs'?'btn-primary':'btn-ghost'}" style="border-radius:var(--radius-md)" onclick="RankingsPage.setMobileTab('pairs')">👥 Parejas</button>
        </div>
        <div>
          ${mt==='individual' ? this._renderPlayers() : this._renderPairs()}
        </div>
      `;
    } else {
      el.innerHTML = this._renderGlobal();
    }
  },

  setMobileTab(tab) {
    this.state.mobileTab = tab;
    this.state.expanded = null;
    this.renderTab();
  },

  toggleExpand(id) {
    this.state.expanded = this.state.expanded === id ? null : id;
    this.renderTab();
  },

  /* ── PLAYERS ────────────────────────────────── */
  _renderPlayers() {
    const groupId = Auth.getGroupId();
    let allStats = DB.getAllPlayerStats(groupId);
    allStats = Utils.sortArray(allStats, `stats.${this.state.sort}`, this.state.dir);

    if (!allStats.length) {
      return `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">Sin datos de ranking aún</div></div>`;
    }

    const podiumHtml = this._podium(allStats.slice(0,3), (ps) => `
      <div style="font-size:0.95rem;font-weight:800">${Utils.escHtml(ps.name.split(' ')[0])}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">${ps.stats.wins}V · ${ps.stats.losses}D</div>
    `);

    const listHtml = allStats.map((ps, i) => this._playerRow(ps, i)).join('');

    return `
      ${podiumHtml}
      <div class="rk-sort-bar">
        ${[['eff','EFF%'],['wins','V'],['losses','D'],['pointDiff','DP'],['shoesGiven','👟']].map(([k,l]) =>
          `<button class="rk-sort-btn ${this.state.sort===k?'active':''}" onclick="RankingsPage.toggleSort('${k}')">${l}${this.state.sort===k?(this.state.dir==='desc'?' ↓':' ↑'):''}</button>`
        ).join('')}
      </div>
      <div class="rk-list">${listHtml}</div>`;
  },

  _playerRow(ps, i) {
    const st = ps.stats;
    const isOpen = this.state.expanded === ps.id;
    const streakHtml = st.currentStreak > 1
      ? `<span class="streak-badge ${st.currentStreakType==='win'?'streak-win':'streak-loss'}">${st.currentStreakType==='win'?'🔥':'❄️'}${st.currentStreak}</span>`
      : '';
    const diffColor = st.pointDiff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

    return `
    <div class="rk-row ${isOpen?'rk-row-open':''}">
      <div class="rk-row-main" onclick="RankingsPage.toggleExpand('${ps.id}')">
        <div class="rk-pos">
          <div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div>
        </div>
        <div class="avatar avatar-sm" style="background:${Utils.avatarColor(ps.name)};flex-shrink:0">${Utils.initials(ps.name)}</div>
        <div class="rk-name-col">
          <span class="rk-name">${Utils.escHtml(ps.name)}</span>
          ${st.currentStreak > 1 ? `<span class="rk-streak">${streakHtml}</span>` : ''}
        </div>
        <div class="rk-stats-inline">
          <span class="rk-stat text-success"><b>${st.wins}</b><small>V</small></span>
          <span class="rk-stat text-danger"><b>${st.losses}</b><small>D</small></span>
          <span class="rk-stat rk-stat-shoes" style="color:var(--accent-warning)"><b>${st.shoesGiven}</b><small>👟</small></span>
          <span class="rk-stat" style="color:${diffColor}"><b>${Utils.fmtDiff(st.pointDiff)}</b><small>DP</small></span>
        </div>
        <div class="rk-eff-col">
          <span class="rk-eff-val ${st.eff>50?'text-success':st.eff<30?'text-danger':''}">${st.eff}%</span>
          <div class="rk-eff-bar"><div class="rk-eff-fill ${st.eff>=60?'green':st.eff<30?'red':''}" style="width:${st.eff}%"></div></div>
        </div>
        <div class="rk-chevron">${isOpen?'▲':'▼'}</div>
      </div>
      ${isOpen ? `
      <div class="rk-detail">
        <div class="rk-detail-grid">
          <div class="rk-detail-item"><div class="rk-detail-label">Partidas</div><div class="rk-detail-val">${st.played}</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">Victorias</div><div class="rk-detail-val text-success">${st.wins}</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">Derrotas</div><div class="rk-detail-val text-danger">${st.losses}</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">Efectividad</div><div class="rk-detail-val">${st.eff}%</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">Dif. Puntos</div><div class="rk-detail-val" style="color:${diffColor}">${Utils.fmtDiff(st.pointDiff)}</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">👟 Dados</div><div class="rk-detail-val text-warning">${st.shoesGiven}</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">👟 Recibidos</div><div class="rk-detail-val text-danger">${st.shoesReceived}</div></div>
          <div class="rk-detail-item"><div class="rk-detail-label">Racha</div><div class="rk-detail-val">${streakHtml||'—'}</div></div>
        </div>
        <div style="text-align:center;margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="PlayersPage.openProfile('${ps.id}')">Ver perfil completo →</button>
        </div>
      </div>` : ''}
    </div>`;
  },

  /* ── PAIRS ──────────────────────────────────── */
  _renderPairs() {
    const groupId = Auth.getGroupId();
    let pairs = DB.getBestPairs(groupId).filter(p => p.stats.played >= 1);
    
    // Si el criterio de sort no aplica a parejas (ej: pointDiff), usamos 'wins'
    const validSorts = ['eff', 'wins', 'losses', 'played'];
    const currentSort = validSorts.includes(this.state.sort) ? this.state.sort : 'wins';
    
    pairs = Utils.sortArray(pairs, `stats.${currentSort}`, this.state.dir);

    if (!pairs.length) {
      return `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No hay datos de parejas aún</div></div>`;
    }

    const podiumHtml = this._podium(pairs.slice(0,3), (pair) => `
      <div style="font-size:0.85rem;font-weight:800;line-height:1.3">
        ${Utils.escHtml(pair.p1.name.split(' ')[0])}<br>${Utils.escHtml(pair.p2.name.split(' ')[0])}
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">${pair.stats.wins}V · ${pair.stats.losses}D</div>
    `);

    const listHtml = pairs.map((pair, i) => {
      const isOpen = this.state.expanded === `pair-${i}`;
      return `
      <div class="rk-row ${isOpen?'rk-row-open':''}">
        <div class="rk-row-main" onclick="RankingsPage.toggleExpand('pair-${i}')">
          <div class="rk-pos"><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div></div>
          <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
            <div class="avatar avatar-sm" style="background:${Utils.avatarColor(pair.p1.name)}">${Utils.initials(pair.p1.name)}</div>
          </div>
          <div class="rk-name-col">
            <span class="rk-name">${Utils.escHtml(pair.p1.name.split(' ')[0])} &amp; ${Utils.escHtml(pair.p2.name.split(' ')[0])}</span>
          </div>
          <div class="rk-stats-inline">
            <span class="rk-stat text-success"><b>${pair.stats.wins}</b><small>V</small></span>
            <span class="rk-stat text-danger"><b>${pair.stats.losses}</b><small>D</small></span>
          </div>
          <div class="rk-eff-col">
            <span class="rk-eff-val ${pair.stats.eff>50?'text-success':pair.stats.eff<30?'text-danger':''}">${pair.stats.eff}%</span>
            <div class="rk-eff-bar"><div class="rk-eff-fill ${pair.stats.eff>=60?'green':''}" style="width:${pair.stats.eff}%"></div></div>
          </div>
          <div class="rk-chevron">${isOpen?'▲':'▼'}</div>
        </div>
        ${isOpen ? `
        <div class="rk-detail">
          <div class="rk-detail-grid">
            <div class="rk-detail-item"><div class="rk-detail-label">PJ</div><div class="rk-detail-val">${pair.stats.played}</div></div>
            <div class="rk-detail-item"><div class="rk-detail-label">Victorias</div><div class="rk-detail-val text-success">${pair.stats.wins}</div></div>
            <div class="rk-detail-item"><div class="rk-detail-label">Derrotas</div><div class="rk-detail-val text-danger">${pair.stats.losses}</div></div>
            <div class="rk-detail-item"><div class="rk-detail-label">EFF</div><div class="rk-detail-val">${pair.stats.eff}%</div></div>
          </div>
        </div>` : ''}
      </div>`;
    }).join('');

    return `
      ${podiumHtml}
      <div class="rk-sort-bar">
        ${[['eff','EFF%'],['wins','V'],['losses','D'],['played','PJ']].map(([k,l]) =>
          `<button class="rk-sort-btn ${currentSort===k?'active':''}" onclick="RankingsPage.toggleSort('${k}')">${l}${currentSort===k?(this.state.dir==='desc'?' ↓':' ↑'):''}</button>`
        ).join('')}
      </div>
      <div class="rk-list">${listHtml}</div>`;
  },

  /* ── GLOBAL ─────────────────────────────────── */
  _renderGlobal() {
    const groups = DB.getGroups();
    const rows = [];
    for (const g of groups) {
      DB.getAllPlayerStats(g.id).forEach(ps => rows.push({ ...ps, groupName: g.name }));
    }
    rows.sort((a, b) => b.stats.eff - a.stats.eff || b.stats.wins - a.stats.wins);

    if (!rows.length) return `<div class="empty-state"><div class="empty-icon">🌍</div><div class="empty-text">Sin datos globales</div></div>`;

    const podiumHtml = this._podium(rows.slice(0,3), (ps) => `
      <div style="font-size:0.9rem;font-weight:800">${Utils.escHtml(ps.name.split(' ')[0])}</div>
      <div style="font-size:0.72rem;color:var(--text-muted)">${Utils.escHtml(ps.groupName)}</div>
    `);

    const listHtml = rows.map((ps, i) => {
      const isOpen = this.state.expanded === `g-${ps.id}`;
      return `
      <div class="rk-row ${isOpen?'rk-row-open':''}">
        <div class="rk-row-main" onclick="RankingsPage.toggleExpand('g-${ps.id}')">
          <div class="rk-pos"><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div></div>
          <div class="avatar avatar-sm" style="background:${Utils.avatarColor(ps.name)};flex-shrink:0">${Utils.initials(ps.name)}</div>
          <div class="rk-name-col">
            <span class="rk-name">${Utils.escHtml(ps.name)}</span>
            <span class="chip chip-primary" style="font-size:0.65rem;padding:1px 7px">${Utils.escHtml(ps.groupName)}</span>
          </div>
          <div class="rk-stats-inline">
            <span class="rk-stat text-success"><b>${ps.stats.wins}</b><small>V</small></span>
            <span class="rk-stat text-danger"><b>${ps.stats.losses}</b><small>D</small></span>
          </div>
          <div class="rk-eff-col">
            <span class="rk-eff-val ${ps.stats.eff>50?'text-success':ps.stats.eff<30?'text-danger':''}">${ps.stats.eff}%</span>
            <div class="rk-eff-bar"><div class="rk-eff-fill" style="width:${ps.stats.eff}%"></div></div>
          </div>
          <div class="rk-chevron">${isOpen?'▲':'▼'}</div>
        </div>
        ${isOpen ? `
        <div class="rk-detail">
          <div class="rk-detail-grid">
            <div class="rk-detail-item"><div class="rk-detail-label">Partidas</div><div class="rk-detail-val">${ps.stats.played}</div></div>
            <div class="rk-detail-item"><div class="rk-detail-label">Victorias</div><div class="rk-detail-val text-success">${ps.stats.wins}</div></div>
            <div class="rk-detail-item"><div class="rk-detail-label">Derrotas</div><div class="rk-detail-val text-danger">${ps.stats.losses}</div></div>
            <div class="rk-detail-item"><div class="rk-detail-label">EFF</div><div class="rk-detail-val">${ps.stats.eff}%</div></div>
          </div>
        </div>` : ''}
      </div>`;
    }).join('');

    return `${podiumHtml}<div class="rk-list">${listHtml}</div>`;
  },

  /* ── PODIUM HELPER ─────────────────────────── */
  _podium(top3, contentFn) {
    const colors = ['#ffd700','#c0c0c0','#cd7f32'];
    const medals = ['🥇','🥈','🥉'];
    const order = [1, 0, 2]; // center=gold on desktop; on mobile just linear

    return `
    <div class="rk-podium">
      ${[0,1,2].map(i => {
        const ps = top3[i];
        if (!ps) return `<div class="rk-podium-slot rk-podium-${i+1}" style="visibility:hidden"></div>`;
        const col = colors[i];
        return `
        <div class="rk-podium-slot rk-podium-${i+1}" style="border-top:3px solid ${col}">
          <div class="rk-podium-medal">${medals[i]}</div>
          <div class="avatar avatar-md" style="background:${Utils.avatarColor(ps.name)};margin:0 auto 8px;box-shadow:0 0 0 3px ${col}40">${Utils.initials(ps.name)}</div>
          ${contentFn(ps)}
          <div class="rk-podium-eff" style="color:${col}">${ps.stats?.eff ?? ps.stats?.eff}%<span>EFF</span></div>
        </div>`;
      }).join('')}
    </div>`;
  },

  toggleSort(key) {
    if (this.state.sort === key) this.state.dir = this.state.dir === 'asc' ? 'desc' : 'asc';
    else { this.state.sort = key; this.state.dir = 'desc'; }
    this.renderTab();
  },

  exportRankings() {
    const groupId = Auth.getGroupId();
    const allStats = DB.getAllPlayerStats(groupId);
    const data = allStats.map((ps, i) => ({
      Posición: i + 1, Nombre: ps.name, Alias: ps.alias || '',
      Partidas: ps.stats.played, Victorias: ps.stats.wins, Derrotas: ps.stats.losses,
      Efectividad: ps.stats.eff + '%', 'Dif. Puntos': ps.stats.pointDiff,
      'Zapatos dados': ps.stats.shoesGiven
    }));
    Utils.exportCSV(data, 'ranking.csv');
    Toast.success('Ranking exportado');
  }
};
