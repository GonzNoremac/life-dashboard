import { FB } from './config.js';
import { state } from '../state.js';
import { showLoot } from '../utils.js';
import { refreshAllViews } from './sync.js';

// ── UI helpers ───────────────────────────────────────────
export function setSyncStatus(status, text) {
  ['sync-status','settings-sync-status'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'sync-badge sync-' + status;
    el.textContent = text;
  });
}

export function dismissLoading() {
  const ls = document.getElementById('loading-screen');
  if (!ls) return;
  ls.classList.add('fade-out');
  setTimeout(() => ls.style.display = 'none', 320);
}

export function showAuthScreen() {
  dismissLoading();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-wrapper').style.display = 'none';
}

export function showAppScreen() {
  dismissLoading();
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'block';
}

export function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

export function setAuthLoading(loading) {
  const btn = document.getElementById('auth-submit-btn');
  btn.textContent = loading ? '…' : 'Sign In';
  btn.disabled = loading;
}

export function updateUserDisplay() {
  const el = document.getElementById('user-display');
  if (el && FB.user) el.textContent = FB.user.email;
  const row = document.getElementById('settings-user-row');
  const emailEl = document.getElementById('settings-user-email');
  if (row && emailEl && FB.user) {
    emailEl.textContent = FB.user.email;
    row.style.display = 'block';
  }
}

// ── Auth actions ─────────────────────────────────────────
export async function authSignIn() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { setAuthError('Please fill in all fields.'); return; }
  setAuthError(''); setAuthLoading(true);
  try {
    await FB.auth.signInWithEmailAndPassword(email, password);
  } catch(e) {
    const msgs = {
      'auth/invalid-email':      'Invalid email address.',
      'auth/user-not-found':     'No account found with this email.',
      'auth/wrong-password':     'Incorrect password.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/user-disabled':      'This account has been disabled.',
      'auth/too-many-requests':  'Too many attempts. Please try again later.',
    };
    setAuthError(msgs[e.code] || e.message);
    setAuthLoading(false);
  }
}

export async function authSignOut() {
  if (!FB.auth) return;
  await FB.auth.signOut();
  // Reset state
  const keys = ['budgets','expenses','savings','debts','assets','bills','income','events','workouts','foods'];
  keys.forEach(k => state[k] = []);
  refreshAllViews();
  showLoot('Signed out');
}

export async function authResetPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { setAuthError('Enter your email address first.'); return; }
  try {
    await FB.auth.sendPasswordResetEmail(email);
    setAuthError('');
    alert('Password reset email sent to ' + email);
  } catch(e) {
    setAuthError('Could not send reset email: ' + e.message);
  }
}
