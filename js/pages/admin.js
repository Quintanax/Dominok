/* =========================================
   ADMIN PAGE — Master Control Hub
   ========================================= */
const AdminPage = {
  render() {
    const currentUser = Auth.currentUser;
    const isAdmin = Auth.isAdmin();
    const group = DB.getGroupById(Auth.getGroupId());

    return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-title">⚙️ Administración</div>
          <div class="page-header-sub">Gestión de usuarios, grupos y auditoría del sistema</div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" onclick="AdminPage.setTab('profile',this)">👤 Perfil</button>
        <button class="tab-btn" onclick="AdminPage.setTab('group',this)">🏠 Mi Grupo</button>
        ${isAdmin ? '<button class="tab-btn" onclick="AdminPage.setTab(\'groups\',this)">🏢 Grupos</button>' : ''}
        ${isAdmin ? '<button class="tab-btn" onclick="AdminPage.setTab(\'users\',this)">👥 Usuarios</button>' : ''}
        <button class="tab-btn" onclick="AdminPage.setTab('settings',this)">🔧 Ajustes</button>
        <button class="tab-btn" onclick="AdminPage.setTab('logs',this)">📋 Auditoría</button>
      </div>

      <!-- Profile Tab -->
      <div id="tab-profile" class="tab-panel">
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Información Personal</div>
            <div style="display:flex;align-items:center;gap:16px;margin:15px 0">
              <div class="avatar avatar-xl" style="background:${Utils.avatarColor(currentUser.name)}">${Utils.initials(currentUser.name)}</div>
              <div>
                <div style="font-size:1.2rem;font-weight:700">${Utils.escHtml(currentUser.name)}</div>
                <div class="text-muted">${Utils.escHtml(currentUser.email)}</div>
                <span class="badge ${currentUser.role==='admin'?'badge-info':currentUser.role==='group_admin'?'badge-warning':'badge-muted'}" style="margin-top:8px">
                  ${currentUser.role==='admin'?'🛡️ Admin Global':currentUser.role==='group_admin'?'👑 Admin Grupo':'👤 Usuario'}
                </span>
              </div>
            </div>
            <form onsubmit="AdminPage.saveProfile(event)">
              <div class="form-group">
                <label class="form-label">Nombre completo</label>
                <input id="prof-name" class="form-input" value="${Utils.escHtml(currentUser.name)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input id="prof-email" class="form-input" type="email" value="${Utils.escHtml(currentUser.email)}" required />
              </div>
              <button type="submit" class="btn btn-primary">💾 Guardar Perfil</button>
            </form>
          </div>
          <div class="card">
            <div class="card-title">Seguridad</div>
            <form onsubmit="AdminPage.changePassword(event)">
              <p class="text-xs text-muted" style="margin-bottom:15px">Cambia tu contraseña de acceso a la plataforma.</p>
              <div class="form-group">
                <label class="form-label">Contraseña actual</label>
                <input id="pwd-current" class="form-input" type="password" required />
              </div>
              <div class="form-group">
                <label class="form-label">Nueva contraseña</label>
                <input id="pwd-new" class="form-input" type="password" required />
              </div>
              <div class="form-group">
                <label class="form-label">Confirmar</label>
                <input id="pwd-confirm" class="form-input" type="password" required />
              </div>
              <button type="submit" class="btn btn-secondary">🔒 Actualizar Contraseña</button>
            </form>
          </div>
        </div>
      </div>

      <!-- Group Tab -->
      <div id="tab-group" class="tab-panel hidden">
        <div class="card">
          <div class="card-title">🏠 Configuración de Tu Grupo</div>
          <form onsubmit="AdminPage.saveGroup(event)">
            <div class="form-group">
              <label class="form-label">Nombre del Club/Equipo</label>
              <input id="grp-name" class="form-input" value="${Utils.escHtml(group?.name||'')}" required />
            </div>
            <div class="form-group">
              <label class="form-label">ID de Grupo (para Telegram)</label>
              <div style="display:flex;gap:10px">
                <input class="form-input" value="${Auth.getGroupId()}" readonly style="background:var(--bg-lighter);cursor:copy" onclick="Utils.copyToClipboard(this.value);Toast.success('ID copiado')" />
                <button type="button" class="btn btn-secondary" onclick="Utils.copyToClipboard('${Auth.getGroupId()}');Toast.success('ID copiado')">📋</button>
              </div>
              <p class="text-xs text-muted" style="margin-top:5px">Usa este ID con el comando <code>/group</code> en el bot de Telegram.</p>
            </div>
            <div style="display:flex;gap:20px;margin-top:10px;margin-bottom:20px;">
              <div class="stat-row" style="flex:1">
                <span class="stat-label">👥 Miembros</span>
                <span class="stat-value">${DB.getPlayers(Auth.getGroupId()).length}</span>
              </div>
              <div class="stat-row" style="flex:1">
                <span class="stat-label">🎮 Partidas Totales</span>
                <span class="stat-value">${DB.getMatches(Auth.getGroupId()).length}</span>
              </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:15px; margin-top:5px;">
               <button type="submit" class="btn btn-primary">💾 Guardar Cambios</button>
               <button type="button" class="btn btn-danger" onclick="AdminPage.wipeMyGroupData()">🗑️ Borrar Datos del Grupo</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MASTER GROUPS Tab (Global Admin) -->
      ${isAdmin ? `
      <div id="tab-groups" class="tab-panel hidden">
        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:15px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
            <div class="card-title">🏢 Gestión de Grupos Multi-Tenant</div>
            <div class="text-xs text-muted">Aislamiento de datos activado</div>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Grupo/Equipo</th>
                  <th class="col-num">Integrantes</th>
                  <th class="col-num">Actividad</th>
                  <th>Admin de Grupo</th>
                  <th>Estado</th>
                  <th>Gestión</th>
                </tr>
              </thead>
              <tbody>
                ${DB.getGroups().map(g => {
                  const players = DB.getPlayers(g.id).length;
                  const matches = DB.getMatches(g.id).length;
                  const admin = DB.getUserById(g.adminId);
                  return `
                  <tr>
                    <td>
                      <div style="font-weight:700">${Utils.escHtml(g.name)}</div>
                      <div class="text-xs text-muted">Desde: ${Utils.fmtDate(g.createdAt)}</div>
                    </td>
                    <td class="col-num">${players}</td>
                    <td class="col-num">${matches}</td>
                    <td>
                      <div class="text-sm">${admin ? Utils.escHtml(admin.name) : '—'}</div>
                      <div class="text-xs text-muted">${admin ? Utils.escHtml(admin.email) : 'Sin asignar'}</div>
                    </td>
                    <td><span class="badge ${g.active?'badge-success':'badge-danger'}">${g.active?'✅ Activo':'🚫 Suspendido'}</span></td>
                    <td>
                      <div class="row-actions">
                        <button class="row-action-btn" onclick="AdminPage.toggleGroupActive('${g.id}',${!g.active})" title="Suspender/Activar">
                          ${g.active ? '🔒' : '🔓'}
                        </button>
                        <button class="row-action-btn danger" onclick="AdminPage.confirmDeleteGroup('${g.id}')">🗑️</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>` : ''}

      <!-- MASTER USERS Tab (Global Admin) -->
      ${isAdmin ? `
      <div id="tab-users" class="tab-panel hidden">
        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:15px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-color)">
            <div class="card-title">👥 Directorio Maestro de Usuarios</div>
            <input type="text" placeholder="Buscar usuario..." class="form-input" style="max-width:200px" oninput="AdminPage.filterTable(this, 'users-table')" />
          </div>
          <div class="table-wrapper">
            <table class="data-table" id="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Grupo Asociado</th>
                  <th>Estado</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                ${DB.getUsers().map(u => `
                  <tr>
                    <td>
                      <div class="player-cell">
                        <div class="avatar" style="background:${Utils.avatarColor(u.name)}">${Utils.initials(u.name)}</div>
                        <div class="player-cell-info">
                          <div class="player-cell-name">${Utils.escHtml(u.name)}</div>
                          <div class="text-xs text-muted">${Utils.fmtDate(u.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td class="text-muted">${Utils.escHtml(u.email)}</td>
                    <td>
                      <span class="badge ${u.role==='admin'?'badge-info':u.role==='group_admin'?'badge-warning':'badge-muted'}">
                        ${u.role==='admin'?'🛡️ Admin':u.role==='group_admin'?'👑 G.Admin':'👤 User'}
                      </span>
                    </td>
                    <td><div style="font-weight:500">${Utils.escHtml(DB.getGroupById(u.groupId)?.name || '—')}</div></td>
                    <td><span class="badge ${u.active?'badge-success':'badge-danger'}">${u.active?'✅':'❌'}</span></td>
                    <td>
                      <div class="row-actions">
                        ${u.id !== currentUser.id ? `
                        <button class="row-action-btn" onclick="AdminPage.toggleUserActive('${u.id}',${!u.active})">
                          ${u.active ? '🔒' : '🔓'}
                        </button>
                        <button class="row-action-btn" onclick="AdminPage.viewAudit('${u.id}')" title="Ver Auditoría">🔍</button>
                        <button class="row-action-btn danger" onclick="AdminPage.confirmDeleteUser('${u.id}')">🗑️</button>
                        ` : '—'}
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>` : ''}

      <!-- Settings Tab -->
      <div id="tab-settings" class="tab-panel hidden">
        <div class="card">
          <div class="card-title">🔧 Preferencias Globales</div>
          <div class="stat-row">
            <span class="stat-label">Modo oscuro</span>
            <button class="btn btn-secondary btn-sm" onclick="App.toggleTheme()">🌓 Alternar Tema</button>
          </div>
          <div class="stat-row">
            <span class="stat-label">Backup de Seguridad</span>
            <button class="btn btn-secondary btn-sm" onclick="ImportPage.exportBackup()">📤 Descargar JSON</button>
          </div>
          ${isAdmin ? `
          <div class="stat-row" style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)">
            <div style="color:var(--accent-warning);font-weight:700">Mantenimiento</div>
            <button class="btn btn-warning btn-sm" onclick="AdminPage.resetDemo()">🔄 Resetear Demo</button>
          </div>` : ''}
        </div>
      </div>

      <!-- Logs/Audit Tab -->
      <div id="tab-logs" class="tab-panel hidden">
        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:15px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
            <div class="card-title">📋 Auditoría y Trazabilidad</div>
            <input type="text" id="log-filter" placeholder="Filtrar logs..." class="form-input" style="max-width:250px" oninput="AdminPage.filterLogs(this.value)" />
          </div>
          <div class="table-wrapper">
            <table class="data-table" id="audit-table">
              <thead>
                <tr><th>Acción</th><th>Descripción</th><th>Autor</th><th>Fecha/Hora</th></tr>
              </thead>
              <tbody id="audit-tbody">
                ${AdminPage._renderLogRows(DB.getLogs().slice(0, 80))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  },

  afterRender() {},

  setTab(tab, el) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    el?.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  },

  _renderLogRows(logs) {
    const actionIcons = { match_created:'🎮', player_added:'👤', player_edited:'✏️', player_deleted:'🗑️', match_deleted:'❌', backup:'💾', login:'🔐' };
    return logs.map(l => {
      const user = l.userId !== 'system' ? DB.getUserById(l.userId) : null;
      return `<tr>
        <td><span class="chip">${actionIcons[l.action]||'•'} ${l.action.replace('_',' ')}</span></td>
        <td>${Utils.escHtml(l.desc)}</td>
        <td>${user ? Utils.escHtml(user.name) : '🤖 Sistema'}</td>
        <td class="text-muted text-xs">${Utils.fmtDate(l.createdAt)} ${new Date(l.createdAt).toLocaleTimeString()}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" class="text-center">Sin registros</td></tr>';
  },

  filterLogs(query) {
    const q = query.toLowerCase();
    const allLogs = DB.getLogs();
    const filtered = allLogs.filter(l => 
        l.desc.toLowerCase().includes(q) || 
        l.action.toLowerCase().includes(q) ||
        (DB.getUserById(l.userId)?.name || 'sistema').toLowerCase().includes(q)
    ).slice(0, 80);
    document.getElementById('audit-tbody').innerHTML = this._renderLogRows(filtered);
  },

  filterTable(input, tableId) {
    const q = input.value.toLowerCase();
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    rows.forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  saveProfile(e) {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    if (!name || !email) return;
    DB.updateUser(Auth.currentUser.id, { name, email });
    Toast.success('Perfil actualizado. Recargando...');
    setTimeout(() => location.reload(), 800);
  },

  changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('pwd-current').value;
    const n = document.getElementById('pwd-new').value;
    const c = document.getElementById('pwd-confirm').value;
    if (current !== Auth.currentUser.password) return Toast.error('Contraseña actual errónea');
    if (n !== c) return Toast.error('Las contraseñas no coinciden');
    DB.updateUser(Auth.currentUser.id, { password: n });
    Toast.success('Contraseña actualizada');
    e.target.reset();
  },

  saveGroup(e) {
    e.preventDefault();
    const name = document.getElementById('grp-name').value.trim();
    DB.updateGroup(Auth.getGroupId(), { name });
    Toast.success('Grupo actualizado');
  },

  async wipeMyGroupData() {
    if (!confirm('⚠️ PELIGRO: ¿Estás seguro de que deseas ELIMINAR todas las partidas y jugadores registrados en tu grupo? Esto no se puede deshacer.')) return;
    
    // Show loading state
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;flex-direction:column;';
    overlay.innerHTML = '<div class="loader" style="margin-bottom:15px;width:40px;height:40px;border:4px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div><div>Borrando datos del grupo...</div>';
    document.body.appendChild(overlay);

    try {
      const groupId = Auth.getGroupId();
      
      // Wipe from cloud if configured
      if (window.CloudDB && typeof window.CloudDB.wipeCloudData === 'function') {
        await window.CloudDB.wipeCloudData();
      }

      // Wipe from local DB
      DB._store.players = DB._store.players.filter(p => p.groupId !== groupId);
      DB._store.matches = DB._store.matches.filter(m => m.groupId !== groupId);
      
      // Clear logs related to group
      DB._store.logs = DB._store.logs.filter(l => {
          const u = DB.getUserById(l.userId);
          return u ? u.groupId !== groupId : true;
      });

      DB.save();
      
      location.reload();
    } catch (e) {
      console.error(e);
      Toast.error('Hubo un error borrando los datos.');
      overlay.remove();
    }
  },

  toggleUserActive(userId, active) {
    DB.updateUser(userId, { active });
    Toast.success(active ? 'Usuario activado' : 'Usuario bloqueado');
    this.refreshPage();
  },

  toggleGroupActive(groupId, active) {
    DB.updateGroup(groupId, { active });
    // Also disable all users of this group? Optional but recommended
    const groupUsers = DB.getUsers().filter(u => u.groupId === groupId);
    groupUsers.forEach(u => DB.updateUser(u.id, { active }));
    Toast.success(active ? 'Grupo Reactivado' : 'Grupo Suspendido Globalmente');
    this.refreshPage();
  },

  viewAudit(userId) {
    this.setTab('logs', document.querySelector('[onclick*="logs"]'));
    const user = DB.getUserById(userId);
    const filterInput = document.getElementById('log-filter');
    if (filterInput) {
        filterInput.value = user.name;
        this.filterLogs(user.name);
    }
  },

  confirmDeleteUser(userId) {
    App.confirmDialog('Eliminar Usuario', 'Se perderá el acceso para esta cuenta.', () => {
      DB.deleteUser(userId);
      Toast.success('Eliminado');
      this.refreshPage();
    });
  },

  confirmDeleteGroup(groupId) {
    App.confirmDialog('⚠️ ELIMINAR GRUPO COMPLETO', 'Se borrarán jugadores, partidas y usuarios de este grupo. Esta acción es definitiva.', () => {
      // Add DB logic for full purge if needed, but for now we filter store
      DB.deleteGroup(groupId); 
      Toast.success('Grupo erradicado del sistema');
      this.refreshPage();
    });
  },

  refreshPage() {
    App.navigate('admin');
  },

  resetDemo() {
    App.confirmDialog('Resetear Sistema', 'Se borrarán todos los datos y se pondrá la demo inicial.', () => {
        DB.resetDemo();
        location.reload();
    });
  }
};
