/* =========================================
   ADMIN DASHBOARD — Global Platform View
   ========================================= */
const AdminDashboardPage = {
  render() {
    return `
    <div class="page-enter">
      <div class="card" style="margin-bottom:20px;background:var(--bg-elevated);border-left:4px solid var(--accent-primary)">
        <h2 style="margin:0 0 10px">🌐 Panel de Control Global</h2>
        <p style="color:var(--text-muted);margin:0;font-size:0.9rem">
          Vista administrativa de toda la plataforma DominoStats Pro. Estadísticas conjuntas de todos los grupos y equipos registrados.
        </p>
      </div>
      <div id="admin-stats-container">Cargando métricas...</div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">🏆 Top 5 Grupos (Por Actividad)</div>
          <div id="admin-groups-list"></div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">👥 Top 5 Jugadores a Nivel Global</div>
          <div id="admin-players-list"></div>
        </div>
      </div>
    </div>`;
  },

  afterRender() {
    this._renderStats();
  },

  _renderStats() {
    const users = DB.getUsers();
    const groups = DB.getGroups();
    const allMatches = DB.getMatches(null); // null means all groups
    const allPlayers = DB.getPlayers(null);

    const totalZapatos = allMatches.filter(m => m.score.team1 === 0 || m.score.team2 === 0).length;

    const kpi = (label, value, icon, color) => `
      <div class="stat-card" style="border-top:3px solid ${color}">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:2rem">${icon}</div>
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">${label}</div>
            <div style="font-size:1.8rem;font-weight:900;line-height:1;margin-top:4px">${value}</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-stats-container').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        ${kpi('Usuarios', users.length, '👤', 'var(--accent-primary)')}
        ${kpi('Equipos Creados', groups.length, '🛡️', 'var(--accent-info)')}
        ${kpi('Jugadores', allPlayers.length, '👥', 'var(--accent-success)')}
        ${kpi('Partidas Registradas', allMatches.length, '🎮', 'var(--accent-warning)')}
        ${kpi('Zapatos Globales', totalZapatos, '👟', 'var(--accent-danger)')}
      </div>
    `;

    // Group activity list
    const groupMatches = {};
    groups.forEach(g => { groupMatches[g.id] = { name: g.name, count: 0, users: 0 }; });
    allMatches.forEach(m => { if(groupMatches[m.groupId]) groupMatches[m.groupId].count++; });
    users.forEach(u => { if(u.groupId && groupMatches[u.groupId]) groupMatches[u.groupId].users++; });
    
    const topGroups = Object.values(groupMatches).sort((a, b) => b.count - a.count).slice(0, 5);
    document.getElementById('admin-groups-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Grupo / Equipo</th><th class="col-num">Miembros</th><th class="col-num">Partidas</th></tr></thead>
        <tbody>
          ${topGroups.length ? topGroups.map((g, i) => `<tr>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div> <strong>${Utils.escHtml(g.name)}</strong></div></td>
            <td class="col-num">${g.users}</td>
            <td class="col-num text-success" style="font-weight:bold">${g.count}</td>
          </tr>`).join('') : '<tr><td colspan="3" class="text-muted">No hay grupos</td></tr>'}
        </tbody>
      </table>
    `;

    // Top global players
    const playersMap = {};
    allMatches.forEach(m => {
        const p1 = m.team1.player1, p2 = m.team1.player2, p3 = m.team2.player1, p4 = m.team2.player2;
        [p1, p2, p3, p4].filter(Boolean).forEach(id => {
            if (!playersMap[id]) playersMap[id] = { name: DB.getPlayerById(id)?.name || '?', wins: 0, played: 0 };
            playersMap[id].played++;
            const inT1 = id === p1 || id === p2;
            if ((inT1 && m.winner === 'team1') || (!inT1 && m.winner === 'team2')) {
                playersMap[id].wins++;
            }
        });
    });

    const topPlayers = Object.values(playersMap)
        .filter(p => p.played >= 5) // At least 5 matches to qualify
        .sort((a,b) => (b.wins/b.played) - (a.wins/a.played) || b.wins - a.wins)
        .slice(0, 5);

    document.getElementById('admin-players-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Jugador</th><th class="col-num">PJ</th><th class="col-num">Victorias</th><th>WR %</th></tr></thead>
        <tbody>
          ${topPlayers.length ? topPlayers.map((p, i) => `<tr>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div> <span>${Utils.avatarEl(p.name)} ${Utils.escHtml(p.name)}</span></div></td>
            <td class="col-num">${p.played}</td>
            <td class="col-num text-success">${p.wins}</td>
            <td><span class="eff-pct">${((p.wins/p.played)*100).toFixed(1)}%</span></td>
          </tr>`).join('') : '<tr><td colspan="4" class="text-muted">Faltan datos (min 5 PJ)</td></tr>'}
        </tbody>
      </table>
    `;
  }
};
