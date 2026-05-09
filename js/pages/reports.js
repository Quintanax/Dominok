/* =========================================
   REPORTS PAGE
   ========================================= */
const ReportsPage = {
  render() {
    const groupId = Auth.getGroupId();
    const allStats = DB.getAllPlayerStats(groupId);
    const matches = DB.getMatches(groupId);
    const monthly = DB.getMonthlyStats(groupId);

    const totalGames = matches.length;
    const avgScore = totalGames > 0
      ? (matches.reduce((s, m) => s + m.score.team1 + m.score.team2, 0) / (totalGames * 2)).toFixed(0)
      : 0;
    const totalShoes = matches.reduce((s, m) => s + (m.shoes.team1Given||0) + (m.shoes.team2Given||0), 0);
    const bestPlayer = allStats[0];
    const mostActive = [...allStats].sort((a,b) => b.stats.played - a.stats.played)[0];

    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">📋 Reportes</div>
          <div class="page-header-sub">KPIs y métricas clave del grupo</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="ReportsPage.exportReport()">⬇ Exportar Reporte</button>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="grid-4" style="margin-bottom:12px">
        <div class="kpi-card purple">
          <span class="kpi-icon">🎮</span>
          <div class="kpi-label">Total Partidas</div>
          <div class="kpi-value purple">${totalGames}</div>
        </div>
        <div class="kpi-card blue">
          <span class="kpi-icon">🏆</span>
          <div class="kpi-label">Torneos</div>
          <div class="kpi-value blue">${matches.filter(m=>m.type==='tournament').length}</div>
        </div>
        <div class="kpi-card green">
          <span class="kpi-icon">📊</span>
          <div class="kpi-label">Prom. Puntos/Equipo</div>
          <div class="kpi-value green">${avgScore}</div>
        </div>
        <div class="kpi-card orange">
          <span class="kpi-icon">👟</span>
          <div class="kpi-label">Total Zapatos</div>
          <div class="kpi-value orange">${totalShoes}</div>
        </div>
      </div>

      <div class="dashboard-row cols-1-1">
        <!-- Monthly Activity -->
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">📅 Actividad Mensual</div>
          <div id="rep-monthly-chart"></div>
        </div>

        <!-- Key Metrics -->
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">🌟 Jugadores Destacados</div>
          <div class="stat-row">
            <span class="stat-label">🥇 Mayor efectividad</span>
            <span class="stat-value">${bestPlayer ? `${Utils.escHtml(bestPlayer.name)} (${bestPlayer.stats.eff}%)` : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">⚡ Más activo</span>
            <span class="stat-value">${mostActive ? `${Utils.escHtml(mostActive.name)} (${mostActive.stats.played}PJ)` : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">🔥 Mayor racha ganadora</span>
            <span class="stat-value">${allStats.length ? (() => { const best = allStats.reduce((a,b) => b.stats.maxWinStreak > a.stats.maxWinStreak ? b : a); return `${Utils.escHtml(best.name)} (${best.stats.maxWinStreak})`; })() : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">👟 Más zapatos dados</span>
            <span class="stat-value">${allStats.length ? (() => { const best = allStats.reduce((a,b) => b.stats.shoesGiven > a.stats.shoesGiven ? b : a); return `${Utils.escHtml(best.name)} (${best.stats.shoesGiven})`; })() : '—'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">📈 Mayor diferencia de puntos</span>
            <span class="stat-value">${allStats.length ? (() => { const best = allStats.reduce((a,b) => b.stats.pointDiff > a.stats.pointDiff ? b : a); return `${Utils.escHtml(best.name)} (+${best.stats.pointDiff})`; })() : '—'}</span>
          </div>
        </div>
      </div>

      <!-- Full Stats Table -->
      <div class="card" style="margin-top:12px;padding:0;overflow:hidden">
        <div style="padding:8px 12px;border-bottom:1px solid var(--border-color)">
          <div class="card-title">📊 Reporte Completo de Jugadores</div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th class="col-num">PJ</th>
                <th class="col-num">V</th>
                <th class="col-num">D</th>
                <th class="col-num">EF%</th>
                <th class="col-num">PF</th>
                <th class="col-num">PC</th>
                <th class="col-num">DP</th>
                <th class="col-num">ZD</th>
                <th class="col-num">ZR</th>
                <th class="col-num">RV</th>
                <th class="col-num">RD</th>
              </tr>
            </thead>
            <tbody>
              ${allStats.map((ps, i) => {
                const st = ps.stats;
                return `<tr>
                  <td>${i+1}</td>
                  <td>
                    <div class="player-cell">
                      ${Utils.avatarEl(ps.name)}
                      <div>
                        <div class="player-cell-name">${Utils.escHtml(ps.name)}</div>
                        <div class="player-cell-alias">${Utils.escHtml(ps.alias||'')}</div>
                      </div>
                    </div>
                  </td>
                  <td class="col-num">${st.played}</td>
                  <td class="col-num text-success semibold">${st.wins}</td>
                  <td class="col-num text-danger">${st.losses}</td>
                  <td class="col-num text-accent semibold">${st.eff}%</td>
                  <td class="col-num">${st.pointsFor}</td>
                  <td class="col-num">${st.pointsAgainst}</td>
                  <td class="col-num ${st.pointDiff>=0?'text-success':'text-danger'}">${Utils.fmtDiff(st.pointDiff)}</td>
                  <td class="col-num text-warning">${st.shoesGiven}</td>
                  <td class="col-num">${st.shoesReceived}</td>
                  <td class="col-num text-success">${st.maxWinStreak}</td>
                  <td class="col-num text-danger">${st.maxLossStreak}</td>
                </tr>`;
              }).join('') || `<tr><td colspan="13"><div class="empty-state"><div class="empty-text">Sin datos</div></div></td></tr>`}
            </tbody>
          </table>
        </div>
        <div style="padding:12px 20px;border-top:1px solid var(--border-color);font-size:0.75rem;color:var(--text-muted)">
          PJ=Partidas Jugadas, V=Victorias, D=Derrotas, EF%=Efectividad, PF=Puntos Favor, PC=Puntos Contra, DP=Diferencia, ZD=Zapatos Dados, ZR=Zapatos Recibidos, RV=Racha Victorias, RD=Racha Derrotas
        </div>
      </div>
    </div>`;
  },

  afterRender() {
    const groupId = Auth.getGroupId();
    const monthly = DB.getMonthlyStats(groupId);
    if (monthly.length > 0) {
      Charts.renderBarChart('rep-monthly-chart',
        monthly.map(m => {
          const [y, mo] = m.month.split('-');
          return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mo)-1];
        }),
        [
          { label: 'Amistosos', data: monthly.map(m => m.friendly) },
          { label: 'Torneos', data: monthly.map(m => m.tournaments) }
        ],
        { height: 200, legend: true }
      );
    }
  },

  exportReport() {
    const groupId = Auth.getGroupId();
    const allStats = DB.getAllPlayerStats(groupId);
    const data = allStats.map((ps, i) => ({
      Posición: i+1, Nombre: ps.name, Alias: ps.alias || '',
      'Partidas Jugadas': ps.stats.played, Victorias: ps.stats.wins, Derrotas: ps.stats.losses,
      'Efectividad (%)': ps.stats.eff,
      'Puntos a Favor': ps.stats.pointsFor, 'Puntos en Contra': ps.stats.pointsAgainst,
      'Diferencia de Puntos': ps.stats.pointDiff,
      'Zapatos Dados': ps.stats.shoesGiven, 'Zapatos Recibidos': ps.stats.shoesReceived,
      'Max Racha Victorias': ps.stats.maxWinStreak, 'Max Racha Derrotas': ps.stats.maxLossStreak
    }));
    Utils.exportCSV(data, `reporte_completo_${new Date().toISOString().split('T')[0]}.csv`);
    Toast.success('Reporte exportado');
  }
};
