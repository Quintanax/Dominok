/* =========================================
   DB.JS — Local Database (localStorage)
   Simulates a full relational DB
   ========================================= */
const DB = {
  _store: {},
  _statsCache: {}, // cache de stats por groupId → { players, pairs, ts }

  init() {
    try {
      const saved = localStorage.getItem('dominostats_db');
      if (saved) {
        this._store = JSON.parse(saved);
      } else {
        throw new Error('No data');
      }
    } catch (e) {
      console.warn('DB initialization failed or empty. Seeding default data.');
      this._store = {
        users: [], groups: [], players: [], matches: [],
        tournaments: [], tournament_matches: [], tournament_players: [], tournament_teams: [],
        notifications: [], logs: [], settings: {}
      };
      this._seedData();
    }

    // Ensure core tables exist after loading
    if (!this._store.users) this._store.users = [];
    if (!this._store.groups) this._store.groups = [];
    if (!this._store.players) this._store.players = [];
    if (!this._store.matches) this._store.matches = [];
    if (!this._store.notifications) this._store.notifications = [];
    if (!this._store.logs) this._store.logs = [];
    if (!this._store.settings) this._store.settings = {};
    if (!this._store.tournaments) this._store.tournaments = [];
    if (!this._store.tournament_matches) this._store.tournament_matches = [];
    if (!this._store.tournament_players) this._store.tournament_players = [];
    if (!this._store.tournament_teams) this._store.tournament_teams = [];
    if (!this._store.tournament_groups) this._store.tournament_groups = [];
    if (!this._store.tournament_rounds) this._store.tournament_rounds = [];

    // Ensure demo admin exists for bot connection
    const demoEmail = 'admin@demo.com';
    const userExists = this._store.users.some(u => u.email && u.email.toLowerCase() === demoEmail);
    if (!userExists) {
      const adminId = 'admin_demo_user';
      const group1Id = 'dominostats_demo_group';
      this._store.groups.push({ id: group1Id, name: 'Mi Club Dominó', adminId: adminId, createdAt: this._daysAgo(0), active: true });
      this._store.users.push({
        id: adminId, name: 'Administrador', email: demoEmail,
        password: 'admin123', role: 'admin', groupId: group1Id,
        createdAt: this._daysAgo(0), avatar: null, active: true
      });
      this.save();
    }

    return this;
  },

  save() {
    localStorage.setItem('dominostats_db', JSON.stringify(this._store));
  },

  // Invalida el caché de stats para un grupo (o todos si no se especifica)
  _invalidateStatsCache(groupId) {
    if (groupId) delete this._statsCache[groupId];
    else this._statsCache = {};
  },

  _autoRepairOrphanedMatches() {
    let orphansRepaired = 0;
    if (!this._store.matches || !this._store.players) return;
    
    this._store.matches.forEach(m => {
      let changed = false;
      const checkAndFix = (team, pNum) => {
        const id = team[`player${pNum}`];
        const name = team[`player${pNum}Name`];

        // 1) Handle completely orphaned match (id is null but name exists)
        if (!id && name) {
          const activePlayers = this._store.players.filter(x => x.active && x.groupId === m.groupId);
          const newP = typeof Utils !== 'undefined' && Utils.fuzzyMatch ? Utils.fuzzyMatch(name, activePlayers) : null;
          if (newP) {
            team[`player${pNum}`] = newP.id;
            changed = true;
          }
          return;
        }

        if (!id) return;

        const p = this._store.players.find(x => x.id === id);
        if (p && !p.active) {
          // Si sabemos con quién se fusionó
          if (p.mergedInto) {
            const keepP = this._store.players.find(x => x.id === p.mergedInto);
            if (keepP && keepP.active) {
              team[`player${pNum}`] = keepP.id;
              changed = true;
              return;
            }
          }
          // Si no, intentamos emparejar por nombre o alias (fuzzy)
          const searchName = name || p.name;
          if (searchName) {
            const activePlayers = this._store.players.filter(x => x.active && x.groupId === m.groupId);
            const newP = typeof Utils !== 'undefined' && Utils.fuzzyMatch ? Utils.fuzzyMatch(searchName, activePlayers) : null;
            if (newP) {
              team[`player${pNum}`] = newP.id;
              changed = true;
            }
          }
        }
      };
      
      if (m.team1) { checkAndFix(m.team1, 1); checkAndFix(m.team1, 2); }
      if (m.team2) { checkAndFix(m.team2, 1); checkAndFix(m.team2, 2); }
      if (changed) orphansRepaired++;
    });
    
    if (orphansRepaired > 0) {
      console.log(`[DB] Reparadas ${orphansRepaired} partidas huérfanas.`);
      this._invalidateStatsCache();
      this.save();
      // Forzaremos la sincronización desde el llamador si es necesario
    }
    return orphansRepaired;
  },

  _seedData() {
    // Blank slate
  },

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },
  _daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); },
  _hoursAgo(n) { const d = new Date(); d.setHours(d.getHours() - n); return d.toISOString(); },
  _minutesAgo(n) { const d = new Date(); d.setMinutes(d.getMinutes() - n); return d.toISOString(); },

  // === USERS ===
  getUsers() { return this._store.users; },
  getUserById(id) { return this._store.users.find(u => u.id === id); },
  getUserByEmail(email) {
    if (!email) return null;
    const e = email.toLowerCase().trim();
    return this._store.users.find(u =>
      (u.email && u.email.toLowerCase() === e) ||
      (u.name && u.name.toLowerCase() === e) ||
      (u.id === e)
    );
  },
  addUser(user) {
    user.id = this._uuid(); user.createdAt = new Date().toISOString();
    this._store.users.push(user); this.save();
    return user;
  },
  updateUser(id, data) {
    const idx = this._store.users.findIndex(u => u.id === id);
    if (idx >= 0) { this._store.users[idx] = {...this._store.users[idx], ...data}; this.save(); }
  },
  deleteUser(id) {
    this._store.users = this._store.users.filter(u => u.id !== id); this.save();
  },

  // === GROUPS ===
  getGroups() { return this._store.groups; },
  getGroupById(id) { return this._store.groups.find(g => g.id === id); },
  addGroup(group) {
    group.id = this._uuid(); group.createdAt = new Date().toISOString();
    this._store.groups.push(group); this.save();
    return group;
  },
  updateGroup(id, data) {
    const idx = this._store.groups.findIndex(g => g.id === id);
    if (idx >= 0) { this._store.groups[idx] = {...this._store.groups[idx], ...data}; this.save(); }
  },
  deleteGroup(id) {
    this._store.groups = this._store.groups.filter(g => g.id !== id);
    // Cascade
    this._store.users = this._store.users.filter(u => u.groupId !== id);
    this._store.players = this._store.players.filter(p => p.groupId !== id);
    this._store.matches = this._store.matches.filter(m => m.groupId !== id);
    this.save();
    this.addLog({ action: 'group_deleted', desc: `Grupo eliminado (ID: ${id})` });
  },

  // === PLAYERS ===
  getPlayers(groupId = null) {
    if (!groupId) return this._store.players;
    return this._store.players.filter(p => p.groupId === groupId && p.active);
  },
  getPlayerById(id) { return this._store.players.find(p => p.id === id); },
  addPlayer(player) {
    player.id = this._uuid(); player.createdAt = new Date().toISOString(); player.active = true;
    this._store.players.push(player); this.save();
    this.addLog({ action: 'player_added', desc: `Nuevo jugador: ${player.name}` });
    return player;
  },
  updatePlayer(id, data) {
    const idx = this._store.players.findIndex(p => p.id === id);
    if (idx >= 0) { 
      this._store.players[idx] = {...this._store.players[idx], ...data}; 
      this._invalidateStatsCache(this._store.players[idx].groupId);
      this.save(); 
    }
  },
  deletePlayer(id) {
    this.updatePlayer(id, { active: false });
    this.addLog({ action: 'player_deleted', desc: `Jugador eliminado: ${id}` });
  },
  importPlayers(players, groupId) {
    const imported = [];
    for (const p of players) {
      const name = p.name || p.nombre;
      if (!name) continue;
      
      const rawAliases = p.aliases || p.alias || '';
      // Support comma-separated aliases
      // Support comma-separated aliases and numeric values
      const safeRaw = (rawAliases !== null && rawAliases !== undefined) ? String(rawAliases) : '';
      const aliasesArray = safeRaw.split(',').map(a => a.trim()).filter(Boolean);
      
      const player = this.addPlayer({ 
        name: name, 
        aliases: aliasesArray, 
        alias: aliasesArray[0] || '', // backwards compatibility
        groupId, 
        notes: p.notes || p.notas || '' 
      });
      imported.push(player);
    }
    return imported;
  },

  // === MATCHES ===
  getMatches(groupId = null) {
    let m = this._store.matches;
    if (groupId) m = m.filter(x => x.groupId === groupId);
    return m.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getMatchById(id) { return this._store.matches.find(m => m.id === id); },
  addMatch(match) {
    match.id = this._uuid(); match.createdAt = new Date().toISOString();
    this._store.matches.push(match); this.save();
    this._invalidateStatsCache(match.groupId);
    this.addLog({ action: 'match_created', desc: `Nueva partida ${match.type}` });
    this.addNotification({ title: 'Partida registrada', desc: `${match.type === 'tournament' ? 'Torneo' : 'Amistoso'} — ${match.score.team1}:${match.score.team2}`, type: 'match' });
    return match;
  },
  updateMatch(id, data) {
    const idx = this._store.matches.findIndex(m => m.id === id);
    if (idx >= 0) {
      this._store.matches[idx] = {...this._store.matches[idx], ...data};
      this._invalidateStatsCache(this._store.matches[idx].groupId);
      this.save();
    }
  },
  deleteMatch(id) {
    const match = this._store.matches.find(m => m.id === id);
    this._store.matches = this._store.matches.filter(m => m.id !== id);
    if (!this._store.deletedMatchIds) this._store.deletedMatchIds = [];
    this._store.deletedMatchIds.push(id);
    if (match) this._invalidateStatsCache(match.groupId);
    this.save();
    this.addLog({ action: 'match_deleted', desc: `Partida eliminada: ${id}` });
  },

  // === STATS ENGINE ===
  getPlayerStats(playerId, groupId) {
    const matches = this.getMatches(groupId);
    let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
    let shoesGiven = 0, shoesReceived = 0, played = 0;
    let currentStreak = 0, currentStreakType = null;
    let maxWinStreak = 0, maxLossStreak = 0;
    let tempStreak = 0, tempType = null;
    const playerMatches = [];

    for (const m of [...matches].reverse()) {
      const inTeam1 = m.team1.player1 === playerId || m.team1.player2 === playerId;
      const inTeam2 = m.team2.player1 === playerId || m.team2.player2 === playerId;
      if (!inTeam1 && !inTeam2) continue;
      played++;
      const myTeam = inTeam1 ? 'team1' : 'team2';
      const oppTeam = inTeam1 ? 'team2' : 'team1';
      const won = m.winner === myTeam;

      if (won) wins++; else losses++;
      pointsFor += m.score[myTeam];
      pointsAgainst += m.score[oppTeam];
      shoesGiven += m.shoes[`${myTeam}Given`] || 0;
      shoesReceived += m.shoes[`${oppTeam}Given`] || 0;
      playerMatches.push({...m, won, myTeam});

      // Streak calc
      if (tempType === null) { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
      else if ((won && tempType === 'win') || (!won && tempType === 'loss')) {
        tempStreak++;
      } else { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
      if (tempType === 'win') maxWinStreak = Math.max(maxWinStreak, tempStreak);
      else maxLossStreak = Math.max(maxLossStreak, tempStreak);
    }

    // Current streak (from most recent)
    for (const m of playerMatches.reverse()) {
      const won = m.won;
      if (currentStreakType === null) { currentStreakType = won ? 'win' : 'loss'; currentStreak = 1; }
      else if ((won && currentStreakType === 'win') || (!won && currentStreakType === 'loss')) currentStreak++;
      else break;
    }

    const eff = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;
    const pointDiff = pointsFor - pointsAgainst;
    return { playerId, played, wins, losses, pointsFor, pointsAgainst, pointDiff, shoesGiven, shoesReceived, eff: parseFloat(eff), currentStreak, currentStreakType, maxWinStreak, maxLossStreak };
  },

  getAllPlayerStats(groupId) {
    // ── Caché: devolver resultado previo si no ha cambiado ──
    const cached = this._statsCache[groupId];
    if (cached) return cached;

    // ── Single-pass O(matches): computar stats de TODOS los jugadores en una sola iteración ──
    const players = this.getPlayers(groupId);
    if (!players.length) return [];

    // Inicializar acumuladores por playerId
    const acc = {};
    players.forEach(p => {
      acc[p.id] = {
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0,
        shoesGiven: 0, shoesReceived: 0, played: 0,
        history: [] // [true=win, false=loss] en orden cronológico
      };
    });

    // Una sola pasada por las partidas (ordenadas cronológicamente)
    const matches = this.getMatches(groupId);
    const chronological = [...matches].reverse(); // getMatches devuelve desc
    for (const m of chronological) {
      const processTeam = (myTeamKey, oppTeamKey) => {
        const p1id = m[myTeamKey].player1;
        const p2id = m[myTeamKey].player2;
        const won  = m.winner === myTeamKey;
        const ptsFor  = m.score[myTeamKey]  || 0;
        const ptsAga  = m.score[oppTeamKey] || 0;
        const shoesGiven = m.shoes?.[`${myTeamKey}Given`]  || 0;
        const shoesRecv  = m.shoes?.[`${oppTeamKey}Given`] || 0;

        [p1id, p2id].forEach(pid => {
          if (!pid || !acc[pid]) return;
          const a = acc[pid];
          a.played++;
          if (won) a.wins++; else a.losses++;
          a.pointsFor     += ptsFor;
          a.pointsAgainst += ptsAga;
          a.shoesGiven    += shoesGiven;
          a.shoesReceived += shoesRecv;
          a.history.push(won);
        });
      };
      processTeam('team1', 'team2');
      processTeam('team2', 'team1');
    }

    // Calcular métricas derivadas (eff, rachas) para cada jugador
    const result = players.map(p => {
      const a = acc[p.id];
      const eff = a.played > 0 ? parseFloat(((a.wins / a.played) * 100).toFixed(1)) : 0;
      const pointDiff = a.pointsFor - a.pointsAgainst;

      // Racha actual (desde el final de history)
      let currentStreak = 0, currentStreakType = null;
      for (let i = a.history.length - 1; i >= 0; i--) {
        const won = a.history[i];
        if (currentStreakType === null) { currentStreakType = won ? 'win' : 'loss'; currentStreak = 1; }
        else if ((won && currentStreakType === 'win') || (!won && currentStreakType === 'loss')) currentStreak++;
        else break;
      }

      // Racha máxima
      let maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0, tempType = null;
      for (const won of a.history) {
        if (tempType === null) { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
        else if ((won && tempType === 'win') || (!won && tempType === 'loss')) tempStreak++;
        else { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
        if (tempType === 'win') maxWinStreak = Math.max(maxWinStreak, tempStreak);
        else maxLossStreak = Math.max(maxLossStreak, tempStreak);
      }

      return {
        ...p,
        stats: {
          playerId: p.id,
          played: a.played, wins: a.wins, losses: a.losses,
          pointsFor: a.pointsFor, pointsAgainst: a.pointsAgainst, pointDiff,
          shoesGiven: a.shoesGiven, shoesReceived: a.shoesReceived,
          eff, currentStreak, currentStreakType, maxWinStreak, maxLossStreak
        }
      };
    }).sort((a, b) => b.stats.eff - a.stats.eff || b.stats.wins - a.stats.wins);

    // Guardar en caché
    this._statsCache[groupId] = result;
    return result;
  },

  getPairStats(player1Id, player2Id, groupId) {
    const matches = this.getMatches(groupId);
    let wins = 0, losses = 0, played = 0;
    for (const m of matches) {
      const inTeam1 = (m.team1.player1 === player1Id || m.team1.player2 === player1Id) &&
                      (m.team1.player1 === player2Id || m.team1.player2 === player2Id);
      const inTeam2 = (m.team2.player1 === player1Id || m.team2.player2 === player1Id) &&
                      (m.team2.player1 === player2Id || m.team2.player2 === player2Id);
      if (!inTeam1 && !inTeam2) continue;
      played++;
      const myTeam = inTeam1 ? 'team1' : 'team2';
      if (m.winner === myTeam) wins++; else losses++;
    }
    const eff = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;
    return { player1Id, player2Id, played, wins, losses, eff: parseFloat(eff) };
  },

  getVsStats(player1Id, player2Id, groupId) {
    const matches = this.getMatches(groupId);
    let p1Wins = 0, p2Wins = 0, played = 0;
    for (const m of matches) {
      const p1InT1 = m.team1.player1 === player1Id || m.team1.player2 === player1Id;
      const p2InT2 = m.team2.player1 === player2Id || m.team2.player2 === player2Id;
      const p2InT1 = m.team1.player1 === player2Id || m.team1.player2 === player2Id;
      const p1InT2 = m.team2.player1 === player1Id || m.team2.player2 === player1Id;
      if (!((p1InT1 && p2InT2) || (p2InT1 && p1InT2))) continue;
      played++;
      if ((p1InT1 && m.winner === 'team1') || (p1InT2 && m.winner === 'team2')) p1Wins++;
      else p2Wins++;
    }
    return { played, p1Wins, p2Wins };
  },

  getBestPairs(groupId) {
    // Usar caché de parejas si existe
    const cacheKey = `pairs_${groupId}`;
    if (this._statsCache[cacheKey]) return this._statsCache[cacheKey];

    const matches = this.getMatches(groupId);
    const chronological = [...matches].reverse();
    const pairsMap = {};

    chronological.forEach(m => {
      const processPair = (teamKey, winnerKey) => {
        const a = m[teamKey].player1;
        const b = m[teamKey].player2;
        if (!a || !b) return;
        const key = [a, b].sort().join('|');
        if (!pairsMap[key]) pairsMap[key] = { played: 0, wins: 0, losses: 0, shoesGiven: 0, history: [] };
        pairsMap[key].played++;
        const won = (m.winner === winnerKey);
        if (won) pairsMap[key].wins++;
        else pairsMap[key].losses++;
        pairsMap[key].shoesGiven += (m.shoes?.[`${teamKey}Given`] || 0);
        pairsMap[key].history.push(won);
      };
      processPair('team1', 'team1');
      processPair('team2', 'team2');
    });

    const result = [];
    for (const [key, stats] of Object.entries(pairsMap)) {
      const [id1, id2] = key.split('|');
      const p1 = this.getPlayerById(id1);
      const p2 = this.getPlayerById(id2);
      if (p1 && p2) {
        stats.eff = stats.played > 0 ? parseFloat(((stats.wins / stats.played) * 100).toFixed(1)) : 0;
        
        let maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0, tempType = null;
        for (const won of stats.history) {
          if (tempType === null) { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
          else if ((won && tempType === 'win') || (!won && tempType === 'loss')) tempStreak++;
          else { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
          if (tempType === 'win') maxWinStreak = Math.max(maxWinStreak, tempStreak);
          else maxLossStreak = Math.max(maxLossStreak, tempStreak);
        }
        stats.maxWinStreak = maxWinStreak;
        stats.maxLossStreak = maxLossStreak;

        result.push({ p1, p2, stats });
      }
    }
    const sorted = result.sort((a, b) => b.stats.eff - a.stats.eff || b.stats.wins - a.stats.wins);
    this._statsCache[cacheKey] = sorted;
    return sorted;
  },

  getMatchesForPlayer(playerId, groupId) {
    return this.getMatches(groupId).filter(m =>
      m.team1.player1 === playerId || m.team1.player2 === playerId ||
      m.team2.player1 === playerId || m.team2.player2 === playerId
    );
  },

  // Predict match outcome — usa stats cacheadas cuando están disponibles
  predictMatch(team1PlayerIds, team2PlayerIds, groupId) {
    // Intentar obtener desde el single-pass cache
    const allStats = this.getAllPlayerStats(groupId);
    const statsMap = {};
    allStats.forEach(ps => { statsMap[ps.id] = ps.stats; });

    const getStat = (id) => statsMap[id] || this.getPlayerStats(id, groupId);
    const t1 = team1PlayerIds.map(getStat);
    const t2 = team2PlayerIds.map(getStat);

    const t1Eff = (t1[0].eff + (t1[1] ? t1[1].eff : 50)) / (t1[1] ? 2 : 1);
    const t2Eff = (t2[0].eff + (t2[1] ? t2[1].eff : 50)) / (t2[1] ? 2 : 1);

    const pairStat1 = t1.length === 2 ? this.getPairStats(team1PlayerIds[0], team1PlayerIds[1], groupId) : null;
    const pairStat2 = t2.length === 2 ? this.getPairStats(team2PlayerIds[0], team2PlayerIds[1], groupId) : null;
    const p1Bonus = pairStat1 && pairStat1.played > 3 ? (pairStat1.eff - 50) * 0.2 : 0;
    const p2Bonus = pairStat2 && pairStat2.played > 3 ? (pairStat2.eff - 50) * 0.2 : 0;

    const t1RecentBonus = t1[0].currentStreakType === 'win' ? t1[0].currentStreak * 1.5 : -(t1[0].currentStreak || 0);
    const t2RecentBonus = t2[0].currentStreakType === 'win' ? t2[0].currentStreak * 1.5 : -(t2[0].currentStreak || 0);

    const score1 = t1Eff + p1Bonus + t1RecentBonus;
    const score2 = t2Eff + p2Bonus + t2RecentBonus;
    const total = score1 + score2;
    const t1Prob = total > 0 ? (score1 / total * 100) : 50;

    return { team1Prob: Math.min(95, Math.max(5, t1Prob)).toFixed(1), team2Prob: (100 - t1Prob).toFixed(1) };
  },

  getMonthlyStats(groupId) {
    const matches = this.getMatches(groupId);
    const months = {};
    for (const m of matches) {
      if (!m.date) continue;
      const d = new Date(m.date);
      if (isNaN(d.getTime())) continue;
      
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: key, matches: 0, tournaments: 0, friendly: 0 };
      months[key].matches++;
      if (m.type === 'tournament') months[key].tournaments++;
      else months[key].friendly++;
    }
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  },

  getWeekdayStats(playerId, groupId) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const stats = Array(7).fill(null).map((_, i) => ({ day: days[i], wins: 0, losses: 0, played: 0 }));
    const matches = this.getMatchesForPlayer(playerId, groupId);
    for (const m of matches) {
      const dow = new Date(m.date).getDay();
      const inTeam1 = m.team1.player1 === playerId || m.team1.player2 === playerId;
      const won = (inTeam1 && m.winner === 'team1') || (!inTeam1 && m.winner === 'team2');
      stats[dow].played++;
      if (won) stats[dow].wins++; else stats[dow].losses++;
    }
    return stats;
  },

  // === NOTIFICATIONS ===
  getNotifications() { return this._store.notifications.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); },
  addNotification(n) {
    n.id = this._uuid(); n.createdAt = new Date().toISOString(); n.read = false;
    this._store.notifications.unshift(n); this.save();
  },
  markAllNotificationsRead() {
    this._store.notifications.forEach(n => n.read = true); this.save();
  },

  // === LOGS ===
  getLogs() { return this._store.logs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); },
  addLog(log) {
    log.id = this._uuid(); log.createdAt = new Date().toISOString();
    log.userId = (window.Auth && Auth.currentUser) ? Auth.currentUser.id : 'system';
    this._store.logs.unshift(log);
    if (this._store.logs.length > 200) this._store.logs = this._store.logs.slice(0, 200);
    this.save();
  },

  // === SETTINGS ===
  getSetting(key, def = null) { return this._store.settings[key] !== undefined ? this._store.settings[key] : def; },
  setSetting(key, val) { this._store.settings[key] = val; this.save(); },

  // === BACKUP ===
  exportBackup() {
    return JSON.stringify(this._store, null, 2);
  },
  importBackup(json) {
    try {
      const data = JSON.parse(json);
      this._store = data; this.save(); return true;
    } catch { return false; }
  },
  resetDemo() {
    localStorage.removeItem('dominostats_db');
    this._store = { users: [], groups: [], players: [], matches: [], tournaments: [], tournament_matches: [], tournament_players: [], tournament_teams: [], notifications: [], logs: [], settings: {} };
    this._seedData();
  },

  // =============================================
  // === TOURNAMENTS ===
  // =============================================
  getTournaments(groupId = null) {
    let t = this._store.tournaments || [];
    if (groupId) t = t.filter(x => x.groupId === groupId);
    return t.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getTournamentById(id) { return (this._store.tournaments || []).find(t => t.id === id); },
  addTournament(t) {
    if (!this._store.tournaments) this._store.tournaments = [];
    t.id = this._uuid(); t.createdAt = new Date().toISOString(); t.status = t.status || 'active';
    this._store.tournaments.push(t); this.save();
    this.addLog({ action: 'tournament_created', desc: `Torneo creado: ${t.name}` });
    return t;
  },
  updateTournament(id, data) {
    if (!this._store.tournaments) this._store.tournaments = [];
    const idx = this._store.tournaments.findIndex(t => t.id === id);
    if (idx >= 0) { this._store.tournaments[idx] = {...this._store.tournaments[idx], ...data}; this.save(); }
  },
  deleteTournament(id) {
    if (!this._store.tournaments) this._store.tournaments = [];
    this._store.tournaments = this._store.tournaments.filter(t => t.id !== id);
    // Cascade delete everything related
    if (this._store.tournament_matches) this._store.tournament_matches = this._store.tournament_matches.filter(m => m.tournamentId !== id);
    if (this._store.tournament_players) this._store.tournament_players = this._store.tournament_players.filter(p => p.tournamentId !== id);
    if (this._store.tournament_teams) this._store.tournament_teams = this._store.tournament_teams.filter(t => t.tournamentId !== id);
    if (this._store.tournament_groups) this._store.tournament_groups = this._store.tournament_groups.filter(g => g.tournamentId !== id);
    if (this._store.tournament_rounds) this._store.tournament_rounds = this._store.tournament_rounds.filter(r => r.tournamentId !== id);
    this.save();
    this.addLog({ action: 'tournament_deleted', desc: `Torneo eliminado: ${id}` });
  },
  cloneTournament(id) {
    const orig = this.getTournamentById(id);
    if (!orig) return null;
    const clone = {
      ...orig,
      name: orig.name + ' (Copia)',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null
    };
    delete clone.id; delete clone.createdAt;
    const newT = this.addTournament(clone);
    // Copy players
    const players = this.getTournamentPlayers(id);
    players.forEach(p => this.addTournamentPlayer({ tournamentId: newT.id, playerId: p.playerId, groupId: p.groupId }));
    return newT;
  },

  // === TOURNAMENT PLAYERS ===
  getTournamentPlayers(tournamentId) {
    return (this._store.tournament_players || []).filter(p => p.tournamentId === tournamentId);
  },
  addTournamentPlayer(p) {
    if (!this._store.tournament_players) this._store.tournament_players = [];
    // Avoid duplicates
    const exists = this._store.tournament_players.find(x => x.tournamentId === p.tournamentId && x.playerId === p.playerId);
    if (exists) return exists;
    p.id = this._uuid(); p.joinedAt = new Date().toISOString();
    this._store.tournament_players.push(p); this.save();
    return p;
  },
  removeTournamentPlayer(tournamentId, playerId) {
    if (!this._store.tournament_players) this._store.tournament_players = [];
    this._store.tournament_players = this._store.tournament_players.filter(
      p => !(p.tournamentId === tournamentId && p.playerId === playerId)
    );
    this.save();
  },

  // === TOURNAMENT TEAMS ===
  getTournamentTeams(tournamentId) {
    return (this._store.tournament_teams || []).filter(t => t.tournamentId === tournamentId);
  },
  getTournamentTeamById(id) { return (this._store.tournament_teams || []).find(t => t.id === id); },
  addTournamentTeam(team) {
    if (!this._store.tournament_teams) this._store.tournament_teams = [];
    team.id = this._uuid(); team.createdAt = new Date().toISOString();
    this._store.tournament_teams.push(team); this.save();
    return team;
  },
  updateTournamentTeam(id, data) {
    if (!this._store.tournament_teams) this._store.tournament_teams = [];
    const idx = this._store.tournament_teams.findIndex(t => t.id === id);
    if (idx >= 0) { this._store.tournament_teams[idx] = {...this._store.tournament_teams[idx], ...data}; this.save(); }
  },
  deleteTournamentTeam(id) {
    if (!this._store.tournament_teams) this._store.tournament_teams = [];
    this._store.tournament_teams = this._store.tournament_teams.filter(t => t.id !== id);
    this.save();
  },

  // Get team stats: wins/losses/pts from tournament_matches where team is referenced
  getTournamentTeamStats(teamId, tournamentId) {
    const matches = this.getTournamentMatches(tournamentId).filter(m => m.team1Id === teamId || m.team2Id === teamId);
    let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0, played = 0, shoesGiven = 0, shoesReceived = 0;
    for (const m of matches) {
      const myTeam = m.team1Id === teamId ? 'team1' : 'team2';
      const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
      played++;
      if (m.winner === myTeam) wins++; else losses++;
      pointsFor += m.score?.[myTeam] || 0;
      pointsAgainst += m.score?.[oppTeam] || 0;
      shoesGiven += m.shoes?.[`${myTeam}Given`] || 0;
      shoesReceived += m.shoes?.[`${oppTeam}Given`] || 0;
    }
    const eff = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;
    const pointDiff = pointsFor - pointsAgainst;
    return { teamId, played, wins, losses, pointsFor, pointsAgainst, pointDiff, shoesGiven, shoesReceived, eff: parseFloat(eff) };
  },

  getAllTournamentTeamStats(tournamentId) {
    const teams = this.getTournamentTeams(tournamentId);
    return teams.map(team => ({
      ...team,
      stats: this.getTournamentTeamStats(team.id, tournamentId)
    })).sort((a, b) => b.stats.wins - a.stats.wins || b.stats.pointDiff - a.stats.pointDiff);
  },

  // Generate round-robin fixtures (every team plays each other)
  generateRoundRobin(teamIds) {
    const fixtures = [];
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        fixtures.push({ team1Id: teamIds[i], team2Id: teamIds[j] });
      }
    }
    return fixtures;
  },

  // Generate bracket fixtures (sequential single-elimination)
  generateBracket(teamIds) {
    // Pad to next power of 2 with byes
    const n = Math.pow(2, Math.ceil(Math.log2(teamIds.length)));
    const seeded = [...teamIds];
    while (seeded.length < n) seeded.push(null); // null = bye
    const rounds = [];
    let current = seeded;
    let roundNum = 1;
    while (current.length > 1) {
      const matches = [];
      for (let i = 0; i < current.length; i += 2) {
        matches.push({ team1Id: current[i], team2Id: current[i+1], roundNumber: roundNum, isBye: current[i+1] === null });
      }
      rounds.push(matches);
      current = matches.map(() => null); // winners TBD
      roundNum++;
    }
    return rounds;
  },

  // === TOURNAMENT MATCHES ===
  getTournamentMatches(tournamentId) {
    return (this._store.tournament_matches || [])
      .filter(m => m.tournamentId === tournamentId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getTournamentMatchById(id) { return (this._store.tournament_matches || []).find(m => m.id === id); },
  addTournamentMatch(m) {
    if (!this._store.tournament_matches) this._store.tournament_matches = [];
    m.id = this._uuid(); m.createdAt = new Date().toISOString();
    this._store.tournament_matches.push(m); this.save();
    // Update tournament match count
    const t = this.getTournamentById(m.tournamentId);
    if (t) {
      this.addNotification({ title: `🏆 ${t.name}`, desc: `Nueva partida: ${m.score.team1}:${m.score.team2}`, type: 'match' });
    }
    this.addLog({ action: 'tournament_match', desc: `Partida en torneo: ${m.tournamentId}` });
    return m;
  },
  updateTournamentMatch(id, data) {
    if (!this._store.tournament_matches) this._store.tournament_matches = [];
    const idx = this._store.tournament_matches.findIndex(m => m.id === id);
    if (idx >= 0) { this._store.tournament_matches[idx] = {...this._store.tournament_matches[idx], ...data}; this.save(); }
  },
  deleteTournamentMatch(id) {
    if (!this._store.tournament_matches) this._store.tournament_matches = [];
    this._store.tournament_matches = this._store.tournament_matches.filter(m => m.id !== id);
    this.save();
  },

  // === TOURNAMENT STATS ENGINE (ISOLATED) ===
  getTournamentPlayerStats(playerId, tournamentId) {
    const matches = this.getTournamentMatches(tournamentId);
    let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
    let shoesGiven = 0, shoesReceived = 0, played = 0;
    let currentStreak = 0, currentStreakType = null;
    let maxWinStreak = 0, maxLossStreak = 0;
    let tempStreak = 0, tempType = null;
    const playerMatches = [];

    for (const m of [...matches].reverse()) {
      const inTeam1 = m.team1.player1 === playerId || m.team1.player2 === playerId;
      const inTeam2 = m.team2.player1 === playerId || m.team2.player2 === playerId;
      if (!inTeam1 && !inTeam2) continue;
      played++;
      const myTeam = inTeam1 ? 'team1' : 'team2';
      const oppTeam = inTeam1 ? 'team2' : 'team1';
      const won = m.winner === myTeam;
      if (won) wins++; else losses++;
      pointsFor += m.score[myTeam];
      pointsAgainst += m.score[oppTeam];
      shoesGiven += m.shoes[`${myTeam}Given`] || 0;
      shoesReceived += m.shoes[`${oppTeam}Given`] || 0;
      playerMatches.push({...m, won, myTeam});

      if (tempType === null) { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
      else if ((won && tempType === 'win') || (!won && tempType === 'loss')) { tempStreak++; }
      else { tempType = won ? 'win' : 'loss'; tempStreak = 1; }
      if (tempType === 'win') maxWinStreak = Math.max(maxWinStreak, tempStreak);
      else maxLossStreak = Math.max(maxLossStreak, tempStreak);
    }

    for (const m of playerMatches.reverse()) {
      const won = m.won;
      if (currentStreakType === null) { currentStreakType = won ? 'win' : 'loss'; currentStreak = 1; }
      else if ((won && currentStreakType === 'win') || (!won && currentStreakType === 'loss')) currentStreak++;
      else break;
    }

    const eff = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;
    const pointDiff = pointsFor - pointsAgainst;
    return { playerId, played, wins, losses, pointsFor, pointsAgainst, pointDiff, shoesGiven, shoesReceived, eff: parseFloat(eff), currentStreak, currentStreakType, maxWinStreak, maxLossStreak };
  },

  getAllTournamentPlayerStats(tournamentId) {
    const tPlayers = this.getTournamentPlayers(tournamentId);
    return tPlayers.map(tp => {
      const player = this.getPlayerById(tp.playerId);
      if (!player) return null;
      return {
        ...player,
        stats: this.getTournamentPlayerStats(tp.playerId, tournamentId)
      };
    }).filter(Boolean).sort((a, b) => b.stats.wins - a.stats.wins || b.stats.eff - a.stats.eff);
  },

  getTournamentPairStats(player1Id, player2Id, tournamentId) {
    const matches = this.getTournamentMatches(tournamentId);
    let wins = 0, losses = 0, played = 0;
    for (const m of matches) {
      const inTeam1 = (m.team1.player1 === player1Id || m.team1.player2 === player1Id) &&
                      (m.team1.player1 === player2Id || m.team1.player2 === player2Id);
      const inTeam2 = (m.team2.player1 === player1Id || m.team2.player2 === player1Id) &&
                      (m.team2.player1 === player2Id || m.team2.player2 === player2Id);
      if (!inTeam1 && !inTeam2) continue;
      played++;
      const myTeam = inTeam1 ? 'team1' : 'team2';
      if (m.winner === myTeam) wins++; else losses++;
    }
    const eff = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;
    return { player1Id, player2Id, played, wins, losses, eff: parseFloat(eff) };
  },

  getBestTournamentPairs(tournamentId) {
    const tPlayers = this.getTournamentPlayers(tournamentId);
    const pairs = [];
    for (let i = 0; i < tPlayers.length; i++) {
      for (let j = i + 1; j < tPlayers.length; j++) {
        const stats = this.getTournamentPairStats(tPlayers[i].playerId, tPlayers[j].playerId, tournamentId);
        if (stats.played > 0) {
          const p1 = this.getPlayerById(tPlayers[i].playerId);
          const p2 = this.getPlayerById(tPlayers[j].playerId);
          if (p1 && p2) pairs.push({ p1, p2, stats });
        }
      }
    }
    return pairs.sort((a, b) => b.stats.eff - a.stats.eff || b.stats.played - a.stats.played);
  },

  getTournamentMVP(tournamentId) {
    const allStats = this.getAllTournamentPlayerStats(tournamentId);
    if (!allStats.length) return null;
    return allStats.reduce((best, ps) => {
      const score = ps.stats.wins * 3 + ps.stats.eff * 0.5 + ps.stats.pointDiff * 0.01;
      const bestScore = best ? (best.stats.wins * 3 + best.stats.eff * 0.5 + best.stats.pointDiff * 0.01) : -Infinity;
      return score > bestScore ? ps : best;
    }, null);
  },

  predictTournamentMatch(team1PlayerIds, team2PlayerIds, tournamentId, useGlobal = false) {
    const groupId = Auth.getGroupId();
    const getStats = (id) => {
      const ts = this.getTournamentPlayerStats(id, tournamentId);
      if (useGlobal && ts.played < 3) {
        const gs = this.getPlayerStats(id, groupId);
        return { eff: (ts.eff + gs.eff) / 2, currentStreak: ts.currentStreak || gs.currentStreak, currentStreakType: ts.currentStreakType || gs.currentStreakType };
      }
      return ts;
    };
    const t1 = team1PlayerIds.map(id => getStats(id));
    const t2 = team2PlayerIds.map(id => getStats(id));
    const t1Eff = t1.reduce((s, p) => s + p.eff, 0) / t1.length;
    const t2Eff = t2.reduce((s, p) => s + p.eff, 0) / t2.length;
    const t1Bonus = t1[0].currentStreakType === 'win' ? t1[0].currentStreak * 1.5 : -t1[0].currentStreak;
    const t2Bonus = t2[0].currentStreakType === 'win' ? t2[0].currentStreak * 1.5 : -t2[0].currentStreak;
    const s1 = t1Eff + t1Bonus;
    const s2 = t2Eff + t2Bonus;
    const total = Math.max(s1 + s2, 1);
    return { team1Prob: Math.min(95, Math.max(5, (s1 / total * 100))).toFixed(1), team2Prob: Math.min(95, Math.max(5, (s2 / total * 100))).toFixed(1) };
  },

  // === TOURNAMENT GROUPS ===
  getTournamentGroups(tournamentId) {
    if (!this._store.tournament_groups) this._store.tournament_groups = [];
    return this._store.tournament_groups.filter(g => g.tournamentId === tournamentId);
  },
  getTournamentGroupById(id) {
    return (this._store.tournament_groups || []).find(g => g.id === id);
  },
  addTournamentGroup(group) {
    if (!this._store.tournament_groups) this._store.tournament_groups = [];
    group.id = this._uuid(); group.createdAt = new Date().toISOString();
    this._store.tournament_groups.push(group); this.save();
    return group;
  },
  updateTournamentGroup(id, data) {
    if (!this._store.tournament_groups) this._store.tournament_groups = [];
    const idx = this._store.tournament_groups.findIndex(g => g.id === id);
    if (idx >= 0) { this._store.tournament_groups[idx] = {...this._store.tournament_groups[idx], ...data}; this.save(); }
  },
  deleteTournamentGroup(id) {
    if (!this._store.tournament_groups) this._store.tournament_groups = [];
    this._store.tournament_groups = this._store.tournament_groups.filter(g => g.id !== id);
    this.save();
  },

  // Compute standings for a group (works for teams and individual players)
  getGroupStandings(tournamentId, groupId) {
    const group = this.getTournamentGroupById(groupId);
    if (!group) return [];
    const memberIds = group.memberIds || []; // array of teamId or playerId
    const matches = (this._store.tournament_matches || []).filter(m =>
      m.tournamentId === tournamentId && m.groupId === groupId
    );

    return memberIds.map(memberId => {
      let wins = 0, losses = 0, draws = 0, ptsFor = 0, ptsAgainst = 0, played = 0;
      for (const m of matches) {
        const inTeam1 = m.team1Id === memberId || m.team1?.player1 === memberId || m.team1?.player2 === memberId;
        const inTeam2 = m.team2Id === memberId || m.team2?.player1 === memberId || m.team2?.player2 === memberId;
        if (!inTeam1 && !inTeam2) continue;
        played++;
        const myKey = inTeam1 ? 'team1' : 'team2';
        const oppKey = inTeam1 ? 'team2' : 'team1';
        const myScore = m.score?.[myKey] || 0;
        const oppScore = m.score?.[oppKey] || 0;
        ptsFor += myScore; ptsAgainst += oppScore;
        if (m.winner === myKey) wins++;
        else if (m.winner === 'draw') draws++;
        else losses++;
      }
      const pts = wins * 3 + draws;
      const diff = ptsFor - ptsAgainst;
      const eff = played > 0 ? ((wins / played) * 100).toFixed(1) : 0;
      return { memberId, played, wins, draws, losses, ptsFor, ptsAgainst, diff, pts, eff: parseFloat(eff) };
    }).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.ptsFor - a.ptsFor);
  },

  // === TOURNAMENT ROUNDS (for rotating pairs) ===
  getTournamentRounds(tournamentId) {
    if (!this._store.tournament_rounds) this._store.tournament_rounds = [];
    return this._store.tournament_rounds
      .filter(r => r.tournamentId === tournamentId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  },
  addTournamentRound(round) {
    if (!this._store.tournament_rounds) this._store.tournament_rounds = [];
    round.id = this._uuid(); round.createdAt = new Date().toISOString();
    this._store.tournament_rounds.push(round); this.save();
    return round;
  },
  updateTournamentRound(id, data) {
    if (!this._store.tournament_rounds) this._store.tournament_rounds = [];
    const idx = this._store.tournament_rounds.findIndex(r => r.id === id);
    if (idx >= 0) { this._store.tournament_rounds[idx] = {...this._store.tournament_rounds[idx], ...data}; this.save(); }
  },
  deleteTournamentRound(id) {
    if (!this._store.tournament_rounds) this._store.tournament_rounds = [];
    this._store.tournament_rounds = this._store.tournament_rounds.filter(r => r.id !== id);
    this.save();
  },

  // === POINTS RANKING (Por Puntos) ===
  // Scoring: first win with a given partner → +1 pt; every additional win with same partner → +2.5 pts
  getPointsRanking(groupId, dateFrom = null, dateTo = null) {
    const matches = this.getMatches(groupId);
    const players = this.getPlayers(groupId);

    // Build a lookup map for quick player name resolution
    const playerMap = {};
    players.forEach(p => { playerMap[p.id] = p; });

    // Filter by date range
    const filtered = matches.filter(m => {
      if (!m.date) return true;
      const d = new Date(m.date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });

    // per-player accumulators
    // winsByPartner[playerId][partnerId] = count of wins together
    const winsByPartner = {};
    const playedCount = {};
    const winsCount = {};

    players.forEach(p => {
      winsByPartner[p.id] = {};
      playedCount[p.id] = 0;
      winsCount[p.id] = 0;
    });

    // Process chronologically (oldest first) so "first win" is correctly detected
    const chronological = [...filtered].reverse();

    for (const m of chronological) {
      const processTeam = (teamKey) => {
        const p1id = m[teamKey].player1;
        const p2id = m[teamKey].player2;
        const won = m.winner === teamKey;

        [p1id, p2id].forEach(pid => {
          if (pid && playedCount[pid] !== undefined) playedCount[pid]++;
        });

        if (!won || !p1id || !p2id) return;

        [p1id, p2id].forEach((pid, idx) => {
          if (!pid || winsByPartner[pid] === undefined) return;
          const partnerId = idx === 0 ? p2id : p1id;
          if (!partnerId) return;
          winsCount[pid] = (winsCount[pid] || 0) + 1;
          winsByPartner[pid][partnerId] = (winsByPartner[pid][partnerId] || 0) + 1;
        });
      };
      processTeam('team1');
      processTeam('team2');
    }

    // Compute points per player
    const result = players.map(p => {
      const partners = winsByPartner[p.id];
      let points = 0;
      let uniquePartners = 0;

      for (const [partnerId, winsWithPartner] of Object.entries(partners)) {
        if (winsWithPartner <= 0) continue;
        uniquePartners++;
        points += 1; // first win with this partner
        if (winsWithPartner > 1) {
          points += (winsWithPartner - 1) * 0.25; // additional wins
        }
      }

      return {
        id: p.id,
        name: p.name,
        alias: p.alias || '',
        played: playedCount[p.id] || 0,
        wins: winsCount[p.id] || 0,
        uniquePartners,
        points,
        partnerDetails: Object.entries(partners)
          .filter(([, w]) => w > 0)
          .map(([pid, w]) => ({ name: playerMap[pid]?.name || pid, wins: w }))
          .sort((a, b) => b.wins - a.wins)
      };
    }).filter(p => p.played > 0 || p.points > 0)
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    return result;
  },

  // Generate random rotating pairs ensuring no repeated pairs when possible
  generateRotatingPairs(playerIds, existingPairHistory = []) {
    const n = playerIds.length;
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const pairs = [];
    const used = new Set();

    // Try to form pairs avoiding repeats
    const histSet = new Set(existingPairHistory.map(([a, b]) => [a, b].sort().join('|')));
    const available = [...shuffled];

    while (available.length >= 2) {
      const p1 = available.shift();
      // Find best partner (one not paired before)
      let partnerIdx = available.findIndex(p2 => !histSet.has([p1, p2].sort().join('|')));
      if (partnerIdx === -1) partnerIdx = 0; // fallback: take first available
      const p2 = available.splice(partnerIdx, 1)[0];
      pairs.push([p1, p2]);
    }

    return pairs;
  }
};
window.DB = DB;
