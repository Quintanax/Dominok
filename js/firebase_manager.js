/* =========================================
   FIREBASE MANAGER — Real-time Cloud Sync
   Uses Firebase Compat SDK (v8 API) loaded
   via CDN in index.html as a regular script.
   ========================================= */

window.CloudDB = {
  _db: null,
  _unsubscribe: null,

  // =========================================
  // CLOUD AUTHENTICATION (Cross-browser Login)
  // Users and groups stored in Firestore so
  // any browser can log in.
  // =========================================

  async registerUser(name, email, password, groupName) {
    const db = this._getDb();
    if (!db) return { error: 'Sin conexión a la nube. Inténtalo de nuevo.' };

    const emailNorm = email.toLowerCase().trim();

    // Check if email already exists in Firestore
    const existing = await db.collection('users').where('email', '==', emailNorm).limit(1).get();
    if (!existing.empty) return { error: 'Este email ya está registrado.' };
    if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' };

    // Create group document
    const groupRef = db.collection('groups').doc();
    const groupId = groupRef.id;
    const userRef = db.collection('users').doc();
    const userId = userRef.id;

    const group = {
      id: groupId,
      name: groupName,
      adminId: userId,
      createdAt: new Date().toISOString(),
      active: true
    };

    const user = {
      id: userId,
      name,
      email: emailNorm,
      password,
      role: 'group_admin',
      groupId,
      createdAt: new Date().toISOString(),
      active: true,
      avatar: null
    };

    const batch = db.batch();
    batch.set(groupRef, group);
    batch.set(userRef, user);
    await batch.commit();

    // Seed local DB with the new user + group so the app can continue normally
    this._injectUserLocally(user, group);

    return { success: true, user };
  },

  async loginUser(email, password) {
    const db = this._getDb();
    if (!db) return { error: 'Sin conexión a la nube. Inténtalo de nuevo.' };

    const emailNorm = email.toLowerCase().trim();

    const snap = await db.collection('users').where('email', '==', emailNorm).limit(1).get();
    if (snap.empty) return { error: 'Email no encontrado.' };

    const user = snap.docs[0].data();
    if (user.password !== password) return { error: 'Contraseña incorrecta.' };
    if (!user.active) return { error: 'Cuenta inactiva. Contacta al administrador.' };

    // Load the user's group from Firestore
    const groupSnap = await db.collection('groups').doc(user.groupId).get();
    const group = groupSnap.exists ? groupSnap.data() : null;

    // Inject into local DB so the rest of the app works normally
    this._injectUserLocally(user, group);

    return { success: true, user };
  },

  _injectUserLocally(user, group) {
    // Ensure local DB has this user
    if (!DB._store.users) DB._store.users = [];
    if (!DB._store.groups) DB._store.groups = [];

    const uIdx = DB._store.users.findIndex(u => u.id === user.id);
    if (uIdx === -1) DB._store.users.push(user);
    else DB._store.users[uIdx] = user;

    if (group) {
      const gIdx = DB._store.groups.findIndex(g => g.id === group.id);
      if (gIdx === -1) DB._store.groups.push(group);
      else DB._store.groups[gIdx] = group;
    }

    // Persist to localStorage so DB.getUserById() works during the session
    try { localStorage.setItem('dominostats_db', JSON.stringify(DB._store)); } catch(e) {}
  },



  _getDb() {
    if (this._db) return this._db;
    if (typeof firebase === 'undefined') {
      console.error('❌ CloudDB: Firebase SDK no está cargado.');
      return null;
    }
    const firebaseConfig = {
      apiKey: "AIzaSyAx5QqWr2DVEfjuy5Pc69AZKcGrwbqYUzY",
      authDomain: "estadisticas-de-domino.firebaseapp.com",
      projectId: "estadisticas-de-domino",
      storageBucket: "estadisticas-de-domino.firebasestorage.app",
      messagingSenderId: "20856378924",
      appId: "1:20856378924:web:d84065d4732f9faa9d6389"
    };
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ CloudDB: Firebase inicializado correctamente.');
      }
      this._db = firebase.firestore();
      return this._db;
    } catch (e) {
      console.error('❌ CloudDB: Error inicializando Firebase:', e);
      return null;
    }
  },

  // Resolve player names in Telegram matches to local player IDs.
  // Tries exact name match, then alias match (case-insensitive).
  _resolvePlayerIdsInMatch(match, groupId) {
    const players = DB.getPlayers(groupId);

    const findId = (name) => {
      if (!name) return null;
      const q = name.trim().toLowerCase();
      // 1) Exact name match
      let p = players.find(p => p.name && p.name.trim().toLowerCase() === q);
      if (p) return p.id;
      // 2) Alias match (aliases can be an array or a comma-separated string)
      p = players.find(p => {
        const aliases = Array.isArray(p.aliases)
          ? p.aliases
          : (p.alias || '').split(',').map(a => a.trim()).filter(Boolean);
        return aliases.some(a => a.toLowerCase() === q);
      });
      if (p) return p.id;
      return null;
    };

    let changed = false;

    // team1
    if (!match.team1.player1 && match.team1.player1Name) {
      const id = findId(match.team1.player1Name);
      if (id) { match.team1.player1 = id; changed = true; }
    }
    if (!match.team1.player2 && match.team1.player2Name) {
      const id = findId(match.team1.player2Name);
      if (id) { match.team1.player2 = id; changed = true; }
    }
    // team2
    if (!match.team2.player1 && match.team2.player1Name) {
      const id = findId(match.team2.player1Name);
      if (id) { match.team2.player1 = id; changed = true; }
    }
    if (!match.team2.player2 && match.team2.player2Name) {
      const id = findId(match.team2.player2Name);
      if (id) { match.team2.player2 = id; changed = true; }
    }

    // Ensure shoes object exists
    if (!match.shoes) {
      match.shoes = { team1Given: 0, team2Given: 0 };
      changed = true;
    }
    // Ensure type exists
    if (!match.type) {
      match.type = 'friendly';
      changed = true;
    }

    return changed;
  },

  listenToCloud() {
    const db = this._getDb();
    if (!db) {
      console.error('❌ CloudDB.listenToCloud: No hay conexión a Firebase.');
      return;
    }

    // Get the groupId from the currently logged-in user
    const groupId = (typeof Auth !== 'undefined' && Auth.currentUser)
      ? Auth.currentUser.groupId
      : null;

    if (!groupId) {
      console.warn('⚠️ CloudDB.listenToCloud: No hay groupId. ¿El usuario está logueado?');
      return;
    }

    console.log('👂 CloudDB: Escuchando Firestore para grupo:', groupId);

    // Cancel previous listener if any
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    this._unsubscribe = db.collection('groups').doc(groupId).onSnapshot(
      (docSnap) => {
        if (!docSnap.exists) {
          console.log('ℹ️ CloudDB: No existe documento en Firestore para este grupo todavía.');
          return;
        }

        const cloudData = docSnap.data();
        console.log('☁️ CloudDB: Datos recibidos de Firestore:', {
          matches: (cloudData.matches || []).length,
          players: (cloudData.players || []).length
        });

        let changed = false;

        // Sync players
        if (Array.isArray(cloudData.players)) {
          cloudData.players.forEach(cp => {
            if (!cp || !cp.id) return;
            const idx = DB._store.players.findIndex(p => p.id === cp.id);
            if (idx === -1) {
              DB._store.players.push(cp);
              changed = true;
              console.log('👤 CloudDB: Nuevo jugador sincronizado:', cp.name || cp.id);
            } else if (JSON.stringify(DB._store.players[idx]) !== JSON.stringify(cp)) {
              DB._store.players[idx] = cp;
              changed = true;
            }
          });
        }

        // Sync matches + resolve player IDs from names (Telegram-origin matches)
        if (Array.isArray(cloudData.matches)) {
          const deletedIds = DB._store.deletedMatchIds || [];
          cloudData.matches.forEach(cm => {
            if (!cm || !cm.id) return;
            if (deletedIds.includes(cm.id)) return; // Ignorar si fue eliminada localmente

            // Resolve names → IDs
            this._resolvePlayerIdsInMatch(cm, groupId);

            const idx = DB._store.matches.findIndex(m => m.id === cm.id);
            if (idx === -1) {
              DB._store.matches.push(cm);
              changed = true;
              console.log('🎮 CloudDB: Nueva partida sincronizada:', cm.id);
            } else {
              // Re-resolve on existing entry in case players were registered after
              const existingResolved = this._resolvePlayerIdsInMatch(DB._store.matches[idx], groupId);
              if (existingResolved || JSON.stringify(DB._store.matches[idx]) !== JSON.stringify(cm)) {
                DB._store.matches[idx] = cm;
                changed = true;
              }
            }
          });
        }

        // Also re-resolve any existing stored matches that still lack player IDs
        DB._store.matches.forEach(m => {
          if (m.groupId === groupId) {
            const resolved = this._resolvePlayerIdsInMatch(m, groupId);
            if (resolved) changed = true;
          }
        });


        if (changed) {
          // Persist to localStorage so DB.getMatches() picks it up
          try {
            localStorage.setItem('dominostats_db', JSON.stringify(DB._store));
            console.log('💾 CloudDB: localStorage actualizado con datos de Firebase.');
          } catch (e) {
            console.error('❌ CloudDB: Error guardando en localStorage:', e);
          }

          // Refresh current page view
          try {
            if (typeof App !== 'undefined' && App.currentPage) {
              if (App.currentPage === 'matches' && typeof MatchesPage !== 'undefined' && MatchesPage.loadTable) {
                MatchesPage.loadTable();
                console.log('🔄 CloudDB: Tabla de partidas actualizada.');
              } else if (App.currentPage === 'dashboard' && typeof DashboardPage !== 'undefined' && DashboardPage.render) {
                App.navigate('dashboard');
              } else if (typeof App.navigate === 'function') {
                App.navigate(App.currentPage);
              }
            }
          } catch (e) {
            console.error('❌ CloudDB: Error al refrescar UI:', e);
          }
        } else {
          console.log('ℹ️ CloudDB: Sin cambios respecto al estado local.');
        }
      },
      (error) => {
        console.error('❌ CloudDB: Error en el listener de Firestore:', error.code, error.message);
      }
    );
  },

  async syncToCloud() {
    const db = this._getDb();
    if (!db) return false;
    const groupId = (typeof Auth !== 'undefined' && Auth.currentUser)
      ? Auth.currentUser.groupId
      : null;
    if (!groupId) return false;

    try {
      const docSnap = await db.collection('groups').doc(groupId).get();
      let cloudMatches = [];
      let cloudPlayers = [];
      if (docSnap.exists) {
        const cloudData = docSnap.data();
        cloudMatches = cloudData.matches || [];
        cloudPlayers = cloudData.players || [];
      }

      const localPlayers = DB._store.players.filter(p => p.groupId === groupId);
      const localMatches = DB._store.matches.filter(m => m.groupId === groupId);

      const deletedIds = DB._store.deletedMatchIds || [];

      const mergedMatches = [...localMatches];
      cloudMatches.forEach(cm => {
        if (!deletedIds.includes(cm.id) && !mergedMatches.some(lm => lm.id === cm.id)) mergedMatches.push(cm);
      });

      const mergedPlayers = [...localPlayers];
      cloudPlayers.forEach(cp => {
        if (!mergedPlayers.some(lp => lp.id === cp.id)) mergedPlayers.push(cp);
      });

      await db.collection('groups').doc(groupId).set({
        players: mergedPlayers,
        matches: mergedMatches,
        lastSync: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (e) {
      console.error('❌ CloudDB.syncToCloud: Error:', e);
      return false;
    }
  },

  async wipeCloudData() {
    const db = this._getDb();
    if (!db) return false;
    const groupId = (typeof Auth !== 'undefined' && Auth.currentUser)
      ? Auth.currentUser.groupId
      : null;
    if (!groupId) return false;
    try {
      await db.collection('groups').doc(groupId).set({
        players: [], matches: [], lastSync: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error('❌ CloudDB.wipeCloudData: Error:', e);
      return false;
    }
  }
};

// Intercept local saves to also sync to cloud (safely, after DOM is ready)
document.addEventListener('DOMContentLoaded', function() {
  if (typeof DB !== 'undefined' && DB.save) {
    const originalSave = DB.save.bind(DB);
    DB.save = function() {
      originalSave();
      // Only sync if user is logged in
      if (typeof Auth !== 'undefined' && Auth.currentUser) {
        window.CloudDB.syncToCloud();
      }
    };
    console.log('✅ CloudDB: Interceptor de DB.save() instalado.');
  } else {
    console.warn('⚠️ CloudDB: DB no disponible al intentar instalar interceptor.');
  }
});
