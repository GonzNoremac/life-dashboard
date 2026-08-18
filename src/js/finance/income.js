import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today, autoSave, showLoot } from '../utils.js';
import { closeModal, openModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateSummary } from './summary.js';
import { openDetailSheet, refreshDetailSheet } from '../detail-sheet.js';

// ═══════════════════ INCOME ═══════════════════

const PREVIEW_COUNT = 3;
const INCOME_TYPE_COLORS = { Salary:'tag-green', Freelance:'tag-blue', Investment:'tag-purple', 'Side Hustle':'tag-yellow', Bonus:'tag-yellow', Gift:'tag-blue', Other:'tag-purple' };

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

function incomeRowHtml(i) {
  return `<div class="list-row">
    <div class="list-row-main">
      <div class="list-row-title">${i.name}</div>
      <div class="list-row-meta">
        <span>${i.date}</span>
        <span class="tag ${INCOME_TYPE_COLORS[i.type] || 'tag-green'}">${i.type}</span>
        ${i.notes ? `<span>${i.notes}</span>` : ''}
      </div>
    </div>
    <div class="list-row-value green">${fmt(i.amount)}</div>
    <button class="ctx-btn" onclick="openCtx(event, () => editIncome('${i.id}'), () => { removeItem('income','${i.id}',renderIncome,updateSummary); })">•••</button>
  </div>`;
}

function monthIncomeSorted() {
  const ms = financeMonthStr();
  return state.income.filter(i => i.date.startsWith(ms)).sort((a,b) => b.date.localeCompare(a.date));
}

export function renderIncome() {
  const previewEl = document.getElementById('income-preview-list');
  const viewAllBtn = document.getElementById('income-view-all-btn');
  const ms = financeMonthStr();
  const sorted = monthIncomeSorted();

  if (!sorted.length) {
    previewEl.innerHTML = '<div class="empty"><span class="empty-icon">💵</span>No income for this month</div>';
    viewAllBtn.style.display = 'none';
  } else {
    previewEl.innerHTML = sorted.slice(0, PREVIEW_COUNT).map(incomeRowHtml).join('');
    viewAllBtn.style.display = sorted.length > PREVIEW_COUNT ? '' : 'none';
    viewAllBtn.textContent = `View All (${sorted.length})`;
  }

  const thisMonth = sorted.reduce((s,i) => s + i.amount, 0);
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

  refreshDetailSheet();
}

export function openIncomeDetail() {
  openDetailSheet('All Income', () => openModal('modal-add-income'), renderIncomeDetailBody);
}

function renderIncomeDetailBody() {
  const body = document.getElementById('detail-sheet-body');
  const sorted = monthIncomeSorted();
  body.innerHTML = sorted.length
    ? sorted.map(incomeRowHtml).join('')
    : '<div class="empty"><span class="empty-icon">💵</span>No income for this month</div>';
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
