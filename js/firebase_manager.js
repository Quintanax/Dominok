/* =========================================
   FIREBASE MANAGER — Real-time Cloud Sync
   Uses Firebase Compat SDK (v8 API) loaded
   via CDN in index.html as a regular script.
   ========================================= */

window.CloudDB = {
  _db: null,
  _auth: null,
  _unsubscribe: null,

  // =========================================
  // FIREBASE AUTHENTICATION (Official SDK)
  // Uses firebase.auth() — works on any browser
  // =========================================

  _getAuth() {
    if (this._auth) return this._auth;
    const db = this._getDb(); // ensures Firebase is initialized
    if (!db) return null;
    try {
      this._auth = firebase.auth();
      return this._auth;
    } catch(e) {
      console.error('❌ CloudDB: Error getting Firebase Auth:', e);
      return null;
    }
  },

  async registerUser(name, email, password, groupName) {
    const auth = this._getAuth();
    const db   = this._getDb();
    if (!auth || !db) return { error: 'Sin conexión a la nube. Inténtalo de nuevo.' };
    if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' };

    try {
      // 1. Create Firebase Auth account
      const cred = await auth.createUserWithEmailAndPassword(email.trim(), password);
      const uid  = cred.user.uid;

      // 2. Create group document in Firestore
      const groupRef = db.collection('groups').doc();
      const groupId  = groupRef.id;

      const group = {
        id: groupId,
        name: groupName,
        adminId: uid,
        createdAt: new Date().toISOString(),
        active: true
      };

      // 3. Create user profile document in Firestore
      const user = {
        id: uid,
        name,
        email: email.toLowerCase().trim(),
        role: 'group_admin',
        groupId,
        createdAt: new Date().toISOString(),
        active: true,
        avatar: null
      };

      const batch = db.batch();
      batch.set(groupRef, group);
      batch.set(db.collection('users').doc(uid), user);
      await batch.commit();

      // 4. Inject into local DB for the current session
      this._injectUserLocally(user, group);

      return { success: true, user };
    } catch(e) {
      console.error('❌ CloudDB.registerUser:', e);
      if (e.code === 'auth/email-already-in-use') return { error: 'Este email ya está registrado.' };
      if (e.code === 'auth/invalid-email')        return { error: 'El email no es válido.' };
      if (e.code === 'auth/weak-password')        return { error: 'La contraseña es muy débil (mín. 6 caracteres).' };
      return { error: 'Error al crear la cuenta: ' + e.message };
    }
  },

  async loginUser(email, password) {
    const auth = this._getAuth();
    const db   = this._getDb();
    if (!auth || !db) return { error: 'Sin conexión a la nube. Inténtalo de nuevo.' };

    try {
      // 1. Sign in with Firebase Auth
      const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
      const uid  = cred.user.uid;

      // 2. Load user profile from Firestore
      let userDoc = await db.collection('users').doc(uid).get();

      // If profile doesn't exist yet (legacy account), create it
      if (!userDoc.exists) {
        const groupRef = db.collection('groups').doc();
        const groupId  = groupRef.id;
        const user = {
          id: uid,
          name: email.split('@')[0],
          email: email.toLowerCase().trim(),
          role: 'group_admin',
          groupId,
          createdAt: new Date().toISOString(),
          active: true,
          avatar: null
        };
        const group = {
          id: groupId,
          name: 'Mi Grupo',
          adminId: uid,
          createdAt: new Date().toISOString(),
          active: true
        };
        const batch = db.batch();
        batch.set(db.collection('users').doc(uid), user);
        batch.set(groupRef, group);
        await batch.commit();
        this._injectUserLocally(user, group);
        return { success: true, user };
      }

      const user = userDoc.data();
      if (!user.active) return { error: 'Cuenta inactiva. Contacta al administrador.' };

      // 3. Load group
      const groupSnap = await db.collection('groups').doc(user.groupId).get();
      const group = groupSnap.exists ? groupSnap.data() : null;

      // 4. Inject into local DB for this session
      this._injectUserLocally(user, group);

      return { success: true, user };
    } catch(e) {
      console.error('❌ CloudDB.loginUser:', e);
      if (e.code === 'auth/user-not-found')   return { error: 'Email no encontrado. ¿Ya tienes cuenta?' };
      if (e.code === 'auth/wrong-password')   return { error: 'Contraseña incorrecta.' };
      if (e.code === 'auth/invalid-email')    return { error: 'El email no es válido.' };
      if (e.code === 'auth/too-many-requests')return { error: 'Demasiados intentos fallidos. Intenta más tarde.' };
      return { error: 'Error al iniciar sesión: ' + e.message };
    }
  },

  _injectUserLocally(user, group) {
    if (!DB._store.users)  DB._store.users  = [];
    if (!DB._store.groups) DB._store.groups = [];

    const uIdx = DB._store.users.findIndex(u => u.id === user.id);
    if (uIdx === -1) DB._store.users.push(user);
    else             DB._store.users[uIdx] = user;

    if (group) {
      const gIdx = DB._store.groups.findIndex(g => g.id === group.id);
      if (gIdx === -1) DB._store.groups.push(group);
      else             DB._store.groups[gIdx] = group;
    }

    try { localStorage.setItem('dominostats_db', JSON.stringify(DB._store)); } catch(e) {}
  },

  // Migrate a legacy localStorage user: register them in Firebase Auth + Firestore
  async migrateUserToCloud(user) {
    const auth = this._getAuth();
    const db   = this._getDb();
    if (!auth || !db || !user || !user.email) return;

    try {
      // Check if already in Firebase Auth by trying to fetch sign-in methods
      const methods = await auth.fetchSignInMethodsForEmail(user.email);
      if (methods && methods.length > 0) {
        // Already registered — just ensure Firestore profile exists
        const doc = await db.collection('users').doc(user.id).get();
        if (!doc.exists) {
          await db.collection('users').doc(user.id).set({ ...user, email: user.email.toLowerCase() });
          const group = (DB._store.groups || []).find(g => g.id === user.groupId);
          if (group) await db.collection('groups').doc(group.id).set(group);
        }
        console.log('✅ CloudDB: Perfil sincronizado en Firestore:', user.email);
        return;
      }

      // Not in Firebase Auth — need password to migrate
      // We can't migrate without password, skip silently (user must re-register)
      console.log('ℹ️ CloudDB: Usuario local no migrado (sin contraseña conocida):', user.email);
    } catch(e) {
      console.error('❌ CloudDB.migrateUserToCloud:', e);
    }
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
