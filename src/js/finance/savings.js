import { state } from '../state.js';
import { fmt, uid, clearFields, autoSave, showLoot } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateSummary } from './summary.js';

// ═══════════════════ SAVINGS ═══════════════════

export function addSaving() {
  const name = document.getElementById('s-name').value.trim();
  const target = parseFloat(document.getElementById('s-target').value) || 0;
  const current = parseFloat(document.getElementById('s-current').value) || 0;
  const date = document.getElementById('s-date').value;
  if (!name || !target) return;
  state.savings.push({ id: uid(), name, target, current, date });
  clearFields(['s-name','s-target','s-current','s-date']);
  closeModal('modal-add-saving');
  renderSavings(); updateSummary();
}

export function renderSavings() {
  const el = document.getElementById('savings-list');
  if (!state.savings.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🎯</div>No savings goals yet</div>'; return; }
  el.innerHTML = state.savings.map(s => {
    const pct = Math.min(100, (s.current / s.target) * 100);
    return `<div style="margin-bottom:1rem">
      <div class="progress-label">
        <span style="font-weight:600">${s.name}</span>
        <span class="green">${fmt(s.current)} / ${fmt(s.target)}</span>
      </div>
      ${s.date ? `<div class="muted" style="font-size:10px;margin-bottom:0.3rem">Target: ${s.date}</div>` : ''}
      <div class="progress-bar"><div class="progress-fill fill-green" style="width:${pct}%"></div></div>
      <div style="margin-top:0.5rem;display:flex;gap:0.5rem">
        <input type="number" placeholder="Update amount" id="sup-${s.id}" style="flex:1" onkeydown="if(event.key==='Enter')updateSaving('${s.id}')">
        <button class="btn btn-ghost btn-sm" onclick="updateSaving('${s.id}')">Update</button>
        <button class="ctx-btn" onclick="openCtx(event, () => editSaving('${s.id}'), () => { removeItem('savings','${s.id}',renderSavings,updateSummary); })">•••</button>
      </div>
    </div>`;
  }).join('');
}

export function updateSaving(id) {
  const input = document.getElementById('sup-' + id);
  const val = parseFloat(input.value) || 0;
  const s = state.savings.find(x => x.id === id);
  if (s) { s.current = Math.min(s.target, s.current + val); input.value = ''; }
  renderSavings(); updateSummary();
}

// ── SAVINGS EDIT ──────────────────────────────────────────

export function editSaving(id) {
  const s = state.savings.find(x => x.id === id);
  if (!s) return;
  document.getElementById('s-name').value    = s.name;
  document.getElementById('s-target').value  = s.target;
  document.getElementById('s-current').value = s.current;
  document.getElementById('s-date').value    = s.date || '';
  openEditModal('modal-add-saving', 'Edit Savings Goal', 'Save Changes', () => {
    s.name    = document.getElementById('s-name').value.trim()    || s.name;
    s.target  = parseFloat(document.getElementById('s-target').value)  || s.target;
    s.current = parseFloat(document.getElementById('s-current').value) || 0;
    s.date    = document.getElementById('s-date').value;
    closeModal('modal-add-saving');
    resetModalToAdd('modal-add-saving', 'Add Savings Goal', 'Add Goal', addSaving);
    renderSavings(); updateSummary(); autoSave();
  });
}

// Patch addSaving to show loot toast
const _origAddSaving = addSaving;
addSaving = function() {
  const prevLen = state.savings.length;
  _origAddSaving();
  if (state.savings.length > prevLen) { showLoot('Savings goal added'); }
};
