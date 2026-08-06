// ─── Firebase configuration ──────────────────────────────────────────────────
// Pour activer les vrais joueurs en ligne :
//  1. Va sur https://console.firebase.google.com
//  2. Crée un projet (gratuit)
//  3. Ajoute une app Web → copie l'objet firebaseConfig ci-dessous
//  4. Active "Realtime Database" → choisis "Démarrer en mode test"
//  5. Dans les règles de la base, mets :
//     { "rules": { ".read": true, ".write": true } }
//
// FIREBASE_ENABLED restera false jusqu'à ce que tu remplisses la config.

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCXLhRFfV4LvGlYvpMGE1-yezUfMyEh8zQ",
  authDomain:        "briqueparbrique-c5425.firebaseapp.com",
  databaseURL:       "https://briqueparbrique-c5425-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "briqueparbrique-c5425",
  storageBucket:     "briqueparbrique-c5425.firebasestorage.app",
  messagingSenderId: "841260981505",
  appId:             "1:841260981505:web:61e7b52d69412edad74f00",
};

export const FIREBASE_ENABLED =
  FIREBASE_CONFIG.apiKey !== "" && FIREBASE_CONFIG.databaseURL !== "";
