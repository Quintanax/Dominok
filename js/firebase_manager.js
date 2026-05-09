import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAx5QqWr2DVEfjuy5Pc69AZKcGrwbqYUzY",
  authDomain: "estadisticas-de-domino.firebaseapp.com",
  projectId: "estadisticas-de-domino",
  storageBucket: "estadisticas-de-domino.firebasestorage.app",
  messagingSenderId: "20856378924",
  appId: "1:20856378924:web:d84065d4732f9faa9d6389",
  measurementId: "G-BF7KPS61V1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.CloudDB = {
  _unsubscribe: null,

  async syncToCloud() {
    const groupId = Auth.getGroupId();
    if (!groupId) return;
    
    try {
      const docSnap = await getDoc(doc(db, "groups", groupId));
      let cloudMatches = [];
      let cloudPlayers = [];
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        cloudMatches = cloudData.matches || [];
        cloudPlayers = cloudData.players || [];
      }

      const localData = DB._store;
      const localPlayers = localData.players.filter(p => p.groupId === groupId);
      const localMatches = localData.matches.filter(m => m.groupId === groupId);

      const mergedMatches = [...localMatches];
      cloudMatches.forEach(cm => {
        if (!mergedMatches.some(lm => lm.id === cm.id)) {
          mergedMatches.push(cm);
        }
      });

      const mergedPlayers = [...localPlayers];
      cloudPlayers.forEach(cp => {
        if (!mergedPlayers.some(lp => lp.id === cp.id)) {
          mergedPlayers.push(cp);
        }
      });

      const dataToSync = {
        players: mergedPlayers,
        matches: mergedMatches,
        lastSync: new Date().toISOString()
      };

      await setDoc(doc(db, "groups", groupId), dataToSync, { merge: true });
      return true;
    } catch (e) {
      console.error("❌ Error sincronizando con Firebase:", e);
      return false;
    }
  },

  listenToCloud() {
    const groupId = Auth.getGroupId();
    if (!groupId) return;

    if (this._unsubscribe) {
        this._unsubscribe();
    }

    console.log("👂 Iniciando escucha en tiempo real de Firebase...");
    
    this._unsubscribe = onSnapshot(doc(db, "groups", groupId), (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        let changed = false;
        
        if (cloudData.players) {
          cloudData.players.forEach(cp => {
            const idx = DB._store.players.findIndex(p => p.id === cp.id);
            if (idx === -1) { DB._store.players.push(cp); changed = true; }
            else if (JSON.stringify(DB._store.players[idx]) !== JSON.stringify(cp)) { DB._store.players[idx] = cp; changed = true; }
          });
        }

        if (cloudData.matches) {
          cloudData.matches.forEach(cm => {
            const idx = DB._store.matches.findIndex(m => m.id === cm.id);
            if (idx === -1) { DB._store.matches.push(cm); changed = true; }
            else if (JSON.stringify(DB._store.matches[idx]) !== JSON.stringify(cm)) { DB._store.matches[idx] = cm; changed = true; }
          });
        }

        if (changed) {
          // Bypass DB.save() to avoid infinite loop
          localStorage.setItem('dominostats_db', JSON.stringify(DB._store));
          console.log("☁️⚡ Datos actualizados en tiempo real desde Telegram/Firebase");
          
          // Refresh UI if necessary
          if (typeof App !== 'undefined' && App.currentPage) {
             if (App.currentPage === 'matches' && typeof window.MatchesPage !== 'undefined') {
                window.MatchesPage.render();
             } else if (App.currentPage === 'admin_dashboard' && typeof window.AdminDashboard !== 'undefined') {
                window.AdminDashboard.render();
             } else {
                 App.loadPage(App.currentPage);
             }
          }
        }
      }
    });
  }
};

// Auto-sync when saving locally
const originalSave = DB.save;
DB.save = function() {
  originalSave.apply(this, arguments);
  window.CloudDB.syncToCloud();
};

// Initial sync on load using Real-time listener
setTimeout(() => {
  if (Auth.isAuthenticated()) {
      window.CloudDB.listenToCloud();
  }
}, 500);
