/* =========================================
   PREDICTOR PAGE
   ========================================= */
const PredictorPage = {
  render() {
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId);
    const playerOpts = players.map(p => `<option value="${p.id}">${Utils.escHtml(p.name)} (${Utils.escHtml(p.alias||'—')})</option>`).join('');

    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">🔮 Predictor Inteligente</div>
          <div class="page-header-sub">Algoritmo de predicción basado en historial y estadísticas</div>
        </div>
      </div>

      <!-- Config -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-title" style="margin-bottom:12px">Configurar enfrentamiento</div>

        <div class="form-group" style="margin-bottom:24px;background:var(--bg-elevated);padding:12px;border-radius:10px">
          <label class="form-label">Contexto de Predicción</label>
          <select id="pred-context" class="form-select" onchange="PredictorPage.predict()">
            <option value="global">🌍 General (Todo el historial de tu equipo)</option>
            ${DB.getTournaments(groupId).map(t => `
              <option value="t_iso_${t.id}">🏆 ${Utils.escHtml(t.name)} (Solo torneo)</option>
              <option value="t_mix_${t.id}">🏆🌍 ${Utils.escHtml(t.name)} + General</option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:start">
          <div>
            <div class="section-title" style="color:var(--accent-primary)">Pareja 1</div>
            <div class="form-group">
              <label class="form-label">Jugador 1</label>
              <select id="pred-t1p1" class="form-select" onchange="PredictorPage.predict()">
                <option value="">Seleccionar...</option>${playerOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Jugador 2</label>
              <select id="pred-t1p2" class="form-select" onchange="PredictorPage.predict()">
                <option value="">Seleccionar...</option>${playerOpts}
              </select>
            </div>
          </div>
          <div style="text-align:center;padding-top:40px">
            <div style="font-size:2rem;font-weight:900;color:var(--text-muted)">VS</div>
          </div>
          <div>
            <div class="section-title" style="color:var(--accent-success)">Pareja 2</div>
            <div class="form-group">
              <label class="form-label">Jugador 1</label>
              <select id="pred-t2p1" class="form-select" onchange="PredictorPage.predict()">
                <option value="">Seleccionar...</option>${playerOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Jugador 2</label>
              <select id="pred-t2p2" class="form-select" onchange="PredictorPage.predict()">
                <option value="">Seleccionar...</option>${playerOpts}
              </select>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-full" onclick="PredictorPage.predict()">🔮 Predecir Resultado</button>
      </div>

      <!-- Result -->
      <div id="pred-result"></div>

      <!-- Best Pairs Suggestion -->
      <div class="card">
        <div class="card-title" style="margin-bottom:12px">💡 Mejores Parejas Sugeridas</div>
        <div class="card-subtitle" style="margin-bottom:12px">Parejas con mejor sinergia histórica (mínimo 2 partidas juntos)</div>
        <div id="best-pairs-list"></div>
      </div>
    </div>`;
  },

  afterRender() {
    this.loadBestPairs();
  },

  predict() {
    const t1p1 = document.getElementById('pred-t1p1')?.value;
    const t1p2 = document.getElementById('pred-t1p2')?.value;
    const t2p1 = document.getElementById('pred-t2p1')?.value;
    const t2p2 = document.getElementById('pred-t2p2')?.value;
    const el = document.getElementById('pred-result');
    if (!el) return;

    const allFilled = t1p1 && t1p2 && t2p1 && t2p2;
    const unique = new Set([t1p1, t1p2, t2p1, t2p2]);
    if (!allFilled || unique.size < 4) {
      el.innerHTML = '';
      return;
    }

    const groupId = Auth.getGroupId();
    const context = document.getElementById('pred-context').value;
    let result = null, vs = null, pair1Stats = null, pair2Stats = null;
    let st1p1, st1p2, st2p1, st2p2;

    if (context === 'global') {
      result = DB.predictMatch([t1p1, t1p2], [t2p1, t2p2], groupId);
      vs = DB.getVsStats(t1p1, t2p1, groupId);
      pair1Stats = DB.getPairStats(t1p1, t1p2, groupId);
      pair2Stats = DB.getPairStats(t2p1, t2p2, groupId);
      st1p1 = DB.getPlayerStats(t1p1, groupId);
      st1p2 = DB.getPlayerStats(t1p2, groupId);
      st2p1 = DB.getPlayerStats(t2p1, groupId);
      st2p2 = DB.getPlayerStats(t2p2, groupId);
    } else {
      const mode = context.startsWith('t_mix_') ? 'mixed' : 'isolated';
      const tId = context.replace('t_iso_', '').replace('t_mix_', '');
      
      result = DB.predictTournamentMatch([t1p1, t1p2], [t2p1, t2p2], tId, mode === 'mixed');
      vs = DB.getVsStats(t1p1, t2p1, groupId); // Keep global VS as fallback info
      pair1Stats = DB.getTournamentPairStats(t1p1, t1p2, tId);
      pair2Stats = DB.getTournamentPairStats(t2p1, t2p2, tId);
      
      const getPStat = id => mode === 'mixed' ? DB.getPlayerStats(id, groupId) : DB.getTournamentPlayerStats(id, tId);
      st1p1 = getPStat(t1p1);
      st1p2 = getPStat(t1p2);
      st2p1 = getPStat(t2p1);
      st2p2 = getPStat(t2p2);
    }

    const t1prob = parseFloat(result.team1Prob);
    const t2prob = parseFloat(result.team2Prob);
    const fav = t1prob > t2prob ? 1 : 2;

    el.innerHTML = `
      <div class="card" style="margin-bottom:12px;border-color:var(--accent-primary);border-width:2px">
        <div style="text-align:center;margin-bottom:12px">
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:8px">PREDICCIÓN ${context !== 'global' ? '🏆' : ''}</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--accent-${fav===1?'primary':'success'})">
            ${fav === 1 ? `${Utils.escHtml(Utils.playerName(t1p1))} & ${Utils.escHtml(Utils.playerName(t1p2))}` : `${Utils.escHtml(Utils.playerName(t2p1))} & ${Utils.escHtml(Utils.playerName(t2p2))}`}
          </div>
          <div style="font-size:0.85rem;color:var(--text-muted)">tiene mayor probabilidad de ganar</div>
        </div>

        <!-- Probability bar -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <span style="font-size:1.8rem;font-weight:900;color:var(--accent-primary);min-width:60px;text-align:right">${t1prob}%</span>
          <div style="flex:1;height:20px;border-radius:10px;background:rgba(255,77,109,0.2);overflow:hidden">
            <div style="height:100%;width:${t1prob}%;background:var(--gradient-primary);border-radius:10px;transition:width 1s ease"></div>
          </div>
          <span style="font-size:1.8rem;font-weight:900;color:var(--accent-danger);min-width:60px">${t2prob}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">
          <span>${Utils.escHtml(Utils.playerName(t1p1))} & ${Utils.escHtml(Utils.playerName(t1p2))}</span>
          <span>${Utils.escHtml(Utils.playerName(t2p1))} & ${Utils.escHtml(Utils.playerName(t2p2))}</span>
        </div>

        <!-- Factor breakdown -->
        <div class="section-title">Factores analizados</div>
        <div class="grid-2">
          <div>
            <div class="stat-row">
              <span class="stat-label">📊 Efectividad P1</span>
              <span class="stat-value">${st1p1.eff}% / ${st1p2.eff}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">🤝 Sinergia pareja</span>
              <span class="stat-value">${pair1Stats.played > 0 ? `${pair1Stats.eff}% (${pair1Stats.played}PJ)` : 'Sin datos'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">🔥 Racha actual</span>
              <span class="stat-value ${st1p1.currentStreakType==='win'?'text-success':'text-danger'}">${st1p1.currentStreakType==='win'?'🔥':'❄️'} ${st1p1.currentStreak}</span>
            </div>
          </div>
          <div>
            <div class="stat-row">
              <span class="stat-label">📊 Efectividad P2</span>
              <span class="stat-value">${st2p1.eff}% / ${st2p2.eff}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">🤝 Sinergia pareja</span>
              <span class="stat-value">${pair2Stats.played > 0 ? `${pair2Stats.eff}% (${pair2Stats.played}PJ)` : 'Sin datos'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">🔥 Racha actual</span>
              <span class="stat-value ${st2p1.currentStreakType==='win'?'text-success':'text-danger'}">${st2p1.currentStreakType==='win'?'🔥':'❄️'} ${st2p1.currentStreak}</span>
            </div>
          </div>
        </div>

        ${vs.played > 0 ? `
        <div class="section-title" style="margin-top:12px">⚔️ Historial directo (jugador vs jugador)</div>
        <div style="text-align:center;padding:12px;background:var(--bg-elevated);border-radius:10px">
          <span style="color:var(--accent-success);font-weight:800">${vs.p1Wins}V</span>
          <span style="color:var(--text-muted)"> — ${vs.played} PJ — </span>
          <span style="color:var(--accent-danger);font-weight:800">${vs.p2Wins}D</span>
        </div>` : `<div class="text-xs text-muted text-center" style="margin-top:12px">Sin historial directo entre estos jugadores</div>`}
      </div>`;
  },

  loadBestPairs() {
    const groupId = Auth.getGroupId();
    const pairs = DB.getBestPairs(groupId).filter(p => p.stats.played >= 2).slice(0, 8);
    const el = document.getElementById('best-pairs-list');
    if (!el) return;

    el.innerHTML = pairs.map((pair, i) => `
      <div class="stat-row">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <div class="rank-badge rank-${i<3?i+1:'other'}">${i+1}</div>
          <div>
            ${Utils.avatarEl(pair.p1.name)}
          </div>
          <div>
            ${Utils.avatarEl(pair.p2.name)}
          </div>
          <div>
            <div style="font-weight:600;font-size:0.9rem">${Utils.escHtml(pair.p1.name)} & ${Utils.escHtml(pair.p2.name)}</div>
            <div class="text-xs text-muted">${pair.stats.played} partidas juntos</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;color:var(--accent-primary)">${pair.stats.eff}%</div>
          <div class="text-xs text-muted">${pair.stats.wins}V / ${pair.stats.losses}D</div>
        </div>
      </div>`).join('') || `<div class="empty-state"><div class="empty-text">No hay suficiente historial de parejas aún</div></div>`;
  }
};
