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
      console.error('❌ Firebase SDK no está cargado.');
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
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this._db = firebase.firestore();
    return this._db;
  },

  async syncToCloud() {
    const db = this._getDb();
    if (!db) return false;
    const groupId = Auth.getGroupId();
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
      console.error('❌ Error sincronizando con Firebase:', e);
      return false;
    }
  },

  listenToCloud() {
    const db = this._getDb();
    if (!db) return;
    const groupId = Auth.getGroupId();
    if (!groupId) return;

    if (this._unsubscribe) this._unsubscribe();

    console.log('👂 Iniciando escucha en tiempo real de Firebase para grupo:', groupId);

    this._unsubscribe = db.collection('groups').doc(groupId).onSnapshot((docSnap) => {
      if (!docSnap.exists) return;

      const cloudData = docSnap.data();
      let changed = false;

      if (cloudData.players) {
        cloudData.players.forEach(cp => {
          const idx = DB._store.players.findIndex(p => p.id === cp.id);
          if (idx === -1) { DB._store.players.push(cp); changed = true; }
          else if (JSON.stringify(DB._store.players[idx]) !== JSON.stringify(cp)) {
            DB._store.players[idx] = cp; changed = true;
          }
        });
      }

      if (cloudData.matches) {
        cloudData.matches.forEach(cm => {
          const idx = DB._store.matches.findIndex(m => m.id === cm.id);
          if (idx === -1) { DB._store.matches.push(cm); changed = true; }
          else if (JSON.stringify(DB._store.matches[idx]) !== JSON.stringify(cm)) {
            DB._store.matches[idx] = cm; changed = true;
          }
        });
      }

      if (changed) {
        localStorage.setItem('dominostats_db', JSON.stringify(DB._store));
        console.log('☁️⚡ Datos nuevos recibidos desde Firebase/Telegram');

        // Refresh the current page UI
        if (typeof App !== 'undefined' && App.currentPage) {
          if (App.currentPage === 'matches' && typeof MatchesPage !== 'undefined') {
            MatchesPage.loadTable();
          } else {
            App.loadPage(App.currentPage);
          }
        }
      }
    }, (error) => {
      console.error('❌ Error en escucha de Firebase:', error);
    });
  },

  async wipeCloudData() {
    const db = this._getDb();
    if (!db) return false;
    const groupId = Auth.getGroupId();
    if (!groupId) return false;
    try {
      await db.collection('groups').doc(groupId).set({
        players: [], matches: [], lastSync: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error('❌ Error borrando Firebase:', e);
      return false;
    }
  }
};

// Intercept local saves to also sync to cloud
(function() {
  const originalSave = DB.save.bind(DB);
  DB.save = function() {
    originalSave();
    window.CloudDB.syncToCloud();
  };
})();

// Start real-time listener once user is logged in
// Called from App.init() after login succeeds
