import { state } from '../state.js';
import { uid, clearFields, today, autoSave, showLoot } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';

// ═══════════════════ HEALTH — WORKOUTS ═══════════════════

export function addWorkout() {
  const name = document.getElementById('w-name').value.trim();
  const type = document.getElementById('w-type').value;
  const duration = parseInt(document.getElementById('w-duration').value) || 0;
  const volume = parseFloat(document.getElementById('w-volume').value) || 0;
  const date = document.getElementById('w-date').value || today();
  const notes = document.getElementById('w-notes').value;
  if (!name) return;
  state.workouts.push({ id: uid(), name, type, duration, volume, date, notes });
  clearFields(['w-name','w-duration','w-volume','w-date','w-notes']);
  closeModal('modal-add-workout');
  renderWorkouts(); updateHealthSummary();
}

export function renderWorkouts() {
  const el = document.getElementById('workout-list');
  if (!state.workouts.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🏋️</div>No workouts logged</div>'; return; }
  const sorted = [...state.workouts].sort((a,b) => b.date.localeCompare(a.date));
  el.innerHTML = sorted.map(w => `
    <div class="workout-item">
      <div class="workout-icon" style="background:var(--surface3);font-size:18px">${w.type}</div>
      <div style="flex:1;margin-left:0.75rem">
        <div style="font-weight:600;font-size:13px">${w.name}</div>
        <div class="muted" style="font-size:10px">${w.date} · ${w.duration} min${w.volume ? ' · ' + w.volume + 'kg' : ''}</div>
        ${w.notes ? `<div class="muted" style="font-size:10px;margin-top:2px">${w.notes}</div>` : ''}
      </div>
      <button class="ctx-btn" onclick="openCtx(event, () => editWorkout('${w.id}'), () => { removeItem('workouts','${w.id}',renderWorkouts,updateHealthSummary); })">•••</button>
    </div>`).join('');
}

export function updateHealthSummary() {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = state.workouts.filter(w => new Date(w.date) >= weekAgo);
  document.getElementById('workouts-this-week').textContent = thisWeek.length;
  document.getElementById('total-volume').textContent = thisWeek.reduce((s,w) => s + w.volume, 0).toFixed(0);

  // Simple streak: count consecutive days ending today
  const workoutDates = new Set(state.workouts.map(w => w.date));
  let streak = 0, d = new Date();
  while (workoutDates.has(d.toISOString().split('T')[0])) {
    streak++; d.setDate(d.getDate() - 1);
  }
  document.getElementById('streak-count').textContent = streak;
}

// ── WORKOUT EDIT ──────────────────────────────────────────

export function editWorkout(id) {
  const w = state.workouts.find(x => x.id === id);
  if (!w) return;
  document.getElementById('w-name').value     = w.name;
  document.getElementById('w-type').value     = w.type;
  document.getElementById('w-duration').value = w.duration;
  document.getElementById('w-volume').value   = w.volume || '';
  document.getElementById('w-date').value     = w.date;
  document.getElementById('w-notes').value    = w.notes || '';
  openEditModal('modal-add-workout', 'Edit Workout', 'Save Changes', () => {
    w.name     = document.getElementById('w-name').value.trim()     || w.name;
    w.type     = document.getElementById('w-type').value;
    w.duration = parseInt(document.getElementById('w-duration').value) || w.duration;
    w.volume   = document.getElementById('w-volume').value;
    w.date     = document.getElementById('w-date').value || w.date;
    w.notes    = document.getElementById('w-notes').value;
    closeModal('modal-add-workout');
    resetModalToAdd('modal-add-workout', 'Log Workout', 'Log Workout', addWorkout);
    renderWorkouts(); updateHealthSummary(); autoSave();
  });
}

// Patch addWorkout to show loot toast
const _origAddWorkout = addWorkout;
addWorkout = function() {
  const prevLen = state.workouts.length;
  _origAddWorkout();
  if (state.workouts.length > prevLen) { showLoot('Workout logged'); }
};
