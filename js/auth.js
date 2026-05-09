/* =========================================
   AUTH.JS — Authentication System
   ========================================= */
const Auth = {
  currentUser: null,
  SESSION_KEY: 'dominostats_session',

  init() {
    // ALWAYS bypass login - Change this email to switch views:
    // User admin: 'admin@demo.com'
    // User normal: 'juan@demo.com'
    this.currentUser = DB.getUserByEmail('juan@demo.com');
    if (this.currentUser) {
      return true;
    }
    return false;
  },

  login(email, password, remember = false) {
    const user = DB.getUserByEmail(email);
    if (!user) return { error: 'Email no encontrado' };
    if (user.password !== password) return { error: 'Contraseña incorrecta' };
    if (!user.active) return { error: 'Cuenta inactiva. Contacta al administrador.' };

    this.currentUser = user;
    const session = { userId: user.id, loginAt: new Date().toISOString() };
    if (remember) {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    }
    DB.addLog({ action: 'login', desc: `Inicio de sesión: ${user.name}` });
    return { success: true, user };
  },

  register(name, email, password, groupName) {
    if (DB.getUserByEmail(email)) return { error: 'Email ya registrado' };
    if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres' };

    const group = DB.addGroup({ name: groupName, active: true });
    const user = DB.addUser({
      name, email, password, role: 'group_admin',
      groupId: group.id, active: true, avatar: null
    });
    DB.updateGroup(group.id, { adminId: user.id });
    return this.login(email, password);
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_KEY);
  },

  isAdmin() { return this.currentUser?.role === 'admin'; },
  isGroupAdmin() { return ['admin', 'group_admin'].includes(this.currentUser?.role); },
  getGroupId() { return this.currentUser?.groupId; },
  can(action) {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    const permissions = {
      admin: ['all'],
      group_admin: ['manage_players', 'manage_matches', 'view_reports', 'manage_group'],
      user: ['view_players', 'view_matches', 'view_reports']
    };
    const perms = permissions[role] || [];
    return perms.includes('all') || perms.includes(action);
  }
};
window.Auth = Auth;
