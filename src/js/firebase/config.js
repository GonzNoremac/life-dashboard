import { showAppScreen, showAuthScreen, updateUserDisplay, setSyncStatus } from './auth.js';
import { firebaseLoadNow } from './sync.js';
import { showLoot } from '../utils.js';

// ═══════════════════ FIREBASE PERSISTENCE ═══════════════════

export const FB = {
  configured: false,
  autosave: true,
  saveTimer: null,
  lastSaved: null,
  docPath: null,
  user: null,
};

export const LS_CONFIG_KEY   = 'chronicle_fb_config';
export const LS_AUTOSAVE_KEY = 'chronicle_fb_autosave';

const FB_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
];

function loadFirebaseScripts() {
  // Load scripts sequentially, one at a time
  return FB_SCRIPTS.reduce((chain, src) => {
    return chain.then(() => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { resolve(); };
      s.onerror = () => reject(new Error('Failed to load: ' + src));
      document.head.appendChild(s);
    }));
  }, Promise.resolve());
}

// ── Init Firebase app ────────────────────────────────────
export async function initFirebase(config) {
  await loadFirebaseScripts();
  // Delete existing app if re-initialising
  try { await window.firebase.app().delete(); } catch(e) {}
  window.firebase.initializeApp(config);

  // Verify auth and firestore are available
  if (!window.firebase.auth) throw new Error('Firebase Auth failed to load. Check your internet connection.');
  if (!window.firebase.firestore) throw new Error('Firebase Firestore failed to load.');

  FB.auth = window.firebase.auth();
  FB.db   = window.firebase.firestore();
  FB.configured = true;

  // Listen for auth state changes
  FB.auth.onAuthStateChanged(async user => {
    if (user) {
      FB.user = user;
      FB.docPath = FB.db.collection('users').doc(user.uid).collection('tracker').doc('main');
      updateUserDisplay();
      showAppScreen();
      setSyncStatus('loading', '… Loading');
      await firebaseLoadNow();
      showLoot('Signed in as ' + user.email.split('@')[0]);
    } else {
      FB.user = null;
      FB.docPath = null;
      showAuthScreen();
      setSyncStatus('idle', '⬡ Not signed in');
    }
  });
}

// Hard-coded Firebase config
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAckuS3UP0NjhRIiAveOeUmpCSr5iNsw4",
  authDomain: "life-dashboard-4410e.firebaseapp.com",
  projectId: "life-dashboard-4410e",
  storageBucket: "life-dashboard-4410e.firebasestorage.app",
  messagingSenderId: "363693911960",
  appId: "1:363693911960:web:47c0d5315789db272a05ed"
};

export async function autoConnectFirebase() {
  FB.autosave = localStorage.getItem(LS_AUTOSAVE_KEY) !== '0';
  setSyncStatus('loading', '… Connecting');
  try {
    await initFirebase(FIREBASE_CONFIG);
  } catch(e) {
    console.error('Firebase init error:', e);
    setSyncStatus('error', '✕ Connection failed');
    showAuthScreen();
  }
}
