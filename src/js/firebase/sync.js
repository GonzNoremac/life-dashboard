import { FB } from './config.js';
import { state } from '../state.js';
import { setSyncStatus } from './auth.js';
import { renderBudgets } from '../finance/budgets.js';
import { renderExpenses, updateExpenseCategorySelect } from '../finance/expenses.js';
import { updateCardSelects, renderCards } from '../finance/cards.js';
import { renderSavings } from '../finance/savings.js';
import { renderDebts } from '../finance/debts.js';
import { renderAssets } from '../finance/assets.js';
import { renderIncome } from '../finance/income.js';
import { renderBills, checkAndAutoLogBills } from '../finance/bills.js';
import { updateSummary } from '../finance/summary.js';
import { renderEvents, renderCalendar } from '../calendar.js';
import { renderWorkouts, updateHealthSummary } from '../health/workouts.js';
import { renderFoods, renderMealSlots, updateNutritionSummary } from '../meals/foods.js';

export const LS_STATE_KEY = 'dashboard-state-v1';

// ── Data sync ────────────────────────────────────────────
export function serializeState() {
  const keys = ['budgets','expenses','savings','debts','assets','bills','income','events','workouts','foods','cards'];
  const out = {}; keys.forEach(k => out[k] = state[k]); return out;
}

export function deserializeState(data) {
  const keys = ['budgets','expenses','savings','debts','assets','bills','income','events','workouts','foods','cards'];
  keys.forEach(k => { if (data[k]) state[k] = data[k]; });
}

export async function firebaseSaveNow() {
  if (!FB.configured || !FB.docPath) { setSyncStatus('error', '✕ Not signed in'); return; }
  setSyncStatus('saving', '… Saving');
  try {
    await FB.docPath.set({ data: serializeState(), updatedAt: new Date().toISOString() });
    FB.lastSaved = new Date();
    setSyncStatus('saved', '✓ Saved');
    const el = document.getElementById('settings-last-saved');
    if (el) el.textContent = 'Last saved: ' + FB.lastSaved.toLocaleTimeString();
  } catch(e) {
    setSyncStatus('error', '✕ Save failed');
    console.error(e);
  }
}

export async function firebaseLoadNow() {
  if (!FB.configured || !FB.docPath) { setSyncStatus('error', '✕ Not signed in'); return; }
  setSyncStatus('loading', '… Loading');
  try {
    const doc = await FB.docPath.get();
    if (doc.exists && doc.data().data) {
      deserializeState(doc.data().data);
      refreshAllViews();
      setSyncStatus('saved', '✓ Synced');
    } else {
      // No cloud data yet — seed from localStorage if available
      const hadLocal = loadStateLocal();
      if (hadLocal) {
        refreshAllViews();
        setSyncStatus('saved', '✓ Ready (local data loaded)');
      } else {
        setSyncStatus('saved', '✓ Ready');
      }
    }
  } catch(e) {
    setSyncStatus('error', '✕ Load failed');
    console.error(e);
  }
}

export function firebaseQueueSave() {
  if (!FB.configured || !FB.autosave || !FB.docPath) return;
  clearTimeout(FB.saveTimer);
  setSyncStatus('saving', '… Saving');
  FB.saveTimer = setTimeout(firebaseSaveNow, 1500);
}

export function refreshAllViews() {
  renderBudgets(); renderExpenses(); updateExpenseCategorySelect(); updateCardSelects();
  renderSavings(); renderDebts(); renderAssets(); renderIncome();
  renderCards(); renderBills(); renderEvents(); renderCalendar();
  renderWorkouts(); updateHealthSummary();
  renderFoods(); renderMealSlots(); updateNutritionSummary();
  updateSummary(); checkAndAutoLogBills();
}

// Patch mutating functions to auto-save
export function patchForSync(fnName) {
  const orig = window[fnName];
  if (typeof orig !== 'function') return;
  window[fnName] = function(...args) { orig.apply(this, args); saveStateLocal(); firebaseQueueSave(); };
}

export function saveStateLocal() {
  try {
    localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
  } catch(e) { console.error('Local save failed', e); }
}

export function loadStateLocal() {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    // Merge saved arrays into state
    ['expenses','income','bills','budgets','savings','debts','assets','events','workouts','foods','cards'].forEach(k => {
      if (Array.isArray(saved[k])) state[k] = saved[k];
    });
    return true;
  } catch(e) { console.error('Local load failed', e); return false; }
}
