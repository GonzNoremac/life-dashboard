import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today, autoSave, showLoot } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateSummary } from './summary.js';

// ═══════════════════ INCOME ═══════════════════

export function addIncome() {
  const name = document.getElementById('i-name').value.trim();
  const amount = parseFloat(document.getElementById('i-amount').value) || 0;
  const date = document.getElementById('i-date').value || today();
  const type = document.getElementById('i-type').value;
  const notes = document.getElementById('i-notes').value.trim();
  if (!name || !amount) return;
  state.income.push({ id: uid(), name, amount, date, type, notes });
  clearFields(['i-name','i-amount','i-date','i-notes']);
  closeModal('modal-add-income');
  renderIncome(); updateSummary();
}

export function renderIncome() {
  const body = document.getElementById('income-body');
  const typeColors = { Salary:'tag-green', Freelance:'tag-blue', Investment:'tag-purple', 'Side Hustle':'tag-yellow', Bonus:'tag-yellow', Gift:'tag-blue', Other:'tag-purple' };
  const ms = financeMonthStr();
  const filtered = state.income.filter(i => i.date.startsWith(ms));

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6" style="padding:2rem;text-align:center;color:var(--text-4)">No income for this month</td></tr>';
  } else {
    const sorted = [...filtered].sort((a,b) => b.date.localeCompare(a.date));
    body.innerHTML = sorted.map(i => `
      <tr>
        <td style="color:var(--text-3)">${i.date}</td>
        <td style="font-weight:600">${i.name}</td>
        <td><span class="tag ${typeColors[i.type] || 'tag-green'}">${i.type}</span></td>
        <td style="font-weight:600;color:var(--green)">${fmt(i.amount)}</td>
        <td style="color:var(--text-3)">${i.notes || '—'}</td>
        <td><button class="ctx-btn" onclick="openCtx(event, () => editIncome('${i.id}'), () => { removeItem('income','${i.id}',renderIncome,updateSummary); })">•••</button></td>
      </tr>`).join('');
  }

  const thisMonth = filtered.reduce((s,i) => s + i.amount, 0);
  const allTime = state.income.reduce((s,i) => s + i.amount, 0);
  document.getElementById('income-this-month').textContent = fmt(thisMonth);
  document.getElementById('income-all-time').textContent = fmt(allTime);

  const monthExpenses = state.expenses.filter(e => e.date.startsWith(ms)).reduce((s,e) => s + e.amount, 0);
  const delta = thisMonth - monthExpenses;
  const vsEl = document.getElementById('income-vs-expenses');
  if (thisMonth > 0 || monthExpenses > 0) {
    vsEl.innerHTML = delta >= 0
      ? `<span class="green">▲ ${fmt(delta)} surplus</span>`
      : `<span class="red">▼ ${fmt(Math.abs(delta))} deficit</span>`;
  } else { vsEl.textContent = '—'; }
}

// ── INCOME EDIT ───────────────────────────────────────────

export function editIncome(id) {
  const item = state.income.find(x => x.id === id);
  if (!item) return;
  document.getElementById('i-name').value   = item.name;
  document.getElementById('i-amount').value = item.amount;
  document.getElementById('i-date').value   = item.date;
  document.getElementById('i-type').value   = item.type;
  document.getElementById('i-notes').value  = item.notes || '';
  openEditModal('modal-add-income', 'Edit Income', 'Save Changes', () => {
    item.name   = document.getElementById('i-name').value.trim()   || item.name;
    item.amount = parseFloat(document.getElementById('i-amount').value) || item.amount;
    item.date   = document.getElementById('i-date').value || item.date;
    item.type   = document.getElementById('i-type').value;
    item.notes  = document.getElementById('i-notes').value;
    closeModal('modal-add-income');
    resetModalToAdd('modal-add-income', 'Log Income', 'Add Income', addIncome);
    renderIncome(); updateSummary(); autoSave();
  });
}

// Patch addIncome to show loot toast
const _origAddIncome = addIncome;
addIncome = function() {
  const prevLen = state.income.length;
  _origAddIncome();
  if (state.income.length > prevLen) {
    const last = state.income[state.income.length-1];
    showLoot('+$' + last.amount.toLocaleString('en-US', {minimumFractionDigits:2}) + ' income logged');
  }
};
