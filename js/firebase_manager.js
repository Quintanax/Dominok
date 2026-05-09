/* =========================================
   FIREBASE MANAGER — Real-time Cloud Sync
   Uses Firebase Compat SDK (v8 API) loaded
   via CDN in index.html as a regular script.
   ========================================= */

window.CloudDB = {
  _db: null,
  _unsubscribe: null,

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

        // Sync matches
        if (Array.isArray(cloudData.matches)) {
          cloudData.matches.forEach(cm => {
            if (!cm || !cm.id) return;
            const idx = DB._store.matches.findIndex(m => m.id === cm.id);
            if (idx === -1) {
              DB._store.matches.push(cm);
              changed = true;
              console.log('🎮 CloudDB: Nueva partida sincronizada:', cm.id);
            } else if (JSON.stringify(DB._store.matches[idx]) !== JSON.stringify(cm)) {
              DB._store.matches[idx] = cm;
              changed = true;
            }
          });
        }

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

      const mergedMatches = [...localMatches];
      cloudMatches.forEach(cm => {
        if (!mergedMatches.some(lm => lm.id === cm.id)) mergedMatches.push(cm);
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
