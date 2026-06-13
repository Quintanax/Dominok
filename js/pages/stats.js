/* =========================================
   STATS PAGE — Advanced Analytics Suite
   ========================================= */
const StatsPage = {
  state: { tab: 'h2h', p1: '', p2: '' },

  _tabs: [
    ['h2h','⚔️','VS Directo (H2H)','⭐⭐⭐'],
    ['mantequillas','🧈','Papás y Mantequillas','⭐⭐⭐'],
    ['nemesis','🛡️','Némesis y Kryptonita','⭐⭐⭐'],
    ['teammates','👥','Análisis de Compañeros','⭐⭐⭐'],
    ['evolution','📈','Evolución de Forma','⭐⭐'],
    ['streaks','🔥','Momentum y Rachas','⭐⭐'],
    ['scores','📊','Distribución de Puntos','⭐⭐'],
    ['heatmap','📅','Actividad por Día','⭐'],
    ['timeline','📉','Línea de Tiempo','⭐']
  ],

  render() {
    return `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom: 16px;">
        <div class="page-header-left">
          <div class="page-header-title">📈 Estadísticas</div>
          <div class="page-header-sub">Análisis avanzado de rendimiento</div>
        </div>
      </div>

      <!-- TOP NAV (All screen sizes) -->
      <div class="stats-top-nav">
        <div class="stats-pills" id="stats-pills">
          ${this._tabs.map(([id,icon,text,stars])=>
            `<button class="stats-pill ${this.state.tab===id?'active':''}" data-tab="${id}" onclick="StatsPage.go('${id}')">${icon} ${text}</button>`
          ).join('')}
        </div>
      </div>

      <main class="stats-main" id="stats-content" style="margin-top: 16px;"></main>
    </div>
    <style>
      /* ── Stats Layout ─────────────────────── */
      .stats-top-nav {
        width: 100%; box-sizing: border-box;
        margin-bottom: 12px;
      }
      .stats-pills {
        display: flex; gap: 8px; flex-wrap: wrap;
      }
      .stats-pill {
        padding: 6px 14px; border-radius: 20px;
        font-size: 0.8rem; font-weight: 600;
        background: var(--bg-card); color: var(--text-secondary);
        border: 1px solid var(--border-color);
        transition: all 150ms ease; cursor: pointer;
        display: flex; align-items: center; gap: 6px;
      }
      .stats-pill:hover { 
        background: var(--bg-elevated); 
        color: var(--text-primary); 
        border-color: rgba(255,255,255,0.2);
      }
      .stats-pill.active {
        background: rgba(108, 99, 255, 0.15);
        color: var(--accent-primary); 
        border-color: var(--accent-primary);
      }
      .stats-main { width: 100%; min-width: 0; }

      /* ── Stat content cards ──────────────── */
      .stat-card { background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:16px;margin-bottom:12px }
      .big-score { font-size:2.6rem;font-weight:900;line-height:1 }
      .vs-hero { display:flex;align-items:center;justify-content:center;gap:20px;padding:20px 12px }
      .vs-side { text-align:center;flex:1;min-width:0 }
      .vs-mid { color:var(--text-muted);font-weight:900;font-size:1rem;text-align:center;flex-shrink:0 }
      .bar-dual { display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--bg-elevated);margin:8px 0 }
      .bar-dual-fill-a { background:var(--accent-primary);transition:width .5s }
      .bar-dual-fill-b { background:var(--accent-danger);flex:1 }
      .form-dot { width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#fff }
      .form-dot.w { background:var(--accent-success) }
      .form-dot.l { background:var(--accent-danger) }
      .nemesis-card { text-align:center;padding:16px 12px }
      .timeline-row { border-left:3px solid;padding:8px 12px;border-radius:0 6px 6px 0;margin-bottom:8px;background:rgba(255,255,255,0.025) }

      /* ── MOBILE ≤768px ───────────────────── */
      @media (max-width: 768px) {
        .stat-card { 
          padding: 12px; overflow: hidden; box-sizing: border-box; 
          width: 100%; min-width: 0; max-width: 100%;
        }
        .stat-card h3 { 
          font-size: 1rem; margin-bottom: 4px; 
          white-space: normal; word-break: break-word;
        }
        .stat-card p { 
          font-size: 0.8rem; margin-bottom: 10px; 
          white-space: normal; word-break: break-word;
        }

        .stats-main select,
        .stats-main .form-select,
        .stats-main .form-group {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
        }

        .vs-hero {
          flex-direction: column; gap: 8px; padding: 12px 8px;
        }
        .vs-side { width: 100%; }
        .vs-mid { padding: 4px 0; }
        .vs-hero .avatar-xl {
          width: 52px !important; height: 52px !important;
          font-size: 1.1rem !important;
        }
        .big-score { font-size: 1.8rem; }

        .nemesis-card { padding: 12px 8px; }
        .nemesis-card .avatar-xl {
          width: 44px !important; height: 44px !important;
          font-size: 0.95rem !important;
        }

        .form-dot { width: 20px; height: 20px; font-size: 0.6rem; }
        .table-wrapper { overflow-x: auto; }
      }
    </style>`;
  },

  _nav(id, icon, text, stars) {
    return `<button class="snav ${this.state.tab===id?'active':''}" data-tab="${id}" onclick="StatsPage.go('${id}')">
      <span>${icon}</span><span>${text}</span><span class="star">${stars}</span>
    </button>`;
  },

  afterRender() { this.renderTab(); },

  go(tab) {
    this.state.tab = tab;
    // Update pills
    document.querySelectorAll('#stats-pills .stats-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    this.renderTab();
  },

  renderTab() {
    const el = document.getElementById('stats-content');
    if (!el) return;
    const map = { h2h: '_viewH2H', mantequillas: '_viewMantequillas', nemesis: '_viewNemesis', teammates: '_viewTeammates',
      evolution: '_viewEvolution', streaks: '_viewStreaks', scores: '_viewScores',
      heatmap: '_viewHeatmap', timeline: '_viewTimeline' };
    el.innerHTML = this[map[this.state.tab] || '_viewH2H']();
  },

  _pOpts(sel='') {
    return DB.getPlayers(Auth.getGroupId())
      .map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>${Utils.escHtml(p.name)}</option>`).join('');
  },

  _empty(icon, msg) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${msg}</div></div>`;
  },

  // Compute player stats filtered by match type
  _statsByType(playerId, groupId, type) {
    const allMatches = DB.getMatchesForPlayer(playerId, groupId)
      .filter(m => m.type === type);
    let wins = 0, losses = 0, pf = 0, pa = 0, shoes = 0;
    for (const m of allMatches) {
      const inT1 = m.team1.player1 === playerId || m.team1.player2 === playerId;
      const won = (inT1 && m.winner === 'team1') || (!inT1 && m.winner === 'team2');
      if (won) wins++; else losses++;
      pf += inT1 ? m.score.team1 : m.score.team2;
      pa += inT1 ? m.score.team2 : m.score.team1;
      shoes += inT1 ? (m.shoes?.team1Given || 0) : (m.shoes?.team2Given || 0);
    }
    const played = wins + losses;
    const eff = played > 0 ? (wins / played * 100).toFixed(1) : 0;
    return { played, wins, losses, pointsFor: pf, pointsAgainst: pa, pointDiff: pf - pa, shoesGiven: shoes, eff: parseFloat(eff) };
  },

  // Render a mini stats card split into friendly/tournament
  _splitStatsCard(playerId, groupId, playerName) {
    const f = this._statsByType(playerId, groupId, 'friendly');
    const t = this._statsByType(playerId, groupId, 'tournament');
    return `
      <div class="grid-2" style="gap:8px;margin-top:10px">
        <div style="background:rgba(108,99,255,.08);border:1px solid rgba(108,99,255,.25);border-radius:var(--radius-md);padding:10px">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-primary);font-weight:700;margin-bottom:6px">🎮 Amistosos</div>
          <div class="stat-row"><span class="stat-label">Partidas</span><span class="stat-value">${f.played}</span></div>
          <div class="stat-row"><span class="stat-label">V / D</span><span class="stat-value"><span class="text-success">${f.wins}</span> / <span class="text-danger">${f.losses}</span></span></div>
          <div class="stat-row"><span class="stat-label">Efectividad</span><span class="stat-value text-accent">${f.eff}%</span></div>
          <div class="stat-row"><span class="stat-label">Dif. Pts</span><span class="stat-value ${f.pointDiff>=0?'text-success':'text-danger'}">${f.pointDiff>0?'+':''}${f.pointDiff}</span></div>
          <div class="stat-row"><span class="stat-label">👟 Zapatos</span><span class="stat-value text-warning">${f.shoesGiven}</span></div>
        </div>
        <div style="background:rgba(0,229,160,.06);border:1px solid rgba(0,229,160,.2);border-radius:var(--radius-md);padding:10px">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-success);font-weight:700;margin-bottom:6px">🏆 Torneos</div>
          <div class="stat-row"><span class="stat-label">Partidas</span><span class="stat-value">${t.played}</span></div>
          <div class="stat-row"><span class="stat-label">V / D</span><span class="stat-value"><span class="text-success">${t.wins}</span> / <span class="text-danger">${t.losses}</span></span></div>
          <div class="stat-row"><span class="stat-label">Efectividad</span><span class="stat-value text-accent">${t.eff}%</span></div>
          <div class="stat-row"><span class="stat-label">Dif. Pts</span><span class="stat-value ${t.pointDiff>=0?'text-success':'text-danger'}">${t.pointDiff>0?'+':''}${t.pointDiff}</span></div>
          <div class="stat-row"><span class="stat-label">👟 Zapatos</span><span class="stat-value text-warning">${t.shoesGiven}</span></div>
        </div>
      </div>`;
  },

  // ========== 1. H2H ==========
  _viewH2H() {
    setTimeout(()=>this._h2hRender(), 50);
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">⚔️ VS Directo — Head to Head</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 14px">Historial completo entre dos jugadores, incluyendo forma reciente y diferencial de puntos</p>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Jugador A</label>
            <select id="h2h-a" class="form-select" onchange="StatsPage._h2hRender()"><option value="">— Seleccionar —</option>${this._pOpts(this.state.p1)}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Jugador B</label>
            <select id="h2h-b" class="form-select" onchange="StatsPage._h2hRender()"><option value="">— Seleccionar —</option>${this._pOpts(this.state.p2)}</select>
          </div>
        </div>
      </div>
      <div id="h2h-out">${this._empty('⚔️','Selecciona dos jugadores distintos')}</div>`;
  },

  _h2hRender() {
    const a = document.getElementById('h2h-a')?.value;
    const b = document.getElementById('h2h-b')?.value;
    if (a) this.state.p1 = a;
    if (b) this.state.p2 = b;
    const el = document.getElementById('h2h-out');
    if (!el) return;
    if (!a || !b || a===b) { el.innerHTML = this._empty('⚔️','Selecciona dos jugadores distintos'); return; }

    const gId = Auth.getGroupId();
    const pa  = DB.getPlayerById(a), pb = DB.getPlayerById(b);
    const colA = Utils.avatarColor(pa.name);
    const colB = Utils.avatarColor(pb.name);

    // Compute direct H2H detailed stats
    let h2hPlayed = 0, p1Wins = 0, p2Wins = 0, p1Points = 0, p2Points = 0, p1Shoes = 0, p2Shoes = 0;
    const matches = DB.getMatches(gId);
    for (const m of matches) {
      const p1InT1 = m.team1.player1 === a || m.team1.player2 === a;
      const p2InT2 = m.team2.player1 === b || m.team2.player2 === b;
      const p2InT1 = m.team1.player1 === b || m.team1.player2 === b;
      const p1InT2 = m.team2.player1 === a || m.team2.player2 === a;
      if (!((p1InT1 && p2InT2) || (p2InT1 && p1InT2))) continue;
      
      h2hPlayed++;
      if ((p1InT1 && m.winner === 'team1') || (p1InT2 && m.winner === 'team2')) {
        p1Wins++;
      } else {
        p2Wins++;
      }

      if (p1InT1) {
        p1Points += m.score.team1; p2Points += m.score.team2;
        p1Shoes += (m.shoes?.team1Given ? 1 : 0); p2Shoes += (m.shoes?.team2Given ? 1 : 0);
      } else {
        p1Points += m.score.team2; p2Points += m.score.team1;
        p1Shoes += (m.shoes?.team2Given ? 1 : 0); p2Shoes += (m.shoes?.team1Given ? 1 : 0);
      }
    }

    const pct = h2hPlayed > 0 ? (p1Wins/h2hPlayed*100).toFixed(0) : 50;
    
    // Overall Stats and Rank
    const allStats = DB.getAllPlayerStats(gId);
    const rankA = allStats.findIndex(p => p.id === a) + 1;
    const rankB = allStats.findIndex(p => p.id === b) + 1;

    // Recent form (last 10 matches each)
    const formA = DB.getMatchesForPlayer(a, gId).slice(0,10).map(m => {
      const inT1 = m.team1.player1===a||m.team1.player2===a;
      return (inT1&&m.winner==='team1')||(!inT1&&m.winner==='team2') ? 'w' : 'l';
    });
    const formB = DB.getMatchesForPlayer(b, gId).slice(0,10).map(m => {
      const inT1 = m.team1.player1===b||m.team1.player2===b;
      return (inT1&&m.winner==='team1')||(!inT1&&m.winner==='team2') ? 'w' : 'l';
    });

    el.innerHTML = `
      <div class="stat-card">
        <div class="vs-hero">
          <div class="vs-side">
            <div class="avatar avatar-xl" style="margin:0 auto 8px;background:${colA}">${Utils.initials(pa.name)}</div>
            <div style="font-weight:800;font-size:1.1rem">${Utils.escHtml(pa.name)}</div>
            <div class="big-score" style="color:${colA}">${p1Wins}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">victorias directas</div>
            <div style="margin-top:8px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
              ${formA.map(r=>`<span class="form-dot ${r}">${r==='w'?'V':'D'}</span>`).join('')}
            </div>
          </div>
          <div class="vs-mid">
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">${h2hPlayed} PJ</div>
            <div style="font-size:1.5rem">⚔️</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">VS</div>
          </div>
          <div class="vs-side">
            <div class="avatar avatar-xl" style="margin:0 auto 8px;background:${colB}">${Utils.initials(pb.name)}</div>
            <div style="font-weight:800;font-size:1.1rem">${Utils.escHtml(pb.name)}</div>
            <div class="big-score" style="color:${colB}">${p2Wins}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">victorias directas</div>
            <div style="margin-top:8px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
              ${formB.map(r=>`<span class="form-dot ${r}">${r==='w'?'V':'D'}</span>`).join('')}
            </div>
          </div>
        </div>
        
        <div class="bar-dual" style="background:${colB}; overflow:hidden; border-radius:10px; height:8px; display:flex;">
          <div style="width:${pct}%; background:${colA}; height:100%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted)">
          <span>${pct}% dominio</span><span>${(100-pct).toFixed(0)}% dominio</span>
        </div>

        <div style="margin:20px 0; background:var(--bg-elevated); border-radius:var(--radius-lg); padding:16px;">
          <h4 style="text-align:center; margin:0 0 16px 0; font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:1px">📊 Comparación Directa (H2H)</h4>
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:8px;">
            <div style="width:33%; text-align:center; font-weight:800; color:${colA}">#${rankA}</div>
            <div style="width:33%; text-align:center; font-size:0.75rem; color:var(--text-muted)">Rango en Liga</div>
            <div style="width:33%; text-align:center; font-weight:800; color:${colB}">#${rankB}</div>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:8px;">
            <div style="width:33%; text-align:center; font-weight:800; color:${colA}">${p1Points} pts</div>
            <div style="width:33%; text-align:center; font-size:0.75rem; color:var(--text-muted)">Puntos Anotados</div>
            <div style="width:33%; text-align:center; font-weight:800; color:${colB}">${p2Points} pts</div>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:8px;">
            <div style="width:33%; text-align:center; font-weight:800; color:${colA}">${p1Shoes} 👟</div>
            <div style="width:33%; text-align:center; font-size:0.75rem; color:var(--text-muted)">Zapatos Propinados</div>
            <div style="width:33%; text-align:center; font-weight:800; color:${colB}">${p2Shoes} 👟</div>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="width:33%; text-align:center; font-weight:800; color:${colA}">${pct}%</div>
            <div style="width:33%; text-align:center; font-size:0.75rem; color:var(--text-muted)">Efectividad H2H</div>
            <div style="width:33%; text-align:center; font-weight:800; color:${colB}">${(100 - pct).toFixed(0)}%</div>
          </div>
        </div>
      </div>
      
      <div class="grid-2">
        ${[{p:pa,label:'A'},{p:pb,label:'B'}].map(({p})=>{
          const gId2 = Auth.getGroupId();
          const sAll = DB.getPlayerStats(p.id, gId2);
          return `
          <div class="stat-card">
            <div style="font-weight:700;margin-bottom:6px;color:var(--text-primary)">${Utils.escHtml(p.name)}</div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px">TOTAL GLOBAL — ${sAll.played} PJ &bull; ${sAll.eff}% efectividad global</div>
            ${this._splitStatsCard(p.id, gId2, p.name)}
          </div>`;
        }).join('')}
      </div>`;
  },

  // ========== 2. NEMESIS ==========
  _viewNemesis() {
    setTimeout(()=>this._nemRender(), 50);
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">🛡️ Némesis y Kryptonita</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 14px">Descubre contra quién pierde más seguido y a quién domina con facilidad (mín. 3 PJ directos)</p>
        <div class="form-group" style="max-width:320px">
          <label class="form-label">Seleccionar jugador</label>
          <select id="nem-p" class="form-select" onchange="StatsPage._nemRender()"><option value="">— Seleccionar —</option>${this._pOpts(this.state.p1)}</select>
        </div>
      </div>
      <div id="nem-out">${this._empty('🛡️','Selecciona un jugador')}</div>`;
  },

  _nemRender() {
    const p = document.getElementById('nem-p')?.value;
    if (p) this.state.p1 = p;
    const el = document.getElementById('nem-out');
    if (!el || !p) { if(el) el.innerHTML = this._empty('🛡️','Selecciona un jugador'); return; }

    const gId = Auth.getGroupId();
    const pl = DB.getPlayerById(p);
    const others = DB.getPlayers(gId).filter(x=>x.id!==p);

    const rivalData = others.map(opp => {
      const vs = DB.getVsStats(p, opp.id, gId);
      if (vs.played < 3) return null;
      return { opp, vs, eff: vs.p1Wins/vs.played };
    }).filter(Boolean).sort((a,b)=>a.eff - b.eff);

    if (!rivalData.length) { el.innerHTML = this._empty('📊','No hay suficientes enfrentamientos directos (mín. 3 PJ)'); return; }

    const nemesis = rivalData[0];
    const victim  = rivalData[rivalData.length-1];

    const allVs = rivalData.map(r => `
      <tr style="cursor:pointer" onclick="StatsPage._showRivalDetails('${p}', '${r.opp.id}')">
        <td><div class="player-cell">${Utils.avatarEl(r.opp.name)}<span>${Utils.escHtml(r.opp.name)}</span></div></td>
        <td class="col-num">${r.vs.played}</td>
        <td class="col-num text-success">${r.vs.p1Wins}</td>
        <td class="col-num text-danger">${r.vs.p2Wins}</td>
        <td>
          <div class="eff-bar">
            <div class="progress-bar" style="flex:1"><div class="progress-fill ${r.eff>=0.5?'green':'red'}" style="width:${r.eff*100}%"></div></div>
            <span class="eff-pct">${(r.eff*100).toFixed(0)}%</span>
          </div>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="grid-2" style="margin-bottom:12px">
        <div class="stat-card nemesis-card" style="border-top:4px solid var(--accent-danger); cursor:pointer" onclick="StatsPage._showRivalDetails('${p}', '${nemesis.opp.id}')">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-danger);font-weight:700;margin-bottom:12px">⚠️ Su Némesis — Le gana seguido</div>
          <div class="avatar avatar-xl" style="margin:0 auto 10px;background:${Utils.avatarColor(nemesis.opp.name)}">${Utils.initials(nemesis.opp.name)}</div>
          <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px">${Utils.escHtml(nemesis.opp.name)}</div>
          <div style="font-size:1.8rem;font-weight:900;color:var(--accent-danger)">${(nemesis.eff*100).toFixed(1)}%</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">efectividad de ${Utils.escHtml(pl.name)}</div>
          <div style="margin-top:8px;font-size:0.85rem"><span class="text-success">${nemesis.vs.p1Wins}V</span> — <span class="text-danger">${nemesis.vs.p2Wins}D</span> en ${nemesis.vs.played} PJ</div>
        </div>
        <div class="stat-card nemesis-card" style="border-top:4px solid var(--accent-success); cursor:pointer" onclick="StatsPage._showRivalDetails('${p}', '${victim.opp.id}')">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-success);font-weight:700;margin-bottom:12px">🎯 Su Víctima — Lo domina</div>
          <div class="avatar avatar-xl" style="margin:0 auto 10px;background:${Utils.avatarColor(victim.opp.name)}">${Utils.initials(victim.opp.name)}</div>
          <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px">${Utils.escHtml(victim.opp.name)}</div>
          <div style="font-size:1.8rem;font-weight:900;color:var(--accent-success)">${(victim.eff*100).toFixed(1)}%</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">efectividad de ${Utils.escHtml(pl.name)}</div>
          <div style="margin-top:8px;font-size:0.85rem"><span class="text-success">${victim.vs.p1Wins}V</span> — <span class="text-danger">${victim.vs.p2Wins}D</span> en ${victim.vs.played} PJ</div>
        </div>
      </div>
      <div class="stat-card" style="margin-bottom:12px">
        <div style="font-weight:700;margin-bottom:8px">📊 Rendimiento de ${Utils.escHtml(pl.name)} por tipo</div>
        ${this._splitStatsCard(p, gId, pl.name)}
      </div>
      <div class="stat-card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);font-weight:700">Todos los rivales directos de ${Utils.escHtml(pl.name)}</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Rival</th><th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">D</th><th>Efectividad</th></tr></thead>
            <tbody>${allVs}</tbody>
          </table>
        </div>
      </div>`;
  },

  _showRivalDetails(mainId, rivalId) {
    const mainP = DB.getPlayerById(mainId);
    const rivalP = DB.getPlayerById(rivalId);
    if (!mainP || !rivalP) return;

    const gId = Auth.getGroupId();
    const allMatches = DB.getMatchesForPlayer(mainId, gId).filter(m => {
      // main is in one team, rival in the other
      const mainInT1 = m.team1.player1 === mainId || m.team1.player2 === mainId;
      const mainInT2 = m.team2.player1 === mainId || m.team2.player2 === mainId;
      const rivalInT1 = m.team1.player1 === rivalId || m.team1.player2 === rivalId;
      const rivalInT2 = m.team2.player1 === rivalId || m.team2.player2 === rivalId;
      return (mainInT1 && rivalInT2) || (mainInT2 && rivalInT1);
    });

    allMatches.reverse();

    let wins = 0, losses = 0, pf = 0, pa = 0, shoesGiven = 0, shoesReceived = 0;

    const matchesHtml = allMatches.map(m => {
      const isT1 = m.team1.player1 === mainId || m.team1.player2 === mainId;
      const won = (isT1 && m.winner === 'team1') || (!isT1 && m.winner === 'team2');
      const myScore = isT1 ? m.score.team1 : m.score.team2;
      const oppScore = isT1 ? m.score.team2 : m.score.team1;
      
      if (won) wins++; else losses++;
      pf += myScore;
      pa += oppScore;
      shoesGiven += isT1 ? (m.shoes?.team1Given || 0) : (m.shoes?.team2Given || 0);
      shoesReceived += isT1 ? (m.shoes?.team2Given || 0) : (m.shoes?.team1Given || 0);

      const nm = (id)=> Utils.escHtml(DB.getPlayerById(id)?.name?.split(' ')[0]||'?');
      const partnerId = isT1 ? (m.team1.player1===mainId?m.team1.player2:m.team1.player1) : (m.team2.player1===mainId?m.team2.player2:m.team2.player1);
      const opp1 = isT1 ? m.team2.player1 : m.team1.player1;
      const opp2 = isT1 ? m.team2.player2 : m.team1.player2;
      
      return `
        <div class="timeline-row" style="border-color:${won?'var(--accent-success)':'var(--accent-danger)'};margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="font-size:0.75rem;color:var(--text-muted)">${Utils.fmtDate(m.date)} &bull; ${m.type==='tournament'?'🏆 Torneo':'🎮 Amistoso'}</span>
              <div style="font-weight:600;margin-top:2px">
                con <span style="color:var(--text-muted)">${nm(partnerId)}</span> vs <span style="color:var(--text-muted)">${nm(opp1)} & ${nm(opp2)}</span>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-weight:900;font-size:1.1rem;color:${won?'var(--accent-success)':'var(--accent-danger)'}">
                ${won?'V':'D'} ${myScore} — ${oppScore}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const played = wins + losses;
    const eff = played > 0 ? ((wins / played) * 100).toFixed(0) : 0;
    const diff = pf - pa;

    App.openModal({
      title: `⚔️ Historial vs Rival`,
      body: `
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-lg)">
          <div style="text-align:center">
             <div class="avatar avatar-lg" style="margin:0 auto 8px;background:${Utils.avatarColor(mainP.name)}">${Utils.initials(mainP.name)}</div>
             <div style="font-weight:700">${Utils.escHtml(mainP.name.split(' ')[0])}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-muted)">VS</div>
          <div style="text-align:center">
             <div class="avatar avatar-lg" style="margin:0 auto 8px;background:${Utils.avatarColor(rivalP.name)}">${Utils.initials(rivalP.name)}</div>
             <div style="font-weight:700">${Utils.escHtml(rivalP.name.split(' ')[0])}</div>
          </div>
        </div>
        
        <div class="grid-3" style="margin-bottom:16px; gap:8px;">
          <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:12px;text-align:center">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Efectividad</div>
             <div style="font-size:1.8rem;font-weight:900;color:${eff>=50?'var(--accent-success)':'var(--accent-danger)'}">${eff}%</div>
             <div style="font-size:0.85rem;margin-top:4px"><span class="text-success">${wins}V</span> — <span class="text-danger">${losses}D</span></div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:12px;text-align:center">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Dif. Pts</div>
             <div style="font-size:1.8rem;font-weight:900;color:${diff>=0?'var(--accent-success)':'var(--accent-danger)'}">${diff>0?'+':''}${diff}</div>
             <div style="font-size:0.85rem;margin-top:4px;color:var(--text-muted)">${pf} a favor, ${pa} en contra</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:12px;text-align:center">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Zapatos</div>
             <div style="font-size:1.8rem;font-weight:900;color:var(--accent-warning)">👟 ${shoesGiven}</div>
             <div style="font-size:0.85rem;margin-top:4px;color:var(--text-muted)">Recibidos: ${shoesReceived}</div>
          </div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--text-primary)">Historial de Partidas (${played})</h4>
        <div style="max-height:300px;overflow-y:auto;padding-right:4px">
          ${matchesHtml || '<div class="empty-state" style="padding:20px">No hay detalles disponibles</div>'}
        </div>
      `,
      footer: `<button class="btn btn-outline" onclick="App.closeModal()" style="width:100%">Cerrar</button>`
    });
  },

  // ========== 2.5 MANTEQUILLAS ==========
  _viewMantequillas() {
    setTimeout(()=>this._mantRender(), 50);
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">🧈 Papás y Mantequillas</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 14px">Descubre a quién dominas (Mantequilla) y quién te domina a ti (Papá), filtrando por cantidad de partidas.</p>
        <div class="grid-2">
          <div class="form-group" style="max-width:320px">
            <label class="form-label">Seleccionar jugador</label>
            <select id="mant-p" class="form-select" onchange="StatsPage._mantRender()"><option value="">— Seleccionar —</option>${this._pOpts(this.state.p1)}</select>
          </div>
          <div class="form-group" style="max-width:150px">
            <label class="form-label">Mín. Partidas</label>
            <input type="number" id="mant-min" class="form-control" value="3" min="1" oninput="StatsPage._mantRender()">
          </div>
        </div>
      </div>
      <div id="mant-out">${this._empty('🧈','Selecciona un jugador')}</div>`;
  },

  _mantRender() {
    const p = document.getElementById('mant-p')?.value;
    const minStr = document.getElementById('mant-min')?.value;
    const minG = parseInt(minStr, 10) || 1;

    if (p) this.state.p1 = p;
    const el = document.getElementById('mant-out');
    if (!el || !p) { if(el) el.innerHTML = this._empty('🧈','Selecciona un jugador'); return; }

    const gId = Auth.getGroupId();
    const pl = DB.getPlayerById(p);
    const others = DB.getPlayers(gId).filter(x=>x.id!==p);

    const rivalData = others.map(opp => {
      const vs = DB.getVsStats(p, opp.id, gId);
      if (vs.played < minG) return null;
      return { opp, vs, eff: vs.p1Wins/vs.played };
    }).filter(Boolean).sort((a,b)=>a.eff - b.eff);

    if (!rivalData.length) { el.innerHTML = this._empty('📊',`No hay suficientes enfrentamientos directos (mín. ${minG} PJ)`); return; }

    const papa = rivalData[0]; // Worst efficiency (they beat me) -> Papá
    const mantequilla = rivalData[rivalData.length-1]; // Best efficiency (I beat them) -> Mantequilla

    const allVs = rivalData.map(r => `
      <tr style="cursor:pointer" onclick="StatsPage._showRivalDetails('${p}', '${r.opp.id}')">
        <td><div class="player-cell">${Utils.avatarEl(r.opp.name)}<span>${Utils.escHtml(r.opp.name)}</span></div></td>
        <td class="col-num">${r.vs.played}</td>
        <td class="col-num text-success">${r.vs.p1Wins}</td>
        <td class="col-num text-danger">${r.vs.p2Wins}</td>
        <td>
          <div class="eff-bar">
            <div class="progress-bar" style="flex:1"><div class="progress-fill ${r.eff>=0.5?'green':'red'}" style="width:${r.eff*100}%"></div></div>
            <span class="eff-pct">${(r.eff*100).toFixed(0)}%</span>
          </div>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="grid-2" style="margin-bottom:12px">
        <div class="stat-card nemesis-card" style="border-top:4px solid var(--accent-danger); cursor:pointer" onclick="StatsPage._showRivalDetails('${p}', '${papa.opp.id}')">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-danger);font-weight:700;margin-bottom:12px">⚠️ Su Papá — Le gana seguido</div>
          <div class="avatar avatar-xl" style="margin:0 auto 10px;background:${Utils.avatarColor(papa.opp.name)}">${Utils.initials(papa.opp.name)}</div>
          <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px">${Utils.escHtml(papa.opp.name)}</div>
          <div style="font-size:1.8rem;font-weight:900;color:var(--accent-danger)">${(papa.eff*100).toFixed(1)}%</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">efectividad de ${Utils.escHtml(pl.name)}</div>
          <div style="margin-top:8px;font-size:0.85rem"><span class="text-success">${papa.vs.p1Wins}V</span> — <span class="text-danger">${papa.vs.p2Wins}D</span> en ${papa.vs.played} PJ</div>
        </div>
        <div class="stat-card nemesis-card" style="border-top:4px solid var(--accent-success); cursor:pointer" onclick="StatsPage._showRivalDetails('${p}', '${mantequilla.opp.id}')">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-success);font-weight:700;margin-bottom:12px">🧈 Su Mantequilla — Lo domina</div>
          <div class="avatar avatar-xl" style="margin:0 auto 10px;background:${Utils.avatarColor(mantequilla.opp.name)}">${Utils.initials(mantequilla.opp.name)}</div>
          <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px">${Utils.escHtml(mantequilla.opp.name)}</div>
          <div style="font-size:1.8rem;font-weight:900;color:var(--accent-success)">${(mantequilla.eff*100).toFixed(1)}%</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">efectividad de ${Utils.escHtml(pl.name)}</div>
          <div style="margin-top:8px;font-size:0.85rem"><span class="text-success">${mantequilla.vs.p1Wins}V</span> — <span class="text-danger">${mantequilla.vs.p2Wins}D</span> en ${mantequilla.vs.played} PJ</div>
        </div>
      </div>
      <div class="stat-card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);font-weight:700">Todos los rivales directos de ${Utils.escHtml(pl.name)} (Mín. ${minG} PJ)</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Rival</th><th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">D</th><th>Efectividad</th></tr></thead>
            <tbody>${allVs}</tbody>
          </table>
        </div>
      </div>`;
  },

  // ========== 3. TEAMMATES ==========
  _viewTeammates() {
    setTimeout(()=>this._tmRender(), 50);
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">👥 Análisis de Compañeros</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 14px">¿Con quién rinde mejor en pareja? Muestra el % de victorias por cada compañero (mín. 2 PJ juntos)</p>
        <div class="form-group" style="max-width:320px">
          <label class="form-label">Seleccionar jugador</label>
          <select id="tm-p" class="form-select" onchange="StatsPage._tmRender()"><option value="">— Seleccionar —</option>${this._pOpts(this.state.p1)}</select>
        </div>
      </div>
      <div id="tm-out">${this._empty('👥','Selecciona un jugador')}</div>`;
  },

  _tmRender() {
    const p = document.getElementById('tm-p')?.value;
    if (p) this.state.p1 = p;
    const el = document.getElementById('tm-out');
    if (!el || !p) { if(el) el.innerHTML = this._empty('👥','Selecciona un jugador'); return; }

    const gId = Auth.getGroupId();
    const mates = {};
    DB.getMatchesForPlayer(p, gId).forEach(m => {
      const isT1 = m.team1.player1===p||m.team1.player2===p;
      const mId  = isT1 ? (m.team1.player1===p?m.team1.player2:m.team1.player1)
                        : (m.team2.player1===p?m.team2.player2:m.team2.player1);
      const won  = (isT1&&m.winner==='team1')||(!isT1&&m.winner==='team2');
      if (!mates[mId]) mates[mId] = {w:0,l:0,pf:0,pa:0};
      mates[mId][won?'w':'l']++;
      const myScore  = isT1?m.score.team1:m.score.team2;
      const oppScore = isT1?m.score.team2:m.score.team1;
      mates[mId].pf += myScore;
      mates[mId].pa += oppScore;
    });

    const list = Object.entries(mates).map(([id,s])=>({
      id, ...s, p:s.w+s.l, eff:s.w/(s.w+s.l), diff:s.pf-s.pa
    })).filter(x=>x.p>=2).sort((a,b)=>b.eff-a.eff);

    if (!list.length) { el.innerHTML = this._empty('👥','No hay compañeros con 2+ partidas juntos'); return; }

    const best = list[0], worst = list[list.length-1];
    const p2 = DB.getPlayerById(p);

    el.innerHTML = `
      <div class="grid-2" style="margin-bottom:12px">
        <div class="stat-card nemesis-card" style="border-top:4px solid var(--accent-success)">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-success);font-weight:700;margin-bottom:10px">🤝 Mejor Compañero</div>
          <div class="avatar avatar-xl" style="margin:0 auto 8px;background:${Utils.avatarColor(DB.getPlayerById(best.id)?.name||'?')}">${Utils.initials(DB.getPlayerById(best.id)?.name||'?')}</div>
          <div style="font-weight:800">${Utils.escHtml(DB.getPlayerById(best.id)?.name||'?')}</div>
          <div style="font-size:2rem;font-weight:900;color:var(--accent-success)">${(best.eff*100).toFixed(0)}%</div>
          <div style="color:var(--text-muted);font-size:0.8rem">${best.p} PJ &bull; <span class="text-success">${best.w}V</span> <span class="text-danger">${best.l}D</span></div>
        </div>
        <div class="stat-card nemesis-card" style="border-top:4px solid var(--accent-danger)">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-danger);font-weight:700;margin-bottom:10px">💔 Peor Compañero</div>
          <div class="avatar avatar-xl" style="margin:0 auto 8px;background:${Utils.avatarColor(DB.getPlayerById(worst.id)?.name||'?')}">${Utils.initials(DB.getPlayerById(worst.id)?.name||'?')}</div>
          <div style="font-weight:800">${Utils.escHtml(DB.getPlayerById(worst.id)?.name||'?')}</div>
          <div style="font-size:2rem;font-weight:900;color:var(--accent-danger)">${(worst.eff*100).toFixed(0)}%</div>
          <div style="color:var(--text-muted);font-size:0.8rem">${worst.p} PJ &bull; <span class="text-success">${worst.w}V</span> <span class="text-danger">${worst.l}D</span></div>
        </div>
      </div>
      <div class="stat-card" style="margin-bottom:12px">
        <div style="font-weight:700;margin-bottom:8px">📊 Rendimiento de ${Utils.escHtml(p2?.name||'')} por tipo</div>
        ${this._splitStatsCard(p, gId, p2?.name||'')}
      </div>
      <div class="stat-card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);font-weight:700">Todos los compañeros</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>#</th><th>Compañero</th><th class="col-num">PJ</th><th class="col-num">V</th><th class="col-num">D</th><th class="col-num">Dif pts</th><th>Win %</th></tr></thead>
            <tbody>
              ${list.map((x,i)=>{
                const nm = DB.getPlayerById(x.id)?.name||'?';
                return `<tr style="cursor:pointer" onclick="StatsPage._showPartnerDetails('${p}', '${x.id}')">
                  <td><div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div></td>
                  <td><div class="player-cell">${Utils.avatarEl(nm)}<span>${Utils.escHtml(nm)}</span></div></td>
                  <td class="col-num">${x.p}</td>
                  <td class="col-num text-success">${x.w}</td>
                  <td class="col-num text-danger">${x.l}</td>
                  <td class="col-num ${x.diff>=0?'text-success':'text-danger'}">${x.diff>0?'+':''}${x.diff}</td>
                  <td><div class="eff-bar"><div class="progress-bar" style="flex:1"><div class="progress-fill ${x.eff>=0.5?'green':'red'}" style="width:${x.eff*100}%"></div></div><span class="eff-pct">${(x.eff*100).toFixed(0)}%</span></div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _showPartnerDetails(mainId, partnerId) {
    const mainP = DB.getPlayerById(mainId);
    const partnerP = DB.getPlayerById(partnerId);
    if (!mainP || !partnerP) return;

    const gId = Auth.getGroupId();
    const allMatches = DB.getMatchesForPlayer(mainId, gId).filter(m => {
      const t1 = (m.team1.player1 === mainId && m.team1.player2 === partnerId) || (m.team1.player1 === partnerId && m.team1.player2 === mainId);
      const t2 = (m.team2.player1 === mainId && m.team2.player2 === partnerId) || (m.team2.player1 === partnerId && m.team2.player2 === mainId);
      return t1 || t2;
    });

    // reverse to show newest first
    allMatches.reverse();

    let wins = 0, losses = 0, pf = 0, pa = 0, shoesGiven = 0;

    const matchesHtml = allMatches.map(m => {
      const isT1 = (m.team1.player1 === mainId && m.team1.player2 === partnerId) || (m.team1.player1 === partnerId && m.team1.player2 === mainId);
      const won = (isT1 && m.winner === 'team1') || (!isT1 && m.winner === 'team2');
      const myScore = isT1 ? m.score.team1 : m.score.team2;
      const oppScore = isT1 ? m.score.team2 : m.score.team1;
      
      if (won) wins++; else losses++;
      pf += myScore;
      pa += oppScore;
      shoesGiven += isT1 ? (m.shoes?.team1Given || 0) : (m.shoes?.team2Given || 0);

      const nm = (id)=> Utils.escHtml(DB.getPlayerById(id)?.name?.split(' ')[0]||'?');
      const opp1 = isT1 ? m.team2.player1 : m.team1.player1;
      const opp2 = isT1 ? m.team2.player2 : m.team1.player2;
      
      return `
        <div class="timeline-row" style="border-color:${won?'var(--accent-success)':'var(--accent-danger)'};margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="font-size:0.75rem;color:var(--text-muted)">${Utils.fmtDate(m.date)} &bull; ${m.type==='tournament'?'🏆 Torneo':'🎮 Amistoso'}</span>
              <div style="font-weight:600;margin-top:2px">
                vs <span style="color:var(--text-muted)">${nm(opp1)} & ${nm(opp2)}</span>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-weight:900;font-size:1.1rem;color:${won?'var(--accent-success)':'var(--accent-danger)'}">
                ${won?'V':'D'} ${myScore} — ${oppScore}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const played = wins + losses;
    const eff = played > 0 ? ((wins / played) * 100).toFixed(0) : 0;
    const diff = pf - pa;

    App.openModal({
      title: `👥 Detalles de la Pareja`,
      body: `
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-lg)">
          <div style="text-align:center">
             <div class="avatar avatar-lg" style="margin:0 auto 8px;background:${Utils.avatarColor(mainP.name)}">${Utils.initials(mainP.name)}</div>
             <div style="font-weight:700">${Utils.escHtml(mainP.name.split(' ')[0])}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-muted)">+</div>
          <div style="text-align:center">
             <div class="avatar avatar-lg" style="margin:0 auto 8px;background:${Utils.avatarColor(partnerP.name)}">${Utils.initials(partnerP.name)}</div>
             <div style="font-weight:700">${Utils.escHtml(partnerP.name.split(' ')[0])}</div>
          </div>
        </div>
        
        <div class="grid-3" style="margin-bottom:16px; gap:8px;">
          <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:12px;text-align:center">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Efectividad</div>
             <div style="font-size:1.8rem;font-weight:900;color:${eff>=50?'var(--accent-success)':'var(--accent-danger)'}">${eff}%</div>
             <div style="font-size:0.85rem;margin-top:4px"><span class="text-success">${wins}V</span> — <span class="text-danger">${losses}D</span></div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:12px;text-align:center">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Dif. Pts</div>
             <div style="font-size:1.8rem;font-weight:900;color:${diff>=0?'var(--accent-success)':'var(--accent-danger)'}">${diff>0?'+':''}${diff}</div>
             <div style="font-size:0.85rem;margin-top:4px;color:var(--text-muted)">${pf} a favor, ${pa} en contra</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:12px;text-align:center">
             <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Zapatos Dados</div>
             <div style="font-size:1.8rem;font-weight:900;color:var(--accent-warning)">👟 ${shoesGiven}</div>
             <div style="font-size:0.85rem;margin-top:4px;color:var(--text-muted)">A sus rivales</div>
          </div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--text-primary)">Historial de Partidas (${played})</h4>
        <div style="max-height:300px;overflow-y:auto;padding-right:4px">
          ${matchesHtml || '<div class="empty-state" style="padding:20px">No hay detalles disponibles</div>'}
        </div>
      `,
      footer: `<button class="btn btn-outline" onclick="App.closeModal()" style="width:100%">Cerrar</button>`
    });
  },

  // ========== 4. EVOLUTION ==========
  _viewEvolution() {
    setTimeout(()=>this._evoRender(), 50);
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">📈 Evolución de Forma</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 14px">Efectividad rolling (ventana de 5 partidas) para ver si el jugador está mejorando o en declive</p>
        <div class="form-group" style="max-width:320px">
          <select id="evo-p" class="form-select" onchange="StatsPage._evoRender()"><option value="">— Seleccionar jugador —</option>${this._pOpts(this.state.p1)}</select>
        </div>
      </div>
      <div id="evo-out">${this._empty('📈','Selecciona un jugador')}</div>`;
  },

  _evoRender() {
    const p = document.getElementById('evo-p')?.value;
    if (p) this.state.p1 = p;
    const el = document.getElementById('evo-out');
    if (!el||!p) { if(el) el.innerHTML=''; return; }

    const matches = DB.getMatchesForPlayer(p, Auth.getGroupId()).slice().reverse();
    if (matches.length < 5) { el.innerHTML = this._empty('📊','Se necesitan al menos 5 partidas'); return; }

    const rates=[], labels=[];
    for (let i=4; i<matches.length; i++) {
      const sl = matches.slice(Math.max(0,i-4), i+1);
      const w  = sl.filter(m=>{const t1=m.team1.player1===p||m.team1.player2===p;return(t1&&m.winner==='team1')||(!t1&&m.winner==='team2')}).length;
      rates.push(parseFloat((w/sl.length*100).toFixed(1)));
      labels.push(Utils.fmtDate(matches[i].date,'short'));
    }

    const last = rates[rates.length-1], first = rates[0];
    const trend = last - first;
    const pEvo  = DB.getPlayerById(p);
    const gEvo  = Auth.getGroupId();

    el.innerHTML = `
      <div class="grid-3" style="margin-bottom:12px">
        <div class="stat-card" style="text-align:center">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Forma actual</div>
          <div style="font-size:2rem;font-weight:900;color:${last>=50?'var(--accent-success)':'var(--accent-danger)'}">${last}%</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Tendencia</div>
          <div style="font-size:2rem;font-weight:900;color:${trend>=0?'var(--accent-success)':'var(--accent-danger)'}">${trend>0?'↗':'↘'} ${Math.abs(trend).toFixed(1)}%</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Partidas analizadas</div>
          <div style="font-size:2rem;font-weight:900">${matches.length}</div>
        </div>
      </div>
      <div class="stat-card">
        <div style="font-weight:700;margin-bottom:8px">📊 Amistosos vs Torneos</div>
        ${this._splitStatsCard(p, gEvo, pEvo?.name||'')}
      </div>
      <div class="stat-card"><div class="card-title" style="margin-bottom:12px">📈 Evolución de Efectividad (cada 5 partidas)</div><div id="evo-chart"></div></div>`;
    Charts.renderLineChart('evo-chart', [{label:'Efectividad %', data:rates}], {labels, height:280, min:0, max:100});
  },

  // ========== 5. STREAKS ==========
  _viewStreaks() {
    const gId = Auth.getGroupId();
    const all = DB.getAllPlayerStats(gId);
    const wins = all.filter(p=>p.stats.currentStreakType==='win'&&p.stats.currentStreak>1).sort((a,b)=>b.stats.currentStreak-a.stats.currentStreak);
    const loss = all.filter(p=>p.stats.currentStreakType==='loss'&&p.stats.currentStreak>1).sort((a,b)=>b.stats.currentStreak-a.stats.currentStreak);
    const sorted = [...all].sort((a,b)=>b.stats.maxWinStreak-a.stats.maxWinStreak);

    const streakRow = (ps, type) => `
      <div class="stat-row" style="gap:12px">
        <div class="player-cell">${Utils.avatarEl(ps.name)}<span style="font-weight:600">${Utils.escHtml(ps.name)}</span></div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <span style="font-size:0.78rem;color:var(--text-muted)">${ps.stats.currentStreak} en fila</span>
          <span class="streak-badge streak-${type}">${type==='win'?'🔥':'❄️'} ${ps.stats.currentStreak}</span>
        </div>
      </div>`;

    return `
      <div class="grid-2" style="margin-bottom:12px">
        <div class="stat-card">
          <div style="font-weight:700;margin-bottom:12px;color:var(--accent-warning)">🔥 Racha ganadora activa</div>
          ${wins.length ? wins.map(p=>streakRow(p,'win')).join('') : '<div class="text-muted text-sm">Nadie en racha ganadora</div>'}
        </div>
        <div class="stat-card">
          <div style="font-weight:700;margin-bottom:12px;color:var(--accent-info)">❄️ Racha perdedora activa</div>
          ${loss.length ? loss.map(p=>streakRow(p,'loss')).join('') : '<div class="text-muted text-sm">Nadie en racha perdedora</div>'}
        </div>
      </div>
      <div class="stat-card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);font-weight:700">🏆 Récords históricos de rachas</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>#</th><th>Jugador</th><th class="col-num">🔥 Máx victorias</th><th class="col-num">❄️ Máx derrotas</th><th>Estado actual</th></tr></thead>
            <tbody>
              ${sorted.map((ps,i)=>`<tr>
                <td>${i+1}</td>
                <td><div class="player-cell">${Utils.avatarEl(ps.name)}<span>${Utils.escHtml(ps.name)}</span></div></td>
                <td class="col-num"><span class="streak-badge streak-win">🔥 ${ps.stats.maxWinStreak}</span></td>
                <td class="col-num"><span class="streak-badge streak-loss">❄️ ${ps.stats.maxLossStreak}</span></td>
                <td>${ps.stats.currentStreak>1?`<span class="streak-badge streak-${ps.stats.currentStreakType}">${ps.stats.currentStreakType==='win'?'🔥':'❄️'} ${ps.stats.currentStreak} activa</span>`:'<span class="text-muted">—</span>'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ========== 6. SCORES ==========
  _viewScores() {
    setTimeout(()=>this._scoresRender(), 50);
    const matches = DB.getMatches(Auth.getGroupId());
    const total = matches.length;
    const shoes = matches.filter(m=>m.score.team1===0||m.score.team2===0).length;
    const avgScore = total>0 ? (matches.reduce((s,m)=>s+m.score.team1+m.score.team2,0)/(total*2)).toFixed(1) : 0;
    return `
      <div class="grid-3" style="margin-bottom:12px">
        <div class="stat-card" style="text-align:center">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Total partidas</div>
          <div style="font-size:2rem;font-weight:900">${total}</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Partidas con zapato</div>
          <div style="font-size:2rem;font-weight:900;color:var(--accent-warning)">👟 ${shoes}</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Puntaje promedio</div>
          <div style="font-size:2rem;font-weight:900">${avgScore}</div>
        </div>
      </div>
      <div class="stat-card"><div class="card-title" style="margin-bottom:12px">📊 Distribución de Puntuaciones Finales</div><div id="scores-chart"></div></div>`;
  },
  _scoresRender() {
    const matches = DB.getMatches(Auth.getGroupId());
    const b = {'0 (Zapato)':0,'1-25':0,'26-50':0,'51-75':0,'76-99':0,'100+':0};
    matches.forEach(m=>[m.score.team1,m.score.team2].forEach(s=>{
      if(s===0) b['0 (Zapato)']++;
      else if(s<=25) b['1-25']++;
      else if(s<=50) b['26-50']++;
      else if(s<=75) b['51-75']++;
      else if(s<=99) b['76-99']++;
      else b['100+']++;
    }));
    Charts.renderBarChart('scores-chart', Object.keys(b), [{label:'Frecuencia', data:Object.values(b)}], {height:280});
  },

  // ========== 7. HEATMAP ==========
  _viewHeatmap() {
    setTimeout(()=>this._heatRender(), 50);
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">📅 Actividad por Día de Semana</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 12px">¿Cuándo se juega más? Distribución de partidas por día</p>
        <div id="heat-chart"></div>
      </div>`;
  },
  _heatRender() {
    const days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const wins=Array(7).fill(0), total=Array(7).fill(0);
    DB.getMatches(Auth.getGroupId()).forEach(m=>{
      const d=new Date(m.date).getDay();
      total[d]++; wins[d]+=(m.winner==='team1'?1:0);
    });
    Charts.renderBarChart('heat-chart', days,
      [{label:'Total partidas',data:total},{label:'Victorias equipo 1',data:wins}],
      {height:280,legend:true});
  },

  // ========== 8. TIMELINE ==========
  _viewTimeline() {
    const matches = DB.getMatches(Auth.getGroupId()).slice(0,60);
    if (!matches.length) return this._empty('📉','Sin partidas registradas');
    return `
      <div class="stat-card">
        <h3 style="margin:0 0 4px">📉 Línea de Tiempo</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 14px">Historial de las últimas 60 partidas en orden cronológico inverso</p>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:65vh;overflow-y:auto">
          ${matches.map(m=>{
            const nm = (id)=> Utils.escHtml(DB.getPlayerById(id)?.name?.split(' ')[0]||'?');
            const isT = m.type==='tournament';
            return `
            <div class="timeline-row" style="border-color:${m.winner==='team1'?'var(--accent-primary)':'var(--accent-danger)'}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <span style="font-size:0.75rem;color:var(--text-muted)">${Utils.fmtDate(m.date)} &bull; ${isT?'🏆 Torneo':'🎮 Amistoso'}</span>
                  <div style="font-weight:600;margin-top:2px">
                    <span class="${m.winner==='team1'?'text-success':''}">${nm(m.team1.player1)} & ${nm(m.team1.player2)}</span>
                    <span style="color:var(--text-muted);margin:0 6px">vs</span>
                    <span class="${m.winner==='team2'?'text-success':''}">${nm(m.team2.player1)} & ${nm(m.team2.player2)}</span>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-weight:900;font-size:1.1rem">${m.score.team1} — ${m.score.team2}</div>
                  ${(m.score.team1===0||m.score.team2===0)?'<span style="font-size:0.75rem">👟 Zapato</span>':''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }
};
