/* =========================================
   RANKINGS PAGE
   ========================================= */
const RankingsPage = {
  state: { tab: 'players', sort: 'eff', dir: 'desc' },

  render() {
    return `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom:16px;">
        <div class="page-header-left">
          <div class="page-header-title">🏆 Rankings</div>
          <div class="page-header-sub">Tabla de posiciones de tu equipo</div>
        </div>
        <div class="page-header-actions" style="display:flex;gap:8px">
          <div class="tabs" style="border-radius: var(--radius-md); padding: 4px; background: rgba(0,0,0,0.1); margin: 0; border: 1px solid var(--border-color);">
            <button class="tab-btn active" id="tab-players" onclick="RankingsPage.setTab('players',this)">👤 Jugadores</button>
            <button class="tab-btn" id="tab-pairs" onclick="RankingsPage.setTab('pairs',this)">👥 Parejas</button>
            ${Auth.isAdmin() ? `<button class="tab-btn" id="tab-global" onclick="RankingsPage.setTab('global',this)">🌍 Global</button>` : ''}
          </div>
          <button class="btn btn-ghost btn-sm" onclick="RankingsPage.exportRankings()">⬇ Exportar</button>
        </div>
      </div>

      <div id="rankings-content"></div>
    </div>`;
  },

  afterRender() { this.renderTab(); },

  setTab(tab, el) {
    this.state.tab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    el?.classList.add('active');
    this.renderTab();
  },

  renderTab() {
    const el = document.getElementById('rankings-content');
    if (!el) return;

    if (this.state.tab === 'players') {
      el.innerHTML = this._renderPlayersRanking();
    } else if (this.state.tab === 'pairs') {
      el.innerHTML = this._renderPairsRanking();
    } else {
      el.innerHTML = this._renderGlobalRanking();
    }
  },

  _renderPlayersRanking() {
    const groupId = Auth.getGroupId();
    let allStats = DB.getAllPlayerStats(groupId);
    allStats = Utils.sortArray(allStats, `stats.${this.state.sort}`, this.state.dir);

    if (allStats.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">Sin datos de ranking aún</div></div>`;
    }

    const top3 = allStats.slice(0, 3);

    return `
      <!-- Top 3 Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:24px">
        ${[top3[0], top3[1], top3[2]].map((ps, i) => {
          if (!ps) return '<div style="visibility:hidden"></div>';
          const r = i===0?1:i===1?2:3;
          const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
          const col = colors[i];
          const st = ps.stats;
          return `
          <div class="kpi-card" style="display:flex;align-items:center;gap:16px;border-top:3px solid ${col};position:relative;z-index:1;background:var(--bg-card);overflow:hidden" onclick="PlayersPage.openProfile('${ps.id}')">
            <div style="position:absolute;right:-15px;top:-15px;font-size:6rem;opacity:0.04;z-index:-1">${r===1?'🥇':r===2?'🥈':'🥉'}</div>
            <div style="position:relative">
              <div class="avatar avatar-lg" style="background:${Utils.avatarColor(ps.name)};width:64px;height:64px;font-size:1.6rem">${Utils.initials(ps.name)}</div>
              <div style="position:absolute;bottom:-6px;right:-6px;background:${col};color:${r===1?'#000':'#fff'};font-weight:900;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;border:3px solid var(--bg-card);box-shadow:0 2px 4px rgba(0,0,0,0.3)">${r}</div>
            </div>
            <div style="flex:1;z-index:2">
              <div style="font-weight:800;font-size:1.1rem;color:var(--text-primary);margin-bottom:2px">${Utils.escHtml(ps.name.split(' ')[0])}</div>
              <div style="color:${col};font-size:1.4rem;font-weight:900;line-height:1;margin-bottom:4px;text-shadow: 0 0 10px ${col}40">${st.eff}% <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);text-shadow:none">EFF</span></div>
              <div class="text-xs text-muted" style="font-weight:600"><span class="text-success">${st.wins} V</span> &bull; <span class="text-danger">${st.losses} D</span> &bull; PJ: ${st.played}</div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Full Table -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th class="col-num" onclick="RankingsPage.toggleSort('played')">PJ</th>
                <th class="col-num" onclick="RankingsPage.toggleSort('wins')">V</th>
                <th class="col-num" onclick="RankingsPage.toggleSort('losses')">D</th>
                <th class="col-num" onclick="RankingsPage.toggleSort('pointDiff')">DP</th>
                <th class="col-num" onclick="RankingsPage.toggleSort('shoesGiven')">👟 D</th>
                <th class="col-num" onclick="RankingsPage.toggleSort('shoesReceived')">👟 R</th>
                <th>Efectividad</th>
                <th>Racha</th>
              </tr>
            </thead>
            <tbody>
              ${allStats.map((ps, i) => {
                const st = ps.stats;
                const streakHtml = st.currentStreak > 1
                  ? `<span class="streak-badge ${st.currentStreakType==='win'?'streak-win':'streak-loss'}">${st.currentStreakType==='win'?'🔥':'❄️'} ${st.currentStreak}</span>`
                  : '<span class="text-muted">—</span>';
                return `<tr style="cursor:pointer" onclick="PlayersPage.openProfile('${ps.id}')">
                  <td><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div></td>
                  <td>
                    <div class="player-cell">
                      ${Utils.avatarEl(ps.name)}
                      <div class="player-cell-info">
                        <div class="player-cell-name">${Utils.escHtml(ps.name)}</div>
                        <div class="player-cell-alias">${Utils.escHtml(ps.alias||'—')}</div>
                      </div>
                    </div>
                  </td>
                  <td class="col-num">${st.played}</td>
                  <td class="col-num text-success semibold">${st.wins}</td>
                  <td class="col-num text-danger">${st.losses}</td>
                  <td class="col-num ${st.pointDiff>=0?'text-success':'text-danger'}">${Utils.fmtDiff(st.pointDiff)}</td>
                  <td class="col-num text-warning">${st.shoesGiven}</td>
                  <td class="col-num text-danger">${st.shoesReceived}</td>
                  <td>
                    <div class="eff-bar">
                      <div class="progress-bar" style="flex:1">
                        <div class="progress-fill ${st.eff>=60?'green':st.eff>=40?'':'red'}" style="width:${st.eff}%"></div>
                      </div>
                      <span class="eff-pct ${st.eff > 50 ? 'col-eff-high' : st.eff < 30 ? 'col-eff-low' : ''}">${st.eff}%</span>
                    </div>
                  </td>
                  <td>${streakHtml}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderPairsRanking() {
    const groupId = Auth.getGroupId();
    const pairs = DB.getBestPairs(groupId).filter(p => p.stats.played >= 2);

    if (!pairs.length) {
      return `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No hay datos de parejas aún</div></div>`;
    }

    const top3 = pairs.slice(0,3);
    return `
      <!-- Top 3 Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:24px">
        ${[top3[0], top3[1], top3[2]].map((pair, i) => {
          if (!pair) return '<div style="visibility:hidden"></div>';
          const r = i===0?1:i===1?2:3;
          const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
          const col = colors[i];
          const st = pair.stats;
          return `
          <div class="kpi-card" style="display:flex;align-items:center;gap:16px;border-top:3px solid ${col};position:relative;z-index:1;background:var(--bg-card);overflow:hidden">
            <div style="position:absolute;right:-15px;top:-15px;font-size:6rem;opacity:0.04;z-index:-1">${r===1?'🥇':r===2?'🥈':'🥉'}</div>
            <div style="position:relative;display:flex;margin-left:8px">
              <div class="avatar avatar-md" style="background:${Utils.avatarColor(pair.p1.name)};border:2px solid var(--bg-card);position:relative;z-index:2">${Utils.initials(pair.p1.name)}</div>
              <div class="avatar avatar-md" style="background:${Utils.avatarColor(pair.p2.name)};border:2px solid var(--bg-card);margin-left:-12px;position:relative;z-index:1">${Utils.initials(pair.p2.name)}</div>
              <div style="position:absolute;bottom:-6px;right:-10px;background:${col};color:${r===1?'#000':'#fff'};font-weight:900;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;border:2px solid var(--bg-card);box-shadow:0 2px 4px rgba(0,0,0,0.3);z-index:3">${r}</div>
            </div>
            <div style="flex:1;z-index:2;margin-left:8px">
              <div style="font-weight:800;font-size:0.95rem;color:var(--text-primary);margin-bottom:2px;line-height:1.2">
                ${Utils.escHtml(pair.p1.name.split(' ')[0])} &<br>${Utils.escHtml(pair.p2.name.split(' ')[0])}
              </div>
              <div style="color:${col};font-size:1.3rem;font-weight:900;line-height:1;margin-bottom:4px;text-shadow: 0 0 10px ${col}40">${st.eff}% <span style="font-size:0.7rem;font-weight:600;color:var(--text-muted);text-shadow:none">EFF</span></div>
              <div class="text-xs text-muted" style="font-weight:600"><span class="text-success">${st.wins} V</span> &bull; <span class="text-danger">${st.losses} D</span> &bull; PJ: ${st.played}</div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pareja</th>
                <th class="col-num">Jugadas</th>
                <th class="col-num">Victorias</th>
                <th class="col-num">Derrotas</th>
                <th>Efectividad</th>
              </tr>
            </thead>
            <tbody>
              ${pairs.map((pair, i) => `
                <tr>
                  <td><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div></td>
                  <td>
                    <div class="player-cell">
                      ${Utils.avatarEl(pair.p1.name)}
                      ${Utils.avatarEl(pair.p2.name)}
                      <div class="player-cell-info">
                        <div class="player-cell-name">${Utils.escHtml(pair.p1.name)} & ${Utils.escHtml(pair.p2.name)}</div>
                        <div class="player-cell-alias">${Utils.escHtml(pair.p1.alias||'')} & ${Utils.escHtml(pair.p2.alias||'')}</div>
                      </div>
                    </div>
                  </td>
                  <td class="col-num">${pair.stats.played}</td>
                  <td class="col-num text-success semibold">${pair.stats.wins}</td>
                  <td class="col-num text-danger">${pair.stats.losses}</td>
                  <td>
                    <div class="eff-bar">
                      <div class="progress-bar" style="flex:1">
                        <div class="progress-fill ${pair.stats.eff>=60?'green':''}" style="width:${pair.stats.eff}%"></div>
                      </div>
                      <span class="eff-pct ${pair.stats.eff > 50 ? 'col-eff-high' : pair.stats.eff < 30 ? 'col-eff-low' : ''}">${pair.stats.eff}%</span>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderGlobalRanking() {
    // All groups
    const groups = DB.getGroups();
    const rows = [];
    for (const g of groups) {
      const stats = DB.getAllPlayerStats(g.id);
      stats.forEach(ps => rows.push({ ...ps, groupName: g.name }));
    }
    rows.sort((a, b) => b.stats.eff - a.stats.eff || b.stats.wins - a.stats.wins);

    const top3 = rows.slice(0,3);

    return `
      <!-- Top 3 Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:24px">
        ${[top3[0], top3[1], top3[2]].map((ps, i) => {
          if (!ps) return '<div style="visibility:hidden"></div>';
          const r = i===0?1:i===1?2:3;
          const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
          const col = colors[i];
          const st = ps.stats;
          return `
          <div class="kpi-card" style="display:flex;align-items:center;gap:16px;border-top:3px solid ${col};position:relative;z-index:1;background:var(--bg-card);overflow:hidden">
            <div style="position:absolute;right:-15px;top:-15px;font-size:6rem;opacity:0.04;z-index:-1">${r===1?'🥇':r===2?'🥈':'🥉'}</div>
            <div style="position:relative">
              <div class="avatar avatar-lg" style="background:${Utils.avatarColor(ps.name)};width:64px;height:64px;font-size:1.6rem">${Utils.initials(ps.name)}</div>
              <div style="position:absolute;bottom:-6px;right:-6px;background:${col};color:${r===1?'#000':'#fff'};font-weight:900;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;border:3px solid var(--bg-card);box-shadow:0 2px 4px rgba(0,0,0,0.3)">${r}</div>
            </div>
            <div style="flex:1;z-index:2">
              <div style="font-weight:800;font-size:1.1rem;color:var(--text-primary);margin-bottom:2px">${Utils.escHtml(ps.name.split(' ')[0])}</div>
              <div style="color:${col};font-size:1.4rem;font-weight:900;line-height:1;margin-bottom:4px;text-shadow: 0 0 10px ${col}40">${st.eff}% <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);text-shadow:none">EFF</span></div>
              <div class="text-xs text-muted" style="font-weight:600"><span class="text-success">${st.wins} V</span> &bull; <span class="text-danger">${st.losses} D</span> &bull; PJ: ${st.played} &bull; ${Utils.escHtml(ps.groupName)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Grupo</th>
                <th class="col-num">PJ</th>
                <th class="col-num">V</th>
                <th>Efectividad</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((ps, i) => `
                <tr>
                  <td><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div></td>
                  <td>
                    <div class="player-cell">
                      ${Utils.avatarEl(ps.name)}
                      <div class="player-cell-name">${Utils.escHtml(ps.name)}</div>
                    </div>
                  </td>
                  <td><span class="chip chip-primary">${Utils.escHtml(ps.groupName)}</span></td>
                  <td class="col-num">${ps.stats.played}</td>
                  <td class="col-num text-success semibold">${ps.stats.wins}</td>
                  <td>
                    <div class="eff-bar">
                      <div class="progress-bar" style="flex:1">
                        <div class="progress-fill" style="width:${ps.stats.eff}%"></div>
                      </div>
                      <span class="eff-pct ${ps.stats.eff > 50 ? 'col-eff-high' : ps.stats.eff < 30 ? 'col-eff-low' : ''}">${ps.stats.eff}%</span>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
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
