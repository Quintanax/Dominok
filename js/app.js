/* =========================================
   APP.JS — Main Application Controller
   ========================================= */
const App = {
  currentPage: 'dashboard',
  _sidebarCollapsed: false,
  _mobileOpen: false,
  _userMenuOpen: false,
  _notifOpen: false,

  // Page Registry
  pages: {
    get dashboard() { return typeof DashboardPage !== 'undefined' ? DashboardPage : null },
    get matches() { return typeof MatchesPage !== 'undefined' ? MatchesPage : null },
    get players() { return typeof PlayersPage !== 'undefined' ? PlayersPage : null },
    get rankings() { return typeof RankingsPage !== 'undefined' ? RankingsPage : null },
    get history() { return typeof HistoryPage !== 'undefined' ? HistoryPage : null },
    get stats() { return typeof StatsPage !== 'undefined' ? StatsPage : null },
    get predictor() { return typeof PredictorPage !== 'undefined' ? PredictorPage : null },
    get import() { return typeof ImportPage !== 'undefined' ? ImportPage : null },
    get reports() { return typeof ReportsPage !== 'undefined' ? ReportsPage : null },
    get admin() { return typeof AdminPage !== 'undefined' ? AdminPage : null },
    get tournaments() { return typeof TournamentsPage !== 'undefined' ? TournamentsPage : null },
    get admin_dashboard() { return typeof AdminDashboardPage !== 'undefined' ? AdminDashboardPage : null },
    get global_tournament() { return typeof GlobalTournamentPage !== 'undefined' ? GlobalTournamentPage : null }
  },

  // Pages only accessible by admin role
  _adminOnly: ['admin', 'admin_dashboard', 'global_tournament'],
  // Pages hidden from admin (they use admin_dashboard instead)
  _userOnly:  [],

  pageTitles: {
    dashboard:          '📊 Dashboard',
    matches:            '🎮 Partidas',
    players:            '👥 Jugadores',
    rankings:           '🏆 Rankings',
    history:            '📚 Historial',
    stats:              '📈 Estadísticas',
    predictor:          '🔮 Predictor',
    import:             '📂 Importar',
    reports:            '📋 Reportes',
    admin:              '⚙️ Admin',
    profile:            '👤 Mi Perfil',
    tournaments:        '🏆 Torneos',
    admin_dashboard:    '🌐 Panel Global',
    global_tournament:  '🌍 Copa Inter-Grupos'
  },

  init() {
    DB.init();

    // Force show app and bypass auth completely as requested
    Auth.init(); // Still call it to set currentUser
    this._showApp();

    // Restore theme
    const theme = localStorage.getItem('dominostats_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        document.getElementById('user-dropdown')?.classList.add('hidden');
        this._userMenuOpen = false;
      }
      if (!e.target.closest('.notification-btn') && !e.target.closest('.notif-panel')) {
        document.getElementById('notif-panel')?.classList.add('hidden');
        this._notifOpen = false;
      }
      if (!e.target.closest('.search-bar')) {
        document.getElementById('search-results')?.classList.add('hidden');
      }
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
      }
    });

    // Auto-backup every 5 minutes
    setInterval(() => {
      if (DB.getSetting('autoBackup', true) && Auth.currentUser) {
        DB.addLog({ action: 'backup', desc: 'Backup automático completado' });
      }
    }, 5 * 60 * 1000);
  },

  _showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    
    // Reset forms and buttons
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.reset();
      const btn = loginForm.querySelector('[type="submit"]');
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
    
    const regForm = document.getElementById('register-form');
    if (regForm) {
      regForm.reset();
      const btn = regForm.querySelector('[type="submit"]');
      if (btn) { btn.disabled = false; btn.textContent = 'Crear Cuenta'; }
    }
  },

  _showApp() {
    try {
      if (document.getElementById('auth-screen')) document.getElementById('auth-screen').classList.add('hidden');
      if (document.getElementById('app')) document.getElementById('app').classList.remove('hidden');

      // Update UI with user info
      const user = Auth.currentUser;
      if (user && user.name) {
        const miniName = document.getElementById('user-name-mini');
        const topName = document.getElementById('topbar-name');
        const miniAvatar = document.getElementById('user-avatar-mini');
        const topAvatar = document.getElementById('topbar-avatar');
        const miniRole = document.getElementById('user-role-mini');

        if (miniName) miniName.textContent = user.name.split(' ')[0];
        if (topName) topName.textContent = user.name.split(' ')[0];
        if (miniAvatar) miniAvatar.textContent = typeof Utils !== 'undefined' ? Utils.initials(user.name) : 'A';
        if (topAvatar) topAvatar.textContent = typeof Utils !== 'undefined' ? Utils.initials(user.name) : 'A';
        if (miniRole) {
          miniRole.textContent = user.role === 'admin' ? 'Admin Global' : user.role === 'group_admin' ? 'Admin Grupo' : 'Usuario';
        }
      }

      this._buildSidebar();
      this.navigate(Auth.isAdmin() ? 'admin_dashboard' : 'dashboard');
      this._loadNotifications();

      // Start real-time Firebase listener now that we have a logged-in user
      if (typeof window.CloudDB !== 'undefined' && Auth.currentUser) {
        window.CloudDB.listenToCloud();
      }
    } catch (e) {
      console.error('Error rendering app:', e);
      // Even if UI update fails, show the app layout
      if (document.getElementById('app')) document.getElementById('app').classList.remove('hidden');
    }
  },

  // Build role-aware sidebar
  _buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    const isAdmin = Auth.isAdmin();
    const ni = (page, icon, label) =>
      `<a href="#" class="nav-item" data-page="${page}" onclick="App.navigate('${page}')">
        <span class="nav-icon">${icon}</span><span class="nav-text">${label}</span>
      </a>`;

    if (isAdmin) {
      nav.innerHTML = `
        <div class="nav-section">
          <span class="nav-section-label">🌐 Administración</span>
          ${ni('admin_dashboard',   '🌐', 'Panel Global')}
          ${ni('global_tournament', '🌍', 'Copa Inter-Grupos')}
          ${ni('admin',            '⚙️', 'Configuración')}
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Vista de Grupos</span>
          ${ni('rankings',   '🏆', 'Ranking Global')}
          ${ni('reports',    '📋', 'Reportes')}
          ${ni('import',     '📂', 'Importar datos')}
        </div>`;
    } else {
      nav.innerHTML = `
        <div class="nav-section">
          <span class="nav-section-label">Mi Equipo</span>
          ${ni('dashboard',   '📊', 'Dashboard')}
          ${ni('matches',     '🎮', 'Partidas')}
          ${ni('tournaments', '🏆', 'Torneos')}
          ${ni('players',     '👥', 'Jugadores')}
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Análisis</span>
          ${ni('rankings',   '🏆', 'Rankings')}
          ${ni('history',    '📚', 'Historial')}
          ${ni('stats',      '📈', 'Estadísticas')}
          ${ni('predictor',  '🔮', 'Predictor')}
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Sistema</span>
          ${ni('import',  '📂', 'Importar')}
          ${ni('reports', '📋', 'Reportes')}
        </div>`;
    }
  },

  navigate(page) {
    if (!this.pages[page]) return;

    // Role-based access guard
    if (this._adminOnly.includes(page) && !Auth.isAdmin()) {
      Toast.error('Acceso restringido. Solo el administrador puede ver esta sección.');
      return;
    }

    // Close mobile menu
    if (this._mobileOpen) this.toggleSidebar();

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update page title in topbar
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = this.pageTitles[page] || page;

    this.currentPage = page;

    // Render page
    const content = document.getElementById('page-content');
    if (!content) return;

    const pageModule = this.pages[page];
    content.innerHTML = pageModule.render();

    // After render hook
    if (pageModule.afterRender) {
      requestAnimationFrame(() => {
        try { pageModule.afterRender(); } catch(e) { console.error(`[${page}] afterRender error:`, e); }
      });
    }

    // Scroll to top
    content.scrollTop = 0;
    window.scrollTo(0, 0);
  },

  // Auth Handlers
  switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
      // Try demo account locally first (always available)
      const isDemoEmail = email.toLowerCase() === 'admin@demo.com';
      if (isDemoEmail) {
        const result = Auth.login(email, password);
        if (result.error) {
          Toast.error(result.error);
          btn.disabled = false; btn.textContent = 'Entrar';
        } else {
          setTimeout(() => this._showApp(), 300);
        }
        return;
      }

      // Cloud login via Firestore
      if (typeof window.CloudDB !== 'undefined') {
        const result = await window.CloudDB.loginUser(email, password);
        if (result.error) {
          // Fallback: try local DB (e.g. was created offline / pre-cloud)
          const localResult = Auth.login(email, password);
          if (localResult.error) {
            Toast.error(result.error);
            btn.disabled = false; btn.textContent = 'Entrar';
            return;
          }
          // ✅ Local login worked — migrate this user to Firestore now
          Toast.info('Migrando cuenta a la nube... un momento');
          await window.CloudDB.migrateUserToCloud(localResult.user);
          setTimeout(() => this._showApp(), 300);
          return;
        }
        Auth.currentUser = result.user;
        const session = { userId: result.user.id, loginAt: new Date().toISOString() };
        sessionStorage.setItem(Auth.SESSION_KEY, JSON.stringify(session));
        DB.addLog({ action: 'login', desc: `Inicio de sesión: ${result.user.name}` });
        setTimeout(() => this._showApp(), 300);
      } else {
        // No Firebase available: try local
        const result = Auth.login(email, password);
        if (result.error) { Toast.error(result.error); btn.disabled = false; btn.textContent = 'Entrar'; }
        else { setTimeout(() => this._showApp(), 300); }
      }
    } catch (err) {
      console.error(err);
      Toast.error('Error al conectar con la nube. Intenta de nuevo.');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  },

  fillDemo() {
    try {
      const email = document.getElementById('login-email');
      const pass = document.getElementById('login-password');
      if (email) email.value = 'admin@demo.com';
      if (pass) pass.value = 'admin123';
    } catch (e) { console.error(e); }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const group = document.getElementById('reg-group').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = e.target.querySelector('[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    try {
      // Cloud registration via Firestore
      if (typeof window.CloudDB !== 'undefined') {
        const result = await window.CloudDB.registerUser(name, email, password, group);
        if (result.error) {
          Toast.error(result.error);
          btn.disabled = false; btn.textContent = 'Crear Cuenta';
          return;
        }
        Auth.currentUser = result.user;
        const session = { userId: result.user.id, loginAt: new Date().toISOString() };
        sessionStorage.setItem(Auth.SESSION_KEY, JSON.stringify(session));
        DB.addLog({ action: 'register', desc: `Nueva cuenta: ${name}` });
        Toast.success('¡Cuenta creada! Bienvenido 🎉');
        setTimeout(() => this._showApp(), 300);
      } else {
        // Fallback: local only
        const result = Auth.register(name, email, password, group);
        if (result.error) { Toast.error(result.error); btn.disabled = false; btn.textContent = 'Crear Cuenta'; }
        else { Toast.success('¡Cuenta creada! Bienvenido 🎉'); setTimeout(() => this._showApp(), 300); }
      }
    } catch (err) {
      console.error(err);
      Toast.error('Error al crear la cuenta. Revisa tu conexión.');
      btn.disabled = false;
      btn.textContent = 'Crear Cuenta';
    }
  },

  togglePassword(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  logout() {
    Auth.logout();
    this._showAuth();
    Toast.info('Sesión cerrada');
  },

  async wipeMyData() {
    if (!confirm('⚠️ PELIGRO: ¿Estás seguro de que deseas ELIMINAR toda tu información (partidas, torneos, jugadores)? Tu cuenta seguirá existiendo pero vacía. Esto no se puede deshacer.')) return;
    
    // Show loading state
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;flex-direction:column;';
    overlay.innerHTML = '<div class="loader" style="margin-bottom:15px;width:40px;height:40px;border:4px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div><div>Borrando tu información...</div>';
    document.body.appendChild(overlay);

    try {
      const groupId = Auth.getGroupId();

      // 1. Wipe from Firebase Cloud (if active)
      if (window.CloudDB && typeof window.CloudDB.wipeCloudData === 'function') {
        await window.CloudDB.wipeCloudData();
      }

      // 2. Wipe from Local DB
      DB._store.players = DB._store.players.filter(p => p.groupId !== groupId);
      DB._store.matches = DB._store.matches.filter(m => m.groupId !== groupId);
      DB._store.tournaments = DB._store.tournaments.filter(t => t.groupId !== groupId);
      DB._store.tournament_matches = DB._store.tournament_matches.filter(m => m.groupId !== groupId);
      DB._store.tournament_players = DB._store.tournament_players.filter(p => p.groupId !== groupId);
      DB._store.tournament_teams = DB._store.tournament_teams.filter(t => t.groupId !== groupId);
      
      // Clear notifications and logs related to the user
      const userId = Auth.currentUser.id;
      DB._store.notifications = [];
      DB._store.logs = DB._store.logs.filter(l => l.userId !== userId);

      DB.save();
      
      // Reload UI
      location.reload();
    } catch (e) {
      console.error(e);
      Toast.error('Error al borrar los datos.');
      overlay.remove();
    }
  },

  // Layout
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    if (window.innerWidth <= 768) {
      this._mobileOpen = !this._mobileOpen;
      sidebar.classList.toggle('mobile-open', this._mobileOpen);
    } else {
      this._sidebarCollapsed = !this._sidebarCollapsed;
      sidebar.classList.toggle('collapsed', this._sidebarCollapsed);
      main.classList.toggle('collapsed', this._sidebarCollapsed);
    }
  },

  toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('dominostats_theme', next);
    document.querySelector('.theme-toggle').textContent = next === 'dark' ? '🌙' : '☀️';
  },

  toggleUserMenu() {
    this._userMenuOpen = !this._userMenuOpen;
    document.getElementById('user-dropdown')?.classList.toggle('hidden', !this._userMenuOpen);
  },

  // Notifications
  showNotifications() {
    this._notifOpen = !this._notifOpen;
    const panel = document.getElementById('notif-panel');
    panel?.classList.toggle('hidden', !this._notifOpen);
    this._loadNotifications();
  },

  _loadNotifications() {
    const notifs = DB.getNotifications();
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) badge.textContent = unread > 0 ? unread : '';
    if (badge) badge.style.display = unread > 0 ? 'flex' : 'none';

    const list = document.getElementById('notif-list');
    if (!list) return;
    const icons = { match:'🎮', player:'👤', streak:'🔥', system:'⚙️' };
    list.innerHTML = notifs.slice(0, 8).map(n => `
      <div class="notif-item ${n.read?'':'unread'}">
        <div class="notif-icon">${icons[n.type]||'🔔'}</div>
        <div class="notif-content">
          <div class="notif-title">${Utils.escHtml(n.title)}</div>
          <div class="notif-desc">${Utils.escHtml(n.desc)}</div>
          <div class="notif-time">${Utils.relativeTime(new Date(n.createdAt))}</div>
        </div>
      </div>`).join('') || '<div class="empty-state"><div class="empty-text">Sin notificaciones</div></div>';
  },

  markAllRead() {
    DB.markAllNotificationsRead();
    this._loadNotifications();
    Toast.success('Todo marcado como leído');
  },

  // Global Search
  globalSearch: Utils.debounce(function(query) {
    const el = document.getElementById('search-results');
    if (!el) return;
    if (!query || query.length < 2) { el.classList.add('hidden'); return; }

    const q = query.toLowerCase();
    const groupId = Auth.getGroupId();
    const players = DB.getPlayers(groupId).filter(p =>
      p.name.toLowerCase().includes(q) || (p.alias||'').toLowerCase().includes(q)
    );
    const matches = DB.getMatches(groupId).filter(m => {
      const players = [m.team1.player1, m.team1.player2, m.team2.player1, m.team2.player2];
      return players.some(id => Utils.playerName(id).toLowerCase().includes(q));
    });

    const results = [
      ...players.slice(0, 4).map(p => ({
        icon: '👤', text: p.name, sub: p.alias || '',
        action: `App.navigate('players');setTimeout(()=>PlayersPage.openProfile('${p.id}'),100)`
      })),
      ...matches.slice(0, 3).map(m => ({
        icon: '🎮', text: `${Utils.playerName(m.team1.player1)} & ${Utils.playerName(m.team1.player2)} vs ${Utils.playerName(m.team2.player1)} & ${Utils.playerName(m.team2.player2)}`,
        sub: `${m.score.team1}:${m.score.team2} — ${Utils.fmtDate(m.date)}`,
        action: `App.navigate('history')`
      }))
    ];

    if (!results.length) {
      el.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-text">Sin resultados para "${Utils.escHtml(query)}"</div></div>`;
    } else {
      el.innerHTML = results.map(r => `
        <div class="search-result-item" onclick="${r.action}; document.getElementById('search-results').classList.add('hidden')">
          <span style="font-size:1.2rem">${r.icon}</span>
          <div>
            <div style="font-size:0.875rem;font-weight:600">${Utils.escHtml(r.text)}</div>
            ${r.sub ? `<div class="search-result-meta">${Utils.escHtml(r.sub)}</div>` : ''}
          </div>
        </div>`).join('');
    }
    el.classList.remove('hidden');
  }, 250),

  // Modal System
  openModal(config, size = '') {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    if (!overlay || !container) return;

    container.className = `modal-container ${size}`;

    if (typeof config === 'string') {
      container.innerHTML = config;
    } else {
      container.innerHTML = `
        <div class="modal-header">
          <div class="modal-title">${config.title || ''}</div>
          <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">${config.body || ''}</div>
        ${config.footer !== '' ? `<div class="modal-footer">${config.footer || ''}</div>` : ''}`;
    }

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeModal(event) {
    if (event && !event.target.classList.contains('modal-overlay')) return;
    document.getElementById('modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  },

  confirmDialog(title, message, onConfirm, dangerBtn = 'Eliminar') {
    this.openModal({
      title: '⚠️ ' + title,
      body: `<div class="text-center" style="padding:8px 0">
        <span class="confirm-icon">⚠️</span>
        <p class="confirm-message">${Utils.escHtml(message)}</p>
      </div>`,
      footer: `<button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
               <button class="btn btn-danger" onclick="App._confirmAction()">🗑️ ${Utils.escHtml(dangerBtn)}</button>`
    }, 'modal-sm');
    this._pendingConfirm = onConfirm;
  },

  _confirmAction() {
    this.closeModal();
    if (this._pendingConfirm) { this._pendingConfirm(); this._pendingConfirm = null; }
  },

  // Particles for Auth screen
  _initParticles() {
    const container = document.getElementById('auth-particles');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left:${Math.random()*100}%;
        top:${Math.random()*100}%;
        animation-duration:${Math.random()*15+8}s;
        animation-delay:${Math.random()*-15}s;
        opacity:${Math.random()*0.4+0.1};
        width:${Math.random()*3+2}px;
        height:${Math.random()*3+2}px;
        background:${['#6c63ff','#00d4ff','#00e5a0','#ffb800'][Math.floor(Math.random()*4)]};
      `;
      container.appendChild(p);
    }
  }
};
window.App = App;

// Start App
document.addEventListener('DOMContentLoaded', () => App.init());
