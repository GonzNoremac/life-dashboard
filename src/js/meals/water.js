import { uid, today, showLoot } from '../utils.js';
import { closeModal } from '../modals.js';

// ═══════════════════ MEALS — WATER TRACKING ═══════════════════

export function waterTodayKey() { return 'water-' + today(); }

export function getWaterLog() {
  const raw = localStorage.getItem(waterTodayKey());
  return raw ? JSON.parse(raw) : [];
}

export function saveWaterLog(log) {
  localStorage.setItem(waterTodayKey(), JSON.stringify(log));
}

export function addWater(oz) {
  const log = getWaterLog();
  log.push({ id: uid(), oz, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  saveWaterLog(log);
  renderWater();
  showLoot(`+${oz}oz water logged`);
}

export function addWaterCustom() {
  const oz = parseInt(document.getElementById('water-custom-amount').value) || 0;
  if (!oz || oz <= 0) return;
  closeModal('modal-water-custom');
  document.getElementById('water-custom-amount').value = '';
  addWater(oz);
}

export function removeWaterEntry(id) {
  saveWaterLog(getWaterLog().filter(e => e.id !== id));
  renderWater();
}

export function updateWaterGoal() {
  const val = parseInt(document.getElementById('water-goal-input').value) || 64;
  localStorage.setItem('water-goal', val);
  renderWater();
}

export function getWaterGoal() {
  return parseInt(localStorage.getItem('water-goal')) || 64;
}

export function renderWater() {
  const log   = getWaterLog();
  const goal  = getWaterGoal();
  const total = log.reduce((s, e) => s + e.oz, 0);
  const pct   = Math.min(100, Math.round((total / goal) * 100));
  const met   = pct >= 100;

  // Sync goal input to saved value
  const goalInput = document.getElementById('water-goal-input');
  if (goalInput && !goalInput.matches(':focus')) goalInput.value = goal;

  document.getElementById('water-today').textContent        = total;
  document.getElementById('water-goal-display').textContent = goal;
  document.getElementById('water-bar').style.width          = pct + '%';
  document.getElementById('water-bar').style.background     = met ? 'var(--green)' : 'var(--blue)';
  document.getElementById('water-pct-badge').textContent    = pct + '%';
  document.getElementById('water-pct-badge').style.color    = met ? 'var(--green)' : 'var(--blue)';
  document.getElementById('water-today').style.color        = met ? 'var(--green)' : 'var(--blue)';

  const logEl = document.getElementById('water-log');
  if (!log.length) {
    logEl.innerHTML = '<div style="font-size:11px;color:var(--text-4);text-align:center;padding:0.5rem 0">No entries today — stay hydrated! 💧</div>';
    return;
  }
  logEl.innerHTML = [...log].reverse().map(e => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--border);font-size:11px">
      <span style="color:var(--blue);font-weight:600">💧 ${e.oz}oz</span>
      <span style="color:var(--text-4)">${e.time}</span>
      <button class="btn btn-danger btn-sm" style="padding:1px 5px;font-size:10px" onclick="removeWaterEntry('${e.id}')">✕</button>
    </div>`).join('');
}
