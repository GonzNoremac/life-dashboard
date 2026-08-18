import { state } from '../state.js';
import { fmt, uid, clearFields, autoSave } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateSummary } from './summary.js';

// ═══════════════════ DEBTS ═══════════════════

export function addDebt() {
  const name = document.getElementById('d-name').value.trim();
  const total = parseFloat(document.getElementById('d-total').value) || 0;
  const remaining = parseFloat(document.getElementById('d-remaining').value) || total;
  const rate = parseFloat(document.getElementById('d-rate').value) || 0;
  const type = document.getElementById('d-type').value;
  if (!name || !total) return;
  state.debts.push({ id: uid(), name, total, remaining, rate, type });
  clearFields(['d-name','d-total','d-remaining','d-rate']);
  closeModal('modal-add-debt');
  renderDebts(); updateSummary();
}

export function renderDebts() {
  const el = document.getElementById('debt-list');
  if (!state.debts.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">💳</div>No debts added</div>'; return; }
  el.innerHTML = state.debts.map(d => {
    const paidPct = Math.round(((d.total - d.remaining) / d.total) * 100);
    return `<div style="margin-bottom:1.25rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem">
        <div>
          <div style="font-weight:600;font-size:13px">${d.name}</div>
          <div class="muted" style="font-size:10px">${d.type} · ${d.rate}% APR</div>
        </div>
        <div style="text-align:right">
          <div class="red" style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px">${fmt(d.remaining)}</div>
          <div class="muted" style="font-size:10px">${paidPct}% paid off</div>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill fill-green" style="width:${paidPct}%"></div></div>
      <div style="margin-top:0.5rem;display:flex;gap:0.5rem">
        <input type="number" placeholder="Payment amount" id="pay-${d.id}" style="flex:1" onkeydown="if(event.key==='Enter')makePayment('${d.id}')">
        <button class="btn btn-ghost btn-sm" onclick="makePayment('${d.id}')">Pay</button>
        <button class="ctx-btn" onclick="openCtx(event, () => editDebt('${d.id}'), () => { removeItem('debts','${d.id}',renderDebts,updateSummary); })">•••</button>
      </div>
    </div>`;
  }).join('');
}

export function makePayment(id) {
  const input = document.getElementById('pay-' + id);
  const amt = parseFloat(input.value) || 0;
  const d = state.debts.find(x => x.id === id);
  if (d) { d.remaining = Math.max(0, d.remaining - amt); input.value = ''; }
  renderDebts(); updateSummary();
}

// ── DEBT EDIT ─────────────────────────────────────────────

export function editDebt(id) {
  const d = state.debts.find(x => x.id === id);
  if (!d) return;
  document.getElementById('d-name').value      = d.name;
  document.getElementById('d-total').value     = d.total;
  document.getElementById('d-remaining').value = d.remaining;
  document.getElementById('d-rate').value      = d.rate;
  document.getElementById('d-type').value      = d.type;
  openEditModal('modal-add-debt', 'Edit Debt', 'Save Changes', () => {
    d.name      = document.getElementById('d-name').value.trim()      || d.name;
    d.total     = parseFloat(document.getElementById('d-total').value)     || d.total;
    d.remaining = parseFloat(document.getElementById('d-remaining').value) || d.remaining;
    d.rate      = parseFloat(document.getElementById('d-rate').value)      || 0;
    d.type      = document.getElementById('d-type').value;
    closeModal('modal-add-debt');
    resetModalToAdd('modal-add-debt', 'Add Debt', 'Add Debt', addDebt);
    renderDebts(); updateSummary(); autoSave();
  });
}
