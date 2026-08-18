import { FB, LS_CONFIG_KEY, LS_AUTOSAVE_KEY, initFirebase } from './config.js';
import { setSyncStatus, updateUserDisplay } from './auth.js';
import { showLoot } from '../utils.js';
import { closeModal, openModalRaw } from '../modals.js';
import { syncDarkModeToggle } from '../theme.js';

// ── Settings modal ───────────────────────────────────────
export async function saveFirebaseConfig() {
  const apiKey     = document.getElementById('fb-apiKey').value.trim();
  const projectId  = document.getElementById('fb-projectId').value.trim();
  const authDomain = document.getElementById('fb-authDomain').value.trim();
  const appId      = document.getElementById('fb-appId').value.trim();
  const autosave   = document.getElementById('fb-autosave').value === '1';
  if (!apiKey || !projectId) { setSyncStatus('error', '✕ Missing fields'); return; }
  const config = { apiKey, projectId, authDomain: authDomain || projectId + '.firebaseapp.com', appId };
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));
  localStorage.setItem(LS_AUTOSAVE_KEY, autosave ? '1' : '0');
  FB.autosave = autosave;
  setSyncStatus('loading', '… Connecting');
  try {
    await initFirebase(config);
    setSyncStatus('saved', '✓ Connected');
    showLoot('Firebase connected');
    closeModal('modal-settings');
    // Auth screen will show automatically via onAuthStateChanged
  } catch(e) {
    setSyncStatus('error', '✕ Failed');
    console.error(e);
    alert('Connection failed. Check your config values.\n\n' + e.message);
  }
}

export function disconnectFirebase() {
  if (confirm('Disconnect Firebase? You will be signed out.')) {
    if (FB.auth) FB.auth.signOut();
    localStorage.removeItem(LS_CONFIG_KEY);
    localStorage.removeItem(LS_AUTOSAVE_KEY);
    FB.configured = false;
    setSyncStatus('idle', '⬡ Not connected');
    showLoot('Disconnected');
  }
}

export function openSettingsModal() {
  const autosaveOn = localStorage.getItem(LS_AUTOSAVE_KEY) !== '0';
  document.getElementById('fb-autosave').value = autosaveOn ? '1' : '0';
  document.getElementById('autosave-toggle').style.background = autosaveOn ? 'var(--blue)' : 'var(--surface3)';
  document.getElementById('autosave-knob').style.transform = autosaveOn ? 'translateX(18px)' : 'translateX(0)';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  syncDarkModeToggle(isDark);
  const el = document.getElementById('settings-last-saved');
  if (el) el.textContent = FB.lastSaved ? 'Last saved: ' + FB.lastSaved.toLocaleTimeString() : '';
  if (FB.user) updateUserDisplay();
  openModalRaw('modal-settings');
}

export function toggleAutoSave() {
  const input = document.getElementById('fb-autosave');
  const toggle = document.getElementById('autosave-toggle');
  const knob = document.getElementById('autosave-knob');
  const on = input.value === '1';
  input.value = on ? '0' : '1';
  toggle.style.background = on ? 'var(--surface3)' : 'var(--blue)';
  knob.style.transform = on ? 'translateX(0)' : 'translateX(18px)';
  FB.autosave = !on;
  localStorage.setItem(LS_AUTOSAVE_KEY, on ? '0' : '1');
}
