/* =========================================
   AWARD RANKINGS PAGE
   Muestra los primeros 3 por categoría,
   con prioridad visual al #1.
   ========================================= */
const AwardRankingsPage = {

  _individualCats: [
    { id: 'wins',          icon: '🏆', label: 'Más Victorias',        key: p => p.stats.wins,                        fmt: v => `${v} V` },
    { id: 'shoes',         icon: '👟', label: 'Más Zapatos Dados',    key: p => p.stats.shoesGiven,                   fmt: v => `${v} 👟` },
    { id: 'streak',        icon: '🔥', label: 'Racha Más Larga',      key: p => p.stats.maxWinStreak || 0,            fmt: v => `${v} seguidas` },
    { id: 'eff',           icon: '📈', label: 'Mayor Efectividad',    key: p => p.stats.played >= 3 ? p.stats.eff : -1,  fmt: v => `${v}%` },
    { id: 'pointDiff',     icon: '🎯', label: 'Mejor Diferencial',    key: p => p.stats.pointDiff,                    fmt: v => (v >= 0 ? '+' : '') + v },
    { id: 'shoesReceived', icon: '😬', label: 'Más Zapatos Recibidos',key: p => p.stats.shoesReceived,                fmt: v => `${v} 👟` },
    { id: 'played',        icon: '🎮', label: 'Más Partidas Jugadas', key: p => p.stats.played,                       fmt: v => `${v} PJ` },
    { id: 'losses',        icon: '💔', label: 'Más Derrotas',         key: p => p.stats.losses,                       fmt: v => `${v} D` },
  ],

  _pairCats: [
    { id: 'pairwins',  icon: '🏆', label: 'Pareja con Más Victorias',   key: p => p.stats.wins,    fmt: v => `${v} V` },
    { id: 'pairstreak',icon: '🔥', label: 'Racha Más Larga',            key: p => p.stats.maxWinStreak || 0, fmt: v => `${v} seguidas` },
    { id: 'paireff',   icon: '📈', label: 'Pareja Más Efectiva',        key: p => p.stats.played >= 3 ? p.stats.eff : -1, fmt: v => `${v}%` },
    { id: 'pairplayed',icon: '🎮', label: 'Pareja Más Activa',          key: p => p.stats.played,  fmt: v => `${v} PJ` },
    { id: 'pairshoes', icon: '👟', label: 'Pareja que Más Zapatea',     key: p => (p.stats.shoesGiven || 0), fmt: v => `${v} 👟` },
    { id: 'pairloss',  icon: '💔', label: 'Peor Racha (Derrotas)',      key: p => p.stats.maxLossStreak || 0, fmt: v => `${v} seguidas` },
  ],

  state: { tab: 'individual' },

  render() {
    return `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom:16px">
        <div class="page-header-left">
          <div class="page-header-title">🥇 Rankings</div>
          <div class="page-header-sub">Líderes por categoría</div>
        </div>
      </div>

      <!-- Tab switcher -->
      <div style="display:flex;gap:8px;margin-bottom:20px;background:var(--bg-elevated);padding:5px;border-radius:var(--radius-lg);width:fit-content">
        <button class="btn btn-sm ${this.state.tab==='individual'?'btn-primary':'btn-ghost'}"
                style="border-radius:var(--radius-md)" onclick="AwardRankingsPage.setTab('individual')">👤 Individual</button>
        <button class="btn btn-sm ${this.state.tab==='pairs'?'btn-primary':'btn-ghost'}"
                style="border-radius:var(--radius-md)" onclick="AwardRankingsPage.setTab('pairs')">👥 Parejas</button>
      </div>

      <div id="award-content"></div>
    </div>
    <style>
      /* ── Award Card Grid ─────────────────── */
      .award-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }
      @media (max-width: 768px) { .award-grid { grid-template-columns: 1fr; } }

      /* ── Award Category Card ─────────────── */
      .award-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
      .award-card-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px;
        background: var(--bg-elevated);
        border-bottom: 1px solid var(--border-color);
      }
      .award-card-icon { font-size: 1.3rem; }
      .award-card-title { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); }

      /* ── Podium rows inside card ─────────── */
      .award-list { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }

      /* FIRST place — highlighted */
      .award-row-1 {
        display: flex; align-items: center; gap: 10px;
        background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04));
        border: 1px solid rgba(255,215,0,0.3);
        border-radius: var(--radius-md);
        padding: 10px 12px;
      }
      .award-row-2, .award-row-3 {
        display: flex; align-items: center; gap: 10px;
        border-radius: var(--radius-md);
        padding: 7px 10px;
        background: var(--bg-elevated);
        opacity: 0.85;
      }
      .award-medal { font-size: 1.1rem; flex-shrink: 0; width: 22px; text-align: center; }
      .award-medal-1 { font-size: 1.4rem; }
      .award-info { flex: 1; min-width: 0; }
      .award-name { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .award-name-1 { font-size: 1rem; }
      .award-value { font-weight: 800; flex-shrink: 0; }
      .award-value-1 { font-size: 1.05rem; color: #ffd700; }
      .award-value-2 { font-size: 0.9rem; color: #c0c0c0; }
      .award-value-3 { font-size: 0.85rem; color: #cd7f32; }

      /* Avatars */
      .award-avatar-1 { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; color: #fff; flex-shrink: 0; box-shadow: 0 0 0 2px #ffd700; }
      .award-avatar-sm { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.72rem; color: #fff; flex-shrink: 0; }

      /* Empty */
      .award-empty { padding: 14px 12px; color: var(--text-muted); font-size: 0.82rem; text-align: center; }
    </style>`;
  },

  afterRender() { this._renderContent(); },

  setTab(tab) {
    this.state.tab = tab;
    document.querySelectorAll('#award-content').forEach(() => {});
    // Re-render the whole page for simplicity
    const content = document.getElementById('page-content');
    if (content) {
      content.innerHTML = this.render();
      this._renderContent();
    }
  },

  _renderContent() {
    const el = document.getElementById('award-content');
    if (!el) return;
    if (this.state.tab === 'individual') {
      el.innerHTML = this._buildGrid(this._individualCats, false);
    } else {
      el.innerHTML = this._buildGrid(this._pairCats, true);
    }
  },

  _buildGrid(cats, isPairs) {
    const groupId = Auth.getGroupId();
    const items = isPairs
      ? DB.getBestPairs(groupId).filter(p => p.stats.played >= 1)
      : DB.getAllPlayerStats(groupId);

    if (!items.length) {
      return `<div class="empty-state"><div class="empty-icon">${isPairs?'👥':'👤'}</div><div class="empty-text">No hay datos suficientes aún</div></div>`;
    }

    return `<div class="award-grid">${cats.map(cat => this._buildCard(cat, items, isPairs)).join('')}</div>`;
  },

  _buildCard(cat, items, isPairs) {
    // Sort descending by category key, filter out negatives (e.g. eff with < 3 games)
    const sorted = [...items]
      .map(p => ({ item: p, val: cat.key(p) }))
      .filter(x => x.val >= 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, 3);

    const medals = ['🥇', '🥈', '🥉'];
    const rowClass = ['award-row-1', 'award-row-2', 'award-row-3'];
    const avatarClass = ['award-avatar-1', 'award-avatar-sm', 'award-avatar-sm'];
    const nameClass = ['award-name award-name-1', 'award-name', 'award-name'];
    const valClass = ['award-value award-value-1', 'award-value award-value-2', 'award-value award-value-3'];

    const rows = sorted.length
      ? sorted.map((x, i) => {
          const name  = isPairs
            ? `${x.item.p1.name.split(' ')[0]} & ${x.item.p2.name.split(' ')[0]}`
            : x.item.name;
          const color = isPairs
            ? Utils.avatarColor(x.item.p1.name)
            : Utils.avatarColor(x.item.name);
          const initials = isPairs
            ? Utils.initials(x.item.p1.name)
            : Utils.initials(x.item.name);
          return `
            <div class="${rowClass[i]}">
              <span class="award-medal ${i===0?'award-medal-1':''}">${medals[i]}</span>
              <div class="${avatarClass[i]}" style="background:${color}">${initials}</div>
              <div class="award-info">
                <div class="${nameClass[i]}">${Utils.escHtml(name)}</div>
              </div>
              <span class="${valClass[i]}">${cat.fmt(x.val)}</span>
            </div>`;
        }).join('')
      : `<div class="award-empty">Sin datos suficientes</div>`;

    return `
      <div class="award-card">
        <div class="award-card-header">
          <span class="award-card-icon">${cat.icon}</span>
          <span class="award-card-title">${cat.label}</span>
        </div>
        <div class="award-list">${rows}</div>
      </div>`;
  }
};
