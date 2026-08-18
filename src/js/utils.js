import { state } from './state.js';
import { saveStateLocal, firebaseQueueSave } from './firebase/sync.js';

// ═══════════════════ UTILS ═══════════════════
export function fmt(n) { return '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }
export function today() { return new Date().toISOString().split('T')[0]; }
export function uid() { return Math.random().toString(36).slice(2); }

export function clearFields(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

export function removeItem(arr, id, ...callbacks) {
  state[arr] = state[arr].filter(x => x.id !== id);
  callbacks.forEach(fn => fn && fn());
}

export function autoSave() {
  saveStateLocal();
  if (typeof firebaseQueueSave === 'function') firebaseQueueSave();
}

// Loot Toast
export function showLoot(msg) {
  const t = document.getElementById('loot-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
