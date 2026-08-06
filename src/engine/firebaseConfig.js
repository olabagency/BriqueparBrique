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
  apiKey:            "",
  authDomain:        "",
  databaseURL:       "",   // ex: https://mon-projet-default-rtdb.europe-west1.firebasedatabase.app
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             "",
};

export const FIREBASE_ENABLED =
  FIREBASE_CONFIG.apiKey !== "" && FIREBASE_CONFIG.databaseURL !== "";
