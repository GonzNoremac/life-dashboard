import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today, autoSave, showLoot } from '../utils.js';
import { closeModal, openModal, openEditModal, resetModalToAdd } from '../modals.js';
import { renderBudgets } from './budgets.js';
import { renderIncome } from './income.js';
import { renderCards } from './cards.js';
import { updateSummary } from './summary.js';
import { openDetailSheet, refreshDetailSheet } from '../detail-sheet.js';

// ═══════════════════ FINANCE — EXPENSES ═══════════════════

const PREVIEW_COUNT = 3;

export function addExpense() {
  const desc = document.getElementById('e-desc').value.trim();
  const amount = parseFloat(document.getElementById('e-amount').value) || 0;
  const cat = document.getElementById('e-cat').value;
  const date = document.getElementById('e-date').value || today();
  const card = document.getElementById('e-card').value;
  if (!desc || !amount) return;
  state.expenses.push({ id: uid(), desc, amount, cat, date, card });
  clearFields(['e-desc','e-amount','e-date']);
  closeModal('modal-add-expense');
  renderExpenses(); renderBudgets(); renderIncome(); renderCards(); updateSummary();
}

function expenseRowHtml(e) {
  const cardObj = state.cards.find(c => c.id === e.card);
  const cardBadge = cardObj
    ? `<span class="mini-badge" style="background:${cardObj.color}18;color:${cardObj.color}"><span class="mini-dot" style="background:${cardObj.color}"></span>${cardObj.name}</span>`
    : '';
  return `<div class="list-row">
    <div class="list-row-main">
      <div class="list-row-title">${e.desc}</div>
      <div class="list-row-meta">
        <span>${e.date}</span>
        ${e.cat ? `<span class="tag tag-blue">${e.cat}</span>` : ''}
        ${cardBadge}
      </div>
    </div>
    <div class="list-row-value red">${fmt(e.amount)}</div>
    <button class="ctx-btn" onclick="openCtx(event, () => editExpense('${e.id}'), () => { removeItem('expenses','${e.id}',renderExpenses,renderBudgets,updateSummary,renderCards); })">•••</button>
  </div>`;
}

function monthExpensesSorted() {
  const ms = financeMonthStr();
  return state.expenses.filter(e => e.date.startsWith(ms)).sort((a,b) => b.date.localeCompare(a.date));
}

export function renderExpenses() {
  const previewEl = document.getElementById('expense-preview-list');
  const viewAllBtn = document.getElementById('expense-view-all-btn');
  const sorted = monthExpensesSorted();

  const badge = document.getElementById('expense-count-badge');
  if (badge) badge.textContent = sorted.length;

  if (!sorted.length) {
    previewEl.innerHTML = '<div class="empty"><span class="empty-icon">🧾</span>No expenses for this month</div>';
    viewAllBtn.style.display = 'none';
  } else {
    previewEl.innerHTML = sorted.slice(0, PREVIEW_COUNT).map(expenseRowHtml).join('');
    viewAllBtn.style.display = sorted.length > PREVIEW_COUNT ? '' : 'none';
    viewAllBtn.textContent = `View All (${sorted.length})`;
  }
  refreshDetailSheet();
}

export function openExpenseDetail() {
  openDetailSheet('All Expenses', () => openModal('modal-add-expense'), renderExpenseDetailBody);
}

function renderExpenseDetailBody() {
  const body = document.getElementById('detail-sheet-body');
  const sorted = monthExpensesSorted();
  body.innerHTML = sorted.length
    ? sorted.map(expenseRowHtml).join('')
    : '<div class="empty"><span class="empty-icon">🧾</span>No expenses for this month</div>';
}

export function updateExpenseCategorySelect() {
  const sel = document.getElementById('e-cat');
  sel.innerHTML = '<option value="">Uncategorized</option>' + state.budgets.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
}

// ── EXPENSE EDIT ──────────────────────────────────────────

export function editExpense(id) {
  const e = state.expenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('e-desc').value   = e.desc;
  document.getElementById('e-amount').value = e.amount;
  document.getElementById('e-cat').value    = e.cat || '';
  document.getElementById('e-date').value   = e.date;
  document.getElementById('e-card').value   = e.card || '';
  openEditModal('modal-add-expense', 'Edit Expense', 'Save Changes', () => {
    e.desc   = document.getElementById('e-desc').value.trim()   || e.desc;
    e.amount = parseFloat(document.getElementById('e-amount').value) || e.amount;
    e.cat    = document.getElementById('e-cat').value;
    e.date   = document.getElementById('e-date').value || e.date;
    e.card   = document.getElementById('e-card').value;
    closeModal('modal-add-expense');
    resetModalToAdd('modal-add-expense', 'Add Expense', 'Add Expense', addExpense);
    renderExpenses(); renderBudgets(); updateSummary(); renderCards();
    autoSave();
  });
}

// Patch addExpense to show loot toast — preserves original wrapping order
// (toast wrapper applied here; autosave wrapper applied later in main.js)
const _origAddExpense = addExpense;
addExpense = function() {
  const prevLen = state.expenses.length;
  _origAddExpense();
  if (state.expenses.length > prevLen) showLoot('Expense logged');
};
