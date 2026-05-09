import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

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
  async syncToCloud() {
    const groupId = Auth.getGroupId();
    if (!groupId) return;
    
    try {
      // 1. Get current cloud data to avoid overwriting bot matches
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

      // 2. Merge (Cloud matches that are not in local yet)
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
      console.log("☁️ Sincronización bidireccional exitosa");
      return true;
    } catch (e) {
      console.error("❌ Error sincronizando con Firebase:", e);
      return false;
    }
  },

  async syncFromCloud() {
    const groupId = Auth.getGroupId();
    if (!groupId) return;

    try {
      const docSnap = await getDoc(doc(db, "groups", groupId));
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        
        // Merge cloud players into local (avoiding duplicates by ID)
        if (cloudData.players) {
          cloudData.players.forEach(cp => {
            const idx = DB._store.players.findIndex(p => p.id === cp.id);
            if (idx === -1) DB._store.players.push(cp);
            else DB._store.players[idx] = cp;
          });
        }

        // Merge cloud matches
        if (cloudData.matches) {
          cloudData.matches.forEach(cm => {
            const idx = DB._store.matches.findIndex(m => m.id === cm.id);
            if (idx === -1) DB._store.matches.push(cm);
            else DB._store.matches[idx] = cm;
          });
        }

        DB.save();
        console.log("☁️ Datos descargados desde Firebase");
        return true;
      }
    } catch (e) {
      console.error("❌ Error descargando desde Firebase:", e);
    }
    return false;
  }
};

// Auto-sync when saving locally
const originalSave = DB.save;
DB.save = function() {
  originalSave.apply(this, arguments);
  window.CloudDB.syncToCloud();
};

// Initial sync on load
setTimeout(() => {
  window.CloudDB.syncFromCloud();
}, 2000);
