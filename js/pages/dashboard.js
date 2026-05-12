/* =========================================
   DASHBOARD PAGE
   ========================================= */
const DashboardPage = {
  render() {
    const groupId = Auth.getGroupId();
    const allStats = DB.getAllPlayerStats(groupId);
    const matches = DB.getMatches(groupId);
    const players = DB.getPlayers(groupId);
    const monthly = DB.getMonthlyStats(groupId);

    const totalMatches = matches.length;
    const tournamentMatches = matches.filter(m => m.type === 'tournament').length;
    const friendlyMatches = totalMatches - tournamentMatches;
    const top3 = allStats.slice(0, 3);
    const recentMatches = matches.slice(0, 5);
    const avgEff = allStats.length ? (allStats.reduce((s, p) => s + p.stats.eff, 0) / allStats.length).toFixed(1) : 0;

    return `
    <div class="page-enter">
      <!-- Welcome -->
      <div class="page-header" style="margin-bottom: 24px;">
        <div class="page-header-left">
          <div class="page-header-title" style="font-size:16px;font-weight:600;">¡Bienvenido, <span style="color:#A5B4FC">${Utils.escHtml(Auth.currentUser.name.split(' ')[0])}</span>! 👋</div>
          <div class="page-header-sub" style="font-size:12px;color:#64748B">${Utils.fmtDate(new Date().toISOString(), 'long')} · ${DB.getGroupById(groupId)?.name || 'Mi Grupo'}</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="App.navigate('matches');setTimeout(()=>MatchesPage.openNew(),100)">
            + Nueva Partida
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="dashboard-kpis stagger-children">
        <div class="kpi-card purple">
          <span class="kpi-icon">🎮</span>
          <div class="kpi-label">Total Partidas</div>
          <div class="kpi-value purple" id="kpi-matches">${totalMatches}</div>
          <div class="kpi-change up">↑ ${matches.filter(m => m.date >= new Date(Date.now()-7*86400000).toISOString().split('T')[0]).length} esta semana</div>
        </div>
        <div class="kpi-card blue">
          <span class="kpi-icon">👥</span>
          <div class="kpi-label">Jugadores Activos</div>
          <div class="kpi-value blue" id="kpi-players">${players.length}</div>
          <div class="kpi-change up">↑ En ${DB.getGroupById(groupId)?.name?.split(' ').slice(-1)[0] || 'el grupo'}</div>
        </div>
        <div class="kpi-card green">
          <span class="kpi-icon">🏆</span>
          <div class="kpi-label">Torneos</div>
          <div class="kpi-value green">${tournamentMatches}</div>
          <div class="kpi-change" style="color:var(--text-secondary)">${friendlyMatches} amistosos</div>
        </div>
        <div class="kpi-card orange">
          <span class="kpi-icon">📊</span>
          <div class="kpi-label">Efectividad Media</div>
          <div class="kpi-value orange">${avgEff}%</div>
          <div class="kpi-change" style="color:var(--text-secondary)">Top: ${top3[0]?.stats.eff || 0}%</div>
        </div>
      </div>

      <!-- Row 1: Line Chart + Top Players -->
      <div class="dashboard-row cols-3-2">
        <div class="card" style="background: #141829;">
          <div class="card-header">
            <div>
              <div class="card-title">📈 Actividad Mensual</div>
              <div class="card-subtitle">Partidas jugadas por mes</div>
            </div>
            <div style="display:flex;gap:12px;font-size:0.78rem">
              <span style="color:#6c63ff">● Amistosos</span>
              <span style="color:#00e5a0">● Torneos</span>
            </div>
          </div>
          <div class="chart-container" id="monthly-chart"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">🥇 Top Jugadores</div>
            <a href="#" onclick="App.navigate('rankings')" style="font-size:0.8rem;color:var(--accent-primary)">Ver todos →</a>
          </div>
          <div id="top-players-widget"></div>
        </div>
      </div>

      <!-- Row 2: Donut + Recent Matches + Activity -->
      <div class="dashboard-row" style="grid-template-columns:1fr 2fr 1fr">
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
          <div class="card-title">Tipo de Partidas</div>
          <div class="donut-chart" id="type-donut"></div>
          <div style="display:flex;gap:16px;width:100%;justify-content:center">
            <div style="text-align:center">
              <div style="font-weight:800;font-size:1.1rem;color:var(--accent-primary)">${friendlyMatches}</div>
              <div class="text-xs text-muted">Amistosos</div>
            </div>
            <div style="text-align:center">
              <div style="font-weight:800;font-size:1.1rem;color:var(--accent-success)">${tournamentMatches}</div>
              <div class="text-xs text-muted">Torneos</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚡ Partidas Recientes</div>
            <a href="#" onclick="App.navigate('history')" style="font-size:0.8rem;color:var(--accent-primary)">Ver historial →</a>
          </div>
          <div id="recent-matches-widget"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">📋 Actividad</div>
          </div>
          <div class="activity-feed" id="activity-feed"></div>
        </div>
      </div>

      <!-- Row 3: Bar Chart Wins per player -->
      <div class="dashboard-row cols-1-1">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">🎯 Top Victorias</div>
              <div class="card-subtitle">Jugadores con más victorias</div>
            </div>
          </div>
          <div id="wins-hbar" style="min-height:180px"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">👟 Ranking Zapatos</div>
              <div class="card-subtitle">Zapatos propinados total</div>
            </div>
          </div>
          <div id="shoes-hbar" style="min-height:180px"></div>
        </div>
      </div>
    </div>`;
  },

  afterRender() {
    const groupId = Auth.getGroupId();
    const monthly = DB.getMonthlyStats(groupId);
    const allStats = DB.getAllPlayerStats(groupId);
    const matches = DB.getMatches(groupId);
    const logs = DB.getLogs().slice(0, 5);

    // Monthly chart
    if (monthly.length > 0) {
      Charts.renderLineChart('monthly-chart', [
        { label: 'Amistosos', data: monthly.map(m => m.friendly) },
        { label: 'Torneos', data: monthly.map(m => m.tournaments) }
      ], {
        labels: monthly.map(m => {
          const [y, mo] = m.month.split('-');
          return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mo)-1];
        }),
        height: 200
      });
    }

    // Top players widget
    const topPl = document.getElementById('top-players-widget');
    if (topPl) {
      topPl.innerHTML = allStats.slice(0, 7).map((ps, i) => `
        <div class="top-player-row">
          <div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i+1}</div>
          ${Utils.avatarEl(ps.name)}
          <div class="top-player-name">
            ${Utils.escHtml(ps.name)}<br><span class="text-xs text-muted">${Utils.escHtml(ps.alias || '')}</span>
            <div style="height:2px;background:rgba(255,255,255,0.1);margin-top:4px;border-radius:2px;overflow:hidden;width:100%">
              <div style="height:100%;width:${ps.stats.eff}%;background:${ps.stats.eff > 55 ? '#10B981' : ps.stats.eff >= 45 ? '#F59E0B' : '#EF4444'}"></div>
            </div>
          </div>
          <div style="text-align:right">
            <div class="top-player-stat">${ps.stats.wins}V</div>
            <div class="top-player-eff">${ps.stats.eff}%</div>
          </div>
        </div>`).join('') || '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Sin jugadores aún</div></div>';
    }

    // Donut
    const totalM = matches.length;
    const friendlyM = matches.filter(m => m.type === 'friendly').length;
    const tournM = totalM - friendlyM;
    Charts.renderDonut('type-donut', [
      { value: friendlyM, color: '#6c63ff', label: 'Amistosos' },
      { value: tournM, color: '#00e5a0', label: 'Torneos' }
    ], { size: 130, strokeW: 20, center: totalM, sub: 'Total' });

    // Recent matches
    const rmEl = document.getElementById('recent-matches-widget');
    if (rmEl) {
      rmEl.innerHTML = matches.slice(0, 5).map(m => {
        const t1n = `${Utils.playerAlias(m.team1.player1)} & ${Utils.playerAlias(m.team1.player2)}`;
        const t2n = `${Utils.playerAlias(m.team2.player1)} & ${Utils.playerAlias(m.team2.player2)}`;
        const w1 = m.winner === 'team1';
        return `<div class="match-mini">
          <div class="match-teams">
            <div class="match-team" style="color:${w1?'var(--accent-success)':'var(--text-secondary)'}">${Utils.escHtml(t1n)}</div>
            <div class="match-vs">vs</div>
            <div class="match-team" style="color:${!w1?'var(--accent-success)':'var(--text-secondary)'}">${Utils.escHtml(t2n)}</div>
          </div>
          <div class="match-score-block">
            <div class="match-score">
              <span class="${w1?'score-win':'score-lose'}">${m.score.team1}</span>
              <span class="match-score-sep">:</span>
              <span class="${!w1?'score-win':'score-lose'}">${m.score.team2}</span>
            </div>
            <span class="chip ${m.type==='tournament'?'chip-success':'chip-primary'} match-type-chip">${m.type==='tournament'?'🏆':'🎮'} ${m.type==='tournament'?'Torneo':'Amist.'}</span>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-text">Sin partidas registradas</div></div>';

    }

    // Activity feed
    const actEl = document.getElementById('activity-feed');
    const actionMap = {
      match_created: { icon: '🎮', color: 'green' },
      player_added: { icon: '👤', color: '' },
      player_edited: { icon: '✏️', color: 'orange' },
      player_deleted: { icon: '🗑️', color: 'red' },
      match_deleted: { icon: '❌', color: 'red' },
      backup: { icon: '💾', color: '' },
      login: { icon: '🔐', color: '' }
    };
    if (actEl) {
      actEl.innerHTML = logs.map(l => {
        const am = actionMap[l.action] || { icon: '•', color: '' };
        return `<div class="activity-item">
          <div class="activity-dot ${am.color}">${am.icon}</div>
          <div class="activity-content">
            <div class="activity-text">${Utils.escHtml(l.desc)}</div>
            <div class="activity-time">${Utils.relativeTime(new Date(l.createdAt))}</div>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-text">Sin actividad reciente</div></div>';
    }

    // Wins HBar
    Charts.renderHBar('wins-hbar', allStats.slice(0, 8).map(ps => ({
      label: ps.alias || ps.name.split(' ')[0], value: ps.stats.wins
    })), { fmt: v => v + 'V' });

    // Shoes HBar
    Charts.renderHBar('shoes-hbar', [...allStats].sort((a,b) => b.stats.shoesGiven - a.stats.shoesGiven).slice(0, 8).map(ps => ({
      label: ps.alias || ps.name.split(' ')[0], value: ps.stats.shoesGiven, color: '#ffb800'
    })), { fmt: v => v + '👟' });
  }
};
